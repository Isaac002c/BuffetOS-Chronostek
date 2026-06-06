'use client';

import Link from 'next/link';

// ─── ICONS ────────────────────────────────────────────────────────────────────

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  events: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="8" cy="15" r="1" fill="currentColor" />
      <circle cx="12" cy="15" r="1" fill="currentColor" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
    </svg>
  ),
  quotations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  team: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  leads: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  sheets: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

const navItems = [
  { key: 'dashboard',   label: 'Dashboard',  href: '/dashboard?module=buffet&tab=dashboard',   icon: 'dashboard' },
  { key: 'leads',       label: 'Leads',      href: '/dashboard?module=buffet&tab=leads',        icon: 'leads' },
  { key: 'events',      label: 'Calendário', href: '/dashboard?module=buffet&tab=events',       icon: 'events' },
  { key: 'quotations', label: 'Orçamentos',    href: '/dashboard?module=buffet&tab=quotations', icon: 'quotations' },
  { key: 'sheets',     label: 'Ficha Técnica', href: '/dashboard?module=buffet&tab=sheets',     icon: 'sheets'     },
  { key: 'billing',    label: 'Financeiro',    href: '/dashboard?module=buffet&tab=billing',    icon: 'billing'    },
  { key: 'team',       label: 'Equipe',        href: '/dashboard?module=buffet&tab=team',       icon: 'team'       },
];

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

export default function Sidebar({ activeTab, collapsed, mobileOpen, onToggleCollapse, onClose, badges = {} }) {
  return (
    <>
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}
        aria-label="Navegação principal"
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-mark" style={{ background: 'none', padding: 0, flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="ChronosTek"
              width={44}
              height={44}
              style={{
                objectFit: 'contain',
                borderRadius: 12,
                display: 'block',
                boxShadow: '0 0 14px rgba(96,165,250,0.45), 0 0 4px rgba(96,165,250,0.2)',
                border: '1px solid rgba(96,165,250,0.25)',
              }}
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
            <span style={{
              display: 'none', width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: '#fff', fontWeight: 800, fontSize: 15,
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(96,165,250,0.45)',
              letterSpacing: 0.5,
            }}>CT</span>
          </div>
          {!collapsed && (
            <div className="brand-info">
              <strong>ChronosTek</strong>
              <span>CRM Buffet</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-menu">
          {navItems.map(item => {
            const isActive = activeTab === item.key;
            const badge = badges[item.key];
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  {icons[item.icon] || icons.dashboard}
                </span>
                {!collapsed && <span className="sidebar-label">{item.label}</span>}
                {badge > 0 && (
                  <span className={`sidebar-badge ${badge > 5 ? 'critical' : ''}`}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && <p className="sidebar-footer-title">Suporte</p>}
          <a href="mailto:contato@chronostek.com.br" className="sidebar-footer-link">
            {collapsed ? '✉' : 'contato@chronostek.com.br'}
          </a>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      <button
        type="button"
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />
    </>
  );
}
