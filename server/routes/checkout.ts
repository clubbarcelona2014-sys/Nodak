import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { ANNUAL_MONTHS, APPS_CATALOG, AWS_REGIONS, PROMO_CODES, SUITE_PLANS } from '../data/catalog.ts';
import { getDb } from '../db.ts';
import { type AuthenticatedRequest, optionalAuth, requireAuth } from '../middleware/auth.ts';

export const checkoutRouter = Router();

checkoutRouter.get('/plans', (_req: Request, res: Response) => {
  res.json({
    apps: APPS_CATALOG,
    suites: SUITE_PLANS,
    regions: AWS_REGIONS,
    annualMonths: ANNUAL_MONTHS,
  });
});

checkoutRouter.post('/checkout/validate-promo', (req: Request, res: Response) => {
  const code = String((req.body as { code?: string }).code || '')
    .trim()
    .toUpperCase();
  const promo = PROMO_CODES[code];
  if (!promo) {
    res.status(404).json({ valid: false, message: 'Promo code not recognized.' });
    return;
  }
  res.json({ valid: true, code, ...promo });
});

checkoutRouter.get('/billing/summary', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.json({
      subscription: null,
      unlockedApps: [],
      invoices: [],
    });
    return;
  }

  const db = getDb();
  const userId = req.user.userId;

  const activeSubs = db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC")
    .all(userId) as (Record<string, unknown> & { apps_json?: string })[];

  const latestSub = activeSubs[0];
  const unlockedSet = new Set<string>();
  for (const sub of activeSubs) {
    if (sub.apps_json) {
      try {
        const arr = JSON.parse(sub.apps_json) as string[];
        arr.forEach((a) => unlockedSet.add(a));
      } catch {
        // Ignore malformed json
      }
    }
  }

  const invoices = db
    .prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 25')
    .all(userId);

  res.json({
    subscription: latestSub
      ? {
          id: latestSub.id,
          planId: latestSub.plan_id,
          planName: latestSub.plan_name,
          billingCycle: latestSub.billing_cycle,
          apps: Array.from(unlockedSet),
          amountCents: latestSub.amount_cents,
          currency: latestSub.currency,
          paymentMethod: latestSub.payment_method,
          cardLast4: latestSub.card_last4,
          awsRegion: latestSub.aws_region,
          status: latestSub.status,
          createdAt: latestSub.created_at,
        }
      : null,
    unlockedApps: Array.from(unlockedSet),
    invoices,
  });
});

function resolvePlanSelection(planId: string) {
  const suite = SUITE_PLANS.find((s) => s.id === planId);
  if (suite) {
    return {
      planId: suite.id,
      planName: suite.name,
      appsToUnlock: suite.apps,
      monthlyBaseCents: suite.monthlyPriceCents,
    };
  }

  // Match formats: "pulse-essential", "pulse-professional", "pulse-business", or "app-pulse"
  const normalized = planId.toLowerCase();
  for (const app of APPS_CATALOG) {
    const codeLower = app.code.toLowerCase();
    if (normalized === `app-${codeLower}` || normalized === codeLower) {
      const tier = app.tiers[1]; // Default to Professional
      return {
        planId: `${codeLower}-${tier.tier}`,
        planName: `${app.name} — ${tier.label}`,
        appsToUnlock: [app.code],
        monthlyBaseCents: tier.monthlyPriceCents,
      };
    }
    for (const t of app.tiers) {
      if (normalized === `${codeLower}-${t.tier}`) {
        return {
          planId: `${codeLower}-${t.tier}`,
          planName: `${app.name} — ${t.label}`,
          appsToUnlock: [app.code],
          monthlyBaseCents: t.monthlyPriceCents,
        };
      }
    }
  }
  return null;
}

