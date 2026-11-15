import bcrypt from 'bcryptjs';
import { APPS_CATALOG } from './data/catalog.ts';
import { getDb } from './db.ts';

export function seedInitialData(): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Default demo executive user
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get('usr_nodak_demo');
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync('NodakCloud2026!', 10);
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, provider, company, role, aws_region, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'usr_nodak_demo',
      'ejecutivo@nodak.com',
      'Valeria Mendoza',
      passwordHash,
      'local',
      'NODAK Holdings S.A.',
      'owner',
      'us-east-1',
      now
    );

    // Seed active subscription (NODAK One Suite)
    db.prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, plan_name, billing_cycle, apps_json, amount_cents, currency, payment_method, card_last4, aws_region, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'sub_demo_001',
      'usr_nodak_demo',
      'suite-one',
      'NODAK One — Suite Completa',
      'annual',
      JSON.stringify(['PULSE', 'FLOW', 'STOCK', 'LEDGER', 'BUILD', 'AUTOMATE']),
      11900,
      'USD',
      'card',
      '4242',
      'us-east-1',
      'active',
      now
    );

    db.prepare(
      `INSERT INTO invoices (id, user_id, subscription_id, invoice_number, subtotal_cents, discount_cents, tax_cents, total_cents, promo_code, payment_method_label, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'inv_demo_001',
      'usr_nodak_demo',
      'sub_demo_001',
      'INV-2026-8410',
      14900,
      3000,
      1904,
      13804,
      'NODAK20',
      'Visa •••• 4242',
      'paid',
      now
    );

    // Seed AWS IAM policies for each app
    const insertIam = db.prepare(
      `INSERT INTO aws_iam_policies (id, user_id, role_name, app_code, aws_service, region, mfa_required, auto_deny_enabled, status, last_audited_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const app of APPS_CATALOG) {
      insertIam.run(
        `iam_${app.code.toLowerCase()}_demo`,
        'usr_nodak_demo',
        `nodak-${app.code.toLowerCase()}-production-role`,
        app.code,
        app.awsServiceSummary,
        'us-east-1',
        1,
        1,
        'active',
        now
      );
    }

    // Seed AWS Audit Logs
    const insertLog = db.prepare(
      `INSERT INTO aws_audit_logs (id, user_id, event_type, actor, resource, decision, region, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertLog.run('log_01', 'usr_nodak_demo', 'IAM_POLICY_ENFORCE', 'arn:aws:iam::849201749201:role/nodak-ledger-production-role', 'kms:Decrypt / ledger-vault', 'ALLOW', 'us-east-1', now);
    insertLog.run('log_02', 'usr_nodak_demo', 'EXTERNAL_IP_BLOCKED', '185.220.101.44 (Unauthenticated)', 's3:GetObject / nodak-stock-docs', 'DENY', 'us-east-1', now);
    insertLog.run('log_03', 'usr_nodak_demo', 'MULTI_AZ_HEALTH_CHECK', 'aws-ecs-fargate-scheduler', 'cluster/nodak-core-prod', 'ALLOW', 'us-east-1', now);
  }

  // 2. Seed PULSE Metrics
  const pulseCount = (db.prepare('SELECT COUNT(*) as count FROM pulse_metrics').get() as { count: number }).count;
  if (pulseCount === 0) {
    const insertPulse = db.prepare(
      `INSERT INTO pulse_metrics (id, period_label, mrr_cents, arr_cents, active_tenants, churn_bps, nrr_pct, aws_query_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const periods = [
      ['Jun 2026', 18400000, 220800000, 312, 190, 114, 42],
      ['Jul 2026', 20650000, 247800000, 341, 175, 116, 39],
      ['Ago 2026', 22900000, 274800000, 369, 160, 118, 36],
      ['Sep 2026', 25800000, 309600000, 404, 145, 121, 34],
      ['Oct 2026', 28450000, 341400000, 438, 132, 123, 31],
      ['Nov 2026', 31920000, 383040000, 476, 118, 126, 28],
    ];
    periods.forEach(([period, mrr, arr, tenants, churn, nrr, qms], idx) => {
      insertPulse.run(`pulse_${idx + 1}`, period, mrr, arr, tenants, churn, nrr, qms, now);
    });
  }

  // 3. Seed FLOW CRM Deals
  const flowCount = (db.prepare('SELECT COUNT(*) as count FROM flow_deals').get() as { count: number }).count;
  if (flowCount === 0) {
    const insertDeal = db.prepare(
      `INSERT INTO flow_deals (id, title, company, contact_email, value_cents, stage, probability, owner_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertDeal.run('deal_01', 'Suite Enterprise VPC Multi-AZ', 'Grupo Financiero Pacífico', 'cto@pacifico.com', 4200000, 'Negociación', 80, 'Valeria Mendoza', now);
    insertDeal.run('deal_02', 'Despliegue Stock + Ledger', 'Logística Andina S.A.', 'ops@logandina.co', 2850000, 'Propuesta', 60, 'Carlos Ríos', now);
    insertDeal.run('deal_03', 'Automatización EventBridge + Flow', 'Retail Norteamérica', 'it@retailnorte.mx', 1950000, 'Prospección', 35, 'Sofía Paredes', now);
    insertDeal.run('deal_04', 'Renovación Anual NODAK One', 'Clínica Metropolitana', 'finanzas@clinicametro.es', 5400000, 'Cerrado', 100, 'Valeria Mendoza', now);
    insertDeal.run('deal_05', 'Integración Microsoft Entra SSO', 'Manufactura Vértice', 'seguridad@vertice.cl', 3100000, 'Negociación', 75, 'Carlos Ríos', now);
  }

  // 4. Seed STOCK Inventory
  const stockCount = (db.prepare('SELECT COUNT(*) as count FROM stock_items').get() as { count: number }).count;
  if (stockCount === 0) {
    const insertStock = db.prepare(
      `INSERT INTO stock_items (id, sku, name, category, warehouse, quantity, reorder_point, unit_cost_cents, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertStock.run('stk_01', 'NDK-SRV-401', 'Nodo Edge AWS Outposts 2U', 'Infraestructura', 'US-East', 42, 15, 320000, now);
    insertStock.run('stk_02', 'NDK-POS-118', 'Terminal Biométrica NFC Pro', 'Hardware POS', 'LATAM-Hub', 11, 20, 48500, now);
    insertStock.run('stk_03', 'NDK-SEC-092', 'Llave Hardware FIDO2 Yubi-Enterprise', 'Seguridad IAM', 'EU-West', 184, 50, 6500, now);
    insertStock.run('stk_04', 'NDK-NET-305', 'Switch Fibra 10GbE Gestionado', 'Conectividad', 'US-East', 19, 12, 115000, now);
    insertStock.run('stk_05', 'NDK-SEN-710', 'Sensor Telemetría Frío Industrial', 'IoT Logístico', 'LATAM-Hub', 8, 25, 29000, now);
  }

  // 5. Seed LEDGER Entries
  const ledgerCount = (db.prepare('SELECT COUNT(*) as count FROM ledger_entries').get() as { count: number }).count;
  if (ledgerCount === 0) {
    const insertLedger = db.prepare(
      `INSERT INTO ledger_entries (id, entry_date, reference, account, category, amount_cents, entry_type, reconciled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertLedger.run('ldg_01', '2026-11-12', 'FAC-9041', 'Checking / Stripe Settlement', 'Suscripciones SaaS', 1482000, 'credit', 1, now);
    insertLedger.run('ldg_02', '2026-11-11', 'AWS-US-E1', 'Amazon Web Services Inc.', 'Infraestructura Cloud', 342500, 'debit', 1, now);
    insertLedger.run('ldg_03', '2026-11-10', 'FAC-9038', 'Clínica Metropolitana', 'Contrato Anual Enterprise', 5400000, 'credit', 1, now);
    insertLedger.run('ldg_04', '2026-11-09', 'MS-ENTRA-26', 'Microsoft Corp. Licensing', 'APIs & Identidad', 89000, 'debit', 0, now);
    insertLedger.run('ldg_05', '2026-11-08', 'FAC-9032', 'Logística Andina S.A.', 'Implementación Stock', 950000, 'credit', 0, now);
  }

  // 6. Seed BUILD Tasks
  const buildCount = (db.prepare('SELECT COUNT(*) as count FROM build_tasks').get() as { count: number }).count;
  if (buildCount === 0) {
    const insertTask = db.prepare(
      `INSERT INTO build_tasks (id, code, title, sprint, assignee, priority, status, story_points, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertTask.run('tsk_01', 'NDK-401', 'Failover Multi-AZ Aurora us-east-1b', 'Sprint 24', 'Diego Navarro', 'Alta', 'Desplegado', 5, now);
    insertTask.run('tsk_02', 'NDK-402', 'Checkout Stripe Link + Apple Pay 1-Click', 'Sprint 24', 'Valeria Mendoza', 'Alta', 'En Progreso', 8, now);
    insertTask.run('tsk_03', 'NDK-403', 'Webhook Microsoft Graph Calendars.Read', 'Sprint 24', 'Sofía Paredes', 'Media', 'Revisión', 3, now);
    insertTask.run('tsk_04', 'NDK-404', 'Política IAM Auto-Deny KMS para Ledger', 'Sprint 25', 'Diego Navarro', 'Alta', 'Backlog', 5, now);
    insertTask.run('tsk_05', 'NDK-405', 'Exportador CSV/JSON tabular en Pulse BI', 'Sprint 24', 'Carlos Ríos', 'Baja', 'En Progreso', 2, now);
  }

  // 7. Seed AUTOMATE Workflows
  const autoCount = (db.prepare('SELECT COUNT(*) as count FROM automate_workflows').get() as { count: number }).count;
  if (autoCount === 0) {
    const insertAuto = db.prepare(
      `INSERT INTO automate_workflows (id, name, trigger_source, action_target, aws_lambda_arn, runs_count, success_rate, enabled, last_run_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertAuto.run(
      'wf_01',
      'Deal Cerrado -> Asiento Contable + Factura',
      'FLOW: Deal Cerrado',
      'LEDGER + Google Gmail',
      'arn:aws:lambda:us-east-1:849201749201:function:nodak-flow-to-ledger',
      142,
      99.8,
      1,
      now
    );
    insertAuto.run(
      'wf_02',
      'Alerta Reorden Stock -> Aprobación Teams',
      'STOCK: Cantidad < Reorden',
      'Microsoft Graph + Purchase Order',
      'arn:aws:lambda:us-east-1:849201749201:function:nodak-stock-reorder',
      89,
      100.0,
      1,
      now
    );
    insertAuto.run(
      'wf_03',
      'Sincronización Nocturna Redshift Pulse',
      'EventBridge: Cron 02:00 UTC',
      'PULSE Redshift Serverless',
      'arn:aws:lambda:us-east-1:849201749201:function:nodak-pulse-etl',
      310,
      99.9,
      1,
      now
    );
    insertAuto.run(
      'wf_04',
      'Auditoría IAM Auto-Deny -> Google Calendar',
      'AWS CloudTrail: Deny Event',
      'IAM Security + Calendar Incident',
      'arn:aws:lambda:us-east-1:849201749201:function:nodak-iam-guard',
      27,
      100.0,
      1,
      now
    );
  }
}
