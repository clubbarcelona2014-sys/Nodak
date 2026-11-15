import {
  Activity,
  BarChart3,
  Boxes,
  CheckCircle2,
  GitBranch,
  Landmark,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import type { AppCode } from '../types.ts';

interface InteractivePlatformPreviewProps {
  initialApp?: AppCode;
  onSelectAppDetail?: (code: AppCode) => void;
}

const TABS: { code: AppCode; label: string; category: string; icon: typeof BarChart3 }[] = [
  { code: 'PULSE', label: 'Pulse', category: 'Analítica BI', icon: BarChart3 },
  { code: 'FLOW', label: 'Flow', category: 'CRM Ventas', icon: TrendingUp },
  { code: 'STOCK', label: 'Stock', category: 'Inventarios', icon: Boxes },
  { code: 'LEDGER', label: 'Ledger', category: 'Finanzas', icon: Landmark },
  { code: 'BUILD', label: 'Build', category: 'Proyectos', icon: GitBranch },
  { code: 'AUTOMATE', label: 'Automate', category: 'Flujos AWS', icon: Workflow },
];

export function InteractivePlatformPreview({
  initialApp = 'PULSE',
  onSelectAppDetail,
}: InteractivePlatformPreviewProps) {
  const [active, setActive] = useState<AppCode>(initialApp);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.14] bg-[#060913] shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
      {/* Realistic Software Window Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-black/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#A50044]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FCCB06]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#004D98]" />
          <span className="ml-2 font-mono text-[11px] font-semibold text-[#94A3B8]">
            portal.nodak.cloud / {active.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
          <Activity className="h-3.5 w-3.5" />
          <span>AWS Multi-AZ En Línea</span>
        </div>
      </div>

      {/* Interactive App Module Switcher */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.08] bg-[#080D1B] px-3 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isCurrent = active === tab.code;
          return (
            <button
              key={tab.code}
              type="button"
              onClick={() => setActive(tab.code)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                isCurrent
                  ? 'bg-[#FCCB06] text-black'
                  : 'text-[#CBD5E1] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Real Interactive Software Canvas */}
      <div className="p-5 sm:p-6">
        {active === 'PULSE' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">NODAK PULSE · Amazon Redshift BI</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Ingresos recurrentes y retención</h3>
              </div>
              <span className="font-mono text-xs text-emerald-400">Consulta SQL: 38 ms</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                <p className="text-[11px] text-[#94A3B8]">Ingreso Mensual</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-white">$184,200</p>
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-400">+18.4% trim.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                <p className="text-[11px] text-[#94A3B8]">Retención Neta</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-white">124%</p>
                <p className="mt-0.5 text-[11px] text-[#CBD5E1]">Cuentas activas: 412</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                <p className="text-[11px] text-[#94A3B8]">Margen Bruto</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#FCCB06]">86.2%</p>
                <p className="mt-0.5 text-[11px] text-[#CBD5E1]">Auditado en línea</p>
              </div>
            </div>

            {/* Real SVG Growth Curve */}
            <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Evolución de facturación últimos 6 meses</span>
                <span className="font-mono text-white">USD Consolidado</span>
              </div>
              <svg viewBox="0 0 420 90" className="h-24 w-full" aria-label="Curva de crecimiento mensual">
                <defs>
                  <linearGradient id="nodakArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FCCB06" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#FCCB06" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,74 L70,64 L140,56 L210,45 L280,32 L350,21 L420,10 L420,90 L0,90 Z"
                  fill="url(#nodakArea)"
                />
                <polyline
                  fill="none"
                  stroke="#FCCB06"
                  strokeWidth="2.5"
                  points="0,74 70,64 140,56 210,45 280,32 350,21 420,10"
                />
                {[
                  [0, 74],
                  [70, 64],
                  [140, 56],
                  [210, 45],
                  [280, 32],
                  [350, 21],
                  [420, 10],
                ].map(([cx, cy], idx) => (
                  <circle key={idx} cx={cx} cy={cy} r="3.5" fill="#FCCB06" />
                ))}
              </svg>
            </div>
          </div>
        )}

        {active === 'FLOW' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">NODAK FLOW · CRM & Correo</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Oportunidades comerciales activas</h3>
              </div>
              <span className="text-[11px] font-semibold text-[#CBD5E1]">Sincronizado con Gmail y Outlook</span>
            </div>

            <div className="divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 text-xs">
              {[
                { company: 'Grupo Industrial Norte', stage: 'Negociación', prob: '85%', amount: '$48,500' },
                { company: 'Logística Pacífico S.A.', stage: 'Propuesta enviada', prob: '65%', amount: '$31,200' },
                { company: 'Retail Andino Corp.', stage: 'Cierre firmado', prob: '100%', amount: '$74,000' },
                { company: 'Financiera Metropolitana', stage: 'Evaluación', prob: '45%', amount: '$22,800' },
              ].map((deal) => (
                <div key={deal.company} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-bold text-white">{deal.company}</p>
                    <p className="text-[11px] text-[#94A3B8]">
                      Etapa: {deal.stage} · Probabilidad {deal.prob}
                    </p>
                  </div>
                  <span className="font-mono font-bold tabular-nums text-[#FCCB06]">{deal.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'STOCK' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">NODAK STOCK · DynamoDB Global</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Existencias por centro de distribución</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">3 bodegas conectadas</span>
            </div>

            <div className="divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 text-xs">
              {[
                { sku: 'NDK-401', item: 'Terminal POS Empresarial', wh: 'CDMX Norte', qty: '318 uds', pct: 84 },
                { sku: 'NDK-209', item: 'Sensor IoT Cadena Fría', wh: 'Monterrey', qty: '142 uds', pct: 58 },
                { sku: 'NDK-882', item: 'Kit Etiquetado RFID', wh: 'Bogotá Centro', qty: '24 uds', pct: 18 },
              ].map((row) => (
                <div key={row.sku} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      <span className="font-mono text-[#94A3B8]">{row.sku}</span> · {row.item}
                    </span>
                    <span className={`font-mono font-bold tabular-nums ${row.pct < 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {row.qty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${row.pct < 25 ? 'bg-[#A50044]' : 'bg-[#FCCB06]'}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-[11px] text-[#94A3B8]">{row.wh}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'LEDGER' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">NODAK LEDGER · Cifrado AWS KMS</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Libro contable y conciliación bancaria</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">99.4% Conciliado</span>
            </div>

            <div className="divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 text-xs">
              {[
                { ref: 'FAC-2026-9012', desc: 'Pago suscripción corporativa', type: '+', val: '+$12,400.00', status: 'Conciliado' },
                { ref: 'PROV-8831', desc: 'Infraestructura Amazon Web Services', type: '-', val: '-$1,840.00', status: 'Conciliado' },
                { ref: 'NOM-1104', desc: 'Dispersión nómina operativa', type: '-', val: '-$28,500.00', status: 'Verificado' },
              ].map((entry) => (
                <div key={entry.ref} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-bold text-white">{entry.desc}</p>
                    <p className="font-mono text-[11px] text-[#94A3B8]">{entry.ref} · {entry.status}</p>
                  </div>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      entry.type === '+' ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {entry.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'BUILD' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">NODAK BUILD · Portafolio de Entregas</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Avance del trimestre Q4</h3>
              </div>
              <span className="font-mono text-xs text-white">18 / 21 Hitos completados</span>
            </div>

            <div className="divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 text-xs">
              {[
                { code: 'BLD-104', title: 'Migración de facturación electrónica', owner: 'Ana López', status: 'Completado' },
                { code: 'BLD-112', title: 'Portal de proveedores multi-almacén', owner: 'Carlos Ruiz', status: 'En revisión' },
                { code: 'BLD-119', title: 'Tablero ejecutivo para dirección', owner: 'Sofía Vega', status: 'En curso' },
              ].map((task) => (
                <div key={task.code} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-bold text-white">
                      <span className="font-mono text-[#94A3B8]">{task.code}</span> · {task.title}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">Responsable: {task.owner}</p>
                  </div>
                  <span className="font-semibold text-[#FCCB06] whitespace-nowrap">{task.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'AUTOMATE' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">NODAK AUTOMATE · Step Functions & EventBridge</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Flujos automáticos ejecutándose hoy</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">99.98% Tasa de éxito</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Aviso de factura vencida por Outlook', runs: '1,420 envíos', flow: 'Ledger → Outlook' },
                { name: 'Orden de compra automática por stock mínimo', runs: '384 ejecuciones', flow: 'Stock → Proveedores' },
                { name: 'Resumen diario de ventas para dirección', runs: '90 reportes', flow: 'Pulse → Gmail' },
              ].map((wf) => (
                <div
                  key={wf.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/50 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-bold text-white">{wf.name}</p>
                      <p className="font-mono text-[11px] text-[#94A3B8]">{wf.flow}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-[#FCCB06]">{wf.runs}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onSelectAppDetail && (
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3.5 text-xs">
            <span className="text-[#94A3B8]">Vista interactiva en vivo de {active}</span>
            <button
              type="button"
              onClick={() => onSelectAppDetail(active)}
              className="font-bold text-[#FCCB06] hover:underline"
            >
              Ver especificaciones de {active} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
