/**
 * calcFinancials.js — fonte única de verdade para cálculos financeiros do orçamento.
 * Importar aqui e não duplicar fórmulas em outros componentes.
 *
 * Limites de margem configuráveis por tenant no futuro:
 *   - buscar de /api/tenant/settings ou similar
 *   - passar como parâmetro opcional `thresholds`
 */

export const MARGIN_THRESHOLDS = {
  warning: 25, // abaixo: alerta amarelo
  danger:  15, // abaixo: alerta vermelho
};

/**
 * @param {Object} params
 * @param {Array}  params.items          - itens da proposta [{quantity, unit_price, sheet_cost?}]
 * @param {Array}  params.fixedCosts     - custos fixos [{amount}]
 * @param {Array}  params.variableCosts  - custos variáveis [{calc_type, amount}]
 * @param {number} params.discountPct    - desconto em %
 * @param {number} params.guestCount     - número de convidados
 * @param {Object} [params.thresholds]   - override dos limites de margem (futuro: por tenant)
 * @returns {Object} todos os indicadores financeiros
 */
export function calcFinancials({
  items         = [],
  fixedCosts    = [],
  variableCosts = [],
  discountPct   = 0,
  guestCount    = 0,
  thresholds    = MARGIN_THRESHOLDS,
}) {
  const safe = (n) => (isNaN(Number(n)) || n === '' || n === null ? 0 : Number(n));
  const guests = safe(guestCount);

  // ── RECEITA ──────────────────────────────────────────────────────────────────
  const subtotal     = items.reduce((s, i) => s + safe(i.quantity) * safe(i.unit_price), 0);
  const discountAmt  = subtotal * (safe(discountPct) / 100);
  const receita      = subtotal - discountAmt;           // valor total cobrado do cliente
  const precoVendaPessoa = guests > 0 ? receita / guests : 0;

  // ── CUSTOS ───────────────────────────────────────────────────────────────────
  // Ficha técnica: soma dos custos calculados por item (sheet_cost já escalado por convidados)
  const custoFichas  = items.reduce((s, i) => s + safe(i.sheet_cost), 0);

  // Variáveis: "por pessoa" × convidados | "total" soma direta
  const custoVariavel = variableCosts.reduce((s, c) => {
    const amt = safe(c.amount);
    return s + (c.calc_type === 'per_person' ? amt * guests : amt);
  }, 0);

  // Fixos: soma direta
  const custoFixo   = fixedCosts.reduce((s, c) => s + safe(c.amount), 0);

  const custoTotal  = custoFichas + custoVariavel + custoFixo;
  const custoPessoa = guests > 0 ? custoTotal / guests : 0;

  // ── RESULTADO ────────────────────────────────────────────────────────────────
  const lucro        = receita - custoTotal;
  const margemPct    = receita > 0 ? (lucro / receita) * 100 : 0;
  const lucroPessoa  = guests > 0 ? lucro / guests : 0;

  // Alerta de margem (só quando há custo registrado — evita alerta falso em orçamentos sem custo)
  let margemAlerta = null;
  if (receita > 0 && custoTotal > 0) {
    if (margemPct < thresholds.danger)        margemAlerta = 'danger';
    else if (margemPct < thresholds.warning)  margemAlerta = 'warning';
  }

  return {
    // Receita
    subtotal,
    discountAmt,
    receita,
    precoVendaPessoa,
    // Custos
    custoFichas,
    custoVariavel,
    custoFixo,
    custoTotal,
    custoPessoa,
    // Resultado
    lucro,
    margemPct,
    lucroPessoa,
    margemAlerta,
  };
}
