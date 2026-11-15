export type AppCode = 'PULSE' | 'FLOW' | 'STOCK' | 'LEDGER' | 'BUILD' | 'AUTOMATE';
export type TierCode = 'essential' | 'professional' | 'business';

export type WorkspaceSection =
  | 'OVERVIEW'
  | AppCode
  | 'AWS_CLOUD'
  | 'BILLING';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  provider: 'local' | 'google' | 'microsoft';
  avatarUrl: string | null;
  company: string;
  role: string;
  awsRegion: string;
  createdAt: string;
}

export interface OAuthConnection {
  id: string;
  provider: 'google' | 'microsoft';
  account_email: string;
  scopes: string;
  status: string;
  last_synced_at: string;
}

export interface OAuthProviderInfo {
  configured: boolean;
  source?: 'env' | 'vault' | 'none';
  clientIdPreview?: string | null;
  suggestedClientId?: string;
  projectId?: string;
  appId?: string;
  authDomain?: string;
  redirectUri: string;
  devRedirectUri?: string;
  sharedRedirectUri?: string;
  devOrigin?: string;
  sharedOrigin?: string;
  authEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  discoveryUrl?: string;
  consoleUrl?: string;
  scopes: string[];
  tenantId?: string;
}

export interface ProductTierSpec {
  tier: TierCode;
  label: string;
  audience: string;
  monthlyPriceCents: number;
  features: string[];
}

export interface AppCatalogItem {
  code: AppCode;
  letter: string;
  name: string;
  category: string;
  tagline: string;
  problem: string;
  solution: string;
  monthlyPriceCents: number;
  annualMonthlyPriceCents: number;
  tiers: ProductTierSpec[];
  awsStack: string[];
  awsServiceSummary: string;
  limits: {
    seats: string;
    throughput: string;
    storage: string;
    sla: string;
  };
  capabilities: string[];
}

export interface SuitePlan {
  id: string;
  name: string;
  audience: string;
  monthlyPriceCents: number;
  annualMonthlyPriceCents: number;
  apps: AppCode[];
  limits: {
    seats: string;
    throughput: string;
    storage: string;
    sla: string;
  };
}

export interface AwsRegionInfo {
  id: string;
  name: string;
  latencyMs: number;
  azCount: number;
}

export interface SubscriptionSummary {
  id: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  apps: AppCode[];
  amountCents: number;
  currency: string;
  paymentMethod: string;
  cardLast4: string | null;
  awsRegion: string;
  status: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  promo_code: string | null;
  payment_method_label: string;
  status: string;
  created_at: string;
}

export interface AwsIamPolicy {
  id: string;
  role_name: string;
  app_code: AppCode;
  aws_service: string;
  region: string;
  mfa_required: number;
  auto_deny_enabled: number;
  status: string;
  last_audited_at: string;
}

export interface AwsAuditLog {
  id: string;
  event_type: string;
  actor: string;
  resource: string;
  decision: 'ALLOW' | 'DENY';
  region: string;
  created_at: string;
}

export interface PulseMetric {
  id: string;
  period_label: string;
  mrr_cents: number;
  arr_cents: number;
  active_tenants: number;
  churn_bps: number;
  nrr_pct: number;
  aws_query_ms: number;
}

export interface FlowDeal {
  id: string;
  title: string;
  company: string;
  contact_email: string;
  value_cents: number;
  stage: 'Prospección' | 'Propuesta' | 'Negociación' | 'Cerrado';
  probability: number;
  owner_name: string;
  updated_at: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  quantity: number;
  reorder_point: number;
  unit_cost_cents: number;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_date: string;
  reference: string;
  account: string;
  category: string;
  amount_cents: number;
  entry_type: 'credit' | 'debit';
  reconciled: number;
}

export interface BuildTask {
  id: string;
  code: string;
  title: string;
  sprint: string;
  assignee: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Backlog' | 'En Progreso' | 'Revisión' | 'Desplegado';
  story_points: number;
}

export interface AutomateWorkflow {
  id: string;
  name: string;
  trigger_source: string;
  action_target: string;
  aws_lambda_arn: string;
  runs_count: number;
  success_rate: number;
  enabled: number;
  last_run_at: string;
}
