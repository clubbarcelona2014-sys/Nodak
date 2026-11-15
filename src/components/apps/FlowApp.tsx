import { ArrowRight, Plus, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrency } from '../../lib/api.ts';
import type { FlowDeal } from '../../types.ts';

interface FlowAppProps {
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

const STAGES: FlowDeal['stage'][] = ['Prospección', 'Propuesta', 'Negociación', 'Cerrado'];

export function FlowApp({ onRequireAuth, isAuthenticated }: FlowAppProps) {
  const [deals, setDeals] = useState<FlowDeal[]>([]);
  const [filterStage, setFilterStage] = useState<string>('Todos');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [valueUsd, setValueUsd] = useState('25000');
  const [stage, setStage] = useState<FlowDeal['stage']>('Prospección');
  const [error, setError] = useState<string | null>(null);

  const loadDeals = async () => {
    try {
      const res = await apiRequest<{ deals: FlowDeal[] }>('/api/v1/apps/flow');
      setDeals(res.deals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pipeline.');
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{ deal: FlowDeal }>('/api/v1/apps/flow/deals', {
        method: 'POST',
        body: JSON.stringify({ title, company, valueUsd: Number(valueUsd), stage }),
      });
      setDeals((prev) => [res.deal, ...prev]);
      setTitle('');
      setCompany('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando oportunidad.');
    }
  };

  const advanceStage = async (deal: FlowDeal) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    const idx = STAGES.indexOf(deal.stage);
    const nextStage = STAGES[Math.min(STAGES.length - 1, idx + 1)];
    if (nextStage === deal.stage) return;
    try {
      const res = await apiRequest<{ deal: FlowDeal }>(`/api/v1/apps/flow/deals/${deal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: nextStage }),
      });
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? res.deal : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la etapa.');
    }
  };

  const filtered = deals.filter((d) => {
    const matchStage = filterStage === 'Todos' || d.stage === filterStage;
    const matchQuery =
      !query.trim() ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.company.toLowerCase().includes(query.toLowerCase());
    return matchStage && matchQuery;
  });

  const totalPipelineCents = deals.reduce((sum, d) => sum + d.value_cents, 0);
  const weightedCents = deals.reduce((sum, d) => sum + Math.round((d.value_cents * d.probability) / 100), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Amazon Aurora PostgreSQL · ElastiCache Redis · Sincronización Google & Microsoft
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            NODAK Flow — CRM y Pipeline Comercial
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Oportunidad
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-5 dark:border-white/10 dark:bg-[#0D111A]"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del deal"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="text"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Empresa cliente"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="number"
            required
            value={valueUsd}
            onChange={(e) => setValueUsd(e.target.value)}
            placeholder="Valor USD"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as FlowDeal['stage'])}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            Guardar Deal
          </button>
        </form>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pipeline Total Bruto</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(totalPipelineCents)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pronóstico Ponderado</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {formatCurrency(weightedCents)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Oportunidades Activas</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {deals.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/5">
          {['Todos', ...STAGES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStage(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filterStage === s
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-blue-600 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa o deal..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#0D111A] dark:text-white"
          />
        </div>
      </div>

      {/* Deals Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D111A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Oportunidad</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Etapa</th>
                <th className="px-5 py-3 text-right">Probabilidad</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filtered.map((deal) => (
                <tr key={deal.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{deal.title}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{deal.company}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-semibold ${
                        deal.stage === 'Cerrado'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : deal.stage === 'Negociación'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {deal.stage}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {deal.probability}%
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(deal.value_cents)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {deal.stage !== 'Cerrado' ? (
                      <button
                        type="button"
                        onClick={() => advanceStage(deal)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 whitespace-nowrap"
                      >
                        Avanzar
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Ganado</span>
                    )}
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
