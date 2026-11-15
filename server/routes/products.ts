import crypto from 'crypto';
import { Router, type NextFunction, type Response } from 'express';
import { getDb } from '../db.ts';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';

export const productsRouter = Router();

function requirePaidApp(appCode: 'PULSE' | 'FLOW' | 'STOCK' | 'LEDGER' | 'BUILD' | 'AUTOMATE') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      const db = getDb();
      const subs = db
        .prepare("SELECT apps_json FROM subscriptions WHERE user_id = ? AND status = 'active'")
        .all(req.user!.userId) as { apps_json: string }[];

      const unlocked = new Set<string>();
      for (const s of subs) {
        try {
          (JSON.parse(s.apps_json) as string[]).forEach((code) => unlocked.add(code));
        } catch {
          // ignore
        }
      }

      if (!unlocked.has(appCode)) {
        res.status(402).json({
          error: 'PAYMENT_REQUIRED',
          app: appCode,
          message: `Suscripción activa requerida para acceder a NODAK ${appCode}.`,
        });
        return;
      }
      next();
    });
  };
}

// 1. PULSE — Business Intelligence & Analytics
productsRouter.get('/apps/pulse', requirePaidApp('PULSE'), (_req, res: Response) => {
  const db = getDb();
  const metrics = db.prepare('SELECT * FROM pulse_metrics ORDER BY id ASC').all();
  res.json({ metrics });
});

productsRouter.post('/apps/pulse/snapshot', requirePaidApp('PULSE'), (req: AuthenticatedRequest, res: Response) => {
  const { periodLabel, mrrUsd, activeTenants, nrrPct } = req.body as {
    periodLabel?: string;
    mrrUsd?: number;
    activeTenants?: number;
    nrrPct?: number;
  };
  if (!periodLabel || !mrrUsd) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Periodo y MRR requeridos.' });
    return;
  }
  const db = getDb();
  const id = `pulse_${Date.now()}`;
  const mrrCents = Math.round(Number(mrrUsd) * 100);
  const arrCents = mrrCents * 12;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO pulse_metrics (id, period_label, mrr_cents, arr_cents, active_tenants, churn_bps, nrr_pct, aws_query_ms, created_at)
     VALUES (?, ?, ?, ?, ?, 112, ?, 24, ?)`
  ).run(id, periodLabel.trim(), mrrCents, arrCents, Number(activeTenants || 500), Number(nrrPct || 128), now);

  const created = db.prepare('SELECT * FROM pulse_metrics WHERE id = ?').get(id);
  res.status(201).json({ metric: created });
});

// 2. FLOW — Enterprise CRM
productsRouter.get('/apps/flow', requirePaidApp('FLOW'), (_req, res: Response) => {
  const db = getDb();
  const deals = db.prepare('SELECT * FROM flow_deals ORDER BY updated_at DESC').all();
  res.json({ deals });
});

productsRouter.post('/apps/flow/deals', requirePaidApp('FLOW'), (req: AuthenticatedRequest, res: Response) => {
  const { title, company, contactEmail, valueUsd, stage } = req.body as {
    title?: string;
    company?: string;
    contactEmail?: string;
    valueUsd?: number;
    stage?: string;
  };
  if (!title || !company || !valueUsd) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Título, empresa y valor son requeridos.' });
    return;
  }
  const db = getDb();
  const id = `deal_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const resolvedStage = stage || 'Prospección';
  const probMap: Record<string, number> = {
    Prospección: 30,
    Propuesta: 60,
    Negociación: 80,
    Cerrado: 100,
  };

  db.prepare(
    `INSERT INTO flow_deals (id, title, company, contact_email, value_cents, stage, probability, owner_name, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title.trim(),
    company.trim(),
    (contactEmail || 'contacto@empresa.com').trim(),
    Math.round(Number(valueUsd) * 100),
    resolvedStage,
    probMap[resolvedStage] || 40,
    req.user!.name,
    now
  );

  const created = db.prepare('SELECT * FROM flow_deals WHERE id = ?').get(id);
  res.status(201).json({ deal: created });
});

productsRouter.patch('/apps/flow/deals/:id', requirePaidApp('FLOW'), (req: AuthenticatedRequest, res: Response) => {
  const { stage } = req.body as { stage?: string };
  const probMap: Record<string, number> = {
    Prospección: 30,
    Propuesta: 60,
    Negociación: 80,
    Cerrado: 100,
  };
  if (!stage || !probMap[stage]) {
    res.status(400).json({ error: 'INVALID_STAGE', message: 'Etapa inválida.' });
    return;
  }
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE flow_deals SET stage = ?, probability = ?, updated_at = ? WHERE id = ?').run(
    stage,
    probMap[stage],
    now,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM flow_deals WHERE id = ?').get(req.params.id);
  res.json({ deal: updated });
});

// 3. STOCK — Inventory & Supply Chain
productsRouter.get('/apps/stock', requirePaidApp('STOCK'), (_req, res: Response) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM stock_items ORDER BY sku ASC').all();
  res.json({ items });
});

productsRouter.post('/apps/stock/items', requirePaidApp('STOCK'), (req: AuthenticatedRequest, res: Response) => {
  const { sku, name, category, warehouse, quantity, reorderPoint, unitCostUsd } = req.body as {
    sku?: string;
    name?: string;
    category?: string;
    warehouse?: string;
    quantity?: number;
    reorderPoint?: number;
    unitCostUsd?: number;
  };
  if (!sku || !name) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'SKU y nombre requeridos.' });
    return;
  }
  const db = getDb();
  const id = `stk_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO stock_items (id, sku, name, category, warehouse, quantity, reorder_point, unit_cost_cents, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      sku.trim().toUpperCase(),
      name.trim(),
      (category || 'Operaciones').trim(),
      (warehouse || 'US-East').trim(),
      Number(quantity || 0),
      Number(reorderPoint || 15),
      Math.round(Number(unitCostUsd || 100) * 100),
      now
    );
    const created = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id);
    res.status(201).json({ item: created });
  } catch {
    res.status(409).json({ error: 'DUPLICATE_SKU', message: 'El código SKU ya existe.' });
  }
});

