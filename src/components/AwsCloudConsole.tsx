import { Activity, CheckCircle2, Globe, RefreshCw, Shield, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.ts';
import type { AwsAuditLog, AwsIamPolicy, AwsRegionInfo } from '../types.ts';

interface AwsCloudConsoleProps {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

interface TopologyPayload {
  accountId: string;
  enforcementMode: string;
  activeRegion: AwsRegionInfo;
  regions: AwsRegionInfo[];
  servicesByApp: {
    code: string;
    name: string;
    awsStack: string[];
    summary: string;
    sla: string;
  }[];
  policies: AwsIamPolicy[];
  logs: AwsAuditLog[];
}

interface FailoverStatus {
  ok: boolean;
  architecture: string;
  primaryRegion: string;
  standbyRegion: string;
  zones: { zone: string; status: string; latencyMs: number }[];
  uptimeSla: string;
  checkedAt: string;
}

export function AwsCloudConsole({ isAuthenticated, onRequireAuth }: AwsCloudConsoleProps) {
  const [topology, setTopology] = useState<TopologyPayload | null>(null);
  const [failover, setFailover] = useState<FailoverStatus | null>(null);
  const [checkingFailover, setCheckingFailover] = useState(false);

  const [simApp, setSimApp] = useState('LEDGER');
  const [simAction, setSimAction] = useState('kms:Decrypt');
  const [simMfa, setSimMfa] = useState(false);
  const [simResult, setSimResult] = useState<{ decision: 'ALLOW' | 'DENY'; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTopology = async () => {
    try {
      const [data, health] = await Promise.all([
        apiRequest<TopologyPayload>('/api/v1/aws/topology'),
        apiRequest<FailoverStatus>('/api/v1/aws/failover-check', { method: 'POST' }),
      ]);
      setTopology(data);
      setFailover(health);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el estado de la nube AWS.');
    }
  };

  useEffect(() => {
    loadTopology();
  }, []);

  const runFailoverCheck = async () => {
    setCheckingFailover(true);
    try {
      const health = await apiRequest<FailoverStatus>('/api/v1/aws/failover-check', { method: 'POST' });
      setFailover(health);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comprobar la continuidad Multi-AZ.');
    } finally {
      setCheckingFailover(false);
    }
  };

  const switchRegion = async (regionId: string) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      await apiRequest('/api/v1/aws/region', {
        method: 'PATCH',
        body: JSON.stringify({ region: regionId }),
      });
      loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la región AWS.');
    }
  };

  const togglePolicyField = async (policy: AwsIamPolicy, field: 'mfaRequired' | 'autoDenyEnabled') => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      const payload =
        field === 'mfaRequired'
          ? { mfaRequired: !policy.mfa_required }
          : { autoDenyEnabled: !policy.auto_deny_enabled };
      await apiRequest(`/api/v1/aws/iam/${policy.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el permiso de seguridad.');
    }
  };

  const runSimulation = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      const res = await apiRequest<{ decision: 'ALLOW' | 'DENY'; reason: string }>('/api/v1/aws/iam/simulate', {
        method: 'POST',
        body: JSON.stringify({ appCode: simApp, action: simAction, hasMfa: simMfa }),
      });
      setSimResult(res);
      loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo probar la regla de acceso.');
    }
  };

  if (!topology) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white/[0.05]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#FCCB06]">
            Amazon Web Services · Respaldo continuo en múltiples zonas
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Estado de la Nube AWS y Protección de Accesos
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Supervisa la disponibilidad de tus programas y controla quién puede realizar operaciones sensibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={runFailoverCheck}
            disabled={checkingFailover}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0A0E1A] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:border-[#FCCB06] hover:text-[#FCCB06]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingFailover ? 'animate-spin' : ''}`} />
            {checkingFailover ? 'Verificando zonas...' : 'Comprobar continuidad'}
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#05070D] px-3 py-1.5">
            <Globe className="h-4 w-4 text-[#FCCB06]" />
            <select
              value={topology.activeRegion.id}
              onChange={(e) => switchRegion(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white outline-none"
            >
              {topology.regions.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#05070D] text-white">
                  {r.name} ({r.latencyMs}ms)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#A50044]/50 bg-[#A50044]/15 px-4 py-2.5 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Multi-AZ Continuity Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#05070D] p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Centro de datos principal</p>
          <p className="mt-2 text-xl font-bold text-white">{topology.activeRegion.name}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Código {topology.activeRegion.id} · Respaldo en {topology.activeRegion.azCount} zonas independientes
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#05070D] p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Disponibilidad sin caídas</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-bold tabular-nums text-white">
            <Activity className="h-5 w-5 text-emerald-400" />
            {failover?.uptimeSla || '99.99%'} En Línea
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            Respaldo automático activo hacia {failover?.standbyRegion || 'us-west-2'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#05070D] p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Zonas de respaldo verificadas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(failover?.zones || []).map((z) => (
              <span key={z.zone} className="font-mono text-xs font-semibold text-white">
                {z.zone}: <span className="text-emerald-400">{z.latencyMs}ms</span>
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[#94A3B8]">
            {topology.policies.length} / 6 programas protegidos con bloqueo preventivo
          </p>
        </div>
      </div>

      {/* Security Policies Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#05070D]">
        <div className="border-b border-white/[0.08] px-5 py-3.5">
          <h2 className="text-sm font-bold text-white">Controles de seguridad por aplicación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-black text-xs font-semibold text-[#94A3B8]">
              <tr>
                <th className="px-5 py-3">Programa</th>
                <th className="px-5 py-3">Perfil asignado</th>
                <th className="px-5 py-3">Servicios AWS</th>
                <th className="px-5 py-3">Ubicación</th>
                <th className="px-5 py-3 text-right">Doble verificación (MFA)</th>
                <th className="px-5 py-3 text-right">Bloqueo preventivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {topology.policies.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-bold text-white">{p.app_code}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#CBD5E1]">{p.role_name}</td>
                  <td className="px-5 py-3 text-xs text-[#CBD5E1]">{p.aws_service}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#94A3B8]">{p.region}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => togglePolicyField(p, 'mfaRequired')}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        p.mfa_required
                          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/[0.12] text-[#94A3B8]'
                      }`}
                    >
                      {p.mfa_required ? 'Obligatoria' : 'Opcional'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => togglePolicyField(p, 'autoDenyEnabled')}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        p.auto_deny_enabled
                          ? 'border-[#FCCB06]/40 bg-[#FCCB06]/10 text-[#FCCB06]'
                          : 'border-white/[0.12] text-[#94A3B8]'
                      }`}
                    >
                      {p.auto_deny_enabled ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Tester & Audit Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-white/[0.08] bg-[#05070D] p-5 lg:col-span-5">
          <h2 className="text-sm font-bold text-white">Prueba rápida de permisos</h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Comprueba si una acción delicada está protegida antes de que alguien intente ejecutarla.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#CBD5E1]">Aplicación</label>
              <select
                value={simApp}
                onChange={(e) => setSimApp(e.target.value)}
                className="w-full rounded-xl border border-white/[0.12] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#FCCB06]"
              >
                {topology.servicesByApp.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#CBD5E1]">Operación a probar</label>
              <select
                value={simAction}
                onChange={(e) => setSimAction(e.target.value)}
                className="w-full rounded-xl border border-white/[0.12] bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#FCCB06]"
              >
                <option value="kms:Decrypt">Desbloquear llave financiera (Ledger)</option>
                <option value="s3:DeleteObject">Eliminar respaldos de inventario (Stock)</option>
                <option value="redshift:ExecuteStatement">Consultar métricas ejecutivas (Pulse)</option>
                <option value="lambda:InvokeFunction">Ejecutar automatización (Automate)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-[#CBD5E1]">
              <input
                type="checkbox"
                checked={simMfa}
                onChange={(e) => setSimMfa(e.target.checked)}
                className="rounded border-white/20"
              />
              Incluir código de verificación en dos pasos (MFA)
            </label>

            <button
              type="button"
              onClick={runSimulation}
              className="w-full rounded-xl bg-[#FCCB06] py-2.5 text-xs font-bold text-black transition-colors hover:bg-[#FDE047]"
            >
              Comprobar protección ahora
            </button>

            {simResult && (
              <div
                className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  simResult.decision === 'ALLOW'
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                    : 'border-[#A50044]/50 bg-[#A50044]/15 text-rose-200'
                }`}
              >
                {simResult.decision === 'ALLOW' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {simResult.decision === 'ALLOW' ? 'Acceso permitido' : 'Acceso bloqueado por seguridad'}
                  </p>
                  <p className="mt-0.5">{simResult.reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#05070D] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
            <h2 className="text-sm font-bold text-white">Actividad reciente y auditoría</h2>
            <Shield className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <div className="divide-y divide-white/[0.06]">
            {topology.logs.slice(0, 7).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{log.event_type}</p>
                  <p className="truncate font-mono text-[11px] text-[#94A3B8]">
                    {log.resource} · {log.actor}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-xs font-bold ${
                    log.decision === 'ALLOW' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {log.decision === 'ALLOW' ? 'Permitido' : 'Bloqueado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
