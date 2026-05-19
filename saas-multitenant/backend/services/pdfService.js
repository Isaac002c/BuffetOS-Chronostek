// services/pdfService.js
// Serviço para gerar PDFs de propostas de orçamentos

/**
 * Gera HTML da proposta baseado nos dados da simulação
 * @param {Object} proposalData - Dados da proposta
 * @returns {string} HTML renderizado
 */
function generateProposalHTML(proposalData) {
  const {
    client_name,
    event_type,
    event_date,
    number_of_guests,
    template_name,
    template_description,
    items,
    total_cost,
    margin_percentage,
    margin_amount,
    price_with_margin,
    discount,
    final_price,
    company_name = 'Buffet OS',
    company_logo = '',
    notes = '',
    payment_conditions = '50% de entrada e 50% 15 dias antes do evento',
    validity_days = 30,
  } = proposalData;

  const eventDateFormatted = new Date(event_date).toLocaleDateString('pt-BR');
  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + validity_days);
  const validityDateFormatted = validityDate.toLocaleDateString('pt-BR');

  const itemsHTML = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.total_quantity.toFixed(2)} ${item.unit}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.cost_per_unit.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.total_cost.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const discountLine = discount > 0
    ? `
    <tr>
      <td colspan="3" style="padding: 10px; text-align: right;"><strong>Desconto:</strong></td>
      <td style="padding: 10px; text-align: right;">-R$ ${discount.toFixed(2)}</td>
    </tr>
  `
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta de Orçamento</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          background-color: #fff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        
        /* CAPA */
        .cover {
          page-break-after: always;
          text-align: center;
          padding: 60px 20px;
          border-bottom: 3px solid #2c3e50;
        }
        .cover h1 {
          font-size: 32px;
          color: #2c3e50;
          margin-bottom: 20px;
        }
        .cover .company-name {
          font-size: 24px;
          color: #e74c3c;
          margin-bottom: 40px;
        }
        .cover .proposal-info {
          margin-top: 60px;
          font-size: 16px;
          line-height: 1.8;
        }
        
        /* CABEÇALHO */
        .header {
          margin-bottom: 40px;
          border-bottom: 2px solid #ecf0f1;
          padding-bottom: 20px;
        }
        .header h2 {
          font-size: 20px;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        /* SEÇÃO */
        .section {
          margin-bottom: 30px;
        }
        .section h3 {
          font-size: 16px;
          color: #2c3e50;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e74c3c;
        }
        .section p {
          margin-bottom: 10px;
          line-height: 1.6;
        }
        
        /* RESUMO */
        .summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-item {
          background-color: #f8f9fa;
          padding: 15px;
          border-left: 4px solid #e74c3c;
        }
        .summary-item strong {
          display: block;
          color: #7f8c8d;
          font-size: 12px;
          margin-bottom: 5px;
        }
        .summary-item .value {
          font-size: 20px;
          color: #2c3e50;
          font-weight: bold;
        }
        
        /* TABELA */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        thead {
          background-color: #2c3e50;
          color: white;
        }
        thead th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        tbody td {
          padding: 12px;
          border-bottom: 1px solid #ecf0f1;
        }
        tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        /* TOTAIS */
        .totals {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ecf0f1;
        }
        .total-row.final {
          border-bottom: 2px solid #e74c3c;
          font-size: 18px;
          font-weight: bold;
          color: #e74c3c;
          margin-top: 10px;
          padding-bottom: 15px;
        }
        .total-row label {
          color: #7f8c8d;
        }
        .total-row .amount {
          font-weight: 600;
          color: #2c3e50;
        }
        
        /* DIFERENCIAIS */
        .highlights {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .highlight-item {
          background-color: #ecf0f1;
          padding: 15px;
          border-radius: 5px;
          font-size: 14px;
        }
        .highlight-item strong {
          display: block;
          color: #e74c3c;
          margin-bottom: 5px;
        }
        
        /* FOOTER */
        .footer {
          page-break-inside: avoid;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #ecf0f1;
          text-align: center;
          font-size: 12px;
          color: #95a5a6;
        }
        .cta {
          background-color: #e74c3c;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px;
          margin-bottom: 20px;
          font-size: 16px;
          font-weight: bold;
        }
        
        /* PAGE BREAK */
        .page-break {
          page-break-after: always;
        }
        
        @media print {
          body {
            background-color: white;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <!-- CAPA -->
      <div class="container">
        <div class="cover">
          <div class="company-name">${company_name}</div>
          <h1>Proposta de Orçamento</h1>
          <div class="proposal-info">
            <p><strong>${client_name}</strong></p>
            <p>Tipo de Evento: <strong>${event_type}</strong></p>
            <p>Data: <strong>${eventDateFormatted}</strong></p>
            <p>Convidados: <strong>${number_of_guests} pessoas</strong></p>
          </div>
        </div>
      </div>

      <div class="container page-break">
        <!-- RESUMO DO EVENTO -->
        <div class="header">
          <h2>Resumo do Evento</h2>
        </div>

        <div class="summary">
          <div class="summary-item">
            <strong>Cliente</strong>
            <div class="value">${client_name}</div>
          </div>
          <div class="summary-item">
            <strong>Tipo de Evento</strong>
            <div class="value">${event_type}</div>
          </div>
          <div class="summary-item">
            <strong>Data do Evento</strong>
            <div class="value">${eventDateFormatted}</div>
          </div>
          <div class="summary-item">
            <strong>Número de Convidados</strong>
            <div class="value">${number_of_guests}</div>
          </div>
        </div>

        <!-- DESCRIÇÃO -->
        <div class="section">
          <h3>Experiência Proposta</h3>
          <p><strong>${template_name}</strong></p>
          <p>${template_description || 'Evento personalizado com os melhores serviços para sua celebração.'}</p>
        </div>

        <!-- ITENS INCLUSOS -->
        <div class="section">
          <h3>Itens Inclusos</h3>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Valor Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <!-- TOTALIZADORES -->
        <div class="totals">
          <div class="total-row">
            <label>Custo Total dos Insumos:</label>
            <span class="amount">R$ ${total_cost.toFixed(2)}</span>
          </div>
          ${margin_percentage > 0 ? `
          <div class="total-row">
            <label>Margem (${margin_percentage}%):</label>
            <span class="amount">R$ ${margin_amount.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <label>Preço com Margem:</label>
            <span class="amount">R$ ${price_with_margin.toFixed(2)}</span>
          </div>
          ` : ''}
          ${discount > 0 ? `
          <div class="total-row">
            <label>Desconto Aplicado:</label>
            <span class="amount">-R$ ${discount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row final">
            <label>INVESTIMENTO TOTAL:</label>
            <span class="amount">R$ ${final_price.toFixed(2)}</span>
          </div>
        </div>

        <!-- DIFERENCIAIS -->
        <div class="section">
          <h3>Diferenciais do Nosso Serviço</h3>
          <div class="highlights">
            <div class="highlight-item">
              <strong>👥 Equipe Profissional</strong>
              Equipe experiente e atenciosa para garantir o sucesso do seu evento
            </div>
            <div class="highlight-item">
              <strong>🎨 Montagem Completa</strong>
              Montagem e desmontagem inclusos no pacote
            </div>
            <div class="highlight-item">
              <strong>♻️ Reposição Contínua</strong>
              Reposição de alimentos e bebidas conforme consumo
            </div>
            <div class="highlight-item">
              <strong>🤝 Atendimento Premium</strong>
              Atendimento personalizado do início ao fim do evento
            </div>
          </div>
        </div>

        <!-- CONDIÇÕES -->
        <div class="section">
          <h3>Condições de Pagamento</h3>
          <p>${payment_conditions}</p>
        </div>

        <!-- OBSERVAÇÕES -->
        <div class="section">
          <h3>Observações Importantes</h3>
          <p><strong>Validade da Proposta:</strong> ${validity_days} dias (até ${validityDateFormatted})</p>
          <p><strong>Ajustes:</strong> Qualquer alteração no número de convidados ou na data do evento necessita de revisão desta proposta.</p>
          ${notes ? `<p><strong>Notas Adicionais:</strong> ${notes}</p>` : ''}
        </div>

        <!-- CTA -->
        <div class="cta">
          ✓ Para garantir sua data, confirme esta proposta
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <p>Obrigado por escolher o ${company_name}!</p>
          <p>Estamos prontos para tornar seu evento memorável.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

module.exports = {
  generateProposalHTML,
};
