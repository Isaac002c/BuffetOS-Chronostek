'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ModuleLayout from '../components/ModuleLayout';
import { apiRequest } from '../lib/api';

import BuffetQuotations from '../buffet/Quotations';
import BuffetEvents     from '../buffet/Events';
import BuffetBilling    from '../buffet/Billing';
import BuffetLeads      from '../buffet/Leads';
import BuffetTeam       from '../buffet/Team';
import BuffetDashboard  from '../buffet/Dashboard';

const modulePages = {
  buffet: {
    name: 'Buffet',
    pages: {
      dashboard:  BuffetDashboard,
      quotations: BuffetQuotations,
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
    subtitle: 'Visão geral das métricas importantes do seu negócio.',
  },
  quotations: {
    title: 'Orçamentos',
    subtitle: 'Controle rápido e preciso das suas propostas e pipeline de vendas.',
  },
  events: {
    title: 'Calendário',
    subtitle: 'Agenda limpa com foco em visualização e criação de eventos.',
  },
  leads: {
    title: 'Leads',
    subtitle: 'Gerencie oportunidades e contatos de maneira mais fluida.',
  },
  billing: {
    title: 'Financeiro',
    subtitle: 'Visualize receitas, lançamentos e tendências de faturamento.',
  },
  team: {
    title: 'Equipe',
    subtitle: 'Gerencie os membros da sua equipe e suas informações.',
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
    // O JWT fica apenas no cookie httpOnly (não lido por JS).
    // Verificamos presença dos dados de sessão salvos no login.
    const userData   = localStorage.getItem('user');
    const tenantData = localStorage.getItem('tenant');

    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      setTenant(JSON.parse(tenantData || '{}'));
    } catch (e) {
      console.error('[Dashboard] Erro ao parsear dados do usuário:', e);
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    setActiveTab(urlTab);
    // No mobile, fecha o drawer ao navegar (UX)
    setMobileMenuOpen(false);
  }, [urlTab]);

  // Badges desativados — sem contador no menu de Orçamentos
  // Para reativar, descomentar e reimplementar loadBadgeCounts

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', {
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

  const pageMeta = pageInfo[activeTab] || { title: 'Painel', subtitle: 'Visão geral do sistema.' };

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
          onToggleSidebar={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="main-area">
          <ModuleLayout>
            <CachedTabs moduleKey={currentModule} activeTab={activeTab} />
          </ModuleLayout>
        </main>
      </div>

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
