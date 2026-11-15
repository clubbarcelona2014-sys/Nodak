import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrencyExact } from '../lib/api.ts';
import type { AppCatalogItem, AppCode, SuitePlan, UserProfile, WorkspaceSection } from '../types.ts';
import { AwsTopologyVisualizer } from './AwsTopologyVisualizer.tsx';
import { InteractivePlatformPreview } from './InteractivePlatformPreview.tsx';
import { NodakLogo } from './NodakLogo.tsx';

interface LandingViewProps {
  apps: AppCatalogItem[];
  suites: SuitePlan[];
  user: UserProfile | null;
  unlockedApps: AppCode[];
  onEnterWorkspace: (section?: WorkspaceSection) => void;
  onOpenAuth: () => void;
  onOpenCheckout: (planId: string, billingCycle: 'monthly' | 'annual') => void;
}

const DEPARTMENT_CASES = [
  {
    id: 'direccion',
    label: 'Dirección General',
    appsUsed: ['PULSE', 'LEDGER'],
    before: 'Reportes semanales armados a mano en Excel con cifras atrasadas y errores de versión.',
    after: 'Tablero único en vivo con ventas, márgenes, cobranza y flujo de caja auditado por área.',
    outcome: 'Ahorro de 9 horas semanales en cierres ejecutivos y visibilidad diaria real.',
  },
  {
    id: 'ventas',
    label: 'Equipos Comerciales',
    appsUsed: ['FLOW', 'AUTOMATE'],
    before: 'Cotizaciones dispersas en correos individuales sin seguimiento ni recordatorios de renovación.',
    after: 'Embudo comercial sincronizado con Gmail y Microsoft Outlook con alertas automáticas de cierre.',
    outcome: '+32% en velocidad de respuesta al cliente y cero oportunidades olvidadas.',
  },
  {
    id: 'finanzas',
    label: 'Finanzas y Tesorería',
    appsUsed: ['LEDGER', 'PULSE'],
    before: 'Conciliación bancaria lenta a fin de mes y facturas por cobrar sin alertas tempranas.',
    after: 'Registro diario de ingresos, egresos y presupuestos con conciliación directa y cifrado bancario.',
    outcome: 'Cierres contables en la mitad de tiempo y control exacto de liquidez.',
  },
  {
    id: 'bodega',
    label: 'Almacén y Compras',
    appsUsed: ['STOCK', 'AUTOMATE'],
    before: 'Quiebres inesperados de inventario o exceso de mercancía detenida en sucursales.',
    after: 'Existencias por almacén en tiempo real con órdenes de reposición enviadas automáticamente.',
    outcome: 'Control por lote y SKU sin conteos duplicados entre bodegas.',
  },
  {
    id: 'proyectos',
    label: 'Proyectos y Entregas',
    appsUsed: ['BUILD', 'FLOW'],
    before: 'Pendientes perdidos en chats sin fechas claras ni responsables asignados.',
    after: 'Tableros por hito, responsables, dependencias y calendario compartido por equipo.',
    outcome: 'Entregas puntuales con visibilidad completa para líderes y clientes.',
  },
  {
    id: 'automatizacion',
    label: 'Operación Sin Trabajo Manual',
    appsUsed: ['AUTOMATE', 'LEDGER', 'STOCK'],
    before: 'Equipos capturando manualmente los mismos datos entre facturación, correo y almacén.',
    after: 'Reglas automáticas en AWS que conectan inventario, ventas, finanzas y notificaciones.',
    outcome: 'Menos errores humanos y procesos críticos corriendo 24/7 sin supervisión.',
  },
];

const SECURITY_CONTROLS = [
  {
    layer: 'Acceso e Identidad',
    control: 'Google Workspace SSO & Microsoft Entra ID',
    detail: 'Inicio de sesión único sin contraseñas duplicadas y cierre automático de sesiones inactivas.',
    standard: 'OAuth 2.0 / OIDC',
  },
  {
    layer: 'Cifrado de Datos',
    control: 'Llaves dedicadas por empresa en AWS KMS',
    detail: 'Toda la información financiera y comercial viaja en TLS 1.3 y se guarda cifrada con AES-256.',
    standard: 'AES-256 + TLS 1.3',
  },
  {
    layer: 'Disponibilidad Continua',
    control: 'Despliegue Activo en 3 Zonas (Multi-AZ)',
    detail: 'Si una zona entra en mantenimiento o sufre fallas, el tráfico cambia en milisegundos sin caídas.',
    standard: '99.99% SLA Activo',
  },
  {
    layer: 'Trazabilidad y Auditoría',
    control: 'Bitácora inmutable de accesos y cambios',
    detail: 'Cada consulta sensible, aprobación de compra o cambio contable queda registrado con fecha y autor.',
    standard: 'AWS CloudTrail',
  },
];

