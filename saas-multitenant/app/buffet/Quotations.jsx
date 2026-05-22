'use client';

import { useState, useEffect } from 'react';
import {
  getAllQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  duplicateQuotation,
  approveQuotation,
  cancelQuotation,
} from '../lib/quotationsAPI.js';
import { getClients } from '../lib/clientsAPI.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EVENT_TEMPLATES = [
  {
    id: 'wedding',
    name: 'Casamento',
    description: 'Cerimônia e recepção completa para o grande dia',
    emoji: '💍',
    accentColor: '#f43f5e',
    bgColor: '#fff1f2',
    tags: ['Premium', 'Romântico'],
    priceRange: 'R$ 80k – R$ 200k',
    guestAvg: '150 – 300 pessoas',
    defaults: { event_type: 'Casamento', guest_count: 200 },
    items: [
      { item_name: 'Menu principal (por pessoa)', quantity: 200, unit_price: 120 },
      { item_name: 'Open bar premium (por pessoa)', quantity: 200, unit_price: 80 },
      { item_name: 'Mesa de doces decorada', quantity: 1, unit_price: 3500 },
      { item_name: 'Bem-casados personalizados', quantity: 200, unit_price: 8 },
      { item_name: 'Garçons (por diária)', quantity: 8, unit_price: 280 },
    ],
  },
  {
    id: 'debutante',
    name: '15 Anos',
    description: 'Festa de debutante inesquecível com toda a magia',
    emoji: '👑',
    accentColor: '#8b5cf6',
    bgColor: '#f5f3ff',
    tags: ['Premium', 'Especial'],
    priceRange: 'R$ 40k – R$ 100k',
    guestAvg: '100 – 200 pessoas',
    defaults: { event_type: 'Debutante (15 anos)', guest_count: 150 },
    items: [
      { item_name: 'Jantar completo (por pessoa)', quantity: 150, unit_price: 110 },
      { item_name: 'Bolo debutante (andares)', quantity: 1, unit_price: 1200 },
      { item_name: 'Mesa de doces temática', quantity: 1, unit_price: 2800 },
      { item_name: 'Salgados de entrada (por pessoa)', quantity: 150, unit_price: 20 },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Eventos empresariais com sofisticação e profissionalismo',
    emoji: '🏢',
    accentColor: '#2563eb',
    bgColor: '#eff6ff',
    tags: ['Business', 'Formal'],
    priceRange: 'R$ 20k – R$ 80k',
    guestAvg: '50 – 200 pessoas',
    defaults: { event_type: 'Corporativo', guest_count: 100 },
    items: [
      { item_name: 'Coffee break executivo (por pessoa)', quantity: 100, unit_price: 45 },
      { item_name: 'Almoço corporativo (por pessoa)', quantity: 100, unit_price: 85 },
      { item_name: 'Garçons (por diária)', quantity: 4, unit_price: 280 },
    ],
  },
  {
    id: 'island',
    name: 'Ilha Gourmet',
    description: 'Experiência gastronômica premium com ilhas temáticas',
    emoji: '🍽️',
    accentColor: '#10b981',
    bgColor: '#ecfdf5',
    tags: ['Gourmet', 'Premium'],
    priceRange: 'R$ 15k – R$ 50k',
    guestAvg: '50 – 150 pessoas',
    defaults: { event_type: 'Ilha Gourmet', guest_count: 80 },
    items: [
      { item_name: 'Ilha de frios e queijos', quantity: 1, unit_price: 2500 },
      { item_name: 'Ilha de grelhados', quantity: 1, unit_price: 3200 },
      { item_name: 'Ilha de frutos do mar', quantity: 1, unit_price: 4500 },
      { item_name: 'Ilha de sobremesas', quantity: 1, unit_price: 2000 },
    ],
  },
  {
    id: 'children',
    name: 'Infantil',
    description: 'Festa temática com diversão e alegria para as crianças',
    emoji: '🎈',
    accentColor: '#f59e0b',
    bgColor: '#fffbeb',
    tags: ['Kids', 'Temático'],
    priceRange: 'R$ 8k – R$ 25k',
    guestAvg: '50 – 100 pessoas',
    defaults: { event_type: 'Festa Infantil', guest_count: 60 },
    items: [
      { item_name: 'Salgados para crianças (por pessoa)', quantity: 60, unit_price: 35 },
      { item_name: 'Bolo temático personalizado', quantity: 1, unit_price: 800 },
      { item_name: 'Docinhos e guloseimas (por pessoa)', quantity: 60, unit_price: 15 },
    ],
  },
  {
    id: 'graduation',
    name: 'Formatura',
    description: 'Celebre a conquista acadêmica com uma festa memorável',
    emoji: '🎓',
    accentColor: '#f97316',
    bgColor: '#fff7ed',
    tags: ['Celebração', 'Formal'],
    priceRange: 'R$ 30k – R$ 80k',
    guestAvg: '100 – 250 pessoas',
    defaults: { event_type: 'Formatura', guest_count: 180 },
    items: [
      { item_name: 'Jantar completo (por pessoa)', quantity: 180, unit_price: 115 },
      { item_name: 'Open bar (por pessoa)', quantity: 180, unit_price: 65 },
      { item_name: 'Garçons (por diária)', quantity: 8, unit_price: 280 },
    ],
  },
  {
    id: 'custom',
    name: 'Criar do Zero',
    description: 'Monte seu evento personalizado com total liberdade criativa',
    emoji: '✨',
    accentColor: '#6366f1',
    bgColor: '#f8faff',
    tags: ['Personalizado', 'Livre'],
    priceRange: 'Sob consulta',
    guestAvg: 'Variável',
    defaults: { event_type: '', guest_count: 0 },
    items: [],
  },
];

