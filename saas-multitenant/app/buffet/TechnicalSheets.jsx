'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

// ─── API helpers ──────────────────────────────────────────────────────────────

const getSheets    = ()           => apiRequest('/api/technical-sheets').then(r => r.data || []);
const getSheet     = (id)         => apiRequest(`/api/technical-sheets/${id}`).then(r => r.data);
const createSheet  = (body)       => apiRequest('/api/technical-sheets', { method: 'POST', body });
const updateSheet  = (id, body)   => apiRequest(`/api/technical-sheets/${id}`, { method: 'PUT', body });
const deleteSheet  = (id)         => apiRequest(`/api/technical-sheets/${id}`, { method: 'DELETE' });

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'salgado',    label: 'Salgado' },
  { value: 'doce',       label: 'Doce' },
  { value: 'bebida',     label: 'Bebida' },
  { value: 'prato',      label: 'Prato' },
  { value: 'sobremesa',  label: 'Sobremesa' },
  { value: 'servico',    label: 'Serviço' },
  { value: 'outro',      label: 'Outro' },
];

const YIELD_UNITS = ['pessoas', 'unidades', 'kg', 'litros', 'porções'];
const ING_UNITS   = ['unidade', 'kg', 'g', 'litro', 'ml', 'pacote', 'caixa', 'dúzia', 'maço'];

const emptyIngredient = { name: '', quantity: '', unit: 'unidade', unit_cost: '', waste_pct: '', notes: '' };
const emptyForm = { name: '', category: 'outro', base_yield: '1', yield_unit: 'pessoas', notes: '', ingredients: [{ ...emptyIngredient }] };

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  input: {
    width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0',
    borderRadius: 8, background: '#f8fafc', color: '#1e293b',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' },
  card:  { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' },
  btn:   { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  const isErr = message.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: isErr ? '#fee2e2' : '#dcfce7',
      border: `1px solid ${isErr ? '#fca5a5' : '#86efac'}`,
      color: isErr ? '#991b1b' : '#166534',
      padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      {message.text}
    </div>
  );
}

// ─── Cálculo do custo da ficha ────────────────────────────────────────────────

function calcSheetCost(ingredients, baseYield) {
  const total = ingredients.reduce((s, ing) => {
    const qty  = Number(ing.quantity)  || 0;
    const cost = Number(ing.unit_cost) || 0;
    const waste = Number(ing.waste_pct) || 0;
    return s + qty * cost * (1 + waste / 100);
  }, 0);
  const yld = Number(baseYield) > 0 ? Number(baseYield) : 1;
  return { totalCost: total, costPerUnit: total / yld };
}

// ─── IngredientRow ────────────────────────────────────────────────────────────

function IngredientRow({ ing, idx, onChange, onRemove, baseYield }) {
  const cost = (Number(ing.quantity) || 0) * (Number(ing.unit_cost) || 0) * (1 + (Number(ing.waste_pct) || 0) / 100);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 80px 90px 110px 70px 1fr 80px 32px', gap: 6, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
      <input style={S.input} placeholder="Nome do ingrediente" value={ing.name} onChange={e => onChange(idx, 'name', e.target.value)} />
      <input style={S.input} type="number" min="0" step="0.001" placeholder="Qtd" value={ing.quantity} onChange={e => onChange(idx, 'quantity', e.target.value)} />
      <select style={S.input} value={ing.unit} onChange={e => onChange(idx, 'unit', e.target.value)}>
        {ING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <input style={S.input} type="number" min="0" step="0.01" placeholder="Custo unit." value={ing.unit_cost} onChange={e => onChange(idx, 'unit_cost', e.target.value)} />
      <input style={S.input} type="number" min="0" max="100" step="0.1" placeholder="Perda%" value={ing.waste_pct} onChange={e => onChange(idx, 'waste_pct', e.target.value)} />
      <input style={S.input} placeholder="Observação" value={ing.notes} onChange={e => onChange(idx, 'notes', e.target.value)} />
      <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textAlign: 'right', paddingRight: 4 }}>
        R$ {fmt(cost)}
      </div>
      <button onClick={() => onRemove(idx)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  );
}

