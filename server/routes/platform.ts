import crypto from 'crypto';
import { Router, type Response } from 'express';
import { APPS_CATALOG, AWS_REGIONS } from '../data/catalog.ts';
import { getDb } from '../db.ts';
import { type AuthenticatedRequest, optionalAuth, requireAuth } from '../middleware/auth.ts';

export const platformRouter = Router();

platformRouter.get('/aws/topology', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const userId = req.user?.userId || 'usr_nodak_demo';

  const user = db.prepare('SELECT aws_region FROM users WHERE id = ?').get(userId) as
    | { aws_region?: string }
    | undefined;

  const policies = db
    .prepare('SELECT * FROM aws_iam_policies WHERE user_id = ? ORDER BY app_code ASC')
    .all(userId);

  const logs = db
    .prepare('SELECT * FROM aws_audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(userId);

  const activeRegion = user?.aws_region || process.env.AWS_REGION || 'us-east-1';
  const regionMeta = AWS_REGIONS.find((r) => r.id === activeRegion) || AWS_REGIONS[0];

  res.json({
    accountId: process.env.AWS_ACCOUNT_ID || '849201749201',
    enforcementMode: process.env.AWS_IAM_ENFORCEMENT_MODE || 'STRICT_AUTO_DENY',
    activeRegion: regionMeta,
    regions: AWS_REGIONS,
    servicesByApp: APPS_CATALOG.map((app) => ({
      code: app.code,
      name: app.name,
      awsStack: app.awsStack,
      summary: app.awsServiceSummary,
      sla: app.limits.sla,
    })),
    policies,
    logs,
  });
});

platformRouter.patch('/aws/region', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { region } = req.body as { region?: string };
  const validRegion = AWS_REGIONS.find((r) => r.id === region);
  if (!validRegion) {
    res.status(400).json({ error: 'INVALID_REGION', message: 'Región AWS no soportada.' });
    return;
  }

  const db = getDb();
  const userId = req.user!.userId;
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET aws_region = ? WHERE id = ?').run(validRegion.id, userId);
  db.prepare('UPDATE aws_iam_policies SET region = ?, last_audited_at = ? WHERE user_id = ?').run(
    validRegion.id,
    now,
    userId
  );
  db.prepare(
    `INSERT INTO aws_audit_logs (id, user_id, event_type, actor, resource, decision, region, created_at)
     VALUES (?, ?, 'AWS_MULTI_AZ_FAILOVER', ?, 'vpc/nodak-core-cluster', 'ALLOW', ?, ?)`
  ).run(`log_${crypto.randomUUID().slice(0, 10)}`, userId, req.user!.email, validRegion.id, now);

  res.json({ ok: true, activeRegion: validRegion });
});

platformRouter.patch('/aws/iam/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { mfaRequired, autoDenyEnabled } = req.body as {
    mfaRequired?: boolean;
    autoDenyEnabled?: boolean;
  };
  const db = getDb();
  const userId = req.user!.userId;
  const policyId = req.params.id;

  const existing = db
    .prepare('SELECT * FROM aws_iam_policies WHERE id = ? AND user_id = ?')
    .get(policyId, userId) as Record<string, unknown> | undefined;

  if (!existing) {
    res.status(404).json({ error: 'POLICY_NOT_FOUND', message: 'Política IAM no encontrada.' });
    return;
  }

  const nextMfa = typeof mfaRequired === 'boolean' ? (mfaRequired ? 1 : 0) : Number(existing.mfa_required);
  const nextAutoDeny =
    typeof autoDenyEnabled === 'boolean' ? (autoDenyEnabled ? 1 : 0) : Number(existing.auto_deny_enabled);
  const now = new Date().toISOString();

  db.prepare('UPDATE aws_iam_policies SET mfa_required = ?, auto_deny_enabled = ?, last_audited_at = ? WHERE id = ?').run(
    nextMfa,
    nextAutoDeny,
    now,
    policyId
  );

  db.prepare(
    `INSERT INTO aws_audit_logs (id, user_id, event_type, actor, resource, decision, region, created_at)
     VALUES (?, ?, 'IAM_POLICY_UPDATED', ?, ?, 'ALLOW', ?, ?)`
  ).run(
    `log_${crypto.randomUUID().slice(0, 10)}`,
    userId,
    req.user!.email,
    String(existing.role_name),
    String(existing.region),
    now
  );

  const updated = db.prepare('SELECT * FROM aws_iam_policies WHERE id = ?').get(policyId);
  res.json({ ok: true, policy: updated });
});

platformRouter.post('/aws/iam/simulate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { appCode, action, hasMfa } = req.body as {
    appCode?: string;
    action?: string;
    hasMfa?: boolean;
  };

  const db = getDb();
  const userId = req.user!.userId;
  const policy = db
    .prepare('SELECT * FROM aws_iam_policies WHERE user_id = ? AND app_code = ?')
    .get(userId, String(appCode || 'PULSE').toUpperCase()) as
    | { role_name: string; region: string; mfa_required: number; auto_deny_enabled: number }
    | undefined;

  const isPrivilegedAction = /delete|decrypt|export|rotate|admin/i.test(action || '');
  const mfaOk = !policy?.mfa_required || Boolean(hasMfa);
  const blockedByAutoDeny = Boolean(policy?.auto_deny_enabled) && (!mfaOk || (isPrivilegedAction && !hasMfa));
  const decision = blockedByAutoDeny ? 'DENY' : 'ALLOW';
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO aws_audit_logs (id, user_id, event_type, actor, resource, decision, region, created_at)
     VALUES (?, ?, 'IAM_SIMULATION', ?, ?, ?, ?, ?)`
  ).run(
    `log_${crypto.randomUUID().slice(0, 10)}`,
    userId,
    req.user!.email,
    `${policy?.role_name || 'nodak-role'} :: ${action || 's3:GetObject'}`,
    decision,
    policy?.region || 'us-east-1',
    now
  );

  res.json({
    decision,
    reason:
      decision === 'DENY'
        ? 'Acceso bloqueado automáticamente: se requiere verificación en dos pasos (MFA) para esta operación.'
        : 'Acceso autorizado tras verificar permisos y sesión empresarial.',
    evaluatedAt: now,
  });
});

platformRouter.post('/aws/failover-check', optionalAuth, (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  let dbHealthy = false;
  try {
    const check = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    dbHealthy = check?.ok === 1;
  } catch {
    dbHealthy = false;
  }

  const checkedAt = new Date().toISOString();
  res.json({
    ok: dbHealthy,
    architecture: 'Multi-AZ Activo-Activo',
    primaryRegion: process.env.AWS_REGION || 'us-east-1',
    standbyRegion: 'us-west-2',
    zones: [
      { zone: 'us-east-1a', status: 'Operativa', latencyMs: 11 },
      { zone: 'us-east-1b', status: 'Operativa', latencyMs: 12 },
      { zone: 'us-east-1c', status: 'Operativa', latencyMs: 13 },
    ],
    uptimeSla: '99.99%',
    checkedAt,
  });
});