checkoutRouter.post('/checkout/confirm', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    planId,
    billingCycle,
    paymentMethod,
    cardLast4,
    cardBrand,
    promoCode,
    awsRegion,
    cardholderName,
    bankName,
    paypalEmail,
  } = req.body as {
    planId?: string;
    billingCycle?: 'monthly' | 'annual';
    paymentMethod?: string;
    cardLast4?: string;
    cardBrand?: string;
    promoCode?: string;
    awsRegion?: string;
    cardholderName?: string;
    bankName?: string;
    paypalEmail?: string;
  };

  if (!planId || !billingCycle || !paymentMethod) {
    res.status(400).json({ error: 'INVALID_CHECKOUT', message: 'Missing checkout parameters.' });
    return;
  }

  const resolved = resolvePlanSelection(planId);
  if (!resolved) {
    res.status(404).json({ error: 'PLAN_NOT_FOUND', message: 'Selected plan does not exist.' });
    return;
  }

  // Annual billing = 10 monthly payments (2 months free)
  const subtotalCents =
    billingCycle === 'annual' ? resolved.monthlyBaseCents * ANNUAL_MONTHS : resolved.monthlyBaseCents;
  const normalizedPromo = promoCode ? promoCode.trim().toUpperCase() : '';
  const promo = normalizedPromo ? PROMO_CODES[normalizedPromo] : undefined;
  const discountCents = promo ? Math.round((subtotalCents * promo.discountPct) / 100) : 0;
  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round(taxableCents * 0.16);
  const totalCents = taxableCents + taxCents;

  const region = AWS_REGIONS.some((r) => r.id === awsRegion) ? awsRegion! : 'us-east-1';
  const userId = req.user!.userId;
  const now = new Date().toISOString();

  const cleanLast4 = cardLast4 ? cardLast4.replace(/\D/g, '').slice(-4) : '';
  const paymentLabelMap: Record<string, string> = {
    card: cleanLast4 ? `${cardBrand || 'Tarjeta'} •••• ${cleanLast4}` : `${cardBrand || 'Tarjeta'}`,
    apple_pay: 'Apple Pay Express',
    google_pay: 'Google Pay Express',
    link: 'Stripe Link 1-Clic',
    paypal: paypalEmail ? `PayPal (${paypalEmail.trim()})` : 'PayPal Empresas',
    ach: bankName
      ? `Transferencia ${bankName.trim()}${cleanLast4 ? ` •••• ${cleanLast4}` : ''}`
      : cleanLast4
        ? `Transferencia bancaria •••• ${cleanLast4}`
        : 'Transferencia bancaria',
  };
  const paymentMethodLabel = paymentLabelMap[paymentMethod] || 'Tarjeta Corporativa';

  const db = getDb();
  const subId = `sub_${crypto.randomUUID().slice(0, 12)}`;
  const invId = `inv_${crypto.randomUUID().slice(0, 12)}`;
  const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const tx = db.transaction(() => {
    // If upgrading to full suite, supersede individual subs; otherwise keep other active app subs so multi-app buyers retain access
    if (resolved.appsToUnlock.length === 6) {
      db.prepare(`UPDATE subscriptions SET status = 'superseded' WHERE user_id = ? AND status = 'active'`).run(userId);
    }

    db.prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, plan_name, billing_cycle, apps_json, amount_cents, currency, payment_method, card_last4, aws_region, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, 'active', ?)`
    ).run(
      subId,
      userId,
      resolved.planId,
      resolved.planName,
      billingCycle,
      JSON.stringify(resolved.appsToUnlock),
      totalCents,
      paymentMethod,
      cardLast4 || null,
      region,
      now
    );

    db.prepare(
      `INSERT INTO invoices (id, user_id, subscription_id, invoice_number, subtotal_cents, discount_cents, tax_cents, total_cents, promo_code, payment_method_label, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`
    ).run(
      invId,
      userId,
      subId,
      invoiceNumber,
      subtotalCents,
      discountCents,
      taxCents,
      totalCents,
      promo ? normalizedPromo : null,
      paymentMethodLabel,
      now
    );

    db.prepare('UPDATE users SET aws_region = ? WHERE id = ?').run(region, userId);

    for (const appCode of resolved.appsToUnlock) {
      const appSpec = APPS_CATALOG.find((a) => a.code === appCode);
      const existingPolicy = db
        .prepare('SELECT id FROM aws_iam_policies WHERE user_id = ? AND app_code = ?')
        .get(userId, appCode);
      if (!existingPolicy && appSpec) {
        db.prepare(
          `INSERT INTO aws_iam_policies (id, user_id, role_name, app_code, aws_service, region, mfa_required, auto_deny_enabled, status, last_audited_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'active', ?)`
        ).run(
          `iam_${appCode.toLowerCase()}_${crypto.randomUUID().slice(0, 6)}`,
          userId,
          `nodak-${appCode.toLowerCase()}-production-role`,
          appCode,
          appSpec.awsServiceSummary,
          region,
          now
        );
      } else {
        db.prepare('UPDATE aws_iam_policies SET region = ?, last_audited_at = ? WHERE user_id = ? AND app_code = ?').run(
          region,
          now,
          userId,
          appCode
        );
      }
    }

    db.prepare(
      `INSERT INTO aws_audit_logs (id, user_id, event_type, actor, resource, decision, region, created_at)
       VALUES (?, ?, 'CHECKOUT_PROVISION_AWS', ?, ?, 'ALLOW', ?, ?)`
    ).run(
      `log_${crypto.randomUUID().slice(0, 10)}`,
      userId,
      cardholderName || req.user!.email,
      `plan/${resolved.planId} -> ${resolved.appsToUnlock.join(',')}`,
      region,
      now
    );
  });

  tx();

  const activeSubs = db
    .prepare("SELECT apps_json FROM subscriptions WHERE user_id = ? AND status = 'active'")
    .all(userId) as { apps_json: string }[];
  const allUnlocked = Array.from(
    new Set(activeSubs.flatMap((s) => JSON.parse(s.apps_json) as string[]))
  );

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId);
  res.status(201).json({
    ok: true,
    subscription: {
      id: subId,
      planId: resolved.planId,
      planName: resolved.planName,
      billingCycle,
      apps: allUnlocked,
      awsRegion: region,
      status: 'active',
    },
    invoice,
  });
});