const SMART_BLOCKS = [
  {
    id: 'buffet',
    name: 'Buffet Completo',
    icon: '🍽️',
    description: 'Menu, entradas e sobremesas',
    items: [
      { item_name: 'Menu principal (por pessoa)', quantity: 100, unit_price: 110 },
      { item_name: 'Entradas e antepastos', quantity: 100, unit_price: 25 },
      { item_name: 'Sobremesas variadas', quantity: 100, unit_price: 28 },
    ],
  },
  {
    id: 'open_bar',
    name: 'Open Bar',
    icon: '🍹',
    description: 'Bebidas, drinks e coquetéis',
    items: [
      { item_name: 'Open bar completo (por pessoa)', quantity: 100, unit_price: 75 },
      { item_name: 'Drinks e coquetéis especiais', quantity: 30, unit_price: 22 },
    ],
  },
  {
    id: 'sweets',
    name: 'Mesa de Doces',
    icon: '🎂',
    description: 'Bolo, docinhos e guloseimas',
    items: [
      { item_name: 'Mesa de doces decorada', quantity: 1, unit_price: 2800 },
      { item_name: 'Bolo decorativo personalizado', quantity: 1, unit_price: 950 },
      { item_name: 'Docinhos finos (por unidade)', quantity: 200, unit_price: 4 },
    ],
  },
  {
    id: 'decor',
    name: 'Decoração',
    icon: '🌸',
    description: 'Flores, arranjos e ambientação',
    items: [
      { item_name: 'Decoração floral central', quantity: 1, unit_price: 3500 },
      { item_name: 'Arranjos de mesa (por mesa)', quantity: 15, unit_price: 180 },
    ],
  },
  {
    id: 'music',
    name: 'DJ / Música',
    icon: '🎵',
    description: 'DJ profissional e equipamento de som',
    items: [
      { item_name: 'DJ profissional (6h)', quantity: 1, unit_price: 2200 },
      { item_name: 'Equipamento de som premium', quantity: 1, unit_price: 1800 },
    ],
  },
  {
    id: 'staff',
    name: 'Equipe Extra',
    icon: '👥',
    description: 'Garçons, barman e coordenador',
    items: [
      { item_name: 'Garçons (por diária)', quantity: 5, unit_price: 280 },
      { item_name: 'Barman profissional', quantity: 2, unit_price: 350 },
      { item_name: 'Maitre / coordenador', quantity: 1, unit_price: 500 },
    ],
  },
];

