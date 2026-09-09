/**
 * calcFinancials.js — fonte única de verdade para cálculos financeiros do orçamento.
 *
 * REGRA DE MARKUP (importante):
 *   Markup = lucro / custo (percentual aplicado SOBRE o custo).
 *   Fórmula: preço = custo × (1 + markup%)
 *   Ex.: custo R$ 1.000, markup 40% → preço = 1.000 × 1,40 = R$ 1.400,00
 *   (NÃO é margem: margem 40% daria 1.000 / 0,60 = 1.666,67)
 *
 *   Relação com a margem resultante: markup 40% ⟺ margem real de ~28,57%.
 *
 * OBS.: os campos persistidos `default_margin` e `pass_margin` mantêm o nome
 * por compatibilidade de banco, mas agora representam o MARKUP em %.
 *
 * Limites de alerta configuráveis por tenant (futuro: buscar de /api/tenant/settings).
 */

// ─── Limites de alerta de markup ─────────────────────────────────────────────
// Equivalentes aos antigos limites de margem (25% / 15%) convertidos para markup:
//   margem 25% ⟺ markup ~33%   |   margem 15% ⟺ markup ~18%
export const MARKUP_THRESHOLDS = {
  warning: 33, // abaixo: alerta amarelo
  danger:  18, // abaixo: alerta vermelho
};

// Markup padrão do buffet (usado como sugestão inicial)
export const DEFAULT_MARKUP_PCT = 40;

// ─── Helper: preço de venda a partir de custo + markup ───────────────────────

/**
 * Calcula o preço de venda aplicando markup sobre o custo.
 * preço = custo × (1 + markup/100)
 *
 * Retorna o custo quando markup <= 0 (sem acréscimo = custo reembolsado).
 * Markup não tem teto (pode ser 100%, 200%, ...).
 */
export function priceFromMarkup(cost, markupPct) {
  const c = Number(cost)      || 0;
  const m = Number(markupPct) || 0;
  if (m <= 0) return c;          // sem markup: repassa custo exato
  return c * (1 + m / 100);
}

/**
 * Calcula o valor repassado de um custo (fixo ou variável).
 * Retorna { passValue, passProfit } onde:
 *   passValue  = preço cobrado do cliente por esse custo
 *   passProfit = lucro gerado pelo repasse
 *
 * Se pass_to_client = false → passValue = 0
 * (cost.pass_margin mantém o nome do campo, mas representa o markup %)
 */
function calcCostPass(effectiveAmount, cost) {
  if (!cost.pass_to_client) return { passValue: 0, passProfit: 0 };
  const m = Number(cost.pass_margin) || 0;
  const passValue  = priceFromMarkup(effectiveAmount, m);
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
 * @param {number} defaultMarkup  - markup padrão da proposta (%)
 * @param {Object} thresholds     - override dos limites de alerta
 */
export function calcFinancials({
  items         = [],
  fixedCosts    = [],
  variableCosts = [],
  discountPct   = 0,
  guestCount    = 0,
  defaultMarkup = DEFAULT_MARKUP_PCT,
  thresholds    = MARKUP_THRESHOLDS,
}) {
  const safe    = (n) => (isNaN(Number(n)) || n === '' || n === null ? 0 : Number(n));
  const guests  = safe(guestCount);
  const dm      = Math.max(safe(defaultMarkup), 0); // markup não tem teto

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
  // Fórmula: passValue = custo × (1 + markup%)
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
  // Markup real = lucro sobre o custo (não sobre a receita).
  const markupReal   = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
  const lucroPessoa  = guests > 0 ? lucro / guests : 0;

  // ── PRECIFICAÇÃO INTELIGENTE ───────────────────────────────────────────────
  // Receita recomendada = base de custo × (1 + markup desejado)
  //
  // Cenário A — proposta com fichas técnicas / custos internos:
  //   custoTotal > 0 → usa custoTotal como base (comportamento original)
  //
  // Cenário B — proposta com itens manuais sem fichas (ex.: Proposta Personalizada):
  //   usa receitaItens como custo implícito e soma os custos fixos/variáveis.
  //   Nesse caso o unit_price representa o custo do item; o markup é aplicado
  //   sobre toda a base, mesmo quando também há frete ou outro custo informado.
  //
  // Cenário C — proposta vazia (sem itens e sem custos):
  //   custoBase = 0 → receitaRecomendada = 0 (sem recomendação)
  const custoItensManuais = custoFichas > 0 ? 0 : receitaItens;
  const custoBase = custoTotal + custoItensManuais;
  const receitaRecomendada   = custoBase > 0 ? custoBase * (1 + dm / 100) : 0;
  const diferencaParaMarkup  = receitaRecomendada - receitaTotal;
  const precoRecomendadoPessoa = guests > 0 && receitaRecomendada > 0 ? receitaRecomendada / guests : 0;
  const totalFinal           = Math.max(receitaTotal, receitaRecomendada);
  const lucroFinal           = totalFinal - custoBase;
  const markupFinal          = custoBase > 0 ? (lucroFinal / custoBase) * 100 : 0;

  // ── ALERTA DE MARKUP ──────────────────────────────────────────────────────
  let markupAlerta = null;
  if (receitaTotal > 0 && custoTotal > 0) {
    if (markupReal < thresholds.danger)        markupAlerta = 'danger';
    else if (markupReal < thresholds.warning)  markupAlerta = 'warning';
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
    custoItensManuais,
    custoBase,

    // Resultado
    lucro,
    markupReal,
    lucroPessoa,
    markupAlerta,

    // Precificação Inteligente
    defaultMarkup: dm,
    receitaRecomendada,
    diferencaParaMarkup,
    precoRecomendadoPessoa,
    totalFinal,
    lucroFinal,
    markupFinal,
  };
}
