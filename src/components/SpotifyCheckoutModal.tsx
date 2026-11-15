import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Globe,
  HelpCircle,
  Lock,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrencyExact } from '../lib/api.ts';
import type { AppCatalogItem, AppCode, AwsRegionInfo, InvoiceRecord, SuitePlan, UserProfile } from '../types.ts';
import { NodakLogo } from './NodakLogo.tsx';

interface SpotifyCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  initialPlanId: string;
  initialBillingCycle: 'monthly' | 'annual';
  apps: AppCatalogItem[];
  suites: SuitePlan[];
  regions: AwsRegionInfo[];
  user: UserProfile | null;
  onRequireAuth: () => void;
  onCheckoutSuccess: (invoice: InvoiceRecord, unlockedApps: string[]) => void;
  onLaunchPortal: (firstApp: AppCode) => void;
}

type PaymentTab = 'card' | 'paypal' | 'ach';
type CheckoutStep = 1 | 2 | 3;

const ANNUAL_MONTHS = 10;
const QUICK_PROMOS = [
  { code: 'NODAK20', label: '20% de bienvenida' },
  { code: 'AWSSTART', label: '25% empresas AWS' },
  { code: 'FOUNDER15', label: '15% fundadores' },
];

function detectCardBrand(digits: string): 'VISA' | 'MASTERCARD' | 'AMEX' | 'TARJETA' {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  return 'TARJETA';
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }
  return digits;
}