const FAQS = [
  {
    q: '¿Qué pasa exactamente al completar mi pago en la pasarela?',
    a: 'Tu suscripción se activa en cuestión de segundos sobre tu cuenta de Amazon Web Services, se emite tu comprobante fiscal en USD y se desbloquean de inmediato todas las aplicaciones incluidas en tu Portal de Clientes.',
  },
  {
    q: '¿Cómo ahorro con el ciclo anual frente al mensual?',
    a: 'El plan anual equivale exactamente a 10 mensualidades: obtienes 2 meses completos sin costo en cualquier programa individual o en la suite NODAK One.',
  },
  {
    q: '¿Mi equipo puede entrar con Google o Microsoft Outlook sin crear otra clave?',
    a: 'Sí. Tanto el registro de tu empresa como el acceso diario funcionan con Google Workspace, Gmail, Microsoft 365, Outlook o correo corporativo tradicional.',
  },
  {
    q: '¿Qué incluye la suite NODAK One frente a contratar aplicaciones sueltas?',
    a: 'NODAK One incluye los 6 programas (Pulse, Flow, Stock, Ledger, Build y Automate) integrados en una sola suscripción con un ahorro superior al 40% respecto a pagar módulos por separado.',
  },
];

const APP_SPANISH_SUMMARY: Record<AppCode, string> = {
  PULSE: 'Indicadores, ventas y reportes ejecutivos en tiempo real.',
  FLOW: 'Seguimiento comercial de clientes, cotizaciones y cierres.',
  STOCK: 'Control exacto de almacenes, entradas, salidas y compras.',
  LEDGER: 'Ingresos, gastos, presupuestos y flujo de caja ordenado.',
  BUILD: 'Planeación de proyectos, tableros y responsables por entrega.',
  AUTOMATE: 'Flujos automáticos entre tus apps, correo y reportes.',
};

type HeaderTab = 'inicio' | 'aplicaciones' | 'aws' | 'soluciones' | 'precios';

