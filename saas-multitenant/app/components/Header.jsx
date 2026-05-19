'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumbs from './Breadcrumbs';

export default function Header({ user, tenant, onLogout, pageTitle, pageSubtitle, breadcrumbs = [], currentTab, onToggleSidebar }) {
  const router = useRouter();
  const [role, setRole] = useState('seller');
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
    }
  }, [user]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const tab = currentTab || 'quotations';
    const query = searchValue.trim() ? `?module=buffet&tab=${tab}&search=${encodeURIComponent(searchValue.trim())}` : `?module=buffet&tab=${tab}`;
    router.push(`/dashboard${query}`);
  };

  const getRoleBadge = () => {
    if (role === 'admin') {
      return { label: 'ADMIN', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
    }
    return { label: 'VENDEDOR', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
  };

  const roleBadge = getRoleBadge();

  return (
    <header className="global-header" role="banner">
      <div className="topbar-left">
        <button type="button" className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Abrir menu lateral">
          ☰
        </button>
        <div className="page-summary">
          <div className="page-meta">
            <span className="page-tag">CRM Buffet</span>
            <Breadcrumbs items={breadcrumbs} />
          </div>
          <div className="page-heading">
            <h1 className="page-title">{pageTitle || 'Painel'}</h1>
            {pageSubtitle && <p className="page-description">{pageSubtitle}</p>}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <form className="header-search" onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="global-search" className="sr-only">Buscar no sistema</label>
          <input
            id="global-search"
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Buscar eventos, orçamentos ou propostas"
            className="search-input"
            aria-describedby="search-help"
          />
          <button type="submit" className="search-button" aria-label="Executar busca">
            🔍
          </button>
          <div id="search-help" className="sr-only">
            Pressione Enter para buscar ou use as setas para navegar nos resultados.
          </div>
        </form>

        <button type="button" className="icon-btn notification-btn" aria-label="Notificações">
          🔔
        </button>

        {tenant && (
          <div className="tenant-badge" aria-label={`Empresa atual: ${tenant.name}`}>
            <span className="tenant-icon" aria-hidden="true">🏢</span>
            <span>{tenant.name}</span>
          </div>
        )}

        <div className="header-user-info">
          <div className="user-avatar" aria-label={`Avatar do usuário ${user?.name || 'Usuário'}`}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button onClick={onLogout} className="logout-btn-header" aria-label="Fazer logout do sistema">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

