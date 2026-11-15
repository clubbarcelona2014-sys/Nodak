export type AppCode = 'PULSE' | 'FLOW' | 'STOCK' | 'LEDGER' | 'BUILD' | 'AUTOMATE';
export type TierCode = 'essential' | 'professional' | 'business';

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

export const ANNUAL_MONTHS = 10;

export const AWS_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', latencyMs: 18, azCount: 6 },
  { id: 'us-west-2', name: 'US West (Oregon)', latencyMs: 32, azCount: 4 },
  { id: 'eu-west-1', name: 'Europe (Ireland)', latencyMs: 44, azCount: 3 },
  { id: 'sa-east-1', name: 'South America (São Paulo)', latencyMs: 51, azCount: 3 },
];

export const APPS_CATALOG: AppCatalogItem[] = [
  {
    code: 'PULSE',
    letter: 'P',
    name: 'NODAK PULSE',
    category: 'Business Intelligence',
    tagline: 'See what drives your business with clear metrics and reports.',
    problem: 'Data lives in many places, so leaders decide with partial information.',
    solution: 'NODAK PULSE unifies operational data on Amazon Redshift into one sub-second executive command layer.',
    monthlyPriceCents: 2099,
    annualMonthlyPriceCents: Math.round((2099 * ANNUAL_MONTHS) / 12),
    tiers: [
      {
        tier: 'essential',
        label: 'Essential',
        audience: 'For founders and core reporting',
        monthlyPriceCents: 2099,
        features: [
          'Business dashboard',
          'Basic KPIs & period comparisons',
          'Charts and visualizations',
          'Performance indicators',
          'Basic reports & historical overview',
        ],
      },
      {
        tier: 'professional',
        label: 'Professional',
        audience: 'For scaling analytics teams',
        monthlyPriceCents: 4999,
        features: [
          'Advanced dashboards & custom KPIs',
          'Multiple AWS data sources',
          'Historical comparisons & trends',
          'Advanced & scheduled reporting',
          'Anomaly alerts via EventBridge',
        ],
      },
      {
        tier: 'business',
        label: 'Business',
        audience: 'For multi-department enterprises',
        monthlyPriceCents: 9999,
        features: [
          'Custom department analytics',
          'Consolidated multi-entity reports',
          'Advanced performance monitoring',
          'Expanded Redshift data capacity',
          'Advanced exports & dedicated SLA',
        ],
      },
    ],
    awsStack: ['Amazon Redshift', 'AWS Glue', 'ECS Fargate', 'CloudFront'],
    awsServiceSummary: 'Redshift Serverless + ECS Multi-AZ',
    limits: {
      seats: 'Up to 50 analysts',
      throughput: '10M events/mo',
      storage: '500 GB Redshift',
      sla: '99.99% Multi-AZ',
    },
    capabilities: [
      'KPI dashboards',
      'Data visualization',
      'Reports',
      'Business metrics',
      'Period comparisons',
      'Custom filters',
      'Performance analysis',
      'Exportable reports',
      'Data source management',
      'Alerts',
    ],
  },
  {
    code: 'FLOW',
    letter: 'F',
    name: 'NODAK FLOW',
    category: 'CRM & Sales Management',
    tagline: 'Keep every customer and opportunity moving forward.',
    problem: 'Customer history and deals are scattered, so follow-ups get missed.',
    solution: 'NODAK FLOW centralizes accounts, pipelines, and Outlook/Gmail sync on Aurora PostgreSQL.',
    monthlyPriceCents: 2499,
    annualMonthlyPriceCents: Math.round((2499 * ANNUAL_MONTHS) / 12),
    tiers: [
      {
        tier: 'essential',
        label: 'Essential',
        audience: 'For focused sales desks',
        monthlyPriceCents: 2499,
        features: [
          'Customer & contact database',
          'Company profiles & history',
          'Basic sales pipeline',
          'Follow-up records',
        ],
      },
      {
        tier: 'professional',
        label: 'Professional',
        audience: 'For growing revenue teams',
        monthlyPriceCents: 5999,
        features: [
          'Multiple sales pipelines',
          'Opportunity & quotation management',
          'Sales forecasting & reminders',
          'Google & Outlook email sync',
          'Team assignments & reports',
        ],
      },
      {
        tier: 'business',
        label: 'Business',
        audience: 'For multi-region sales orgs',
        monthlyPriceCents: 11999,
        features: [
          'Multiple sales teams & targets',
          'Advanced sales management',
          'Custom CRM fields & permissions',
          'Consolidated revenue reports',
          'Dedicated Aurora Multi-AZ cluster',
        ],
      },
    ],
    awsStack: ['Aurora PostgreSQL', 'ElastiCache Redis', 'ECS Fargate', 'SES'],
    awsServiceSummary: 'Aurora PostgreSQL + Redis Cluster',
    limits: {
      seats: 'Up to 100 reps',
      throughput: '250k contacts',
      storage: '250 GB KMS encrypted',
      sla: '99.99% Multi-AZ',
    },
    capabilities: [
      'Customers',
      'Contacts',
      'Companies',
      'Sales pipeline',
      'Opportunities',
      'Quotations',
      'Sales activities',
      'Customer history',
      'Follow-up reminders',
      'Sales reports',
      'Team assignments',
    ],
  },
  {
    code: 'STOCK',
    letter: 'S',
    name: 'NODAK STOCK',
    category: 'Inventory & Supply Management',
    tagline: 'Know what you have, where it is and when to reorder.',
    problem: 'Stock counts drift out of sync, causing shortages and excess.',
    solution: 'NODAK STOCK executes atomic warehouse ledger updates on DynamoDB Global Tables.',
    monthlyPriceCents: 2999,
    annualMonthlyPriceCents: Math.round((2999 * ANNUAL_MONTHS) / 12),
    tiers: [
      {
        tier: 'essential',
        label: 'Essential',
        audience: 'For single-warehouse control',
        monthlyPriceCents: 2999,
        features: [
          'Product catalog & categories',
          'Real-time stock quantities',
          'Stock entries and exits',
          'Inventory movements & alerts',
        ],
      },
      {
        tier: 'professional',
        label: 'Professional',
        audience: 'For multi-site operations',
        monthlyPriceCents: 6999,
        features: [
          'Supplier management',
          'Purchase orders & approvals',
          'Multiple inventory locations',
          'Stock adjustment history',
          'Advanced reorder alerts',
        ],
      },
      {
        tier: 'business',
        label: 'Business',
        audience: 'For global supply chains',
        monthlyPriceCents: 13999,
        features: [
          'Multiple warehouses & transfers',
          'Batch and lot tracking',
          'Stock rotation analysis',
          'Advanced inventory reporting',
          'Expanded DynamoDB capacity',
        ],
      },
    ],
    awsStack: ['DynamoDB Global', 'AWS AppSync', 'S3 Glacier', 'Lambda'],
    awsServiceSummary: 'DynamoDB Global Tables + Lambda',
    limits: {
      seats: 'Up to 60 operators',
      throughput: '500k active SKUs',
      storage: '1 TB S3 archive',
      sla: '99.99% Multi-AZ',
    },
    capabilities: [
      'Product catalog',
      'Categories',
      'Stock levels',
      'Warehouses',
      'Suppliers',
      'Stock movements',
      'Inventory adjustments',
      'Low-stock alerts',
      'Import/export',
      'Inventory reports',
      'Movement history',
    ],
  },
  {
    code: 'LEDGER',
    letter: 'L',
    name: 'NODAK LEDGER',
    category: 'Business Financial Operations',
    tagline: 'Track income, expenses, invoices and cash flow in one place.',
    problem: 'Financial records are spread across files and hard to summarize.',
    solution: 'NODAK LEDGER locks accounting entries under AWS KMS encryption and S3 Object Lock.',
    monthlyPriceCents: 2999,
    annualMonthlyPriceCents: Math.round((2999 * ANNUAL_MONTHS) / 12),
    tiers: [
      {
        tier: 'essential',
        label: 'Essential',
        audience: 'For core bookkeeping',
        monthlyPriceCents: 2999,
        features: [
          'Income & expense records',
          'Financial categories',
          'Financial dashboard',
          'Cash flow overview & reports',
        ],
      },
      {
        tier: 'professional',
        label: 'Professional',
        audience: 'For corporate finance teams',
        monthlyPriceCents: 6999,
        features: [
          'Budget management',
          'Accounts receivable & payable',
          'Cash flow analysis',
          'Financial documents & audit trail',
          'Advanced reconciliation reports',
        ],
      },
      {
        tier: 'business',
        label: 'Business',
        audience: 'For multi-entity groups',
        monthlyPriceCents: 13999,
        features: [
          'Department budgets',
          'Financial projections',
          'Consolidated dashboards',
          'Expanded document capacity',
          'AWS KMS dedicated key isolation',
        ],
      },
    ],
    awsStack: ['Aurora PostgreSQL', 'AWS KMS', 'QLDB Audit', 'S3 Object Lock'],
    awsServiceSummary: 'Aurora + KMS + S3 Object Lock',
    limits: {
      seats: 'Up to 30 controllers',
      throughput: 'Unlimited entries',
      storage: '10-yr Object Lock',
      sla: '99.995% Multi-AZ',
    },
    capabilities: [
      'Income',
      'Expenses',
      'Financial categories',
      'Budgets',
      'Invoices',
      'Receivables',
      'Payables',
      'Cash-flow reporting',
      'Financial summaries',
      'Transaction history',
      'Exportable reports',
    ],
  },
  {
    code: 'BUILD',
    letter: 'B',
    name: 'NODAK BUILD',
    category: 'Project & Team Management',
    tagline: 'Plan work, assign owners and track progress to delivery.',
    problem: 'Tasks and deadlines get lost between chats and spreadsheets.',
    solution: 'NODAK BUILD runs high-velocity sprints, milestones, and team capacity on ECS Fargate.',
    monthlyPriceCents: 2099,
    annualMonthlyPriceCents: Math.round((2099 * ANNUAL_MONTHS) / 12),
    tiers: [
      {
        tier: 'essential',
        label: 'Essential',
        audience: 'For small delivery squads',
        monthlyPriceCents: 2099,
        features: [
          'Project creation & tasks',
          'Task assignments & due dates',
          'Progress tracking',
          'Basic project dashboard',
        ],
      },
      {
        tier: 'professional',
        label: 'Professional',
        audience: 'For agile engineering orgs',
        monthlyPriceCents: 4999,
        features: [
          'Subtasks & Kanban boards',
          'Team calendar & dependencies',
          'Comments & file attachments',
          'Advanced sprint reports',
        ],
      },
      {
        tier: 'business',
        label: 'Business',
        audience: 'For enterprise PMOs',
        monthlyPriceCents: 9999,
        features: [
          'Project portfolios',
          'Resource & capacity planning',
          'Advanced IAM permissions',
          'Workload monitoring',
          'Consolidated portfolio dashboards',
        ],
      },
    ],
    awsStack: ['ECS Fargate', 'Aurora Serverless v2', 'CodePipeline', 'CloudWatch'],
    awsServiceSummary: 'ECS Fargate + Aurora Serverless v2',
    limits: {
      seats: 'Up to 150 builders',
      throughput: 'Unlimited projects',
      storage: '500 GB artifacts',
      sla: '99.99% Multi-AZ',
    },
    capabilities: [
      'Workspaces',
      'Projects',
      'Tasks',
      'Subtasks',
      'Assignments',
      'Priorities',
      'Deadlines',
      'Kanban',
      'Calendar',
      'Timeline',
      'Comments',
      'Attachments',
      'Progress tracking',
      'Project reports',
    ],
  },
  {
    code: 'AUTOMATE',
    letter: 'A',
    name: 'NODAK AUTOMATE',
    category: 'Workflow Automation',
    tagline: 'Automate repetitive work with controlled, auditable workflows.',
    problem: 'Manual routine steps consume time and invite errors.',
    solution: 'NODAK AUTOMATE orchestrates cross-product triggers, Google/Microsoft APIs, and AWS Lambda.',
    monthlyPriceCents: 3499,
    annualMonthlyPriceCents: Math.round((3499 * ANNUAL_MONTHS) / 12),
    tiers: [
      {
        tier: 'essential',
        label: 'Essential',
        audience: 'For essential automations',
        monthlyPriceCents: 3499,
        features: [
          'Basic workflow creation',
          'Scheduled triggers',
          'Simple conditions & actions',
          'Execution history & error logs',
        ],
      },
      {
        tier: 'professional',
        label: 'Professional',
        audience: 'For connected operations',
        monthlyPriceCents: 7999,
        features: [
          'Multi-step EventBridge workflows',
          'Multiple conditions & branching',
          'Google & Microsoft Graph connectors',
          'Automated notifications & retries',
        ],
      },
      {
        tier: 'business',
        label: 'Business',
        audience: 'For mission-critical pipelines',
        monthlyPriceCents: 15999,
        features: [
          'Complex Step Functions sequences',
          'Expanded integration capacity',
          'Higher Lambda execution limits',
          'Advanced monitoring & audit trail',
        ],
      },
    ],
    awsStack: ['AWS Lambda', 'EventBridge', 'Step Functions', 'SQS FIFO'],
    awsServiceSummary: 'EventBridge + AWS Step Functions',
    limits: {
      seats: 'Unlimited operators',
      throughput: '2M runs/mo',
      storage: '90-day CloudWatch',
      sla: '99.99% Multi-AZ',
    },
    capabilities: [
      'Visual workflow builder',
      'Triggers',
      'Conditions',
      'Actions',
      'Scheduled automations',
      'Integrations',
      'Execution history',
      'Error logs',
      'Retry controls',
      'Templates',
      'Permissions',
      'Audit trail',
    ],
  },
];

