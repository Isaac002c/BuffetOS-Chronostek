// services/calculationService.js
// Serviço centralizado para cálculos de simulação de orçamentos

const templateModels = require('../models/templateModels');

/**
 * Simula um orçamento baseado em um template
 * @param {string} template_id - ID do template
 * @param {number} number_of_guests - Número de convidados
 * @param {number} margin_percentage - Margem de lucro em percentual (ex: 30 para 30%)
 * @param {number} discount - Desconto em valor absoluto (ex: 100 para R$ 100)
 * @param {string} tenant_id - ID do tenant
 * @returns {Object} Dados da simulação
 */
async function simulateQuotation({
  template_id,
  number_of_guests,
  margin_percentage = 0,
  discount = 0,
  tenant_id
}) {
  // Validações
  if (!template_id || !tenant_id) {
    throw new Error('template_id e tenant_id são obrigatórios');
  }

  if (number_of_guests < 1) {
    throw new Error('number_of_guests deve ser maior que 0');
  }

  // Buscar template com items
  const template = await templateModels.getTemplateWithItems(template_id, tenant_id);
  if (!template) {
    throw new Error('Template não encontrado');
  }

  // Calcular items
  const calculatedItems = template.items.map(item => {
    const total_quantity = parseFloat(item.quantity_per_person) * number_of_guests;
    const cost_per_unit = parseFloat(item.cost_per_unit) || 0;
    const total_cost = total_quantity * cost_per_unit;

    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity_per_person: parseFloat(item.quantity_per_person),
      total_quantity,
      cost_per_unit,
      total_cost,
    };
  });

  // Calcular totais
  const total_cost = calculatedItems.reduce((sum, item) => sum + item.total_cost, 0);
  
  // Aplicar margem
  const margin_amount = (total_cost * (margin_percentage / 100));
  const price_with_margin = total_cost + margin_amount;
  
  // Aplicar desconto
  const final_price = price_with_margin - (discount || 0);

  return {
    template_id,
    template_name: template.name,
    template_description: template.description,
    template_event_type: template.event_type,
    number_of_guests,
    items: calculatedItems,
    total_cost: parseFloat(total_cost.toFixed(2)),
    margin_percentage,
    margin_amount: parseFloat(margin_amount.toFixed(2)),
    price_with_margin: parseFloat(price_with_margin.toFixed(2)),
    discount: parseFloat((discount || 0).toFixed(2)),
    final_price: parseFloat(final_price.toFixed(2)),
  };
}

/**
 * Valida dados de simulação
 */
function validateSimulationInput(data) {
  const errors = [];

  if (!data.template_id) errors.push('template_id é obrigatório');
  if (!data.number_of_guests || data.number_of_guests < 1) errors.push('number_of_guests deve ser maior que 0');
  if (data.margin_percentage && data.margin_percentage < 0) errors.push('margin_percentage não pode ser negativo');
  if (data.discount && data.discount < 0) errors.push('discount não pode ser negativo');

  return errors;
}

module.exports = {
  simulateQuotation,
  validateSimulationInput,
};