productsRouter.patch('/apps/stock/items/:id', requirePaidApp('STOCK'), (req: AuthenticatedRequest, res: Response) => {
  const { delta } = req.body as { delta?: number };
  const db = getDb();
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id) as
    | { quantity: number }
    | undefined;
  if (!item) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Artículo no encontrado.' });
    return;
  }
  const nextQty = Math.max(0, item.quantity + Number(delta || 0));
  const now = new Date().toISOString();
  db.prepare('UPDATE stock_items SET quantity = ?, updated_at = ? WHERE id = ?').run(nextQty, now, req.params.id);
  const updated = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id);
  res.json({ item: updated });
});

// 4. LEDGER — Finance & Accounting
productsRouter.get('/apps/ledger', requirePaidApp('LEDGER'), (_req, res: Response) => {
  const db = getDb();
  const entries = db.prepare('SELECT * FROM ledger_entries ORDER BY entry_date DESC, created_at DESC').all();
  res.json({ entries });
});

productsRouter.post('/apps/ledger/entries', requirePaidApp('LEDGER'), (req: AuthenticatedRequest, res: Response) => {
  const { reference, account, category, amountUsd, entryType } = req.body as {
    reference?: string;
    account?: string;
    category?: string;
    amountUsd?: number;
    entryType?: 'credit' | 'debit';
  };
  if (!reference || !account || !amountUsd) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Referencia, cuenta y monto requeridos.' });
    return;
  }
  const db = getDb();
  const id = `ldg_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  db.prepare(
    `INSERT INTO ledger_entries (id, entry_date, reference, account, category, amount_cents, entry_type, reconciled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    today,
    reference.trim().toUpperCase(),
    account.trim(),
    (category || 'Operación Cloud').trim(),
    Math.round(Number(amountUsd) * 100),
    entryType === 'debit' ? 'debit' : 'credit',
    now
  );

  const created = db.prepare('SELECT * FROM ledger_entries WHERE id = ?').get(id);
  res.status(201).json({ entry: created });
});

productsRouter.patch('/apps/ledger/entries/:id', requirePaidApp('LEDGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM ledger_entries WHERE id = ?').get(req.params.id) as
    | { reconciled: number }
    | undefined;
  if (!entry) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Asiento no encontrado.' });
    return;
  }
  const next = entry.reconciled ? 0 : 1;
  db.prepare('UPDATE ledger_entries SET reconciled = ? WHERE id = ?').run(next, req.params.id);
  const updated = db.prepare('SELECT * FROM ledger_entries WHERE id = ?').get(req.params.id);
  res.json({ entry: updated });
});

// 5. BUILD — Agile Engineering & Projects
productsRouter.get('/apps/build', requirePaidApp('BUILD'), (_req, res: Response) => {
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM build_tasks ORDER BY code ASC').all();
  res.json({ tasks });
});

