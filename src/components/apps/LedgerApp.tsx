import { CheckCircle2, Clock, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrencyExact } from '../../lib/api.ts';
import type { LedgerEntry } from '../../types.ts';

interface LedgerAppProps {
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export function LedgerApp({ onRequireAuth, isAuthenticated }: LedgerAppProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [reference, setReference] = useState('');
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('Suscripciones SaaS');
  const [amountUsd, setAmountUsd] = useState('4500');
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('credit');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ entries: LedgerEntry[] }>('/api/v1/apps/ledger')
      .then((res) => setEntries(res.entries))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando libro mayor.'));
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{ entry: LedgerEntry }>('/api/v1/apps/ledger/entries', {
        method: 'POST',
        body: JSON.stringify({ reference, account, category, amountUsd: Number(amountUsd), entryType }),
      });
      setEntries((prev) => [res.entry, ...prev]);
      setReference('');
      setAccount('');
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el asiento.');
    }
  };

  const toggleReconcile = async (entry: LedgerEntry) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      const res = await apiRequest<{ entry: LedgerEntry }>(`/api/v1/apps/ledger/entries/${entry.id}`, {
        method: 'PATCH',
      });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? res.entry : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error conciliando asiento.');
    }
  };

  const credits = entries.filter((e) => e.entry_type === 'credit').reduce((s, e) => s + e.amount_cents, 0);
  const debits = entries.filter((e) => e.entry_type === 'debit').reduce((s, e) => s + e.amount_cents, 0);
  const netCents = credits - debits;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Amazon Aurora PostgreSQL · AWS KMS Cifrado Dedicado · S3 Object Lock
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            NODAK Ledger — Finanzas y Contabilidad
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar Asiento
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-6 dark:border-white/10 dark:bg-[#0D111A]"
        >
          <input
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ref. (FAC-9050)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="text"
            required
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Contraparte / Cuenta"
            className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as 'credit' | 'debit')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="credit">Ingreso (+)</option>
            <option value="debit">Egreso (-)</option>
          </select>
          <input
            type="number"
            required
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            placeholder="Monto USD"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            Contabilizar
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ingresos Registrados</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrencyExact(credits)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Egresos Cloud & Operativos</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatCurrencyExact(debits)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Flujo Neto</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {formatCurrencyExact(netCents)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D111A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Referencia</th>
                <th className="px-5 py-3">Cuenta / Contraparte</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-right">Conciliación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{entry.entry_date}</td>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {entry.reference}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{entry.account}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{entry.category}</td>
                  <td
                    className={`px-5 py-3 text-right font-mono font-semibold tabular-nums ${
                      entry.entry_type === 'credit'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {entry.entry_type === 'credit' ? '+' : '-'}
                    {formatCurrencyExact(entry.amount_cents)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleReconcile(entry)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        entry.reconciled
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {entry.reconciled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {entry.reconciled ? 'Conciliado' : 'Pendiente'}
                    </button>
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
