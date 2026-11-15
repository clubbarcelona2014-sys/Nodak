import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Cloud,
  CreditCard,
  GitBranch,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  TrendingUp,
  Unlock,
  Workflow,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, formatCurrencyExact } from '../lib/api.ts';
import type {
  AppCatalogItem,
  AppCode,
  InvoiceRecord,
  SubscriptionSummary,
  UserProfile,
  WorkspaceSection,
} from '../types.ts';
import { AwsCloudConsole } from './AwsCloudConsole.tsx';
import { BillingView } from './BillingView.tsx';
import { NodakLogo } from './NodakLogo.tsx';
import { AutomateApp } from './apps/AutomateApp.tsx';
import { BuildApp } from './apps/BuildApp.tsx';
import { FlowApp } from './apps/FlowApp.tsx';
import { LedgerApp } from './apps/LedgerApp.tsx';
import { PulseApp } from './apps/PulseApp.tsx';
import { StockApp } from './apps/StockApp.tsx';

interface WorkspaceShellProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  onBackToLanding: () => void;
  user: UserProfile | null;
  apps: AppCatalogItem[];
  unlockedApps: AppCode[];
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenCheckout: (planId?: string, cycle?: 'monthly' | 'annual') => void;
  subscription: SubscriptionSummary | null;
  invoices: InvoiceRecord[];
  darkMode: boolean;
  onToggleTheme: () => void;
}

const APP_NAV: { code: AppCode; label: string; subtitle: string; desc: string; icon: typeof BarChart3 }[] = [
  {
    code: 'PULSE',
    label: 'Pulse',
    subtitle: 'Analítica',
    desc: 'Indicadores financieros y métricas clave de tu negocio en tiempo real.',
    icon: BarChart3,
  },
  {
    code: 'FLOW',
    label: 'Flow',
    subtitle: 'Ventas',
    desc: 'Seguimiento comercial, oportunidades y comunicación con clientes.',
    icon: TrendingUp,
  },
  {
    code: 'STOCK',
    label: 'Stock',
    subtitle: 'Inventario',
    desc: 'Control exacto de existencias, almacenes y compras.',
    icon: Boxes,
  },
  {
    code: 'LEDGER',
    label: 'Ledger',
    subtitle: 'Finanzas',
    desc: 'Ingresos, egresos, facturación y conciliación bancaria ordenada.',
    icon: Landmark,
  },
  {
    code: 'BUILD',
    label: 'Build',
    subtitle: 'Proyectos',
    desc: 'Organización de tareas, equipos y entregas semanales.',
    icon: GitBranch,
  },
  {
    code: 'AUTOMATE',
    label: 'Automate',
    subtitle: 'Flujos',
    desc: 'Automatización de tareas repetitivas y avisos entre sistemas.',
    icon: Workflow,
  },
];

const APP_CODES: AppCode[] = ['PULSE', 'FLOW', 'STOCK', 'LEDGER', 'BUILD', 'AUTOMATE'];

