'use client';

import { useEffect, useState } from 'react';

export default function Header({ user, tenant, onLogout, pageTitle, pageSubtitle, onToggleSidebar }) {
  const [role, setRole] = useState('');

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user]);

  const roleCfg = role === 'admin'
    ? { label: 'Admin',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' }
    : { label: 'Vendedor', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };

  return (
    <header className="global-header" role="banner">
      {/* ── LEFT ── */}
      <div className="topbar-left">
        {/* Hamburger — visível apenas no mobile via CSS */}
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="page-summary">
          <h1 className="page-title">{pageTitle || 'Painel'}</h1>
          {pageSubtitle && <p className="page-description header-subtitle">{pageSubtitle}</p>}
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="topbar-right">
        {tenant?.name && (
          <div className="tenant-badge header-tenant" aria-label={`Empresa: ${tenant.name}`}>
            <span>{tenant.name}</span>
          </div>
        )}

        {role && (
          <span className="header-role" style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            color: roleCfg.color, background: roleCfg.bg, letterSpacing: 0.3,
          }}>
            {roleCfg.label}
          </span>
        )}

        <div className="header-user-info">
          <div
            className="user-avatar"
            title={user?.name || 'Usuário'}
            aria-label={`Usuário: ${user?.name || 'Usuário'}`}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button
            onClick={onLogout}
            className="logout-btn-header"
            aria-label="Sair do sistema"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
