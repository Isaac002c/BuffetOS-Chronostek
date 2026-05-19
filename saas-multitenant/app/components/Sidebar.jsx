'use client';

import Link from 'next/link';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard?module=buffet&tab=dashboard', icon: '' },
  { key: 'events', label: 'Eventos', href: '/dashboard?module=buffet&tab=events', icon: '' },
  { key: 'quotations', label: 'Orçamento', href: '/dashboard?module=buffet&tab=quotations', icon: '' },
  { key: 'billing', label: 'Financeiro', href: '/dashboard?module=buffet&tab=billing', icon: '' },
  { key: 'team', label: 'Equipe', href: '/dashboard?module=buffet&tab=team', icon: '' },
];

export default function Sidebar({ activeTab, collapsed, mobileOpen, onToggleCollapse, onClose, badges = {} }) {
  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-brand">
          <div className="brand-mark">CT</div>
          {!collapsed && (
            <div className="brand-info">
              <strong>ChronosTek</strong>
              <span>CRM Buffet</span>
            </div>
          )}
        </div>

        <nav className="sidebar-menu">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`sidebar-item ${activeTab === item.key ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              tabIndex={item.disabled ? -1 : 0}
              aria-current={activeTab === item.key ? 'page' : undefined}
            >
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
              {badges[item.key] && badges[item.key] > 0 && (
                <span className={`sidebar-badge ${badges[item.key] > 5 ? 'critical' : ''}`}>{badges[item.key]}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && <p className="sidebar-footer-title">Suporte</p>}
          <a href="mailto:suporte@chronostek.com.br" className="sidebar-footer-link">
            {!collapsed ? 'suporte@chronostek.com.br' : 'Suporte'}
          </a>

          <button type="button" className="sidebar-collapse-btn" onClick={onToggleCollapse} aria-label="Alternar menu lateral">
            {collapsed ? '»' : '«'}
          </button>
        </div>
      </aside>

      <button
        type="button"
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />
    </>
  );
}