const STATUS_CFG = {
  draft:     { label: 'Rascunho',  color: '#64748b', bg: '#f1f5f9' },
  approved:  { label: 'Aprovado',  color: '#16a34a', bg: '#dcfce7' },
  active:    { label: 'Ativo',     color: '#2563eb', bg: '#dbeafe' },
  completed: { label: 'Concluído', color: '#7c3aed', bg: '#ede9fe' },
  cancelled: { label: 'Cancelado', color: '#dc2626', bg: '#fee2e2' },
};

const emptyForm = {
  client_id: '',
  event_type: '',
  event_date: '',
  guest_count: 0,
  status: 'draft',
  notes: '',
  discount_percent: 0,
};

const emptyItem = { item_name: '', quantity: 1, unit_price: 0 };

// ─── UTILS ────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── SHARED STYLE OBJECTS ─────────────────────────────────────────────────────

const S = {
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#f8fafc',
    color: '#1e293b',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  card: {
    background: 'white',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: size === 'sm' ? '3px 10px' : '5px 14px',
      borderRadius: 999,
      fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const isErr = message.type === 'error';
  const isOk  = message.type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 20px',
      borderRadius: 14,
      boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
      background: isErr ? '#fef2f2' : isOk ? '#f0fdf4' : '#eff6ff',
      border: `1px solid ${isErr ? '#fecaca' : isOk ? '#bbf7d0' : '#bfdbfe'}`,
      color: isErr ? '#dc2626' : isOk ? '#16a34a' : '#2563eb',
      fontSize: 14,
      fontWeight: 500,
      animation: 'slideInRight 0.3s ease',
      maxWidth: 400,
    }}>
      <span style={{ fontSize: 18 }}>{isErr ? '⚠️' : isOk ? '✓' : 'ℹ'}</span>
      <span style={{ flex: 1 }}>{message.text}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 16, opacity: 0.5, padding: '0 0 0 8px',
      }}>✕</button>
    </div>
  );
}

// ─── TEMPLATE GALLERY ─────────────────────────────────────────────────────────