productsRouter.post('/apps/build/tasks', requirePaidApp('BUILD'), (req: AuthenticatedRequest, res: Response) => {
  const { title, sprint, priority, storyPoints } = req.body as {
    title?: string;
    sprint?: string;
    priority?: string;
    storyPoints?: number;
  };
  if (!title) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Título requerido.' });
    return;
  }
  const db = getDb();
  const id = `tsk_${crypto.randomUUID().slice(0, 8)}`;
  const code = `NDK-${Math.floor(410 + Math.random() * 580)}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO build_tasks (id, code, title, sprint, assignee, priority, status, story_points, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Backlog', ?, ?)`
  ).run(
    id,
    code,
    title.trim(),
    (sprint || 'Sprint 25').trim(),
    req.user!.name,
    priority || 'Media',
    Number(storyPoints || 3),
    now
  );

  const created = db.prepare('SELECT * FROM build_tasks WHERE id = ?').get(id);
  res.status(201).json({ task: created });
});

productsRouter.patch('/apps/build/tasks/:id', requirePaidApp('BUILD'), (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!['Backlog', 'En Progreso', 'Revisión', 'Desplegado'].includes(status || '')) {
    res.status(400).json({ error: 'INVALID_STATUS', message: 'Estado de tarea inválido.' });
    return;
  }
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE build_tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
  const updated = db.prepare('SELECT * FROM build_tasks WHERE id = ?').get(req.params.id);
  res.json({ task: updated });
});

// 6. AUTOMATE — AWS EventBridge & Lambda Workflows
productsRouter.get('/apps/automate', requirePaidApp('AUTOMATE'), (_req, res: Response) => {
  const db = getDb();
  const workflows = db.prepare('SELECT * FROM automate_workflows ORDER BY id ASC').all();
  res.json({ workflows });
});

productsRouter.post('/apps/automate/workflows', requirePaidApp('AUTOMATE'), (req: AuthenticatedRequest, res: Response) => {
  const { name, triggerSource, actionTarget } = req.body as {
    name?: string;
    triggerSource?: string;
    actionTarget?: string;
  };
  if (!name || !triggerSource || !actionTarget) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Nombre, disparador y destino requeridos.' });
    return;
  }
  const db = getDb();
  const id = `wf_${crypto.randomUUID().slice(0, 8)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO automate_workflows (id, name, trigger_source, action_target, aws_lambda_arn, runs_count, success_rate, enabled, last_run_at)
     VALUES (?, ?, ?, ?, ?, 0, 100.0, 1, ?)`
  ).run(
    id,
    name.trim(),
    triggerSource.trim(),
    actionTarget.trim(),
    `arn:aws:lambda:us-east-1:849201749201:function:nodak-${slug}`,
    now
  );

  const created = db.prepare('SELECT * FROM automate_workflows WHERE id = ?').get(id);
  res.status(201).json({ workflow: created });
});

productsRouter.patch('/apps/automate/workflows/:id/toggle', requirePaidApp('AUTOMATE'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const wf = db.prepare('SELECT * FROM automate_workflows WHERE id = ?').get(req.params.id) as
    | { enabled: number }
    | undefined;
  if (!wf) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Flujo no encontrado.' });
    return;
  }
  const next = wf.enabled ? 0 : 1;
  db.prepare('UPDATE automate_workflows SET enabled = ? WHERE id = ?').run(next, req.params.id);
  const updated = db.prepare('SELECT * FROM automate_workflows WHERE id = ?').get(req.params.id);
  res.json({ workflow: updated });
});

productsRouter.post('/apps/automate/workflows/:id/run', requirePaidApp('AUTOMATE'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const wf = db.prepare('SELECT * FROM automate_workflows WHERE id = ?').get(req.params.id) as
    | { runs_count: number; aws_lambda_arn: string }
    | undefined;
  if (!wf) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Flujo no encontrado.' });
    return;
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE automate_workflows SET runs_count = ?, last_run_at = ? WHERE id = ?').run(
    wf.runs_count + 1,
    now,
    req.params.id
  );
  db.prepare(
    `INSERT INTO aws_audit_logs (id, user_id, event_type, actor, resource, decision, region, created_at)
     VALUES (?, ?, 'LAMBDA_EXECUTION', ?, ?, 'ALLOW', 'us-east-1', ?)`
  ).run(`log_${crypto.randomUUID().slice(0, 10)}`, req.user!.userId, req.user!.email, wf.aws_lambda_arn, now);

  const updated = db.prepare('SELECT * FROM automate_workflows WHERE id = ?').get(req.params.id);
  res.json({ workflow: updated, executedAt: now });
});