export const SUITE_PLANS: SuitePlan[] = [
  {
    id: 'suite-one',
    name: 'NODAK One — Full Suite (All 6 Products)',
    audience: 'Unlock PULSE, FLOW, STOCK, LEDGER, BUILD & AUTOMATE under one AWS organization.',
    monthlyPriceCents: 12999,
    annualMonthlyPriceCents: Math.round((12999 * ANNUAL_MONTHS) / 12),
    apps: ['PULSE', 'FLOW', 'STOCK', 'LEDGER', 'BUILD', 'AUTOMATE'],
    limits: {
      seats: 'Up to 100 unified users',
      throughput: '25M events + 2M Lambda runs/mo',
      storage: '5 TB S3 + Redshift Serverless',
      sla: '99.99% AWS Multi-AZ + IAM Auto-Deny',
    },
  },
  {
    id: 'suite-enterprise',
    name: 'NODAK Enterprise VPC',
    audience: 'Dedicated single-tenant AWS VPC, SAML/Entra SSO, custom KMS keys & 24/7 SRE.',
    monthlyPriceCents: 29999,
    annualMonthlyPriceCents: Math.round((29999 * ANNUAL_MONTHS) / 12),
    apps: ['PULSE', 'FLOW', 'STOCK', 'LEDGER', 'BUILD', 'AUTOMATE'],
    limits: {
      seats: 'Unlimited users + Entra/Google SSO',
      throughput: '100M+ events / Reserved capacity',
      storage: '20 TB customer-managed KMS',
      sla: '99.995% Multi-Region AWS',
    },
  },
];

export const PROMO_CODES: Record<string, { discountPct: number; label: string }> = {
  NODAK20: { discountPct: 20, label: 'Launch 20% Off' },
  AWSSTART: { discountPct: 25, label: 'AWS Cloud Credit 25%' },
  FOUNDER15: { discountPct: 15, label: 'Founder 15% Off' },
};