function TemplateGallery({ onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,23,42,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', borderRadius: 24,
        width: '100%', maxWidth: 1000, maxHeight: '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '32px 40px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Escolha um modelo de evento
            </h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 15 }}>
              Selecione um template — os itens serão pré-configurados automaticamente.
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: 12, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 18, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Grid */}
        <div style={{
          padding: '24px 40px 40px', overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 18,
        }}>
          {EVENT_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => onSelect(tpl)} style={{
              background: tpl.bgColor,
              border: `2px solid transparent`,
              borderRadius: 20, padding: 24,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s ease', position: 'relative',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = tpl.accentColor;
              e.currentTarget.style.boxShadow = `0 12px 32px ${tpl.accentColor}30`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ fontSize: 44, marginBottom: 14, lineHeight: 1 }}>{tpl.emoji}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                {tpl.name}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
                {tpl.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {tpl.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px',
                    borderRadius: 999, background: `${tpl.accentColor}18`, color: tpl.accentColor,
                  }}>{tag}</span>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${tpl.accentColor}25`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Faixa de valor</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{tpl.priceRange}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{tpl.guestAvg}</div>
              </div>
              {tpl.items.length > 0 && (
                <span style={{
                  position: 'absolute', top: 14, right: 14,
                  fontSize: 11, fontWeight: 600, padding: '3px 9px',
                  borderRadius: 999, background: `${tpl.accentColor}18`, color: tpl.accentColor,
                }}>
                  {tpl.items.length} itens
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SMART BLOCK SELECTOR ─────────────────────────────────────────────────────

function SmartBlockSelector({ onAddBlock, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1800,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(3px)',
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 860, maxHeight: '70vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              ⚡ Adicionar Bloco Inteligente
            </h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
              Blocos pré-configurados com itens e estrutura operacional
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{
          padding: '20px 32px 32px', overflow: 'auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14,
        }}>
          {SMART_BLOCKS.map(block => (
            <button key={block.id} onClick={() => { onAddBlock(block); onClose(); }} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 16, padding: '18px 16px',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{block.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{block.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{block.description}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>+{block.items.length} itens incluídos</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BUILDER SECTION ──────────────────────────────────────────────────────────

function BuilderSection({ title, icon, action, children }) {
  return (
    <div style={S.card}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid #f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

// ─── ITEM ROW ─────────────────────────────────────────────────────────────────

function ItemRow({ item, idx, onChange, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const subtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 90px 140px 110px 36px',
      gap: 8,
      alignItems: 'center',
      padding: '6px 8px',
      borderRadius: 10,
      background: hovered ? '#f8fafc' : 'transparent',
      transition: 'background 0.15s',
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}>
      <input
        type="text"
        value={item.item_name}
        placeholder="Descrição do item ou serviço"
        onChange={e => onChange(idx, 'item_name', e.target.value)}
        style={{ ...S.input, padding: '8px 12px', fontSize: 13 }}
      />
      <input
        type="number" min={1}
        value={item.quantity}
        onChange={e => onChange(idx, 'quantity', e.target.value)}
        style={{ ...S.input, padding: '8px 10px', fontSize: 13, textAlign: 'center' }}
      />
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12, pointerEvents: 'none',
        }}>R$</span>
        <input
          type="number" min={0} step="0.01"
          value={item.unit_price}
          onChange={e => onChange(idx, 'unit_price', e.target.value)}
          style={{ ...S.input, padding: '8px 10px 8px 30px', fontSize: 13 }}
        />
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#1e293b',
        padding: '8px 10px', background: '#f1f5f9', borderRadius: 8,
        textAlign: 'right', whiteSpace: 'nowrap',
      }}>
        R$ {fmt(subtotal)}
      </div>
      <button onClick={() => onRemove(idx)} style={{
        width: 36, height: 36, borderRadius: 8,
        border: '1px solid #fecaca', background: '#fef2f2',
        color: '#dc2626', cursor: 'pointer', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}>
        ×
      </button>
    </div>
  );
}

// ─── FINANCIAL SIDEBAR ────────────────────────────────────────────────────────

function FinRow({ label, value, bold, muted, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: muted ? '#94a3b8' : '#64748b' }}>{label}</span>
      <span style={{
        fontSize: bold ? 15 : 13,
        fontWeight: bold ? 700 : 500,
        color: valueColor || (bold ? '#0f172a' : '#334155'),
      }}>{value}</span>
    </div>
  );
}

function FinancialSidebar({
  subtotal, discountPct, discountAmt, total,
  guestCount, costPerPerson, profit, marginPct,
  onSave, loading, editingQuotation, status, onApprove,
}) {
  return (
    <div style={{ ...S.card, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
      <div style={{
        padding: '18px 20px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>💰</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Resumo Financeiro</h3>
      </div>

      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <FinRow label="Subtotal" value={`R$ ${fmt(subtotal)}`} />
          {discountPct > 0 && (
            <FinRow
              label={`Desconto (${discountPct}%)`}
              value={`−R$ ${fmt(discountAmt)}`}
              valueColor="#dc2626"
            />
          )}
          <div style={{ height: 1, background: '#f1f5f9' }} />
          <FinRow label="Total" value={`R$ ${fmt(total)}`} bold />
          {guestCount > 0 && (
            <FinRow label="Custo / Pessoa" value={`R$ ${fmt(costPerPerson)}`} muted />
          )}
          <div style={{ height: 1, background: '#f1f5f9' }} />
          <FinRow
            label={`Margem estimada (${marginPct}%)`}
            value={`R$ ${fmt(profit)}`}
            valueColor="#16a34a"
            bold
          />
        </div>

        {/* Total highlight */}
        <div style={{
          margin: '18px 0 0',
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          borderRadius: 14, padding: '16px 18px',
          border: '1px solid #bfdbfe',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Valor total da proposta
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1e40af', lineHeight: 1 }}>
            R$ {fmt(total)}
          </div>
          {guestCount > 0 && (
            <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 6 }}>
              R$ {fmt(costPerPerson)} por pessoa · {guestCount} convidados
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button onClick={onSave} disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontSize: 14, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}>
            {loading ? 'Salvando...' : editingQuotation ? '💾 Salvar alterações' : '✓ Criar orçamento'}
          </button>

          {editingQuotation && status !== 'approved' && status !== 'cancelled' && (
            <button onClick={onApprove} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: '#dcfce7', color: '#16a34a', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              ✓ Aprovar proposta
            </button>
          )}

          <button style={{
            width: '100%', padding: '11px', borderRadius: 12,
            border: '1px solid #e2e8f0', background: '#f8fafc',
            color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            📄 Gerar PDF
          </button>

          <button style={{
            width: '100%', padding: '11px', borderRadius: 12,
            border: '1px solid #dcfce7', background: '#f0fdf4',
            color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            💬 Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QUOTATION BUILDER ────────────────────────────────────────────────────────

function QuotationBuilder({
  form, items, clients, editingQuotation, loading,
  onFieldChange, onItemChange, onAddItem, onRemoveItem,
  onAddBlock, onSubmit, onBack, onApprove, onChangeTemplate,
}) {
  const [showBlocks, setShowBlocks] = useState(false);

  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
  const discountAmt = subtotal * (Number(form.discount_percent || 0) / 100);
  const total = subtotal - discountAmt;
  const costPerPerson = form.guest_count > 0 ? total / form.guest_count : 0;
  const marginPct = 35;
  const profit = total * (marginPct / 100);

  const clientName = clients.find(c => String(c.id) === String(form.client_id))?.name || 'Selecione o cliente';

  const heroMetrics = [
    { label: 'Valor Total',   value: `R$ ${fmt(total)}`,                        icon: '💰', color: '#2563eb' },
    { label: 'Lucro Est.',    value: `R$ ${fmt(profit)}`,                       icon: '📈', color: '#16a34a' },
    { label: 'Convidados',    value: form.guest_count > 0 ? form.guest_count : '—', icon: '👥', color: '#7c3aed' },
    { label: 'Data',          value: form.event_date ? new Date(form.event_date + 'T00:00').toLocaleDateString('pt-BR') : '—', icon: '📅', color: '#f59e0b' },
    { label: 'Custo/Pessoa',  value: form.guest_count > 0 ? `R$ ${fmt(costPerPerson)}` : '—', icon: '🧮', color: '#06b6d4' },
    { label: 'Margem',        value: `${marginPct}%`,                          icon: '📊', color: '#f43f5e' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Sticky Builder Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, gap: 16,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <button onClick={onBack} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '7px 14px', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ← Voltar
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.event_type || 'Novo Evento'} — {clientName}
                </span>
                <StatusBadge status={form.status} />
              </div>
              {editingQuotation && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                  #{editingQuotation.id} · Editando orçamento
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={onChangeTemplate} style={{
              padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              🎨 Template
            </button>
            {editingQuotation && form.status !== 'approved' && form.status !== 'cancelled' && (
              <button onClick={onApprove} style={{
                padding: '7px 14px', borderRadius: 10, border: 'none',
                background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                ✓ Aprovar
              </button>
            )}
            <button onClick={onSubmit} disabled={loading} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Salvando...' : editingQuotation ? '💾 Salvar' : '✓ Criar'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics */}
      <div style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 12,
          }}>
            {heroMetrics.map(m => (
              <div key={m.label} style={{
                background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #f1f5f9',
              }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, marginBottom: 3 }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Builder */}
      <div style={{
        maxWidth: 1400, margin: '0 auto', padding: '24px',
        display: 'flex', gap: 24, alignItems: 'flex-start',
      }}>
        {/* Left: Sections */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Dados do Evento */}
          <BuilderSection title="Dados do Evento" icon="📋">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Cliente *</label>
                <select value={form.client_id} onChange={e => onFieldChange('client_id', e.target.value)} style={S.input}>
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Tipo de Evento *</label>
                <input
                  type="text" value={form.event_type}
                  onChange={e => onFieldChange('event_type', e.target.value)}
                  placeholder="Ex: Casamento, Formatura, Corporativo"
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Data do Evento *</label>
                <input
                  type="date" value={form.event_date}
                  onChange={e => onFieldChange('event_date', e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Convidados</label>
                <input
                  type="number" min={0} value={form.guest_count}
                  onChange={e => onFieldChange('guest_count', Number(e.target.value))}
                  style={S.input}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => onFieldChange('notes', e.target.value)}
                  placeholder="Restrições alimentares, preferências, informações adicionais..."
                  style={{ ...S.input, minHeight: 78, resize: 'vertical' }}
                />
              </div>
            </div>
          </BuilderSection>

          {/* Itens do Evento */}
          <BuilderSection
            title="Itens do Evento"
            icon="🍽️"
            action={
              <button onClick={() => setShowBlocks(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}>
                ⚡ Bloco Inteligente
              </button>
            }
          >
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 140px 110px 36px',
              gap: 8, padding: '0 8px 8px',
              borderBottom: '1px solid #f1f5f9', marginBottom: 8,
            }}>
              {['Item / Serviço', 'Qtd.', 'Valor Unit.', 'Subtotal', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {items.map((item, idx) => (
                <ItemRow key={idx} item={item} idx={idx} onChange={onItemChange} onRemove={onRemoveItem} />
              ))}
            </div>

            <button onClick={onAddItem} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', marginTop: 10,
              background: 'none', border: '2px dashed #e2e8f0', borderRadius: 10,
              padding: '10px 16px', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#f8faff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}>
              + Adicionar item manualmente
            </button>
          </BuilderSection>

          {/* Financeiro */}
          <BuilderSection title="Configurações Financeiras" icon="💳">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Desconto (%)</label>
                <input
                  type="number" min={0} max={100} step="0.1"
                  value={form.discount_percent}
                  onChange={e => onFieldChange('discount_percent', Number(e.target.value))}
                  placeholder="0" style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Status do Orçamento</label>
                <select value={form.status} onChange={e => onFieldChange('status', e.target.value)} style={S.input}>
                  <option value="draft">Rascunho</option>
                  <option value="approved">Aprovado</option>
                  <option value="active">Ativo</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
          </BuilderSection>
        </div>

        {/* Right: Sticky Sidebar */}
        <div style={{ width: 310, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <FinancialSidebar
              subtotal={subtotal}
              discountPct={form.discount_percent}
              discountAmt={discountAmt}
              total={total}
              guestCount={form.guest_count}
              costPerPerson={costPerPerson}
              profit={profit}
              marginPct={marginPct}
              onSave={onSubmit}
              loading={loading}
              editingQuotation={editingQuotation}
              status={form.status}
              onApprove={onApprove}
            />
          </div>
        </div>
      </div>

      {showBlocks && (
        <SmartBlockSelector
          onAddBlock={onAddBlock}
          onClose={() => setShowBlocks(false)}
        />
      )}
    </div>
  );
}

// ─── QUOTATION CARD ───────────────────────────────────────────────────────────

function QuotationCard({ quotation, getClientName, onEdit, onDuplicate, onApprove, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const eventDate = quotation.event_date
    ? new Date(quotation.event_date + 'T00:00').toLocaleDateString('pt-BR')
    : '—';

  return (
    <div style={{
      ...S.card,
      transition: 'all 0.2s ease',
      transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
      borderColor: hovered ? '#cbd5e1' : '#e2e8f0',
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}>

      {/* Top */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ minWidth: 0, paddingRight: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {quotation.event_type || 'Evento sem nome'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{getClientName(quotation.client_id)}</div>
          </div>
          <StatusBadge status={quotation.status} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          R$ {fmt(Number(quotation.total_amount || 0))}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>📅 {eventDate}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>👥 {quotation.guest_count || '—'} conv.</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}># {quotation.id}</span>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 7 }}>
        <button onClick={() => onEdit(quotation)} style={{
          flex: 1, padding: '8px 0', borderRadius: 10,
          border: '1px solid #e2e8f0', background: '#f8fafc',
          color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }}>
          ✏️ Editar
        </button>
        <button onClick={() => onDuplicate(quotation.id)} title="Duplicar" style={{
          padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
          background: '#f8fafc', color: '#64748b', fontSize: 13, cursor: 'pointer',
        }}>📋</button>
        {quotation.status !== 'approved' && quotation.status !== 'cancelled' && (
          <button onClick={() => onApprove(quotation)} title="Aprovar" style={{
            padding: '8px 12px', borderRadius: 10, border: '1px solid #bbf7d0',
            background: '#dcfce7', color: '#16a34a', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>✓</button>
        )}
        <button onClick={() => { if (window.confirm('Excluir este orçamento?')) onDelete(quotation.id); }} title="Excluir" style={{
          padding: '8px 12px', borderRadius: 10, border: '1px solid #fecaca',
          background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}>
          🗑️
        </button>
      </div>
    </div>
  );
}

// ─── QUOTATION LIST ───────────────────────────────────────────────────────────

function QuotationList({
  quotations, clients, loading,
  onNew, onEdit, onDuplicate, onApprove, onDelete,
  filters, onFilterChange,
}) {
  const getClientName = id => clients.find(c => String(c.id) === String(id))?.name || '—';

  const filtered = quotations.filter(q => {
    const matchClient = filters.client ? String(q.client_id) === String(filters.client) : true;
    const matchStatus = filters.status ? q.status === filters.status : true;
    return matchClient && matchStatus;
  });

  const totalValue = filtered.reduce((s, q) => s + Number(q.total_amount || 0), 0);
  const approved = filtered.filter(q => q.status === 'approved').length;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Orçamentos</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 14 }}>
            {filtered.length} orçamento{filtered.length !== 1 ? 's' : ''} · R$ {fmt(totalValue)} no total · {approved} aprovado{approved !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onNew} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '11px 22px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(37,99,235,0.3)', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)'; }}>
          ✦ Novo Orçamento
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #e2e8f0',
        padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>Filtrar</span>
        <select
          value={filters.client}
          onChange={e => onFilterChange('client', e.target.value)}
          style={{ ...S.input, width: 'auto', minWidth: 160, padding: '7px 30px 7px 12px', fontSize: 13 }}
        >
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          style={{ ...S.input, width: 'auto', minWidth: 140, padding: '7px 30px 7px 12px', fontSize: 13 }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filters.client || filters.status) && (
          <button onClick={() => { onFilterChange('client', ''); onFilterChange('status', ''); }} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca',
            background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Cards / States */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 200, borderRadius: 20,
              background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 20, border: '2px dashed #e2e8f0',
          padding: '64px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.4 }}>📋</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#334155', margin: '0 0 8px' }}>
            Nenhum orçamento encontrado
          </h3>
          <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 15 }}>
            Crie seu primeiro orçamento com o Event Builder inteligente
          </p>
          <button onClick={onNew} style={{
            padding: '11px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            ✦ Criar Primeiro Orçamento
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(q => (
            <QuotationCard
              key={q.id}
              quotation={q}
              getClientName={getClientName}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onApprove={onApprove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BuffetQuotations() {
  const [view, setView] = useState('list'); // 'list' | 'template-gallery' | 'builder'
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [filters, setFilters] = useState({ client: '', status: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qData, cData] = await Promise.all([getAllQuotations(), getClients()]);
      setQuotations(qData || []);
      setClients(cData || []);
    } catch {
      showMsg('error', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => setMessage({ type, text });

  const handleFieldChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleItemChange = (idx, field, value) =>
    setItems(curr =>
      curr.map((item, i) =>
        i === idx
          ? { ...item, [field]: field === 'quantity' || field === 'unit_price' ? Number(value) : value }
          : item
      )
    );

  const handleAddItem = () => setItems(curr => [...curr, { ...emptyItem }]);
  const handleRemoveItem = idx => setItems(curr => curr.filter((_, i) => i !== idx));

  const handleAddBlock = block => {
    const filled = items.filter(i => i.item_name.trim() !== '');
    setItems([...filled, ...block.items]);
    showMsg('success', `Bloco "${block.name}" adicionado — ${block.items.length} itens incluídos.`);
  };

  const handleTemplateSelect = tpl => {
    setForm(prev => ({
      ...emptyForm,
      client_id: prev.client_id,
      event_type: tpl.defaults.event_type,
      guest_count: tpl.defaults.guest_count,
    }));
    setItems(tpl.items.length > 0 ? tpl.items.map(i => ({ ...i })) : [{ ...emptyItem }]);
    setView('builder');
    showMsg('success', `Template "${tpl.name}" carregado com sucesso!`);
  };

  const handleNewQuotation = () => {
    setEditingQuotation(null);
    setForm({ ...emptyForm });
    setItems([{ ...emptyItem }]);
    setView('template-gallery');
  };

  const handleEditQuotation = q => {
    setEditingQuotation(q);
    setForm({
      client_id: q.client_id || '',
      event_type: q.event_type || '',
      event_date: q.event_date ? q.event_date.split('T')[0] : '',
      guest_count: q.guest_count || 0,
      status: q.status || 'draft',
      notes: q.notes || '',
      discount_percent: q.discount_percent || 0,
    });
    const loadedItems = (q.items || []).map(i => ({
      item_name: i.item_name || '',
      quantity: i.quantity || 1,
      unit_price: i.unit_price || 0,
    }));
    setItems(loadedItems.length > 0 ? loadedItems : [{ ...emptyItem }]);
    setView('builder');
  };

  const handleSubmit = async () => {
    if (!form.client_id || !form.event_type || !form.event_date) {
      showMsg('error', 'Cliente, tipo de evento e data são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, items };
      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, payload);
        showMsg('success', 'Orçamento atualizado com sucesso!');
      } else {
        await createQuotation(payload);
        showMsg('success', 'Orçamento criado com sucesso!');
      }
      await loadData();
      setView('list');
    } catch (e) {
      showMsg('error', e.message || 'Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async quotation => {
    const q = quotation || editingQuotation;
    if (!q) return;
    const name = clients.find(c => String(c.id) === String(q.client_id))?.name || 'cliente';
    if (!window.confirm(`Aprovar orçamento de ${name}?`)) return;
    try {
      await approveQuotation(q.id);
      showMsg('success', 'Orçamento aprovado com sucesso!');
      await loadData();
      if (view === 'builder') setForm(prev => ({ ...prev, status: 'approved' }));
    } catch (e) {
      showMsg('error', e.message || 'Erro ao aprovar.');
    }
  };

  const handleDuplicate = async id => {
    const q = quotations.find(x => x.id === id);
    if (!q) return;
    try {
      await duplicateQuotation(id, q.client_id);
      showMsg('success', 'Orçamento duplicado com sucesso!');
      await loadData();
    } catch (e) {
      showMsg('error', e.message || 'Erro ao duplicar.');
    }
  };

  const handleDelete = async id => {
    try {
      await deleteQuotation(id);
      showMsg('success', 'Orçamento excluído.');
      await loadData();
    } catch (e) {
      showMsg('error', e.message || 'Erro ao excluir.');
    }
  };

  return (
    <>
      {view === 'list' && (
        <QuotationList
          quotations={quotations}
          clients={clients}
          loading={loading}
          onNew={handleNewQuotation}
          onEdit={handleEditQuotation}
          onDuplicate={handleDuplicate}
          onApprove={handleApprove}
          onDelete={handleDelete}
          filters={filters}
          onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
        />
      )}

      {view === 'template-gallery' && (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onClose={() => setView('list')}
        />
      )}

      {view === 'builder' && (
        <QuotationBuilder
          form={form}
          items={items}
          clients={clients}
          editingQuotation={editingQuotation}
          loading={saving}
          onFieldChange={handleFieldChange}
          onItemChange={handleItemChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onAddBlock={handleAddBlock}
          onSubmit={handleSubmit}
          onBack={() => setView('list')}
          onApprove={() => editingQuotation && handleApprove(editingQuotation)}
          onChangeTemplate={() => setView('template-gallery')}
        />
      )}

      <Toast message={message} onClose={() => setMessage(null)} />
    </>
  );
}
