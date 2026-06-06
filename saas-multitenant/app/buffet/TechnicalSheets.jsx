'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

// ─── API ──────────────────────────────────────────────────────────────────────

const getSheets   = ()         => apiRequest('/api/technical-sheets').then(r => r.data || []);
const getSheet    = (id)       => apiRequest(`/api/technical-sheets/${id}`).then(r => r.data);
const createSheet = (body)     => apiRequest('/api/technical-sheets', { method: 'POST', body });
const updateSheet = (id, body) => apiRequest(`/api/technical-sheets/${id}`, { method: 'PUT', body });
const deleteSheet = (id)       => apiRequest(`/api/technical-sheets/${id}`, { method: 'DELETE' });

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'salgado',   label: 'Salgado' },
  { value: 'doce',      label: 'Doce' },
  { value: 'bebida',    label: 'Bebida' },
  { value: 'prato',     label: 'Prato' },
  { value: 'sobremesa', label: 'Sobremesa' },
  { value: 'servico',   label: 'Serviço' },
  { value: 'outro',     label: 'Outro' },
];

const YIELD_UNITS = ['pessoas', 'unidades', 'kg', 'litros', 'porções'];

// Unidades de quantidade e custo separadas para conversão
const QTY_UNITS  = ['unidade', 'kg', 'g', 'litro', 'ml', 'pacote', 'caixa', 'dúzia', 'maço'];
const COST_UNITS = ['unidade', 'kg', 'g', 'litro', 'ml', 'pacote', 'caixa', 'dúzia', 'maço'];

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
      background: isErr ? '#fee2e2' : '#dcfce7', border: `1px solid ${isErr ? '#fca5a5' : '#86efac'}`,
      color: isErr ? '#991b1b' : '#166534', padding: '12px 20px', borderRadius: 12,
      fontWeight: 600, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      {message.text}
    </div>
  );
}

// ─── Conversão de unidades (frontend — espelho do backend) ────────────────────

function convertUnits(value, fromUnit, toUnit) {
  const from = (fromUnit || '').toLowerCase().trim();
  const to   = (toUnit   || '').toLowerCase().trim();
  const v = Number(value) || 0;
  if (!from || !to || from === to) return { value: v, compatible: true };
  if (from === 'g'     && to === 'kg')    return { value: v / 1000, compatible: true };
  if (from === 'kg'    && to === 'g')     return { value: v * 1000, compatible: true };
  if (from === 'ml'    && to === 'litro') return { value: v / 1000, compatible: true };
  if (from === 'litro' && to === 'ml')    return { value: v * 1000, compatible: true };
  return { value: v, compatible: false };
}

// ─── Cálculo do custo (com conversão de unidades) ─────────────────────────────

function calcIngredientCost(ing) {
  const qty      = Number(ing.quantity)  || 0;
  const cost     = Number(ing.unit_cost) || 0;
  const wastePct = Number(ing.waste_pct) || 0;
  const qtyUnit  = ing.unit      || 'unidade';
  const costUnit = ing.cost_unit || qtyUnit;

  let effectiveQty = qty;
  let compatible   = true;
  if (qtyUnit !== costUnit) {
    const result = convertUnits(qty, qtyUnit, costUnit);
    effectiveQty = result.value;
    compatible   = result.compatible;
  }

  const lineTotal = effectiveQty * cost * (1 + wastePct / 100);
  return { lineTotal, compatible };
}

function calcSheetCost(ingredients, baseYield) {
  const totalCost = ingredients.reduce((s, ing) => {
    const { lineTotal } = calcIngredientCost(ing);
    return s + lineTotal;
  }, 0);
  const yld = Number(baseYield) > 0 ? Number(baseYield) : 1;
  return { totalCost, costPerUnit: totalCost / yld };
}

// ─── EmptyIngredient ──────────────────────────────────────────────────────────

const emptyIngredient = { name: '', quantity: '', unit: 'unidade', unit_cost: '', cost_unit: '', waste_pct: '', notes: '' };
const emptyForm = { name: '', category: 'outro', base_yield: '50', yield_unit: 'pessoas', notes: '', ingredients: [{ ...emptyIngredient }] };

// ─── IngredientRow ────────────────────────────────────────────────────────────

