'use client';

import { useState } from 'react';

export default function QuickActionsMenu({ activeTab, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { 
      id: 'quotation', 
      label: 'Nova Cotação', 
      icon: '💼', 
      color: '#0ea5e9',
      action: () => {
        onNavigate?.('quotations');
        setIsOpen(false);
      }
    },
    { 
      id: 'lead', 
      label: 'Novo Lead', 
      icon: '👤', 
      color: '#8b5cf6',
      action: () => {
        onNavigate?.('leads');
        setIsOpen(false);
      }
    },
    { 
      id: 'event', 
      label: 'Novo Evento', 
      icon: '📅', 
      color: '#ec4899',
      action: () => {
        onNavigate?.('events');
        setIsOpen(false);
      }
    },
  ];

  return (
    <div className="quick-actions-container">
      {/* Menu de ações expandido */}
      {isOpen && (
        <>
          <div className="quick-actions-menu">
            {actions.map((action, index) => (
              <button
                key={action.id}
                className="quick-action-item"
                onClick={() => {
                  action.action?.();
                  setIsOpen(false);
                }}
                style={{
                  '--action-color': action.color,
                  '--action-delay': `${index * 0.1}s`,
                }}
                title={action.label}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
          {/* Backdrop para fechar menu */}
          <div 
            className="quick-actions-backdrop" 
            onClick={() => setIsOpen(false)} 
          />
        </>
      )}

      {/* Botão FAB flutuante */}
      <button
        className={`quick-actions-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Ações rápidas"
        aria-label="Menu de ações rápidas"
      >
        <span className="fab-icon">+</span>
      </button>
    </div>
  );
}
