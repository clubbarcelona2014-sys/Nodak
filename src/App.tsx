import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal.tsx';
import { LandingView } from './components/LandingView.tsx';
import { SpotifyCheckoutModal } from './components/SpotifyCheckoutModal.tsx';
import { WorkspaceShell } from './components/WorkspaceShell.tsx';
import { apiRequest, setStoredToken } from './lib/api.ts';
import type {
  AppCatalogItem,
  AppCode,
  AwsRegionInfo,
  InvoiceRecord,
  SubscriptionSummary,
  SuitePlan,
  UserProfile,
  WorkspaceSection,
} from './types.ts';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('OVERVIEW');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [apps, setApps] = useState<AppCatalogItem[]>([]);
  const [suites, setSuites] = useState<SuitePlan[]>([]);
  const [regions, setRegions] = useState<AwsRegionInfo[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [unlockedApps, setUnlockedApps] = useState<AppCode[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState('pulse-professional');
  const [checkoutCycle, setCheckoutCycle] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const loadSessionAndBilling = useCallback(async () => {
    try {
      const [meRes, billingRes] = await Promise.all([
        apiRequest<{ authenticated: boolean; user: UserProfile | null }>('/api/v1/auth/me'),
        apiRequest<{ subscription: SubscriptionSummary | null; unlockedApps?: AppCode[]; invoices: InvoiceRecord[] }>(
          '/api/v1/billing/summary'
        ),
      ]);
      setUser(meRes.authenticated ? meRes.user : null);
      setSubscription(billingRes.subscription);
      setUnlockedApps(billingRes.unlockedApps || []);
      setInvoices(billingRes.invoices || []);
    } catch {
      // Keep UI resilient even on transient network errors
    }
  }, []);

  useEffect(() => {
    apiRequest<{ apps: AppCatalogItem[]; suites: SuitePlan[]; regions: AwsRegionInfo[] }>('/api/v1/plans')
      .then((res) => {
        setApps(res.apps);
        setSuites(res.suites);
        setRegions(res.regions);
      })
      .catch(() => {});

    loadSessionAndBilling();
  }, [loadSessionAndBilling]);

  const handleEnterWorkspace = (section: WorkspaceSection = 'PULSE') => {
    setActiveSection(section);
    setViewMode('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCheckout = (planId = 'suite-one', cycle: 'monthly' | 'annual' = 'annual') => {
    setCheckoutPlanId(planId);
    setCheckoutCycle(cycle);
    setCheckoutOpen(true);
  };

  const handleAuthenticated = (authedUser: UserProfile, token: string) => {
    setStoredToken(token);
    setUser(authedUser);
    loadSessionAndBilling();
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setStoredToken(null);
    setUser(null);
    setSubscription(null);
    setUnlockedApps([]);
    setInvoices([]);
  };

  return (
    <>
      {viewMode === 'landing' ? (
        <LandingView
          apps={apps}
          suites={suites}
          user={user}
          unlockedApps={unlockedApps}
          onEnterWorkspace={handleEnterWorkspace}
          onOpenAuth={() => setAuthOpen(true)}
          onOpenCheckout={handleOpenCheckout}
        />
      ) : (
        <WorkspaceShell
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          onBackToLanding={() => setViewMode('landing')}
          user={user}
          apps={apps}
          unlockedApps={unlockedApps}
          onOpenAuth={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onOpenCheckout={(planId, cycle) => handleOpenCheckout(planId || 'suite-one', cycle || 'annual')}
          subscription={subscription}
          invoices={invoices}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((d) => !d)}
        />
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      <SpotifyCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        initialPlanId={checkoutPlanId}
        initialBillingCycle={checkoutCycle}
        apps={apps}
        suites={suites}
        regions={regions}
        user={user}
        onRequireAuth={() => setAuthOpen(true)}
        onCheckoutSuccess={() => {
          loadSessionAndBilling();
        }}
        onLaunchPortal={(firstApp) => handleEnterWorkspace(firstApp)}
      />
    </>
  );
}