export function LandingView({
  apps,
  suites,
  user,
  unlockedApps,
  onEnterWorkspace,
  onOpenAuth,
  onOpenCheckout,
}: LandingViewProps) {
  const [activeTab, setActiveTab] = useState<HeaderTab>('inicio');
  const [selectedProductCode, setSelectedProductCode] = useState<AppCode | null>(null);
  const [pricingSelection, setPricingSelection] = useState<AppCode | 'SUITE'>('SUITE');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Team / ROI Configurator State
  const [calcSeats, setCalcSeats] = useState<number>(25);
  const [calcApps, setCalcApps] = useState<AppCode[]>(['PULSE', 'FLOW', 'LEDGER']);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('direccion');

  const selectedProduct = selectedProductCode
    ? apps.find((a) => a.code === selectedProductCode) || null
    : null;

  const activePricingApp =
    pricingSelection === 'SUITE'
      ? null
      : apps.find((a) => a.code === pricingSelection) || apps[0] || null;

  const activeDept = DEPARTMENT_CASES.find((d) => d.id === selectedDeptId) || DEPARTMENT_CASES[0];

  const switchTab = (tab: HeaderTab) => {
    setSelectedProductCode(null);
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProductDetail = (code: AppCode) => {
    setSelectedProductCode(code);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCalcApp = (code: AppCode) => {
    setCalcApps((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code]
    );
  };

  // Real dynamic cost calculation for Configurator
  const separateMonthlyCents = calcApps.reduce((acc, code) => {
    const found = apps.find((a) => a.code === code);
    const profTier = found?.tiers.find((t) => t.tier === 'professional');
    return acc + (profTier ? profTier.monthlyPriceCents : 5999);
  }, 0);
  const suiteOneMonthlyCents = suites[0]?.monthlyPriceCents || 12999;
  const recommendSuite = calcApps.length >= 3 || calcSeats > 30;
  const effectiveMonthlyCents = recommendSuite ? suiteOneMonthlyCents : separateMonthlyCents;
  const effectiveCheckoutTotal =
    billingCycle === 'annual' ? effectiveMonthlyCents * 10 : effectiveMonthlyCents;
  const perSeatMonthlyCents = Math.round(effectiveMonthlyCents / Math.max(1, calcSeats));
  const recommendedPlanId = recommendSuite
    ? 'suite-one'
    : `${calcApps[0].toLowerCase()}-professional`;

  // Horizontal Row Pricing Renderer ("precios abajo como fila")
  const renderHorizontalTierRows = (product: AppCatalogItem) => {
    const isAnnual = billingCycle === 'annual';
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070B16] shadow-2xl">
        <div className="hidden grid-cols-12 border-b border-white/[0.08] bg-black/60 px-6 py-3.5 text-xs font-bold text-[#94A3B8] md:grid">
          <div className="col-span-3">Nivel de plan</div>
          <div className="col-span-5">Incluye para tu equipo</div>
          <div className="col-span-2 text-right">Precio</div>
          <div className="col-span-2 text-right">Activación</div>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {product.tiers.map((tier, idx) => {
            const displayCents = isAnnual ? tier.monthlyPriceCents * 10 : tier.monthlyPriceCents;
            const savingsCents = tier.monthlyPriceCents * 2;
            const isFeatured = idx === 1;
            const planId = `${product.code.toLowerCase()}-${tier.tier}`;

            return (
              <div
                key={tier.tier}
                className={`grid grid-cols-1 items-center gap-6 px-6 py-6 transition-colors md:grid-cols-12 ${
                  isFeatured
                    ? 'bg-gradient-to-r from-[#0B1430]/90 via-[#091024] to-[#1A0817]/75'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="md:col-span-3">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white">{tier.label}</h3>
                    {isFeatured && (
                      <span className="text-xs font-bold text-[#FCCB06]">· Recomendado</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#94A3B8]">{tier.audience}</p>
                </div>

                <div className="md:col-span-5">
                  <ul className="grid grid-cols-1 gap-1.5 text-xs text-[#E2E8F0] sm:grid-cols-2">
                    {tier.features.slice(0, 4).map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <span className="font-bold text-[#FCCB06]">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="md:col-span-2 md:text-right">
                  <p className="text-2xl font-bold tabular-nums text-white">
                    {formatCurrencyExact(displayCents)}
                    <span className="text-xs font-normal text-[#94A3B8]"> / {isAnnual ? 'año' : 'mes'}</span>
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#FCCB06]">
                    {isAnnual
                      ? `Ahorras ${formatCurrencyExact(savingsCents)}`
                      : 'Cancelación libre'}
                  </p>
                </div>

                <div className="md:col-span-2 md:text-right">
                  <button
                    type="button"
                    onClick={() => onOpenCheckout(planId, billingCycle)}
                    className={`w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap md:w-auto ${
                      isFeatured
                        ? 'bg-[#FCCB06] text-black hover:bg-[#FDE047]'
                        : 'border border-white/25 bg-black/50 text-white hover:border-[#FCCB06] hover:text-[#FCCB06]'
                    }`}
                  >
                    Contratar {tier.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Interactive Enterprise ROI & Team Configurator
  const renderInteractiveConfigurator = () => (
    <section className="mx-auto max-w-6xl px-6 pt-16">
      <div className="rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#0A1022] via-[#060913] to-[#140712] p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FCCB06]">
                <Calculator className="h-3.5 w-3.5" />
                Simulador Real de Presupuesto Empresarial
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">
                Calcula tu inversión según el tamaño de tu equipo
              </h2>
              <p className="mt-1 text-xs text-[#CBD5E1] sm:text-sm">
                Marca las herramientas que necesita tu empresa y ajusta los usuarios para ver si te conviene contratar módulos individuales o la suite NODAK One.
              </p>
            </div>

            {/* Seat Slider */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#CBD5E1]">Tamaño del equipo en portal</span>
                <span className="font-mono text-sm font-bold text-[#FCCB06]">
                  {calcSeats} usuarios activos
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={150}
                step={5}
                value={calcSeats}
                onChange={(e) => setCalcSeats(Number(e.target.value))}
                className="mt-2.5 w-full accent-[#FCCB06]"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-[#94A3B8]">
                <span>5 usuarios</span>
                <span>50 usuarios</span>
                <span>100 usuarios</span>
                <span>150 usuarios</span>
              </div>
            </div>

            {/* App Toggles */}
            <div>
              <p className="mb-2 text-xs font-bold text-[#CBD5E1]">
                Selecciona las áreas que quieres digitalizar:
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {apps.map((app) => {
                  const selected = calcApps.includes(app.code);
                  return (
                    <button
                      key={app.code}
                      type="button"
                      onClick={() => toggleCalcApp(app.code)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                        selected
                          ? 'border-[#FCCB06] bg-[#FCCB06]/12 text-white'
                          : 'border-white/[0.1] bg-black/40 text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <span>{app.code}</span>
                      <span className={selected ? 'text-[#FCCB06]' : 'text-white/25'}>
                        {selected ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Output Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.12] bg-black/70 p-6 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#FCCB06]">
                  {recommendSuite ? 'Recomendación: Suite NODAK One (6 Apps)' : `Plan ${calcApps[0]} Professional`}
                </span>
                <div className="inline-flex rounded-lg border border-white/15 bg-[#070B16] p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`rounded-md px-2.5 py-1 ${billingCycle === 'monthly' ? 'bg-[#FCCB06] text-black' : 'text-[#94A3B8]'}`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`rounded-md px-2.5 py-1 ${billingCycle === 'annual' ? 'bg-[#FCCB06] text-black' : 'text-[#94A3B8]'}`}
                  >
                    Anual
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums text-white">
                  {formatCurrencyExact(effectiveCheckoutTotal)}
                </span>
                <span className="text-xs text-[#94A3B8]">
                  USD / {billingCycle === 'annual' ? 'año' : 'mes'}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-emerald-400">
                Equivale a {formatCurrencyExact(perSeatMonthlyCents)} por usuario al mes
              </p>

              <div className="mt-5 space-y-2 border-t border-white/[0.08] pt-4 text-xs text-[#CBD5E1]">
                <div className="flex justify-between">
                  <span>Módulos activados hoy</span>
                  <span className="font-bold text-white">
                    {recommendSuite ? 'Todas las 6 apps' : calcApps.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Infraestructura</span>
                  <span className="font-semibold text-white">AWS Multi-AZ Dedicado</span>
                </div>
                {recommendSuite && separateMonthlyCents > suiteOneMonthlyCents && (
                  <div className="flex justify-between text-[#FCCB06]">
                    <span>Ahorro vs módulos sueltos</span>
                    <span className="font-mono font-bold">
                      -{formatCurrencyExact((separateMonthlyCents - suiteOneMonthlyCents) * (billingCycle === 'annual' ? 10 : 1))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenCheckout(recommendedPlanId, billingCycle)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FCCB06] py-3 text-xs font-bold text-black transition-colors hover:bg-[#FDE047]"
            >
              Activar configuración en Checkout
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  // Reusable Horizontal Pricing Section (placed at bottom of Inicio AND inside Precios tab)
  const renderPricingSection = () => (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold text-[#FCCB06]">Planes y precios en USD</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Compara cada plan en fila y activa al instante
          </h2>
          <p className="mt-2 text-sm text-[#CBD5E1] sm:text-base">
            Con pago anual pagas 10 mensualidades y recibes 2 meses gratis. Al confirmar en Checkout obtienes acceso inmediato.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-white/[0.12] bg-[#080D1B] p-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              billingCycle === 'monthly' ? 'bg-[#FCCB06] text-black' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              billingCycle === 'annual' ? 'bg-[#FCCB06] text-black' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Anual (2 meses gratis)
          </button>
        </div>
      </div>

      {/* Product Selector Bar */}
      <div
        className="mt-7 inline-flex flex-wrap gap-1 rounded-xl border border-white/[0.12] bg-[#080D1B] p-1.5"
        role="group"
        aria-label="Seleccionar aplicación"
      >
        <button
          type="button"
          onClick={() => setPricingSelection('SUITE')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
            pricingSelection === 'SUITE'
              ? 'bg-[#A50044] text-white'
              : 'text-[#FCCB06] hover:bg-white/5'
          }`}
        >
          Suite Completa (6 Apps)
        </button>
        {apps.map((app) => (
          <button
            key={app.code}
            type="button"
            onClick={() => setPricingSelection(app.code)}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              pricingSelection === app.code
                ? 'bg-[#FCCB06] text-black'
                : 'text-[#CBD5E1] hover:bg-white/5 hover:text-white'
            }`}
          >
            {app.code}
          </button>
        ))}
      </div>

      {pricingSelection === 'SUITE' ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070B16] shadow-2xl">
          <div className="hidden grid-cols-12 border-b border-white/[0.08] bg-black/60 px-6 py-3.5 text-xs font-bold text-[#94A3B8] md:grid">
            <div className="col-span-3">Suite Empresarial</div>
            <div className="col-span-5">Alcance y respaldo en AWS</div>
            <div className="col-span-2 text-right">Precio</div>
            <div className="col-span-2 text-right">Pasarela</div>
          </div>
          <div className="divide-y divide-white/[0.08]">
            {suites.map((suite, idx) => {
              const isAnnual = billingCycle === 'annual';
              const displayCents = isAnnual
                ? suite.monthlyPriceCents * 10
                : suite.monthlyPriceCents;
              const saveCents = suite.monthlyPriceCents * 2;
              return (
                <div
                  key={suite.id}
                  className={`grid grid-cols-1 items-center gap-6 px-6 py-7 transition-colors md:grid-cols-12 ${
                    idx === 0
                      ? 'bg-gradient-to-r from-[#0B1430]/90 via-[#091024] to-[#1A0817]/75'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="md:col-span-3">
                    <p className="text-xs font-bold text-[#FCCB06]">Incluye las 6 aplicaciones</p>
                    <h3 className="mt-1 text-lg font-bold text-white">{suite.name}</h3>
                    <p className="mt-1 text-xs text-[#94A3B8]">{suite.audience}</p>
                  </div>

                  <div className="md:col-span-5">
                    <dl className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-[#94A3B8]">Usuarios</dt>
                        <dd className="font-semibold text-white">{suite.limits.seats}</dd>
                      </div>
                      <div>
                        <dt className="text-[#94A3B8]">Capacidad</dt>
                        <dd className="font-semibold text-white">{suite.limits.throughput}</dd>
                      </div>
                      <div>
                        <dt className="text-[#94A3B8]">Almacenamiento</dt>
                        <dd className="font-semibold text-white">{suite.limits.storage}</dd>
                      </div>
                      <div>
                        <dt className="text-[#94A3B8]">Disponibilidad</dt>
                        <dd className="font-semibold text-white">{suite.limits.sla}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="md:col-span-2 md:text-right">
                    <p className="text-2xl font-bold tabular-nums text-white">
                      {formatCurrencyExact(displayCents)}
                    </p>
                    <p className="text-xs text-[#94A3B8]">/ {isAnnual ? 'año' : 'mes'}</p>
                    {isAnnual && (
                      <p className="mt-0.5 text-xs font-semibold text-[#FCCB06]">
                        Ahorras {formatCurrencyExact(saveCents)}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 md:text-right">
                    <button
                      type="button"
                      onClick={() => onOpenCheckout(suite.id, billingCycle)}
                      className="w-full rounded-xl bg-[#FCCB06] px-4 py-3 text-xs font-bold text-black transition-colors hover:bg-[#FDE047] whitespace-nowrap md:w-auto"
                    >
                      Pagar en Checkout
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        activePricingApp && renderHorizontalTierRows(activePricingApp)
      )}

      {/* Horizontal Row Matrix of All 6 Applications */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/[0.12] bg-[#070B16]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/[0.08] bg-black/60 text-[#94A3B8]">
            <tr>
              <th className="px-5 py-3.5 font-bold">Aplicación</th>
              <th className="px-5 py-3.5 font-bold">Descripción</th>
              <th className="px-5 py-3.5 font-bold text-right">Essential</th>
              <th className="px-5 py-3.5 font-bold text-right">Professional</th>
              <th className="px-5 py-3.5 font-bold text-right">Business</th>
              <th className="px-5 py-3.5 font-bold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {apps.map((app) => {
              const mult = billingCycle === 'annual' ? 10 : 1;
              const unit = billingCycle === 'annual' ? '/año' : '/mes';
              return (
                <tr key={app.code} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-5 py-4 font-bold text-white whitespace-nowrap">{app.name}</td>
                  <td className="px-5 py-4 text-[#CBD5E1]">
                    {APP_SPANISH_SUMMARY[app.code] || app.tagline}
                  </td>
                  {app.tiers.map((t) => (
                    <td
                      key={t.tier}
                      className="px-5 py-4 text-right font-mono font-semibold tabular-nums text-white whitespace-nowrap"
                    >
                      {formatCurrencyExact(t.monthlyPriceCents * mult)}
                      <span className="text-[10px] font-normal text-[#94A3B8]">{unit}</span>
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenCheckout(`${app.code.toLowerCase()}-professional`, billingCycle)}
                      className="font-bold text-[#FCCB06] hover:underline"
                    >
                      Contratar →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[#94A3B8]">
        Cupones activos en la pasarela: <span className="font-mono font-bold text-[#FCCB06]">NODAK20</span> (20%) ·{' '}
        <span className="font-mono font-bold text-[#FCCB06]">AWSSTART</span> (25%) ·{' '}
        <span className="font-mono font-bold text-[#FCCB06]">FOUNDER15</span> (15%).
      </p>
    </section>
  );

  const navTabs: { id: HeaderTab; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'aplicaciones', label: 'Aplicaciones' },
    { id: 'aws', label: 'Nube AWS' },
    { id: 'soluciones', label: 'Soluciones' },
    { id: 'precios', label: 'Precios' },
  ];

  return (
    <div className="min-h-screen bg-[#04060B] text-[#F5F7FA] selection:bg-[#FCCB06] selection:text-black">
      {/* SINGLE CLEAN 3-ZONE TOP BAR WITH REAL SECTION TABS */}
      <header className="sticky top-0 z-40 border-b border-white/[0.1] bg-[#04060B]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
          <button
            type="button"
            onClick={() => switchTab('inicio')}
            className="shrink-0 focus:outline-none"
            aria-label="NODAK Inicio"
          >
            <NodakLogo size="md" />
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {navTabs.map((tab) => {
              const isActive = !selectedProduct && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white/[0.08] text-[#FCCB06]'
                      : 'text-[#CBD5E1] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => (user ? onEnterWorkspace('OVERVIEW') : onOpenAuth())}
              className="hidden rounded-xl bg-[#FCCB06] px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-[#FDE047] lg:inline-flex whitespace-nowrap shrink-0"
            >
              {user ? `Portal de Clientes (${unlockedApps.length}/6)` : 'Portal / Iniciar Sesión'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menú"
              className="rounded-lg border border-white/20 p-2 text-white lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/[0.1] bg-[#04060B] px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-2 text-sm font-bold text-[#D6DFF4]">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`rounded-lg px-3 py-2 text-left ${
                    activeTab === tab.id && !selectedProduct ? 'bg-white/[0.08] text-[#FCCB06]' : 'hover:text-[#FCCB06]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) onEnterWorkspace('OVERVIEW');
                else onOpenAuth();
              }}
              className="mt-4 w-full rounded-xl bg-[#FCCB06] py-2.5 text-xs font-bold text-black"
            >
              {user ? 'Abrir Portal de Clientes' : 'Entrar / Registrar Cuenta'}
            </button>
          </div>
        )}
      </header>

      {/* DEDICATED PRODUCT DETAIL VIEW */}
      {selectedProduct ? (
        <main className="mx-auto max-w-6xl px-6 py-12">
          <button
            type="button"
            onClick={() => setSelectedProductCode(null)}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#FCCB06] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar a {activeTab === 'inicio' ? 'Inicio' : 'Aplicaciones'}
          </button>

          <div className="blaugrana-hero-bg mt-6 rounded-2xl border border-white/[0.12] p-8 sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-bold text-[#FCCB06]">
                {selectedProduct.category} · Alojado en Amazon Web Services
              </p>
              <span className="font-mono text-xs text-[#94A3B8]">
                Disponibilidad {selectedProduct.limits.sla}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {selectedProduct.name}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#CBD5E1] sm:text-lg">
              {APP_SPANISH_SUMMARY[selectedProduct.code] || selectedProduct.tagline}
            </p>

            <div className="mt-9 grid grid-cols-1 gap-8 border-t border-white/[0.1] pt-8 md:grid-cols-2">
              <div>
                <h2 className="text-base font-bold text-white">Qué problema resuelve</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">{selectedProduct.problem}</p>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cómo funciona en tu empresa</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">{selectedProduct.solution}</p>
              </div>
            </div>

            <div className="mt-8 border-t border-white/[0.1] pt-8">
              <h3 className="text-sm font-bold text-white">Herramientas incluidas y Stack AWS</h3>
              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {selectedProduct.capabilities.map((cap) => (
                  <li key={cap} className="flex items-center gap-2 text-sm text-[#E2E8F0]">
                    <span className="text-[#FCCB06]">✓</span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-mono text-xs text-[#94A3B8]">
                Servicios AWS: {selectedProduct.awsStack.join(' · ')}
              </p>
            </div>
          </div>

          <div className="mt-10">
            <InteractivePlatformPreview initialApp={selectedProduct.code} />
          </div>

          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#FCCB06]">Planes disponibles</p>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  Elige el plan de {selectedProduct.name}
                </h2>
              </div>

              <div className="inline-flex rounded-xl border border-white/[0.12] bg-[#080D1B] p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                    billingCycle === 'monthly' ? 'bg-[#FCCB06] text-black' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                    billingCycle === 'annual' ? 'bg-[#FCCB06] text-black' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Anual (2 meses gratis)
                </button>
              </div>
            </div>

            {renderHorizontalTierRows(selectedProduct)}
          </div>
        </main>
      ) : activeTab === 'inicio' ? (
        /* TAB 1: INICIO (Split Hero w/ Live Interactive Workbench + ROI Configurator + Live AWS Topology + Precios en Fila) */
        <main>
          <section className="blaugrana-hero-bg border-b border-white/[0.08]">
            <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 lg:pb-20 lg:pt-16">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <p className="text-xs font-bold text-[#FCCB06]">
                    Amazon Web Services Multi-AZ · Google Workspace & Microsoft Outlook
                  </p>
                  <h1 className="mt-4 text-[clamp(2.2rem,4vw,3.45rem)] font-bold leading-[1.08] tracking-tight text-balance text-white">
                    Software empresarial real, unificado y{' '}
                    <span className="text-[#FCCB06]">siempre en línea.</span>
                  </h1>
                  <p className="mt-4 text-sm leading-relaxed text-[#E2E8F0] sm:text-base">
                    Controla analítica financiera, ventas CRM, inventarios, contabilidad, proyectos y automatizaciones en una misma plataforma alojada en Amazon Web Services. Prueba cada módulo aquí mismo a la derecha.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => switchTab('precios')}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#FCCB06] px-6 py-3.5 text-sm font-bold text-black transition-colors hover:bg-[#FDE047] whitespace-nowrap"
                    >
                      Ver Precios y Activar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (user ? onEnterWorkspace('OVERVIEW') : onOpenAuth())}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/70 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:border-[#FCCB06] hover:text-[#FCCB06] whitespace-nowrap"
                    >
                      <Lock className="h-4 w-4 text-[#FCCB06]" />
                      {user ? 'Abrir Portal de Clientes' : 'Entrar al Portal'}
                    </button>
                  </div>

                  <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/[0.12] pt-6">
                    <div>
                      <p className="text-xl font-bold tabular-nums text-white">99.99%</p>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8]">Disponibilidad Multi-AZ</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold tabular-nums text-white">6 Apps</p>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8]">Suite unificada en AWS</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold tabular-nums text-white">1-Clic SSO</p>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8]">Google y Microsoft Outlook</p>
                    </div>
                  </div>
                </div>

                {/* REAL INTERACTIVE SOFTWARE PREVIEW (REPLACES AI IMAGE) */}
                <div className="lg:col-span-6">
                  <InteractivePlatformPreview
                    initialApp="PULSE"
                    onSelectAppDetail={(code) => openProductDetail(code)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Team Sizing & ROI Configurator */}
          {renderInteractiveConfigurator()}

          {/* Interactive AWS Multi-AZ Topology Map */}
          <section className="mx-auto max-w-6xl px-6 pt-14">
            <AwsTopologyVisualizer onOpenAwsConsole={() => onEnterWorkspace('AWS_CLOUD')} />
          </section>

          {/* PRICING AT THE BOTTOM IN HORIZONTAL ROWS */}
          {renderPricingSection()}
        </main>
      ) : activeTab === 'aplicaciones' ? (
        /* TAB 2: APLICACIONES (Interactive Preview + Full 6-App Stack Matrix) */
        <main className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-bold text-[#FCCB06]">Ecosistema Completo NODAK</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Seis aplicaciones especializadas listas para producción
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
                Cambia entre las pestañas del simulador para inspeccionar cómo opera cada herramienta antes de activar tu licencia en Checkout.
              </p>
            </div>
            <div className="lg:col-span-7">
              <InteractivePlatformPreview
                initialApp="FLOW"
                onSelectAppDetail={(code) => openProductDetail(code)}
              />
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <div
                key={app.code}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.1] bg-[#070B16] p-7"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-semibold text-[#94A3B8]">{app.category}</span>
                    <span className="font-mono text-xs font-bold tabular-nums text-[#FCCB06]">
                      Desde {formatCurrencyExact(app.monthlyPriceCents)}/mes
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-white">{app.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                    {APP_SPANISH_SUMMARY[app.code] || app.tagline}
                  </p>
                  <p className="mt-3 font-mono text-[11px] text-[#94A3B8]">
                    AWS: {app.awsStack.join(' · ')}
                  </p>
                  <ul className="mt-4 space-y-1.5 border-t border-white/[0.08] pt-4 text-xs text-[#CBD5E1]">
                    {app.capabilities.slice(0, 4).map((c) => (
                      <li key={c} className="flex items-center gap-2">
                        <span className="text-[#FCCB06]">✓</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => openProductDetail(app.code)}
                    className="flex-1 rounded-xl border border-white/20 py-2.5 text-xs font-bold text-white transition-colors hover:border-[#FCCB06] hover:text-[#FCCB06]"
                  >
                    Ver ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenCheckout(`${app.code.toLowerCase()}-professional`, billingCycle)}
                    className="flex-1 rounded-xl bg-[#FCCB06] py-2.5 text-xs font-bold text-black transition-colors hover:bg-[#FDE047]"
                  >
                    Contratar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : activeTab === 'aws' ? (
        /* TAB 3: NUBE AWS (Real Interactive Topology + Security Controls Matrix) */
        <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-bold text-[#FCCB06]">Amazon Web Services</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Infraestructura preparada para no caerse nunca
              </h1>
              <p className="mt-2 text-sm text-[#CBD5E1] sm:text-base">
                Selecciona una región y haz clic sobre cualquiera de las tres zonas de disponibilidad para comprobar cómo se redirige el tráfico automáticamente sin perder conexión.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEnterWorkspace('AWS_CLOUD')}
              className="rounded-xl bg-[#FCCB06] px-5 py-3 text-xs font-bold text-black hover:bg-[#FDE047]"
            >
              Abrir consola AWS en vivo
            </button>
          </div>

          <AwsTopologyVisualizer onOpenAwsConsole={() => onEnterWorkspace('AWS_CLOUD')} />

          {/* Security & Compliance Matrix */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070B16]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/50 px-6 py-4">
              <h2 className="text-base font-bold text-white">Controles de seguridad y continuidad</h2>
              <ShieldCheck className="h-4 w-4 text-[#FCCB06]" />
            </div>
            <div className="divide-y divide-white/[0.08]">
              {SECURITY_CONTROLS.map((row) => (
                <div key={row.layer} className="grid grid-cols-1 items-center gap-4 px-6 py-5 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <p className="text-xs font-bold text-[#FCCB06]">{row.layer}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{row.control}</p>
                  </div>
                  <div className="md:col-span-7">
                    <p className="text-xs leading-relaxed text-[#CBD5E1]">{row.detail}</p>
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <span className="font-mono text-xs font-bold text-emerald-400">{row.standard}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      ) : activeTab === 'soluciones' ? (
        /* TAB 4: SOLUCIONES INTERACTIVAS POR ÁREA + FAQ */
        <main className="mx-auto max-w-6xl space-y-12 px-6 py-12">
          <div>
            <p className="text-xs font-bold text-[#FCCB06]">Casos Operativos Reales</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Cómo transforma NODAK cada área de tu empresa
            </h1>
          </div>

          {/* Interactive Department Blueprint */}
          <div className="rounded-2xl border border-white/[0.12] bg-[#070B16] p-6 sm:p-8">
            <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-5">
              {DEPARTMENT_CASES.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                    selectedDeptId === dept.id
                      ? 'bg-[#FCCB06] text-black'
                      : 'border border-white/15 bg-black/50 text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  {dept.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-5">
                <p className="text-xs font-bold text-rose-400">Problema habitual (Sin NODAK)</p>
                <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">{activeDept.before}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0B1430]/70 p-5">
                <p className="text-xs font-bold text-[#FCCB06]">Operación con NODAK</p>
                <p className="mt-2 text-sm leading-relaxed text-white">{activeDept.after}</p>
                <p className="mt-3 font-mono text-[11px] text-[#94A3B8]">
                  Módulos clave: {activeDept.appsUsed.join(' + ')}
                </p>
              </div>
              <div className="flex flex-col justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Resultado medible
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-white">{activeDept.outcome}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCheckout('suite-one', billingCycle)}
                  className="mt-4 w-full rounded-xl bg-[#FCCB06] py-2.5 text-xs font-bold text-black hover:bg-[#FDE047]"
                >
                  Activar flujo completo
                </button>
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="grid grid-cols-1 gap-10 border-t border-white/[0.1] pt-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-bold text-[#FCCB06]">Preguntas frecuentes</p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Respuestas claras antes de iniciar
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">
                Todo el sistema funciona en la nube sin instalaciones locales y con acceso único desde Google o Microsoft Outlook.
              </p>
            </div>

            <div className="space-y-3 lg:col-span-7">
              {FAQS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={item.q} className="rounded-xl border border-white/[0.1] bg-[#080C17]">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-white"
                    >
                      <span>{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-[#FCCB06]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="border-t border-white/[0.08] px-5 py-4 text-sm leading-relaxed text-[#CBD5E1]">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* TAB 5: PRECIOS EN FILA + SIMULADOR */
        <main>
          {renderInteractiveConfigurator()}
          {renderPricingSection()}
        </main>
      )}

      {/* QUIET FOOTER */}
      <footer className="border-t border-white/[0.1] bg-[#030509] py-10 text-xs text-[#94A3B8]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-4">
            <NodakLogo size="sm" />
            <span>© {new Date().getFullYear()} NODAK · Amazon Web Services Multi-AZ</span>
          </div>

          <div className="flex flex-wrap gap-6 font-semibold">
            {navTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className="transition-colors hover:text-[#FCCB06]"
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => (user ? onEnterWorkspace('OVERVIEW') : onOpenAuth())}
              className="text-[#FCCB06] hover:underline"
            >
              Portal de Clientes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
