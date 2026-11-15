import { Activity, CheckCircle2, Cpu, Database, Globe, Lock, Server } from 'lucide-react';
import { useState } from 'react';

interface RegionNode {
  id: string;
  name: string;
  city: string;
  latencyMs: number;
  zones: [string, string, string];
  backupTarget: string;
}

const REGIONS: RegionNode[] = [
  {
    id: 'us-east-1',
    name: 'US East (N. Virginia)',
    city: 'Norteamérica Principal',
    latencyMs: 12,
    zones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
    backupTarget: 'us-west-2 (Oregón)',
  },
  {
    id: 'us-west-2',
    name: 'US West (Oregon)',
    city: 'Pacífico Norteamérica',
    latencyMs: 24,
    zones: ['us-west-2a', 'us-west-2b', 'us-west-2c'],
    backupTarget: 'us-east-1 (Virginia)',
  },
  {
    id: 'eu-west-1',
    name: 'Europe (Ireland)',
    city: 'Unión Europea',
    latencyMs: 36,
    zones: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
    backupTarget: 'eu-central-1 (Fráncfort)',
  },
  {
    id: 'sa-east-1',
    name: 'South America (São Paulo)',
    city: 'Sudamérica',
    latencyMs: 29,
    zones: ['sa-east-1a', 'sa-east-1b', 'sa-east-1c'],
    backupTarget: 'us-east-1 (Virginia)',
  },
];

const STACK_LAYERS = [
  {
    icon: Server,
    title: 'Balanceo automático sin caídas',
    tech: 'AWS Application Load Balancer + CloudFront',
    desc: 'Distribuye las visitas entre servidores activos; si alguno entra en mantenimiento, el tráfico pasa al instante a otra zona.',
  },
  {
    icon: Cpu,
    title: 'Cómputo escalable para tus 6 apps',
    tech: 'Amazon ECS Fargate + AWS Lambda',
    desc: 'Aumenta capacidad automáticamente en cierres de mes o picos de ventas sin ralentizar la pantalla.',
  },
  {
    icon: Database,
    title: 'Motores dedicados por tipo de dato',
    tech: 'Redshift · Aurora PostgreSQL · DynamoDB',
    desc: 'Analítica en Redshift, finanzas y clientes en Aurora Multi-AZ e inventarios en DynamoDB global.',
  },
  {
    icon: Lock,
    title: 'Cifrado bancario y llaves propias',
    tech: 'AWS KMS AES-256 + TLS 1.3 + Google/MS SSO',
    desc: 'Cada movimiento financiero y archivo adjunto viaja cifrado de extremo a extremo.',
  },
];

interface AwsTopologyVisualizerProps {
  onOpenAwsConsole?: () => void;
}

export function AwsTopologyVisualizer({ onOpenAwsConsole }: AwsTopologyVisualizerProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<string>('us-east-1');
  const [simulatedZoneFailover, setSimulatedZoneFailover] = useState<number | null>(null);

  const region = REGIONS.find((r) => r.id === selectedRegionId) || REGIONS[0];

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-[#070B16] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <p className="text-xs font-bold text-[#FCCB06]">
            Topología Interactiva Amazon Web Services
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">
            Arquitectura Multi-Zona en Tiempo Real
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setSelectedRegionId(r.id);
                setSimulatedZoneFailover(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                selectedRegionId === r.id
                  ? 'bg-[#FCCB06] text-black'
                  : 'border border-white/15 bg-black/50 text-[#CBD5E1] hover:text-white'
              }`}
            >
              {r.id}
            </button>
          ))}
        </div>
      </div>

      {/* Live Zone Grid & Failover Simulation */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-white/[0.1] bg-black/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 font-bold text-white">
                <Globe className="h-4 w-4 text-[#FCCB06]" />
                {region.name} · {region.city}
              </span>
              <span className="font-mono text-emerald-400">
                Latencia promedio: {region.latencyMs} ms
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {region.zones.map((zone, idx) => {
                const isMaintenance = simulatedZoneFailover === idx;
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSimulatedZoneFailover(isMaintenance ? null : idx)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      isMaintenance
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-emerald-500/30 bg-[#0A1324] hover:border-[#FCCB06]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">{zone}</span>
                      <Activity
                        className={`h-3.5 w-3.5 ${
                          isMaintenance ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-[#CBD5E1]">
                      {isMaintenance ? 'Tráfico redirigido (0 ms caída)' : 'Operando al 100%'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#94A3B8]">
                      {isMaintenance ? 'Clic para restaurar nodo' : 'Clic para probar relevo'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {simulatedZoneFailover !== null
                  ? `Relevo activo: las otras 2 zonas absorben el 100% sin interrupciones.`
                  : `Réplica continua hacia ${region.backupTarget}`}
              </span>
              {onOpenAwsConsole && (
                <button
                  type="button"
                  onClick={onOpenAwsConsole}
                  className="font-bold text-[#FCCB06] hover:underline"
                >
                  Abrir consola AWS en vivo →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Real Technical Architecture Layers */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-5">
          {STACK_LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div
                key={layer.title}
                className="rounded-xl border border-white/[0.08] bg-black/50 p-4"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-[#FCCB06]" />
                  <h4 className="text-xs font-bold text-white">{layer.title}</h4>
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-[#FCCB06]/90">{layer.tech}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#CBD5E1]">{layer.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
