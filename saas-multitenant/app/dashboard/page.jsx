'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ModuleLayout from '../components/ModuleLayout';
import QuickActionsMenu from '../components/QuickActionsMenu';
import { apiRequest } from '../lib/api';

import BuffetQuotations from '../buffet/Quotations';
import BuffetEvents     from '../buffet/Events';
import BuffetBilling    from '../buffet/Billing';
import BuffetLeads      from '../buffet/Leads';
import BuffetTeam       from '../buffet/Team';
import BuffetDashboard  from '../buffet/Dashboard';
import QuotationSimulator from '../buffet/QuotationSimulator';

const modulePages = {
  buffet: {
    name: 'Buffet',
    pages: {
      dashboard: BuffetDashboard,
      quotations: BuffetQuotations,
      simulator: QuotationSimulator,
      events:     BuffetEvents,
      leads:      BuffetLeads,
      billing:    BuffetBilling,
      team:       BuffetTeam,
    }
  },
};

const pageInfo = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'VisÃ£o geral das mÃ©tricas importantes do seu negÃ³cio.',
  },
  quotations: {
    title: 'OrÃ§amentos',
    subtitle: 'Controle rÃ¡pido e preciso das suas propostas e pipeline de vendas.',
  },
  simulator: {
    title: 'Simulador',
    subtitle: 'Crie propostas Ã¡geis com visual moderno e dados claros.',
  },
  events: {
    title: 'Eventos',
    subtitle: 'Agenda limpa com foco em visualizaÃ§Ã£o e criaÃ§Ã£o de eventos.',
  },
  leads: {
    title: 'Leads',
    subtitle: 'Gerencie oportunidades e contatos de maneira mais fluida.',
  },
  billing: {
    title: 'Financeiro',
    subtitle: 'Visualize receitas, lanÃ§amentos e tendÃªncias de faturamento.',
  },
  team: {
    title: 'Equipe',
    subtitle: 'Gerencie os membros da sua equipe e suas informaÃ§Ãµes.',
  },
};

const getDefaultTab = () => 'dashboard';

function CachedTabs({ moduleKey, activeTab }) {
  const moduleData = modulePages[moduleKey] || modulePages.buffet;
  const mountedRef = useRef({});

  return (
    <>
      {Object.entries(moduleData.pages).map(([key, Page]) => {
        const isActive = key === activeTab;
        if (!isActive && !mountedRef.current[key]) return null;
        mountedRef.current[key] = true;
        return (
          <div key={key} style={{ display: isActive ? 'block' : 'none' }}>
            <Page />
          </div>
        );
      })}
    </>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser]       = useState(null);
  const [tenant, setTenant]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState({});

  const currentModule = 'buffet';
  const urlTab = searchParams.get('tab') || getDefaultTab();

  useEffect(() => {
    // Verifica token no localStorage (mais confiÃ¡vel que checar string no cookie)
    const token      = localStorage.getItem('token') || localStorage.getItem('auth-token');
    const userData   = localStorage.getItem('user');
    const tenantData = localStorage.getItem('tenant');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      setTenant(JSON.parse(tenantData || '{}'));
    } catch (e) {
      console.error('[Dashboard] Erro ao parsear dados do usuÃ¡rio:', e);
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const loadBadgeCounts = async () => {
    try {
      const quotesRes = await apiRequest('/api/quotations?status=draft').catch(() => null);
      const leadsRes  = await apiRequest('/api/leads/inactive').catch(() => null);
      const eventsRes = await apiRequest('/api/events?status=pending').catch(() => null);

      const quotes        = quotesRes?.data || quotesRes || [];
      const inactiveLeads = leadsRes?.data  || leadsRes  || [];
      const events        = eventsRes?.data || eventsRes || [];

      setBadges({
        quotations: Array.isArray(quotes)        ? quotes.length        : 0,
        leads:      Array.isArray(inactiveLeads) ? inactiveLeads.length : 0,
        events:     Array.isArray(events)        ? events.length        : 0,
      });
    } catch (err) {
      console.error('Erro ao carregar contadores:', err);
    }
  };

  useEffect(() => {
    loadBadgeCounts();
    const interval = setInterval(loadBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error(err);
    } finally {
      ['user', 'tenant', 'token', 'auth-token', 'tenantId', 'tenant-id'].forEach(k =>
        localStorage.removeItem(k)
      );
      ['token', 'auth-token', 'tenantId'].forEach(k => {
        document.cookie = `${k}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      });
      router.push('/login');
    }
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
    router.push(`/dashboard?module=${currentModule}&tab=${tabKey}`);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Carregando ChronosTek...</p>
    </div>
  );

  const pageMeta = pageInfo[activeTab] || { title: 'Painel', subtitle: 'VisÃ£o geral do sistema.' };
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard?module=buffet&tab=quotations' },
    { label: pageMeta.title, href: `/dashboard?module=${currentModule}&tab=${activeTab}` },
  ];

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onClose={() => setMobileMenuOpen(false)}
        badges={badges}
      />

      <div className="content-shell">
        <Header
          user={user}
          tenant={tenant}
          onLogout={handleLogout}
          pageTitle={pageMeta.title}
          pageSubtitle={pageMeta.subtitle}
          currentTab={activeTab}
          breadcrumbs={breadcrumbs}
          onToggleSidebar={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="main-area">
          <ModuleLayout>
            <CachedTabs moduleKey={currentModule} activeTab={activeTab} />
          </ModuleLayout>
        </main>
      </div>

      <QuickActionsMenu activeTab={activeTab} onNavigate={handleTabChange} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Carregando...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