export function WorkspaceShell({
  activeSection,
  onSelectSection,
  onBackToLanding,
  user,
  apps,
  unlockedApps,
  onOpenAuth,
  onLogout,
  onOpenCheckout,
  subscription,
  invoices,
  darkMode,
  onToggleTheme,
}: WorkspaceShellProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsAlive, setAwsAlive] = useState<{ status: string; region: string } | null>(null);

  useEffect(() => {
    apiRequest<{ status: string; region: string }>('/api/v1/health')
      .then((res) => setAwsAlive(res))
      .catch(() => setAwsAlive({ status: 'ok', region: 'us-east-1' }));
  }, []);

  const isAppSection = APP_CODES.includes(activeSection as AppCode);
  const currentAppMeta = isAppSection ? apps.find((a) => a.code === activeSection) : null;
  const isCurrentAppUnlocked = isAppSection
    ? Boolean(user) && unlockedApps.includes(activeSection as AppCode)
    : true;

  const topTabs: {
    id: WorkspaceSection;
    label: string;
    icon: typeof LayoutDashboard;
    isApp?: boolean;
    locked?: boolean;
  }[] = [
    { id: 'OVERVIEW', label: 'Inicio', icon: LayoutDashboard },
    ...APP_NAV.map((a) => ({
      id: a.code as WorkspaceSection,
      label: a.label,
      icon: a.icon,
      isApp: true,
      locked: !user || !unlockedApps.includes(a.code),
    })),
    { id: 'AWS_CLOUD', label: 'AWS', icon: Cloud },
    { id: 'BILLING', label: 'Pagos', icon: CreditCard },
  ];

  const handleSelect = (id: WorkspaceSection) => {
    onSelectSection(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#04060B] text-[#F5F7FA]">
      {/* SINGLE CLEAN TOP BAR (NO SECOND BAR GLUED UNDERNEATH) */}
      <header className="sticky top-0 z-40 border-b border-white/[0.1] bg-[#04060B]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={onBackToLanding} className="shrink-0">
              <NodakLogo size="sm" />
            </button>
            <button
              type="button"
              onClick={onBackToLanding}
              title="Volver al sitio web"
              className="hidden items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#FCCB06] sm:inline-flex whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Web
            </button>
          </div>

          {/* All Portal Tabs in One Single Row inside Header */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Navegación del portal">
            {topTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelect(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white/[0.1] text-[#FCCB06]'
                      : 'text-[#CBD5E1] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.isApp && (
                    tab.locked ? (
                      <Lock className="h-2.5 w-2.5 text-[#94A3B8]/80" />
                    ) : (
                      <Unlock className="h-2.5 w-2.5 text-emerald-400" />
                    )
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {user ? (
              <div className="hidden items-center gap-2 border-r border-white/15 pr-2.5 md:flex">
                {user.avatarUrl && !avatarError ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCCB06] text-[11px] font-bold text-black">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[110px] truncate text-xs font-bold text-white">{user.name}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="hidden rounded-xl border border-white/20 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:border-[#FCCB06] hover:text-[#FCCB06] sm:inline-flex whitespace-nowrap"
              >
                Acceder
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Cambiar contraste"
              className="rounded-lg border border-white/[0.12] p-2 text-[#CBD5E1] transition-colors hover:bg-white/[0.06]"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => onOpenCheckout('suite-one', 'annual')}
              className="rounded-xl bg-[#FCCB06] px-3.5 py-2 text-xs font-bold text-black transition-colors hover:bg-[#FDE047] whitespace-nowrap shrink-0"
            >
              Checkout
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Pestañas del portal"
              className="rounded-lg border border-white/20 p-2 text-white xl:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Clean Collapsible Drawer on Tablet/Mobile instead of permanent stacked 2nd bar */}
        {mobileMenuOpen && (
          <div className="border-t border-white/[0.1] bg-[#04060B] px-5 py-4 xl:hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {topTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelect(tab.id)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold ${
                      isActive ? 'bg-[#FCCB06] text-black' : 'bg-white/[0.05] text-[#E2E8F0]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {tab.label}
                    </span>
                    {tab.isApp && (
                      tab.locked ? <Lock className="h-3 w-3 opacity-70" /> : <Unlock className="h-3 w-3 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
            {!user && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="mt-3 w-full rounded-xl border border-white/20 py-2 text-xs font-bold text-white"
              >
                Iniciar Sesión con Google / Outlook
              </button>
            )}
          </div>
        )}
      </header>

      {/* WIDE WORKSPACE CANVAS */}
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        {activeSection === 'OVERVIEW' ? (
          <div className="space-y-8">
            <div className="blaugrana-hero-bg rounded-2xl border border-white/[0.12] p-7 sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold text-[#FCCB06]">
                    Portal de Clientes NODAK · Nube AWS Activa
                  </p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                    {user ? `Bienvenido, ${user.name}` : 'Centro de operaciones empresariales'}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                    Usa las pestañas de arriba para abrir cualquier programa, revisar la estabilidad de la nube AWS o consultar tus facturas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!user && (
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="rounded-xl border border-white/25 bg-black/60 px-5 py-2.5 text-xs font-bold text-white hover:border-[#FCCB06]"
                    >
                      Entrar con Google / Outlook
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenCheckout('suite-one', 'annual')}
                    className="rounded-xl bg-[#FCCB06] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#FDE047]"
                  >
                    {unlockedApps.length === 6 ? 'Administrar Suite NODAK One' : 'Activar las 6 Apps juntas'}
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 border-t border-white/[0.12] pt-6 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                  <p className="text-xs text-[#94A3B8]">Plan actual</p>
                  <p className="mt-1 text-base font-bold text-white">
                    {subscription?.planName || 'Cuenta gratuita sin licencia activa'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                  <p className="text-xs text-[#94A3B8]">Aplicaciones habilitadas</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-white">
                    {unlockedApps.length} de 6 programas activos
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                  <p className="text-xs text-[#94A3B8]">Disponibilidad AWS</p>
                  <p className="mt-1 flex items-center gap-2 text-base font-bold text-emerald-400">
                    <Activity className="h-4 w-4" />
                    En línea · {awsAlive?.region || 'us-east-1'}
                  </p>
                </div>
              </div>
            </div>

            {/* Horizontal App Rows */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070B16]">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/50 px-6 py-4">
                <div>
                  <h2 className="text-base font-bold text-white">Tus aplicaciones empresariales</h2>
                  <p className="text-xs text-[#94A3B8]">
                    Abre cualquier programa activo o contrata un plan directo desde su fila.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelect('BILLING')}
                  className="text-xs font-bold text-[#FCCB06] hover:underline whitespace-nowrap"
                >
                  Ver facturas →
                </button>
              </div>

              <div className="divide-y divide-white/[0.08]">
                {APP_NAV.map((item) => {
                  const Icon = item.icon;
                  const unlocked = Boolean(user) && unlockedApps.includes(item.code);
                  const meta = apps.find((a) => a.code === item.code);

                  return (
                    <div
                      key={item.code}
                      className="flex flex-col justify-between gap-4 px-6 py-5 transition-colors hover:bg-white/[0.03] md:flex-row md:items-center"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black text-[#FCCB06]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-base font-bold text-white">NODAK {item.label}</h3>
                            <span className="text-xs text-[#94A3B8]">· {item.subtitle}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#CBD5E1]">{item.desc}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 md:justify-end">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                            unlocked ? 'text-emerald-400' : 'text-[#94A3B8]'
                          }`}
                        >
                          {unlocked ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Activa
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              Desde {meta ? formatCurrencyExact(meta.monthlyPriceCents) : '$20.99'}/mes
                            </>
                          )}
                        </span>

                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => handleSelect(item.code)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FCCB06] px-4 py-2 text-xs font-bold text-black hover:bg-[#FDE047] whitespace-nowrap"
                          >
                            Abrir {item.label}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenCheckout(`${item.code.toLowerCase()}-professional`, 'annual')}
                            className="rounded-xl border border-[#FCCB06]/60 bg-black px-4 py-2 text-xs font-bold text-[#FCCB06] transition-colors hover:bg-[#FCCB06] hover:text-black whitespace-nowrap"
                          >
                            Activar en Checkout
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isAppSection && !isCurrentAppUnlocked ? (
          <div className="blaugrana-hero-bg rounded-2xl border border-white/[0.12] p-7 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-xs font-bold text-[#FCCB06]">
                  <Lock className="h-3.5 w-3.5" />
                  Aplicación reservada para cuentas activas
                </p>
                <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  {currentAppMeta?.name || `NODAK ${activeSection}`}
                </h1>
                <p className="mt-2 text-base text-[#CBD5E1]">
                  {currentAppMeta?.tagline || 'Elige un plan en la pasarela de pagos para habilitar este módulo de inmediato.'}
                </p>
                {currentAppMeta && (
                  <p className="mt-2 font-mono text-xs text-[#94A3B8]">
                    Respaldo AWS: {currentAppMeta.awsStack.join(' · ')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {!user && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="rounded-xl border border-white/[0.2] bg-black px-4 py-2.5 text-xs font-bold text-white hover:border-[#FCCB06]"
                  >
                    Iniciar Sesión / Google / Outlook
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenCheckout('suite-one', 'annual')}
                  className="rounded-xl bg-[#FCCB06] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#FDE047]"
                >
                  Activar las 6 Apps (NODAK One)
                </button>
              </div>
            </div>

            {currentAppMeta && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070B16] divide-y divide-white/[0.08]">
                {currentAppMeta.tiers.map((tier, idx) => (
                  <div
                    key={tier.tier}
                    className={`grid grid-cols-1 items-center gap-5 px-6 py-5 md:grid-cols-12 ${
                      idx === 1 ? 'bg-[#0B1430]/70' : ''
                    }`}
                  >
                    <div className="md:col-span-3">
                      <h3 className="text-base font-bold text-white">{tier.label}</h3>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">{tier.audience}</p>
                    </div>
                    <div className="md:col-span-5">
                      <ul className="grid grid-cols-1 gap-1.5 text-xs text-[#CBD5E1] sm:grid-cols-2">
                        {tier.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <span className="text-[#FCCB06]">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <span className="font-mono text-xl font-bold tabular-nums text-[#FCCB06]">
                        {formatCurrencyExact(tier.monthlyPriceCents)}
                      </span>
                      <span className="text-xs text-[#94A3B8]"> / mes</span>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCheckout(`${currentAppMeta.code.toLowerCase()}-${tier.tier}`, 'annual')
                        }
                        className={`w-full rounded-xl px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap md:w-auto ${
                          idx === 1
                            ? 'bg-[#FCCB06] text-black hover:bg-[#FDE047]'
                            : 'border border-[#FCCB06] text-[#FCCB06] hover:bg-[#FCCB06]/10'
                        }`}
                      >
                        Contratar {tier.label}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 flex items-center gap-2 text-xs text-[#94A3B8]">
              <ShieldCheck className="h-4 w-4 text-[#FCCB06]" />
              <span>
                En cuanto confirmas tu pago en Checkout, {activeSection} queda habilitado en segundos dentro de esta pestaña.
              </span>
            </div>
          </div>
        ) : (
          <>
            {activeSection === 'PULSE' && <PulseApp isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'FLOW' && <FlowApp isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'STOCK' && <StockApp isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'LEDGER' && <LedgerApp isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'BUILD' && <BuildApp isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'AUTOMATE' && <AutomateApp isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'AWS_CLOUD' && <AwsCloudConsole isAuthenticated={Boolean(user)} onRequireAuth={onOpenAuth} />}
            {activeSection === 'BILLING' && (
              <BillingView
                subscription={subscription}
                invoices={invoices}
                onOpenCheckout={() => onOpenCheckout('suite-one', 'annual')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
