import { ArrowRight, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../lib/api.ts';
import type { BuildTask } from '../../types.ts';

interface BuildAppProps {
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

const COLUMNS: BuildTask['status'][] = ['Backlog', 'En Progreso', 'Revisión', 'Desplegado'];

export function BuildApp({ onRequireAuth, isAuthenticated }: BuildAppProps) {
  const [tasks, setTasks] = useState<BuildTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [sprint, setSprint] = useState('Sprint 25');
  const [priority, setPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [storyPoints, setStoryPoints] = useState('5');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ tasks: BuildTask[] }>('/api/v1/apps/build')
      .then((res) => setTasks(res.tasks))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando tablero.'));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{ task: BuildTask }>('/api/v1/apps/build/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, sprint, priority, storyPoints: Number(storyPoints) }),
      });
      setTasks((prev) => [...prev, res.task]);
      setTitle('');
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.');
    }
  };

  const advanceStatus = async (task: BuildTask) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    const idx = COLUMNS.indexOf(task.status);
    const nextStatus = COLUMNS[(idx + 1) % COLUMNS.length];
    try {
      const res = await apiRequest<{ task: BuildTask }>(`/api/v1/apps/build/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error moviendo tarea.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            AWS ECS Fargate · CodePipeline CI/CD · CloudWatch Traces
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            NODAK Build — Ingeniería y Sprints
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Tarea
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-5 dark:border-white/10 dark:bg-[#0D111A]"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Descripción técnica de la tarea"
            className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <input
            type="text"
            value={sprint}
            onChange={(e) => setSprint(e.target.value)}
            placeholder="Sprint"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'Alta' | 'Media' | 'Baja')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option>Alta</option>
            <option>Media</option>
            <option>Baja</option>
          </select>
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            Agregar al Sprint
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          const points = colTasks.reduce((s, t) => s + t.story_points, 0);
          return (
            <div
              key={col}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-[#0D111A]"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-white/10">
                <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">{col}</span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {colTasks.length} · {points} pts
                </span>
              </div>

              <div className="space-y-2.5">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#131926]"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold">{task.code}</span>
                      <span>
                        {task.priority} · {task.story_points} pts
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{task.assignee}</span>
                      <button
                        type="button"
                        onClick={() => advanceStatus(task)}
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Mover
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">Sin tareas en esta etapa</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
