import { Pause, Play, Plus, Zap } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../lib/api.ts';
import type { AutomateWorkflow } from '../../types.ts';

interface AutomateAppProps {
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export function AutomateApp({ onRequireAuth, isAuthenticated }: AutomateAppProps) {
  const [workflows, setWorkflows] = useState<AutomateWorkflow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [triggerSource, setTriggerSource] = useState('FLOW: Deal Cerrado');
  const [actionTarget, setActionTarget] = useState('Microsoft Teams + LEDGER');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ workflows: AutomateWorkflow[] }>('/api/v1/apps/automate')
      .then((res) => setWorkflows(res.workflows))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando flujos.'));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{ workflow: AutomateWorkflow }>('/api/v1/apps/automate/workflows', {
        method: 'POST',
        body: JSON.stringify({ name, triggerSource, actionTarget }),
      });
      setWorkflows((prev) => [...prev, res.workflow]);
      setName('');
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el flujo.');
    }
  };

  const toggleWorkflow = async (wf: AutomateWorkflow) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      const res = await apiRequest<{ workflow: AutomateWorkflow }>(`/api/v1/apps/automate/workflows/${wf.id}/toggle`, {
        method: 'PATCH',
      });
      setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? res.workflow : w)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  };

  const runWorkflow = async (wf: AutomateWorkflow) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setRunningId(wf.id);
    setNotice(null);
    try {
      const res = await apiRequest<{ workflow: AutomateWorkflow; executedAt: string }>(
        `/api/v1/apps/automate/workflows/${wf.id}/run`,
        { method: 'POST' }
      );
      setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? res.workflow : w)));
      setNotice(`Lambda ejecutado correctamente para "${wf.name}" y registrado en AWS CloudTrail.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la ejecución del flujo.');
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            AWS EventBridge · AWS Lambda · Step Functions · SQS FIFO
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            NODAK Automate — Orquestación Cloud
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Flujo Lambda
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4 dark:border-white/10 dark:bg-[#0D111A]"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de automatización"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="text"
            required
            value={triggerSource}
            onChange={(e) => setTriggerSource(e.target.value)}
            placeholder="Disparador EventBridge"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="text"
            required
            value={actionTarget}
            onChange={(e) => setActionTarget(e.target.value)}
            placeholder="Destino / API"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            Desplegar en AWS
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {wf.trigger_source} → {wf.action_target}
                  </p>
                  <h3 className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-white">
                    {wf.name}
                  </h3>
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    wf.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {wf.enabled ? 'Activo' : 'Pausado'}
                </span>
              </div>
              <p className="mt-2 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {wf.aws_lambda_arn}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono tabular-nums">{wf.runs_count} ejecuciones</span>
                <span className="font-mono tabular-nums">{wf.success_rate.toFixed(1)}% éxito</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleWorkflow(wf)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  {wf.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {wf.enabled ? 'Pausar' : 'Activar'}
                </button>
                <button
                  type="button"
                  disabled={runningId === wf.id}
                  onClick={() => runWorkflow(wf)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <Zap className="h-3 w-3" />
                  {runningId === wf.id ? 'Ejecutando...' : 'Ejecutar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