export function SpotifyCheckoutModal({
  open,
  onClose,
  initialPlanId,
  initialBillingCycle,
  apps,
  suites,
  regions,
  user,
  onRequireAuth,
  onCheckoutSuccess,
  onLaunchPortal,
}: SpotifyCheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>(3);
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBillingCycle);
  const [awsRegion, setAwsRegion] = useState(user?.awsRegion || 'us-east-1');
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('card');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState('México');
  const [postalCode, setPostalCode] = useState('');

  const [paypalEmail, setPaypalEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceRecord | null>(null);
  const [unlockedResult, setUnlockedResult] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedPlanId(initialPlanId);
      setBillingCycle(initialBillingCycle);
      setCompletedInvoice(null);
      setCheckoutError(null);
      setStep(3);
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setCardholderName('');
      setPostalCode('');
      setPaypalEmail('');
      setBankName('');
      setBankAccountNumber('');
      if (user?.awsRegion) {
        setAwsRegion(user.awsRegion);
      }
    }
  }, [open, initialPlanId, initialBillingCycle, user]);

  if (!open) return null;

  const selectablePlans = [
    ...suites.map((s) => ({
      id: s.id,
      group: 'Suites',
      name: s.name,
      subtitle: s.audience,
      monthlyPriceCents: s.monthlyPriceCents,
      appsList: s.apps,
    })),
    ...apps.flatMap((a) =>
      a.tiers.map((t) => ({
        id: `${a.code.toLowerCase()}-${t.tier}`,
        group: a.name,
        name: `${a.name} — ${t.label}`,
        subtitle: t.audience,
        monthlyPriceCents: t.monthlyPriceCents,
        appsList: [a.code],
      }))
    ),
  ];

  const activePlan =
    selectablePlans.find((p) => p.id === selectedPlanId) ||
    selectablePlans.find((p) => p.id === 'suite-one') ||
    selectablePlans[0];

  if (!activePlan) return null;

  const subtotalCents =
    billingCycle === 'annual' ? activePlan.monthlyPriceCents * ANNUAL_MONTHS : activePlan.monthlyPriceCents;
  const annualSavingsCents = billingCycle === 'annual' ? activePlan.monthlyPriceCents * 2 : 0;
  const discountCents = appliedPromo ? Math.round((subtotalCents * appliedPromo.discountPct) / 100) : 0;
  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round(taxableCents * 0.16);
  const totalCents = taxableCents + taxCents;

  const rawDigits = cardNumber.replace(/\D/g, '');
  const cardBrand = detectCardBrand(rawDigits);
  const isSingleAppHighTier = activePlan.appsList.length === 1 && activePlan.monthlyPriceCents >= 9999;

  const validateAndApplyPromo = async (codeToTry: string) => {
    setPromoError(null);
    const trimmed = codeToTry.trim().toUpperCase();
    if (!trimmed) return;
    setPromoInput(trimmed);
    try {
      const res = await apiRequest<{ valid: boolean; code: string; discountPct: number; label: string }>(
        '/api/v1/checkout/validate-promo',
        {
          method: 'POST',
          body: JSON.stringify({ code: trimmed }),
        }
      );
      setAppliedPromo({ code: res.code, discountPct: res.discountPct, label: res.label });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Este cupón no es válido.');
      setAppliedPromo(null);
    }
  };

  const executePayment = async (method: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    const bankDigits = bankAccountNumber.replace(/\D/g, '');
    const resolvedLast4 =
      method === 'card'
        ? rawDigits.slice(-4)
        : method === 'ach'
          ? bankDigits.slice(-4)
          : undefined;

    setCheckoutError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        subscription: { apps: string[] };
        invoice: InvoiceRecord;
      }>('/api/v1/checkout/confirm', {
        method: 'POST',
        body: JSON.stringify({
          planId: activePlan.id,
          billingCycle,
          paymentMethod: method,
          cardLast4: resolvedLast4,
          cardBrand,
          promoCode: appliedPromo?.code,
          awsRegion,
          cardholderName: cardholderName.trim() || user.name,
          bankName: method === 'ach' ? bankName.trim() : undefined,
          paypalEmail: method === 'paypal' ? paypalEmail.trim() : undefined,
        }),
      });
      setCompletedInvoice(res.invoice);
      setUnlockedResult(res.subscription.apps);
      onCheckoutSuccess(res.invoice, res.subscription.apps);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'No se pudo completar el cobro.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (paymentTab === 'card') {
      if (rawDigits.length < 13 || rawDigits.length > 19) {
        setCheckoutError('Ingresa manualmente un número de tarjeta válido (13 a 19 dígitos).');
        return;
      }
      const expDigits = expiry.replace(/\D/g, '');
      if (expDigits.length !== 4) {
        setCheckoutError('Ingresa la fecha de vencimiento completa en formato MM / AA.');
        return;
      }
      const mm = Number(expDigits.slice(0, 2));
      const yy = Number(expDigits.slice(2, 4));
      const now = new Date();
      const curYY = now.getFullYear() % 100;
      const curMM = now.getMonth() + 1;
      if (mm < 1 || mm > 12 || yy < curYY || (yy === curYY && mm < curMM)) {
        setCheckoutError('La fecha de vencimiento de la tarjeta es inválida o ya expiró.');
        return;
      }
      if (cvc.length < 3 || cvc.length > 4) {
        setCheckoutError('Ingresa el código de seguridad CVC/CVV de 3 o 4 dígitos.');
        return;
      }
      if (cardholderName.trim().length < 2) {
        setCheckoutError('Ingresa el nombre completo del titular de la tarjeta.');
        return;
      }
      if (postalCode.trim().length < 3) {
        setCheckoutError('Ingresa el código postal asociado a la tarjeta.');
        return;
      }
    } else if (paymentTab === 'paypal') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim())) {
        setCheckoutError('Ingresa un correo electrónico válido de PayPal para continuar.');
        return;
      }
    } else if (paymentTab === 'ach') {
      if (bankName.trim().length < 2) {
        setCheckoutError('Ingresa el nombre del banco emisor.');
        return;
      }
      const acctDigits = bankAccountNumber.replace(/\D/g, '');
      if (acctDigits.length < 6) {
        setCheckoutError('Ingresa tu número de cuenta bancaria o CLABE (mínimo 6 dígitos).');
        return;
      }
    }

    executePayment(paymentTab);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/88 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Pasarela de Pago NODAK"
    >
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-4 sm:p-6">
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-[#05070D] shadow-2xl">
          {/* DIDACTIC STEP BAR HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] transition-colors hover:text-[#FCCB06] whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Regresar
              </button>
              <span className="h-4 w-px bg-white/15" />
              <NodakLogo size="sm" />
            </div>

            {!completedInvoice && (
              <nav className="flex items-center gap-1.5 overflow-x-auto" aria-label="Pasos del pago">
                {[
                  { id: 1 as CheckoutStep, label: '1. Tu plan y ciclo' },
                  { id: 2 as CheckoutStep, label: '2. Región AWS' },
                  { id: 3 as CheckoutStep, label: '3. Pago seguro' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      step === s.id
                        ? 'bg-[#FCCB06] text-black'
                        : 'bg-white/[0.05] text-[#CBD5E1] hover:bg-white/[0.1]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </nav>
            )}

            <button
              onClick={onClose}
              aria-label="Cerrar pasarela"
              className="rounded-lg border border-white/15 bg-white/[0.05] p-1.5 text-[#CBD5E1] transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid lg:grid-cols-12">
            {/* LEFT PANEL: Guided Blaugrana Receipt & What Happens Next */}
            <div className="blaugrana-hero-bg flex flex-col justify-between border-b border-white/10 p-7 text-white sm:p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">Resumen de tu suscripción</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight tabular-nums text-white">
                    {formatCurrencyExact(totalCents)}
                  </span>
                  <span className="text-sm text-[#94A3B8]">
                    USD / {billingCycle === 'annual' ? 'año' : 'mes'}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-[#E2E8F0]">{activePlan.name}</p>
                <p className="mt-0.5 text-xs text-[#94A3B8]">
                  Incluye acceso inmediato a: <span className="font-semibold text-white">{activePlan.appsList.join(', ')}</span>
                </p>

                {isSingleAppHighTier && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#FCCB06]/40 bg-[#FCCB06]/10 px-3.5 py-2.5 text-xs">
                    <span className="text-[#FDE68A]">
                      Por casi el mismo precio puedes llevar <strong>las 6 aplicaciones</strong> juntas.
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanId('suite-one')}
                      className="shrink-0 rounded-lg bg-[#FCCB06] px-2.5 py-1 text-[11px] font-bold text-black"
                    >
                      Ver Suite
                    </button>
                  </div>
                )}

                {/* Didactic Guide Card: What happens right after paying */}
                <div className="mt-5 rounded-xl border border-white/10 bg-black/45 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <HelpCircle className="h-3.5 w-3.5 text-[#FCCB06]" />
                    ¿Cómo funciona este pago?
                  </p>
                  <ol className="mt-2.5 space-y-2 text-xs text-[#CBD5E1]">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#FCCB06]">1.</span>
                      <span>Confirmas tu plan y región en la nube AWS con respaldo en 3 zonas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#FCCB06]">2.</span>
                      <span>Tu portal se desbloquea en segundos con factura emitida al momento.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#FCCB06]">3.</span>
                      <span>Puedes cambiar de plan o cancelar cuando quieras sin penalizaciones.</span>
                    </li>
                  </ol>
                </div>

                {/* Promo Codes */}
                <div className="mt-5">
                  <label className="mb-1.5 block text-xs font-semibold text-[#CBD5E1]">
                    ¿Tienes un cupón de descuento? Haz clic o escríbelo:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Ej. NODAK20"
                        className="w-full rounded-xl border border-white/15 bg-[#060B24] py-2 pl-9 pr-3 text-xs text-white placeholder:text-[#94A3B8]/70 outline-none focus:border-[#FCCB06]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => validateAndApplyPromo(promoInput)}
                      className="rounded-xl border border-[#FCCB06]/50 bg-[#FCCB06]/10 px-3.5 py-2 text-xs font-bold text-[#FCCB06] transition-colors hover:bg-[#FCCB06]/20 whitespace-nowrap"
                    >
                      Aplicar
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_PROMOS.map((qp) => (
                      <button
                        key={qp.code}
                        type="button"
                        onClick={() => validateAndApplyPromo(qp.code)}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          appliedPromo?.code === qp.code
                            ? 'border-[#FCCB06] bg-[#FCCB06] text-black'
                            : 'border-white/15 bg-white/[0.04] text-[#CBD5E1] hover:text-white'
                        }`}
                      >
                        {qp.code} · {qp.label}
                      </button>
                    ))}
                  </div>
                  {promoError && <p className="mt-1.5 text-xs text-rose-300">{promoError}</p>}
                  {appliedPromo && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Descuento aplicado: {appliedPromo.code} ({appliedPromo.label})
                    </p>
                  )}
                </div>

                {/* Clear Itemized Receipt */}
                <div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-xs sm:text-sm">
                  <div className="flex justify-between text-[#CBD5E1]">
                    <span>
                      Subtotal ({billingCycle === 'annual' ? '10 meses pagados + 2 gratis' : 'mensual'})
                    </span>
                    <span className="font-mono tabular-nums">{formatCurrencyExact(subtotalCents)}</span>
                  </div>
                  {annualSavingsCents > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-[#FCCB06]">
                      <span>Ahorro por pago anual</span>
                      <span className="font-mono tabular-nums">-{formatCurrencyExact(annualSavingsCents)}</span>
                    </div>
                  )}
                  {discountCents > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Cupón ({appliedPromo?.code})</span>
                      <span className="font-mono tabular-nums">-{formatCurrencyExact(discountCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Impuestos estimados (16%)</span>
                    <span className="font-mono tabular-nums">{formatCurrencyExact(taxCents)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/15 pt-3 text-base font-bold text-white">
                    <span>Total a pagar hoy</span>
                    <span className="font-mono tabular-nums text-[#FCCB06]">
                      {formatCurrencyExact(totalCents)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-white/15 pt-4 text-xs text-[#94A3B8]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#FCCB06]" />
                <span>Conexión bancaria cifrada · Activación garantizada en AWS sin interrupciones.</span>
              </div>
            </div>

            {/* RIGHT PANEL: Interactive Didactic Payment & Plan Setup */}
            <div className="bg-white p-7 text-slate-900 sm:p-9 lg:col-span-7">
              {completedInvoice ? (
                <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-2xl font-bold text-slate-900">
                    ¡Todo listo! Tu plataforma ya está activa
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    Emitimos tu comprobante{' '}
                    <span className="font-mono font-bold text-slate-900">{completedInvoice.invoice_number}</span>{' '}
                    por{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyExact(completedInvoice.total_cents)}
                    </span>{' '}
                    mediante {completedInvoice.payment_method_label}.
                  </p>

                  <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-600">
                    <div className="flex justify-between py-1.5">
                      <span>Aplicaciones habilitadas</span>
                      <span className="font-mono font-bold text-slate-900">{unlockedResult.join(', ')}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 py-1.5">
                      <span>Ubicación en AWS</span>
                      <span className="font-mono font-semibold text-slate-900">{awsRegion}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 py-1.5">
                      <span>Disponibilidad garantizada</span>
                      <span className="font-semibold text-emerald-700">Respaldo Multi-Zona Activo</span>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const target = (activePlan.appsList[0] || unlockedResult[0] || 'PULSE') as AppCode;
                        onClose();
                        onLaunchPortal(target);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#05070D] px-6 py-3 text-sm font-bold text-[#FCCB06] transition-transform hover:-translate-y-0.5"
                    >
                      Entrar ahora al Portal de Clientes
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cerrar ventana
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* STEP 1 HELPER: Plan & Cycle Selector */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Paso 1: Elige el plan y la frecuencia de pago</h3>
                        <p className="mt-1 text-xs text-slate-600">
                          Selecciona una herramienta individual o la suite completa NODAK One con las 6 aplicaciones incluidas.
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          Programa o Suite a contratar
                        </label>
                        <select
                          value={activePlan.id}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#004D98]"
                        >
                          <optgroup label="Suites Completas (Todas las Apps)">
                            {selectablePlans
                              .filter((p) => p.group === 'Suites')
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {formatCurrencyExact(p.monthlyPriceCents)}/mes
                                </option>
                              ))}
                          </optgroup>
                          {apps.map((app) => (
                            <optgroup key={app.code} label={app.name}>
                              {selectablePlans
                                .filter((p) => p.group === app.name)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — {formatCurrencyExact(p.monthlyPriceCents)}/mes
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          Frecuencia de cobro
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              billingCycle === 'monthly'
                                ? 'border-[#05070D] bg-slate-900 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400'
                            }`}
                          >
                            <p className="text-sm font-bold">Pago Mensual</p>
                            <p className={`mt-1 text-xs ${billingCycle === 'monthly' ? 'text-slate-300' : 'text-slate-500'}`}>
                              Flexibilidad mes a mes
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingCycle('annual')}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              billingCycle === 'annual'
                                ? 'border-[#05070D] bg-slate-900 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400'
                            }`}
                          >
                            <p className="text-sm font-bold">
                              Pago Anual <span className="text-[#FCCB06]">(2 meses gratis)</span>
                            </p>
                            <p className={`mt-1 text-xs ${billingCycle === 'annual' ? 'text-slate-300' : 'text-slate-500'}`}>
                              Pagas 10 meses y disfrutas 12
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#05070D] px-5 py-2.5 text-sm font-bold text-[#FCCB06]"
                        >
                          Siguiente: Región en AWS
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 HELPER: AWS Region Selection */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Paso 2: Elige dónde vivirá tu información en AWS</h3>
                        <p className="mt-1 text-xs text-slate-600">
                          Selecciona la ubicación geográfica más cercana a tu equipo para que el sistema abra instantáneamente y mantenga copias de seguridad continuas.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {regions.map((r) => {
                          const selected = awsRegion === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setAwsRegion(r.id)}
                              className={`rounded-xl border p-4 text-left transition-colors ${
                                selected
                                  ? 'border-[#05070D] bg-slate-900 text-white'
                                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-sm font-bold">
                                  <Globe className={`h-4 w-4 ${selected ? 'text-[#FCCB06]' : 'text-[#004D98]'}`} />
                                  {r.name}
                                </span>
                                <span className="font-mono text-xs tabular-nums opacity-80">{r.latencyMs}ms</span>
                              </div>
                              <p className={`mt-1 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                                Código {r.id} · Respaldo en {r.azCount} zonas independientes
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900"
                        >
                          ← Cambiar plan
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#05070D] px-5 py-2.5 text-sm font-bold text-[#FCCB06]"
                        >
                          Ir al pago seguro
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Payment Step with Live Card Preview + Express Wallets */}
                  {step === 3 && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Paso 3: Completa tu pago</h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Elige billetera express en 1 clic o ingresa tu tarjeta corporativa.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-bold text-[#004D98] hover:underline whitespace-nowrap"
                        >
                          Ajustar plan o región ({awsRegion})
                        </button>
                      </div>

                      {/* Express Wallets */}
                      <div className="mt-4 grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => executePayment('apple_pay')}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-black py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <span className="text-base leading-none"></span> Pay
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => executePayment('google_pay')}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="font-bold text-blue-600">G</span> Pay
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => executePayment('link')}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#00D66F] py-2.5 text-sm font-bold text-[#052E16] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          link <span className="text-xs font-semibold">1-Clic</span>
                        </button>
                      </div>

                      <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-medium text-slate-400">O elige otro método de pago</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      {/* Payment Tabs */}
                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => setPaymentTab('card')}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                            paymentTab === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Tarjeta
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentTab('paypal')}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                            paymentTab === 'paypal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          PayPal
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentTab('ach')}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                            paymentTab === 'ach' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Transferencia
                        </button>
                      </div>

                      <form onSubmit={handleCardFormSubmit} className="mt-4 space-y-4">
                        {paymentTab === 'card' && (
                          <>
                            <div>
                              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                Número de tarjeta, vencimiento y código de seguridad
                              </label>
                              <div className="overflow-hidden rounded-xl border border-slate-300 focus-within:border-[#004D98] focus-within:ring-2 focus-within:ring-[#004D98]/20">
                                <div className="relative border-b border-slate-200">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="cc-number"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                    placeholder="Ingresa los dígitos de tu tarjeta"
                                    className="w-full px-3.5 py-2.5 pr-24 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 outline-none"
                                  />
                                  {rawDigits.length > 0 && (
                                    <span className="absolute right-3 top-2.5 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                                      {cardBrand}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-slate-200">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="cc-exp"
                                    value={expiry}
                                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                    placeholder="MM / AA"
                                    className="w-full px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 outline-none"
                                  />
                                  <input
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="cc-csc"
                                    maxLength={4}
                                    value={cvc}
                                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="Código CVC / CVV"
                                    className="w-full px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="sm:col-span-1">
                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                  Nombre del titular
                                </label>
                                <input
                                  type="text"
                                  autoComplete="cc-name"
                                  value={cardholderName}
                                  onChange={(e) => setCardholderName(e.target.value)}
                                  placeholder="Como figura en tu tarjeta"
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#004D98]"
                                />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-700">País o región</label>
                                <select
                                  value={country}
                                  onChange={(e) => setCountry(e.target.value)}
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#004D98]"
                                >
                                  <option>México</option>
                                  <option>United States</option>
                                  <option>España</option>
                                  <option>Colombia</option>
                                  <option>Chile</option>
                                  <option>Argentina</option>
                                  <option>Perú</option>
                                  <option>Otro país</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-700">Código postal</label>
                                <input
                                  type="text"
                                  autoComplete="postal-code"
                                  value={postalCode}
                                  onChange={(e) => setPostalCode(e.target.value)}
                                  placeholder="Código postal"
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 outline-none focus:border-[#004D98]"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {paymentTab === 'paypal' && (
                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                            <div>
                              <p className="font-bold text-slate-900">Pago con PayPal</p>
                              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                Ingresa el correo asociado a tu cuenta PayPal personal o empresarial para autorizar el cargo.
                              </p>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-700">
                                Correo de tu cuenta PayPal
                              </label>
                              <input
                                type="email"
                                value={paypalEmail}
                                onChange={(e) => setPaypalEmail(e.target.value)}
                                placeholder="pagos@tuempresa.com"
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#004D98]"
                              />
                            </div>
                          </div>
                        )}

                        {paymentTab === 'ach' && (
                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                            <div>
                              <p className="font-bold text-slate-900">Transferencia bancaria directa (ACH / SPEI)</p>
                              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                Ingresa manualmente los datos de la cuenta bancaria con la que deseas pagar.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700">
                                  Banco emisor
                                </label>
                                <input
                                  type="text"
                                  value={bankName}
                                  onChange={(e) => setBankName(e.target.value)}
                                  placeholder="Nombre de tu banco"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#004D98]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700">
                                  Cuenta o CLABE interbancaria
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={bankAccountNumber}
                                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                                  placeholder="Número de cuenta o CLABE"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 placeholder:font-sans outline-none focus:border-[#004D98]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {checkoutError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                            {checkoutError}
                          </div>
                        )}

                        {!user && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
                            Antes de cobrar, inicia sesión con Google, Microsoft Outlook o tu correo para vincular la licencia a tu empresa.
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#05070D] py-3.5 text-sm font-bold text-[#FCCB06] shadow-sm transition-colors hover:bg-[#0D1326] disabled:opacity-50"
                        >
                          <Lock className="h-4 w-4" />
                          {submitting
                            ? 'Confirmando pago y activando tus aplicaciones...'
                            : user
                              ? `Confirmar y pagar ${formatCurrencyExact(totalCents)}`
                              : `Acceder para pagar ${formatCurrencyExact(totalCents)}`}
                        </button>

                        <p className="text-center text-[11px] text-slate-500">
                          Protegido con cifrado bancario · Cancela o cambia tu plan en cualquier momento desde Facturación.
                        </p>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
