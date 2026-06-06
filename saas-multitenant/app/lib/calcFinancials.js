/**
 * calcFinancials.js — fonte única de verdade para cálculos financeiros do orçamento.
 *
 * REGRA DE MARGEM (importante):
 *   Margem = lucro / receita (sobre o preço final, não sobre o custo).
 *   Fórmula: preço = custo / (1 - margem%)
 *   Ex.: custo R$ 1.000, margem 40% → preço = 1.000 / 0.60 = R$ 1.666,67
 *   (NÃO é markup: 1.000 × 1.40 = 1.400 → margem real apenas 28.57%)
 *
 * Limites de alerta configuráveis por tenant (futuro: buscar de /api/tenant/settings).
 */

// ─── Limites de alerta de margem ─────────────────────────────────────────────

export const MARGIN_THRESHOLDS = {
  warning: 25, // abaixo: alerta amarelo
  danger:  15, // abaixo: alerta vermelho
};

// Margem padrão do buffet (usada como sugestão inicial)
export const DEFAULT_MARGIN_PCT = 40;

// ─── Helper: preço de venda a partir de custo + margem ───────────────────────

/**
 * Calcula o preço de venda usando margem sobre o preço final.
 * preço = custo / (1 - margem/100)
 *
 * Retorna 0 se margem >= 100 (inválido).
 * Retorna custo se margem <= 0 (sem margem = custo reembolsado).
 */
export function priceFromMargin(cost, marginPct) {
  const c = Number(cost)      || 0;
  const m = Number(marginPct) || 0;
  if (m >= 100) return 0;          // inválido — caller deve bloquear
  if (m <= 0)   return c;          // sem margem: repassa custo exato
  return c / (1 - m / 100);
}

/**
 * Calcula o valor repassado de um custo (fixo ou variável).
 * Retorna { passValue, passProfit } onde:
 *   passValue  = preço cobrado do cliente por esse custo
 *   passProfit = lucro gerado pelo repasse
 *
 * Se pass_to_client = false → passValue = 0
 */
function calcCostPass(effectiveAmount, cost) {
  if (!cost.pass_to_client) return { passValue: 0, passProfit: 0 };
  const m = Number(cost.pass_margin) || 0;
  if (m >= 100) return { passValue: 0, passProfit: 0 }; // margem inválida
  const passValue  = priceFromMargin(effectiveAmount, m);
  const passProfit = passValue - effectiveAmount;
  return { passValue, passProfit };
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Calcula todos os indicadores financeiros do orçamento.
 *
 * @param {Array}  items          - [{quantity, unit_price, sheet_cost?}]
 * @param {Array}  fixedCosts     - [{amount, pass_to_client?, pass_margin?, ...}]
 * @param {Array}  variableCosts  - [{calc_type, amount, pass_to_client?, pass_margin?, ...}]
 * @param {number} discountPct    - desconto sobre os itens (%)
 * @param {number} guestCount     - número de convidados
 * @param {number} defaultMargin  - margem padrão da proposta (%)
 * @param {Object} thresholds     - override dos limites de alerta
 */
export function calcFinancials({
  items         = [],
  fixedCosts    = [],
  variableCosts = [],
  discountPct   = 0,
  guestCount    = 0,
  defaultMargin = DEFAULT_MARGIN_PCT,
  thresholds    = MARGIN_THRESHOLDS,
}) {
  const safe    = (n) => (isNaN(Number(n)) || n === '' || n === null ? 0 : Number(n));
  const guests  = safe(guestCount);
  const dm      = Math.min(Math.max(safe(defaultMargin), 0), 99.99);

  // ── RECEITA DOS ITENS ──────────────────────────────────────────────────────
  const subtotalItens = items.reduce((s, i) => s + safe(i.quantity) * safe(i.unit_price), 0);
  const discountAmt   = subtotalItens * (safe(discountPct) / 100);
  const receitaItens  = subtotalItens - discountAmt;

  // ── CUSTOS INTERNOS ────────────────────────────────────────────────────────
  const custoFichas = items.reduce((s, i) => s + safe(i.sheet_cost), 0);

  // Custo efetivo de cada custo variável (per_person × convidados ou valor total)
  const custoVariavel = variableCosts.reduce((s, c) => {
    const a = safe(c.amount);
    return s + (c.calc_type === 'per_person' ? a * guests : a);
  }, 0);

  const custoFixo  = fixedCosts.reduce((s, c) => s + safe(c.amount), 0);
  const custoTotal = custoFichas + custoVariavel + custoFixo;

  // ── RECEITA DE REPASSE (custos repassados ao cliente) ─────────────────────
  // Fórmula: passValue = custo / (1 - margem%)
  const repPasseFixo = fixedCosts.reduce((s, c) => {
    const efetivo = safe(c.amount);
    return s + calcCostPass(efetivo, c).passValue;
  }, 0);

  const repPasseVariavel = variableCosts.reduce((s, c) => {
    const a       = safe(c.amount);
    const efetivo = c.calc_type === 'per_person' ? a * guests : a;
    return s + calcCostPass(efetivo, c).passValue;
  }, 0);

  const receitaRepasse = repPasseFixo + repPasseVariavel;

  // ── RECEITA TOTAL (itens + custos repassados) ──────────────────────────────
  const receitaTotal         = receitaItens + receitaRepasse;
  const receitaTotalPessoa   = guests > 0 ? receitaTotal / guests  : 0;
  const custoPessoa          = guests > 0 ? custoTotal  / guests   : 0;

  // ── RESULTADO ──────────────────────────────────────────────────────────────
  const lucro        = receitaTotal - custoTotal;
  const margemReal   = receitaTotal > 0 ? (lucro / receitaTotal) * 100 : 0;
  const lucroPessoa  = guests > 0 ? lucro / guests : 0;

  // ── PRECIFICAÇÃO INTELIGENTE ───────────────────────────────────────────────
  // Receita recomendada = custo total / (1 - margem desejada)
  // para atingir exatamente `dm`% de margem sobre o preço final
  const receitaRecomendada   = dm < 100 ? custoTotal / (1 - dm / 100) : 0;
  const diferencaParaMargem  = receitaRecomendada - receitaTotal;
  const precoRecomendadoPessoa = guests > 0 && receitaRecomendada > 0 ? receitaRecomendada / guests : 0;

  // ── ALERTA DE MARGEM ──────────────────────────────────────────────────────
  let margemAlerta = null;
  if (receitaTotal > 0 && custoTotal > 0) {
    if (margemReal < thresholds.danger)        margemAlerta = 'danger';
    else if (margemReal < thresholds.warning)  margemAlerta = 'warning';
  }

  return {
    // Receita
    subtotalItens,
    discountAmt,
    receitaItens,
    receitaRepasse,
    repPasseFixo,
    repPasseVariavel,
    receitaTotal,
    receitaTotalPessoa,

    // Custos internos
    custoFichas,
    custoVariavel,
    custoFixo,
    custoTotal,
    custoPessoa,

    // Resultado
    lucro,
    margemReal,
    lucroPessoa,
    margemAlerta,

    // Precificação Inteligente
    defaultMargin: dm,
    receitaRecomendada,
    diferencaParaMargem,
    precoRecomendadoPessoa,
  };
}
