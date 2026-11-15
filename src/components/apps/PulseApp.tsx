import { BarChart3, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrency } from '../../lib/api.ts';
import type { PulseMetric } from '../../types.ts';

interface PulseAppProps {
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export function PulseApp({ onRequireAuth, isAuthenticated }: PulseAppProps) {
  const [metrics, setMetrics] = useState<PulseMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('Dic 2026');
  const [mrrUsd, setMrrUsd] = useState('354000');
  const [activeTenants, setActiveTenants] = useState('512');
  const [nrrPct, setNrrPct] = useState('129');
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ metrics: PulseMetric[] }>('/api/v1/apps/pulse');
      setMetrics(res.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando métricas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleAddSnapshot = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{ metric: PulseMetric }>('/api/v1/apps/pulse/snapshot', {
        method: 'POST',
        body: JSON.stringify({
          periodLabel,
          mrrUsd: Number(mrrUsd),
          activeTenants: Number(activeTenants),
          nrrPct: Number(nrrPct),
        }),
      });
      setMetrics((prev) => [...prev, res.metric]);
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el corte.');
    }
  };

  const latest = metrics[metrics.length - 1];
  const maxMrr = Math.max(...metrics.map((m) => m.mrr_cents), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Amazon Redshift Serverless · ECS Fargate Multi-AZ
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            NODAK Pulse — Inteligencia de Negocios
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadMetrics}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[#0D111A] dark:text-slate-200 dark:hover:bg-white/5 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar Redshift
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar Corte
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAddSnapshot}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-5 dark:border-white/10 dark:bg-[#0D111A]"
        >
          <input
            type="text"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="Periodo"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="number"
            value={mrrUsd}
            onChange={(e) => setMrrUsd(e.target.value)}
            placeholder="MRR USD"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="number"
            value={activeTenants}
            onChange={(e) => setActiveTenants(e.target.value)}
            placeholder="Tenants activos"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="number"
            value={nrrPct}
            onChange={(e) => setNrrPct(e.target.value)}
            placeholder="NRR %"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Guardar en RDS
          </button>
        </form>
      )}

      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ingreso Recurrente (MRR)</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {latest ? formatCurrency(latest.mrr_cents) : '—'}
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Activo · {latest?.period_label || 'Actual'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Proyección Anual (ARR)</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {latest ? formatCurrency(latest.arr_cents) : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consolidado USD</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Retención Neta (NRR)</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {latest ? `${latest.nrr_pct}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {latest ? `${latest.active_tenants} organizaciones activas` : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Latencia Consulta Redshift</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {latest ? `${latest.aws_query_ms} ms` : '—'}
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">us-east-1 · 0 errores</p>
        </div>
      </div>

      {/* Revenue Trajectory Visual */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Evolución Mensual de MRR en AWS Redshift
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {metrics.length} periodos registrados
          </span>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
        ) : (
          <div className="flex h-52 items-end gap-3 pt-4">
            {metrics.map((m) => {
              const heightPct = Math.max(12, Math.round((m.mrr_cents / maxMrr) * 100));
              return (
                <div key={m.id} className="group flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono text-[11px] font-medium tabular-nums text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                    {formatCurrency(m.mrr_cents)}
                  </span>
                  <div className="flex h-36 w-full items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-lg bg-blue-600/85 transition-all duration-200 group-hover:bg-blue-500"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{m.period_label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cohort Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D111A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Periodo</th>
                <th className="px-5 py-3 text-right">MRR</th>
                <th className="px-5 py-3 text-right">ARR</th>
                <th className="px-5 py-3 text-right">Organizaciones</th>
                <th className="px-5 py-3 text-right">NRR</th>
                <th className="px-5 py-3 text-right">Latencia AWS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {metrics.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-2.5 font-medium text-slate-900 dark:text-white">{m.period_label}</td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {formatCurrency(m.mrr_cents)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {formatCurrency(m.arr_cents)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {m.active_tenants}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {m.nrr_pct}%
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {m.aws_query_ms} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
