import { CreditCard, Receipt } from 'lucide-react';
import { formatCurrencyExact } from '../lib/api.ts';
import type { InvoiceRecord, SubscriptionSummary } from '../types.ts';

interface BillingViewProps {
  subscription: SubscriptionSummary | null;
  invoices: InvoiceRecord[];
  onOpenCheckout: () => void;
}

export function BillingView({ subscription, invoices, onOpenCheckout }: BillingViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#FCCB06]">
            Facturación Unificada · Pagos Seguros en USD
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
            Facturación y Suscripciones
          </h1>
        </div>
        <button
          type="button"
          onClick={onOpenCheckout}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#FCCB06] px-4 py-2 font-display text-xs font-bold text-[#050B2B] transition-colors hover:bg-[#FDE047] whitespace-nowrap"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Cambiar Plan / Checkout
        </button>
      </div>

      {/* Active Subscription Card */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/[0.1] bg-[#070B16] p-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-[#94A3B8]">Plan Activo</p>
          <p className="mt-1.5 text-lg font-bold text-white">
            {subscription?.planName || 'Sin suscripción activa'}
          </p>
          <p className={`mt-1 text-xs ${subscription ? 'text-emerald-400' : 'text-[#FCCB06]'}`}>
            {subscription
              ? `Activo · Ciclo ${subscription.billingCycle === 'annual' ? 'Anual (tarifa de 10 meses)' : 'Mensual'}`
              : 'Activa un plan en Checkout para desbloquear tus aplicaciones'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#94A3B8]">Aplicaciones Desbloqueadas</p>
          <p className="mt-1.5 font-mono text-sm font-semibold text-white">
            {subscription && subscription.apps.length > 0 ? subscription.apps.join(' · ') : 'Ninguna activa aún'}
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Región AWS: {subscription?.awsRegion || 'us-east-1 (Pendiente)'}
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-xs font-medium text-[#94A3B8]">Método de Pago</p>
          <p className="mt-1.5 font-mono text-sm font-semibold text-white">
            {subscription
              ? subscription.cardLast4
                ? `Tarjeta •••• ${subscription.cardLast4}`
                : subscription.paymentMethod
              : 'Sin configurar'}
          </p>
          <button
            type="button"
            onClick={onOpenCheckout}
            className="mt-1.5 text-xs font-semibold text-[#FCCB06] hover:underline"
          >
            {subscription ? 'Cambiar plan o método de pago →' : 'Abrir Checkout y Suscribirse →'}
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#070B16]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
          <h2 className="text-sm font-bold text-white">Historial de Facturas</h2>
          <Receipt className="h-4 w-4 text-[#94A3B8]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-black/50 text-xs font-semibold text-[#94A3B8]">
              <tr>
                <th className="px-5 py-3">Factura</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3">Promo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#94A3B8]">
                    No tienes facturas emitidas aún. Confirma un plan en Checkout para generar tu primer comprobante.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[#94A3B8]">
                      {inv.created_at.slice(0, 10)}
                    </td>
                    <td className="px-5 py-3 text-[#CBD5E1]">{inv.payment_method_label}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#94A3B8]">
                      {inv.promo_code || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-emerald-400">Pagada</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-white">
                      {formatCurrencyExact(inv.total_cents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