// ─── SheetForm ────────────────────────────────────────────────────────────────

function SheetForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => initial || { ...emptyForm });
  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const setIng = (idx, field, value) =>
    setForm(p => ({ ...p, ingredients: p.ingredients.map((i, x) => x === idx ? { ...i, [field]: value } : i) }));
  const addIng    = () => setForm(p => ({ ...p, ingredients: [...p.ingredients, { ...emptyIngredient }] }));
  const removeIng = (idx) => setForm(p => ({ ...p, ingredients: p.ingredients.filter((_, x) => x !== idx) }));

  const { totalCost, costPerUnit } = calcSheetCost(form.ingredients, form.base_yield);

  const handleSave = () => {
    if (!form.name.trim()) { alert('Nome da ficha técnica é obrigatório'); return; }
    if (Number(form.base_yield) <= 0) { alert('Rendimento base deve ser maior que 0'); return; }
    onSave({
      ...form,
      base_yield:  Number(form.base_yield) || 1,
      ingredients: form.ingredients.filter(i => i.name.trim()),
    });
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ ...S.btn, background: '#f1f5f9', color: '#475569' }}>← Voltar</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          {initial ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
        </h2>
      </div>

      {/* Dados gerais */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>📋 Dados Gerais</div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={S.label}>Nome da Receita / Item *</label>
            <input style={S.input} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ex: Coxinha de frango" />
          </div>
          <div>
            <label style={S.label}>Categoria</label>
            <select style={S.input} value={form.category} onChange={e => setField('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Rendimento base *</label>
            <input style={S.input} type="number" min="0.1" step="0.1" value={form.base_yield} onChange={e => setField('base_yield', e.target.value)} placeholder="50" />
          </div>
          <div>
            <label style={S.label}>Unidade de rendimento</label>
            <select style={S.input} value={form.yield_unit} onChange={e => setField('yield_unit', e.target.value)}>
              {YIELD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Observações</label>
            <textarea style={{ ...S.input, minHeight: 56, resize: 'vertical' }} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Modo de preparo, dicas, restrições..." />
          </div>
        </div>
      </div>

      {/* Ingredientes */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>🧂 Ingredientes / Insumos</span>
          <button onClick={addIng} style={{ ...S.btn, background: '#eff6ff', color: '#2563eb' }}>+ Adicionar ingrediente</button>
        </div>

        {/* Cabeçalho da tabela */}
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 80px 90px 110px 70px 1fr 80px 32px', gap: 6, paddingBottom: 4, borderBottom: '2px solid #f1f5f9' }}>
            {['Ingrediente', 'Qtd.', 'Unidade', 'Custo unit.', 'Perda%', 'Obs.', 'Total', ''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {form.ingredients.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px', fontSize: 14 }}>
              Nenhum ingrediente adicionado ainda.
            </div>
          ) : (
            form.ingredients.map((ing, idx) => (
              <IngredientRow key={idx} ing={ing} idx={idx} onChange={setIng} onRemove={removeIng} baseYield={form.base_yield} />
            ))
          )}
        </div>
      </div>

      {/* Resumo de custo */}
      <div style={{ ...S.card, marginBottom: 20, background: '#f8fafc' }}>
        <div style={{ padding: '16px 24px', display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Custo total da ficha</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>R$ {fmt(totalCost)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Custo por {form.yield_unit?.replace(/s$/, '') || 'pessoa'}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb' }}>R$ {fmt(costPerUnit)}</div>
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            Rendimento: {form.base_yield} {form.yield_unit}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btn, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : '💾 Salvar Ficha Técnica'}
        </button>
        <button onClick={onCancel} style={{ ...S.btn, background: '#f1f5f9', color: '#475569', padding: '10px 20px' }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── SheetCard ────────────────────────────────────────────────────────────────

function SheetCard({ sheet, onEdit, onDelete }) {
  const catLabel = CATEGORIES.find(c => c.value === sheet.category)?.label || sheet.category;
  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheet.name}</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb' }}>{catLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Custo total</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>R$ {fmt(sheet.total_cost || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Rendimento</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{sheet.base_yield} {sheet.yield_unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Ingredientes</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{sheet.ingredient_count || 0}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 18px', borderTop: '1px solid #f8fafc', display: 'flex', gap: 8 }}>
        <button onClick={() => onEdit(sheet.id)} style={{ ...S.btn, background: '#f1f5f9', color: '#475569', padding: '6px 14px', fontSize: 12 }}>✏️ Editar</button>
        <button onClick={() => onDelete(sheet)} style={{ ...S.btn, background: '#fee2e2', color: '#dc2626', padding: '6px 12px', fontSize: 12 }}>🗑</button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BuffetTechSheets() {
  const [sheets,  setSheets]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [view,    setView]    = useState('list');     // 'list' | 'form'
  const [editing, setEditing] = useState(null);       // sheet data for edit, null for new
  const [message, setMessage] = useState(null);

  const showMsg = (type, text) => setMessage({ type, text });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSheets(await getSheets());
    } catch {
      showMsg('error', 'Não foi possível carregar as fichas técnicas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = () => { setEditing(null); setView('form'); };

  const handleEdit = async (id) => {
    try {
      const sheet = await getSheet(id);
      // Adaptar ingredientes para o formato do formulário
      const formData = {
        ...sheet,
        base_yield:  String(sheet.base_yield),
        ingredients: (sheet.ingredients || []).map(i => ({
          name:      i.name      || '',
          quantity:  String(i.quantity  || ''),
          unit:      i.unit      || 'unidade',
          unit_cost: String(i.unit_cost || ''),
          waste_pct: String(i.waste_pct || ''),
          notes:     i.notes     || '',
        })),
      };
      setEditing(formData);
      setView('form');
    } catch {
      showMsg('error', 'Erro ao carregar ficha técnica.');
    }
  };

  const handleDelete = async (sheet) => {
    if (!window.confirm(`Excluir a ficha técnica "${sheet.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteSheet(sheet.id);
      showMsg('success', 'Ficha técnica excluída.');
      load();
    } catch {
      showMsg('error', 'Erro ao excluir ficha técnica.');
    }
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await updateSheet(editing.id, data);
        showMsg('success', 'Ficha técnica atualizada!');
      } else {
        await createSheet(data);
        showMsg('success', 'Ficha técnica criada!');
      }
      setView('list');
      load();
    } catch (e) {
      showMsg('error', e.message || 'Erro ao salvar ficha técnica.');
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <>
        <SheetForm initial={editing} onSave={handleSave} onCancel={() => setView('list')} saving={saving} />
        <Toast message={message} onClose={() => setMessage(null)} />
      </>
    );
  }

  return (
    <>
      {/* Header da lista */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Fichas Técnicas</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {sheets.length} {sheets.length === 1 ? 'ficha cadastrada' : 'fichas cadastradas'} · Custo real de produção por receita
          </p>
        </div>
        <button onClick={handleNew} style={{ ...S.btn, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', padding: '10px 20px' }}>
          + Nova Ficha Técnica
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px', fontSize: 15 }}>Carregando fichas técnicas...</div>
      ) : sheets.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 18 }}>Nenhuma ficha técnica cadastrada</h3>
          <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
            Cadastre receitas e calcule o custo real de produção de cada item do seu cardápio.
          </p>
          <button onClick={handleNew} style={{ ...S.btn, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', padding: '10px 24px' }}>
            + Criar primeira ficha técnica
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sheets.map(s => (
            <SheetCard key={s.id} sheet={s} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Toast message={message} onClose={() => setMessage(null)} />
    </>
  );
}
