import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const rawPath = process.env.DATABASE_PATH || './nodak.db';
  const resolvedPath = path.resolve(process.cwd(), rawPath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(resolvedPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}

export function initializeDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_sub TEXT,
      avatar_url TEXT,
      company TEXT NOT NULL DEFAULT 'NODAK Enterprise',
      role TEXT NOT NULL DEFAULT 'owner',
      aws_region TEXT NOT NULL DEFAULT 'us-east-1',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      account_email TEXT NOT NULL,
      scopes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'connected',
      last_synced_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS oauth_provider_configs (
      provider TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      tenant_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      apps_json TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      payment_method TEXT NOT NULL,
      card_last4 TEXT,
      aws_region TEXT NOT NULL DEFAULT 'us-east-1',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      tax_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      promo_code TEXT,
      payment_method_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aws_iam_policies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      app_code TEXT NOT NULL,
      aws_service TEXT NOT NULL,
      region TEXT NOT NULL,
      mfa_required INTEGER NOT NULL DEFAULT 1,
      auto_deny_enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      last_audited_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aws_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      resource TEXT NOT NULL,
      decision TEXT NOT NULL,
      region TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pulse_metrics (
      id TEXT PRIMARY KEY,
      period_label TEXT NOT NULL,
      mrr_cents INTEGER NOT NULL,
      arr_cents INTEGER NOT NULL,
      active_tenants INTEGER NOT NULL,
      churn_bps INTEGER NOT NULL,
      nrr_pct INTEGER NOT NULL,
      aws_query_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flow_deals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      value_cents INTEGER NOT NULL,
      stage TEXT NOT NULL,
      probability INTEGER NOT NULL,
      owner_name TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      warehouse TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reorder_point INTEGER NOT NULL,
      unit_cost_cents INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      reference TEXT NOT NULL,
      account TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      entry_type TEXT NOT NULL,
      reconciled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS build_tasks (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      sprint TEXT NOT NULL,
      assignee TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      story_points INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automate_workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_source TEXT NOT NULL,
      action_target TEXT NOT NULL,
      aws_lambda_arn TEXT NOT NULL,
      runs_count INTEGER NOT NULL DEFAULT 0,
      success_rate REAL NOT NULL DEFAULT 99.9,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT NOT NULL
    );
  `);
}
