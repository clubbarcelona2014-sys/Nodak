import { AlertTriangle, CheckCircle2, Minus, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrency } from '../../lib/api.ts';
import type { StockItem } from '../../types.ts';

interface StockAppProps {
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export function StockApp({ onRequireAuth, isAuthenticated }: StockAppProps) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState('Todos');
  const [showAdd, setShowAdd] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [warehouse, setWarehouse] = useState('US-East');
  const [quantity, setQuantity] = useState('40');
  const [unitCostUsd, setUnitCostUsd] = useState('250');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ items: StockItem[] }>('/api/v1/apps/stock')
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando inventario.'));
  }, []);

  const adjustQty = async (item: StockItem, delta: number) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      const res = await apiRequest<{ item: StockItem }>(`/api/v1/apps/stock/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.item : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando stock.');
    }
  };

  const handleAddSku = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{ item: StockItem }>('/api/v1/apps/stock/items', {
        method: 'POST',
        body: JSON.stringify({
          sku,
          name,
          warehouse,
          quantity: Number(quantity),
          reorderPoint: 15,
          unitCostUsd: Number(unitCostUsd),
        }),
      });
      setItems((prev) => [...prev, res.item]);
      setSku('');
      setName('');
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el SKU.');
    }
  };

  const warehouses = ['Todos', 'US-East', 'EU-West', 'LATAM-Hub'];
  const filtered = items.filter((i) => warehouseFilter === 'Todos' || i.warehouse === warehouseFilter);
  const lowStockCount = items.filter((i) => i.quantity <= i.reorder_point).length;
  const totalValuation = items.reduce((sum, i) => sum + i.quantity * i.unit_cost_cents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Amazon DynamoDB Global Tables · AWS Lambda · S3 Glacier
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            NODAK Stock — Inventario y Cadena Logística
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo SKU
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAddSku}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-6 dark:border-white/10 dark:bg-[#0D111A]"
        >
          <input
            type="text"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU (ej. NDK-900)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Descripción"
            className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option>US-East</option>
            <option>EU-West</option>
            <option>LATAM-Hub</option>
          </select>
          <input
            type="number"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Cant."
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            Alta en DynamoDB
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Valoración de Inventario</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(totalValuation)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SKUs Activos</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {items.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Alertas Bajo Reorden</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {lowStockCount}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 self-start rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit dark:border-white/10 dark:bg-white/5">
        {warehouses.map((wh) => (
          <button
            key={wh}
            type="button"
            onClick={() => setWarehouseFilter(wh)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              warehouseFilter === wh
                ? 'bg-white text-slate-900 shadow-sm dark:bg-blue-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {wh}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D111A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Artículo</th>
                <th className="px-5 py-3">Almacén</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Existencia</th>
                <th className="px-5 py-3 text-right">Costo Unit.</th>
                <th className="px-5 py-3 text-right">Ajuste Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filtered.map((item) => {
                const isLow = item.quantity <= item.reorder_point;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.sku}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{item.warehouse}</td>
                    <td className="px-5 py-3">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Reorden requerido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Óptimo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(item.unit_cost_cents)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustQty(item, -5)}
                          aria-label="Descontar 5 unidades"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustQty(item, 10)}
                          aria-label="Reabastecer 10 unidades"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-white/10 dark:text-blue-400 dark:hover:bg-blue-500/10"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