function IngredientRow({ ing, idx, onChange, onRemove }) {
  const { lineTotal, compatible } = calcIngredientCost(ing);
  const hasCostUnit = ing.cost_unit && ing.cost_unit !== ing.unit;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 90px 90px 90px 70px 1fr 80px 28px', gap: 5, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f8fafc' }}>
      <input style={S.input} placeholder="Nome do ingrediente" value={ing.name} onChange={e => onChange(idx, 'name', e.target.value)} />

      {/* Quantidade usada */}
      <input style={S.input} type="number" min="0" step="0.001" placeholder="Qtd" value={ing.quantity} onChange={e => onChange(idx, 'quantity', e.target.value)} />

      {/* Unidade da quantidade */}
      <select style={S.input} value={ing.unit} onChange={e => onChange(idx, 'unit', e.target.value)}>
        {QTY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* Custo unitário */}
      <input style={{ ...S.input, textAlign: 'right' }} type="number" min="0" step="0.001" placeholder="Preço" value={ing.unit_cost} onChange={e => onChange(idx, 'unit_cost', e.target.value)} />

      {/* Unidade do custo (opcional — para conversão) */}
      <select
        style={{ ...S.input, borderColor: hasCostUnit ? '#bfdbfe' : '#e2e8f0', background: hasCostUnit ? '#eff6ff' : '#f8fafc' }}
        value={ing.cost_unit || ing.unit}
        onChange={e => onChange(idx, 'cost_unit', e.target.value === ing.unit ? '' : e.target.value)}
      >
        {COST_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* Perda % */}
      <input style={S.input} type="number" min="0" max="100" step="0.1" placeholder="Perda%" value={ing.waste_pct} onChange={e => onChange(idx, 'waste_pct', e.target.value)} />

      {/* Obs */}
      <input style={S.input} placeholder="Observação" value={ing.notes} onChange={e => onChange(idx, 'notes', e.target.value)} />

      {/* Total da linha */}
      <div style={{ fontSize: 12, color: compatible ? '#475569' : '#f59e0b', fontWeight: 600, textAlign: 'right', paddingRight: 2 }}>
        {!compatible && <span title="Unidades incompatíveis — verifique" style={{ marginRight: 3 }}>⚠</span>}
        R$ {fmt(lineTotal)}
      </div>

      <button onClick={() => onRemove(idx)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  );
}

// ─── SheetForm ────────────────────────────────────────────────────────────────

function SheetForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => initial || { ...emptyForm });
  // Markup sugerido (só para preview — não vai ao banco)
  const [previewMarkup, setPreviewMarkup] = useState(100);

  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const setIng = (idx, field, value) =>
    setForm(p => ({ ...p, ingredients: p.ingredients.map((i, x) => x === idx ? { ...i, [field]: value } : i) }));
  const addIng    = () => setForm(p => ({ ...p, ingredients: [...p.ingredients, { ...emptyIngredient }] }));
  const removeIng = (idx) => setForm(p => ({ ...p, ingredients: p.ingredients.filter((_, x) => x !== idx) }));

  const { totalCost, costPerUnit } = calcSheetCost(form.ingredients, form.base_yield);
  const yieldUnit = form.yield_unit?.replace(/s$/, '') || 'pessoa';
  const suggestedPrice = costPerUnit * (1 + previewMarkup / 100);

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
    <div style={{ maxWidth: 1060, margin: '0 auto', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ ...S.btn, background: '#f1f5f9', color: '#475569' }}>← Voltar</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          {initial?.id ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
        </h2>
      </div>

      {/* Dados gerais */}
      <div style={{ ...S.card, marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>📋 Dados Gerais</div>
        <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
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
            <input style={S.input} type="number" min="0.1" step="1" value={form.base_yield} onChange={e => setField('base_yield', e.target.value)} placeholder="50" />
          </div>
          <div>
            <label style={S.label}>Unidade de rendimento</label>
            <select style={S.input} value={form.yield_unit} onChange={e => setField('yield_unit', e.target.value)}>
              {YIELD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Observações</label>
            <textarea style={{ ...S.input, minHeight: 52, resize: 'vertical' }} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Modo de preparo, dicas, restrições..." />
          </div>
        </div>
      </div>

      {/* Ingredientes */}
      <div style={{ ...S.card, marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>🧂 Ingredientes / Insumos</span>
          <button onClick={addIng} style={{ ...S.btn, background: '#eff6ff', color: '#2563eb', fontSize: 12, padding: '6px 14px' }}>+ Adicionar ingrediente</button>
        </div>

        {/* Cabeçalho */}
        <div style={{ padding: '8px 18px 0', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 90px 90px 90px 70px 1fr 80px 28px', gap: 5, paddingBottom: 4, borderBottom: '2px solid #f1f5f9', minWidth: 700 }}>
            {['Ingrediente', 'Qtd.', 'Un. qtd.', 'Preço unit.', 'Un. preço', 'Perda%', 'Obs.', 'Total', ''].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>
          <div style={{ minWidth: 700 }}>
            {form.ingredients.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: 13 }}>
                Nenhum ingrediente adicionado ainda.
              </div>
            ) : form.ingredients.map((ing, idx) => (
              <IngredientRow key={idx} ing={ing} idx={idx} onChange={setIng} onRemove={removeIng} />
            ))}
          </div>
        </div>
        <div style={{ height: 14 }} />
      </div>

      {/* Resumo de custo + Preview */}
      <div style={{ ...S.card, marginBottom: 18, background: 'linear-gradient(135deg,#f8fafc,#f0f7ff)' }}>
        <div style={{ padding: '18px 24px' }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Custo total */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Custo total da ficha</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>R$ {fmt(totalCost)}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Rende {form.base_yield} {form.yield_unit}</div>
            </div>

            {/* Custo por unidade */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Custo por {yieldUnit}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb' }}>R$ {fmt(costPerUnit)}</div>
            </div>

            <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch' }} />

            {/* Preview de escala */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Preview de custo por escala</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[50, 100, 150, 200].map(n => (
                  <div key={n} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{n} {yieldUnit}s</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>R$ {fmt(costPerUnit * n)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch' }} />

            {/* Markup sugerido */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Preço sugerido (markup)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min="0" step="10" value={previewMarkup}
                  onChange={e => setPreviewMarkup(Number(e.target.value) || 0)}
                  style={{ ...S.input, width: 80, textAlign: 'right' }}
                />
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>%</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Preço sugerido / {yieldUnit}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>R$ {fmt(suggestedPrice)}</div>
              </div>
            </div>

          </div>

          {form.ingredients.some(i => {
            const res = convertUnits(1, i.unit, i.cost_unit || i.unit);
            return !res.compatible;
          }) && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, fontSize: 12, color: '#854d0e' }}>
              ⚠ Alguns ingredientes têm unidades incompatíveis (ex: unidade vs kg). Verifique a coluna "Un. preço" para que a conversão funcione corretamente.
            </div>
          )}
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
  const costPerUnit = sheet.cost_per_unit || (sheet.base_yield > 0 ? (sheet.total_cost || 0) / sheet.base_yield : 0);
  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheet.name}</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb' }}>{catLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Custo total</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>R$ {fmt(sheet.total_cost || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Custo / {(sheet.yield_unit || 'pessoa').replace(/s$/, '')}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>R$ {fmt(costPerUnit)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Rendimento</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{sheet.base_yield} {sheet.yield_unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Ingredientes</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{sheet.ingredient_count || 0}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f8fafc', display: 'flex', gap: 8 }}>
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
  const [view,    setView]    = useState('list');
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  const showMsg = (type, text) => setMessage({ type, text });

  const load = useCallback(async () => {
    setLoading(true);
    try { setSheets(await getSheets()); }
    catch { showMsg('error', 'Não foi possível carregar as fichas técnicas.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = () => { setEditing(null); setView('form'); };

  const handleEdit = async (id) => {
    try {
      const sheet = await getSheet(id);
      setEditing({
        ...sheet,
        base_yield:  String(sheet.base_yield || '1'),
        ingredients: (sheet.ingredients || []).map(i => ({
          name:      i.name      || '',
          quantity:  String(i.quantity  || ''),
          unit:      i.unit      || 'unidade',
          unit_cost: String(i.unit_cost || ''),
          cost_unit: i.cost_unit || '',
          waste_pct: String(i.waste_pct || ''),
          notes:     i.notes     || '',
        })),
      });
      setView('form');
    } catch {
      showMsg('error', 'Erro ao carregar ficha técnica.');
    }
  };

  const handleDelete = async (sheet) => {
    if (!window.confirm(`Excluir "${sheet.name}"? Esta ação não pode ser desfeita.`)) return;
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

      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px', fontSize: 15 }}>Carregando fichas técnicas...</div>
      ) : sheets.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 18 }}>Nenhuma ficha técnica cadastrada</h3>
          <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
            Cadastre receitas e calcule o custo real de produção de cada item do cardápio.
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
