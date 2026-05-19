'use client';

import { useState, useEffect } from 'react';
import { createQuotation } from '../lib/quotationsAPI.js';
import { getClients } from '../lib/clientsAPI.js';
import {
  getAllTemplates,
  getTemplate,
  createTemplate,
  deleteTemplate,
  createTemplateItem,
  simulateQuotation,
  generateProposal,
} from '../lib/templatesAPI.js';
import WhatsAppIntegration from './WhatsAppIntegration';
import PDFGenerator from './PDFGenerator';

// Preset de tipos de eventos com itens padrão (fallback)
const EVENT_PRESETS = {
  casamento: {
    name: 'Casamento',
    items: [
      { item_name: 'Entrada (prato frio)', quantity: 1, unit_price: 35 },
      { item_name: 'Prato Principal', quantity: 1, unit_price: 85 },
      { item_name: 'Sobremesa', quantity: 1, unit_price: 25 },
      { item_name: 'Bebidas', quantity: 1, unit_price: 20 },
      { item_name: 'Garçom (por hora)', quantity: 4, unit_price: 50 },
    ],
  },
  infantil: {
    name: 'Festa Infantil',
    items: [
      { item_name: 'Salgados sortidos', quantity: 1, unit_price: 40 },
      { item_name: 'Docinhos variados', quantity: 1, unit_price: 30 },
      { item_name: 'Bebidas e suco', quantity: 1, unit_price: 15 },
      { item_name: 'Bolo personalizado', quantity: 1, unit_price: 120 },
      { item_name: 'Decoração temática', quantity: 1, unit_price: 100 },
    ],
  },
  corporativo: {
    name: 'Evento Corporativo',
    items: [
      { item_name: 'Café da manhã executivo', quantity: 1, unit_price: 50 },
      { item_name: 'Almoço completo', quantity: 1, unit_price: 75 },
      { item_name: 'Café da tarde', quantity: 1, unit_price: 30 },
      { item_name: 'Bebidas variadas', quantity: 1, unit_price: 25 },
      { item_name: 'Atendimento', quantity: 1, unit_price: 150 },
    ],
  },
  aniversario: {
    name: 'Aniversário',
    items: [
      { item_name: 'Entrada fria', quantity: 1, unit_price: 30 },
      { item_name: 'Prato principal', quantity: 1, unit_price: 60 },
      { item_name: 'Acompanhamentos', quantity: 1, unit_price: 20 },
      { item_name: 'Bolo decorado', quantity: 1, unit_price: 100 },
      { item_name: 'Bebidas e refrigerante', quantity: 1, unit_price: 18 },
    ],
  },
  churrasco: {
    name: 'Churrascaria',
    items: [
      { item_name: 'Carnes variadas (kg)', quantity: 0.5, unit_price: 120 },
      { item_name: 'Acompanhamentos', quantity: 1, unit_price: 40 },
      { item_name: 'Bebidas', quantity: 1, unit_price: 30 },
      { item_name: 'Garçom (por hora)', quantity: 2, unit_price: 50 },
      { item_name: 'Aluguel de equipamentos', quantity: 1, unit_price: 150 },
    ],
  },
};

export default function BuffetQuotationSimulator() {
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [useTemplateMode, setUseTemplateMode] = useState(true);
  
  // Form state
  const [eventType, setEventType] = useState('casamento');
  const [guestCount, setGuestCount] = useState(100);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [items, setItems] = useState([...EVENT_PRESETS.casamento.items]);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Template mode
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [marginPercentage, setMarginPercentage] = useState(30);
  const [discount, setDiscount] = useState(0);
  const [simulatingQuotation, setSimulatingQuotation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, templatesData] = await Promise.all([
        getClients(),
        getAllTemplates(),
      ]);
      setClients(clientsData || []);
      setTemplates(templatesData || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // MODO TEMPLATE - SIMULAÇÃO
  // ============================================

  const handleSimulateFromTemplate = async () => {
    if (!selectedTemplate || !clientId || !guestCount) {
      setMessageType('error');
      setMessage('Selecione template, cliente e número de convidados');
      return;
    }

    setSimulatingQuotation(true);
    try {
      const result = await simulateQuotation({
        template_id: selectedTemplate.id,
        number_of_guests: parseInt(guestCount),
        margin_percentage: parseFloat(marginPercentage),
        discount: parseFloat(discount),
      });

      setSimulation(result);
      setItems(
        result.items.map(item => ({
          item_name: item.name,
          quantity: item.total_quantity,
          unit_price: item.cost_per_unit,
        }))
      );

      setMessageType('success');
      setMessage('✅ Simulação calculada com sucesso!');
    } catch (err) {
      setMessageType('error');
      setMessage('Erro ao simular: ' + err.message);
    } finally {
      setSimulatingQuotation(false);
    }
  };

  const handleLoadTemplate = async (templateId) => {
    try {
      const template = await getTemplate(templateId);
      setSelectedTemplate(template);
      setEventType(template.event_type || 'casamento');
    } catch (err) {
      console.error('Erro ao carregar template:', err);
      setMessageType('error');
      setMessage('Erro ao carregar template');
    }
  };

  // ============================================
  // MODO MANUAL - PRESETS
  // ============================================

  // Mudar tipo de evento atualiza itens padrão
  const handleEventTypeChange = (type) => {
    setEventType(type);
    setItems([...EVENT_PRESETS[type].items]);
  };

  // Atualizar quantidade de pessoas recalcula totais
  const handleGuestCountChange = (count) => {
    setGuestCount(count);
  };

  // Atualizar item individual
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'quantity' || field === 'unit_price' ? Number(value) || 0 : value;
    setItems(newItems);
  };

  // Calcular total
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  // Remover item
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Adicionar item vazio
  const addItem = () => {
    setItems([...items, { item_name: '', quantity: 1, unit_price: 0 }]);
  };

  // Criar orçamento
  const handleCreateQuotation = async () => {
    if (!clientName || !clientPhone || !eventDate) {
      setMessageType('error');
      setMessage('Preencha cliente, telefone e data do evento');
      return;
    }

    setCreating(true);
    try {
      const quotationData = {
        client_id: clientId || null,
        client_name: clientName,
        client_phone: clientPhone,
        event_type: eventType,
        event_date: eventDate,
        guest_count: guestCount,
        status: 'draft',
        notes: useTemplateMode && selectedTemplate ? `Template: ${selectedTemplate.name}\n${notes}` : notes,
        items,
        total_amount: simulation ? simulation.final_price : calculateTotal(),
        ...(simulation && {
          margin_percentage: simulation.margin_percentage,
          margin_amount: simulation.margin_amount,
          price_with_margin: simulation.price_with_margin,
          discount: simulation.discount,
        }),
      };

      await createQuotation(quotationData);
      setMessageType('success');
      setMessage('✅ Orçamento criado com sucesso!');
      
      // Resetar form
      setTimeout(() => {
        setEventType('casamento');
        setGuestCount(100);
        setClientId('');
        setClientName('');
        setClientPhone('');
        setEventDate('');
        setItems([...EVENT_PRESETS.casamento.items]);
        setNotes('');
        setMessage('');
        setSelectedTemplate(null);
        setSimulation(null);
        setMarginPercentage(30);
        setDiscount(0);
      }, 2000);
    } catch (err) {
      setMessageType('error');
      setMessage('Erro ao criar orçamento: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="loading-pulse">Carregando clientes...</div>;
  }

  const totalValue = calculateTotal();

  return (
    <div className="simulator-container">
      <div className="simulator-header">
        <h1>Simulador de Orçamento</h1>
        <p>Crie orçamentos profissionais em menos de 2 minutos</p>
      </div>

      {message && (
        <div className={`notice-message ${messageType}`}>
          {message}
        </div>
      )}

      {/* MODO SELEÇÃO */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${useTemplateMode ? 'active' : ''}`}
          onClick={() => {
            setUseTemplateMode(true);
            setSimulation(null);
          }}
        >
          🎯 Modo Template (Inteligente)
        </button>
        <button
          className={`mode-btn ${!useTemplateMode ? 'active' : ''}`}
          onClick={() => {
            setUseTemplateMode(false);
            setSelectedTemplate(null);
            setSimulation(null);
          }}
        >
          ✏️ Modo Manual
        </button>
      </div>

      <div className="simulator-layout">
        {/* MODO TEMPLATE */}
        {useTemplateMode && (
          <>
            {/* Coluna esquerda - Template Selection */}
            <div className="simulator-config">
              <div className="config-section">
                <h2>Selecione um Template</h2>
                {templates.length === 0 ? (
                  <p style={{ color: '#7f8c8d' }}>Nenhum template disponível. Crie um novo.</p>
                ) : (
                  <div className="template-grid">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        className={`template-btn ${selectedTemplate?.id === template.id ? 'active' : ''}`}
                        onClick={() => handleLoadTemplate(template.id)}
                      >
                        <div className="template-name">{template.name}</div>
                        <div className="template-items-count">{template.items?.length || 0} itens</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedTemplate && (
                <>
                  <div className="config-section">
                    <h2>Configurações do Evento</h2>
                    <label>Cliente *</label>
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>

                    <label>Convidados *</label>
                    <input
                      type="number"
                      value={guestCount}
                      onChange={(e) => handleGuestCountChange(Number(e.target.value))}
                      min="1"
                      className="input-field"
                    />

                    <label>Margem de Lucro (%)</label>
                    <input
                      type="number"
                      value={marginPercentage}
                      onChange={(e) => setMarginPercentage(Number(e.target.value))}
                      step="1"
                      className="input-field"
                    />

                    <label>Desconto (R$)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      step="0.01"
                      className="input-field"
                    />
                  </div>

                  <div className="config-section">
                    <h2>Detalhes do Evento</h2>
                    <label>Data do Evento</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="input-field"
                    />
                    <label>Observações</label>
                    <textarea
                      placeholder="Observações adicionais..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input-field"
                      rows="3"
                    />
                  </div>

                  <button
                    onClick={handleSimulateFromTemplate}
                    disabled={simulatingQuotation}
                    className="btn-primary-large"
                  >
                    {simulatingQuotation ? 'Simulando...' : '🎯 Simular Orçamento'}
                  </button>
                </>
              )}
            </div>

            {/* Coluna direita - Simulação */}
            {simulation && (
              <div className="simulator-summary">
                <div className="summary-header">
                  <h2>Simulação</h2>
                </div>

                <div className="items-table">
                  <div className="items-header">
                    <div className="col-item">Item</div>
                    <div className="col-qty">Qtd Total</div>
                    <div className="col-price">V. Unit.</div>
                    <div className="col-total">Total</div>
                  </div>
                  {simulation.items.map((item) => (
                    <div key={item.id} className="items-row">
                      <div className="col-item">{item.name}</div>
                      <div className="col-qty">{item.total_quantity.toFixed(2)} {item.unit}</div>
                      <div className="col-price">R$ {item.cost_per_unit.toFixed(2)}</div>
                      <div className="col-total">R$ {item.total_cost.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="summary-total">
                  <div className="total-row">
                    <span>Custo Insumos:</span>
                    <span className="total-value">R$ {simulation.total_cost.toFixed(2)}</span>
                  </div>
                  {simulation.margin_percentage > 0 && (
                    <>
                      <div className="total-row">
                        <span>Margem ({simulation.margin_percentage}%):</span>
                        <span className="total-value">R$ {simulation.margin_amount.toFixed(2)}</span>
                      </div>
                      <div className="total-row">
                        <span>Com Margem:</span>
                        <span className="total-value">R$ {simulation.price_with_margin.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {simulation.discount > 0 && (
                    <div className="total-row">
                      <span>Desconto:</span>
                      <span className="total-value" style={{ color: '#27ae60' }}>-R$ {simulation.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="total-row final">
                    <span>TOTAL FINAL:</span>
                    <span className="total-value">R$ {simulation.final_price.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateQuotation}
                  disabled={creating || !clientId}
                  className="btn-primary-large"
                >
                  {creating ? 'Salvando...' : '💾 Salvar Orçamento'}
                </button>
              </div>
            )}
          </>
        )}

        {/* MODO MANUAL */}
        {!useTemplateMode && (
          <>
            {/* Coluna esquerda - Configurações */}
            <div className="simulator-config">
              <div className="config-section">
                <h2>Tipo de Evento</h2>
                <div className="event-types">
                  {Object.entries(EVENT_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      className={`event-type-btn ${eventType === key ? 'active' : ''}`}
                      onClick={() => handleEventTypeChange(key)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="config-section">
                <h2>Informações do Cliente</h2>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-field"
                />
                <input
                  type="tel"
                  placeholder="Telefone (WhatsApp)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="input-field"
                />
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecionar cliente da base (opcional)</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-section">
                <h2>Detalhes do Evento</h2>
                <label>Data do Evento</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input-field"
                />
                <label>Número de Convidados</label>
                <div className="guest-count-input">
                  <button onClick={() => handleGuestCountChange(Math.max(1, guestCount - 10))}>-</button>
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => handleGuestCountChange(Number(e.target.value))}
                    min="1"
                    className="input-field"
                  />
                  <button onClick={() => handleGuestCountChange(guestCount + 10)}>+</button>
                </div>
                <label>Observações</label>
                <textarea
                  placeholder="Observações adicionais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  rows="3"
                />
              </div>
            </div>

            {/* Coluna direita - Itens e Total */}
            <div className="simulator-summary">
              <div className="summary-header">
                <h2>Itens do Orçamento</h2>
                <button onClick={addItem} className="btn-secondary">
                  + Adicionar Item
                </button>
              </div>

              <div className="items-table">
                <div className="items-header">
                  <div className="col-item">Item</div>
                  <div className="col-qty">Qtd</div>
                  <div className="col-price">Valor Unit.</div>
                  <div className="col-total">Total</div>
                  <div className="col-action"></div>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="items-row">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      placeholder="Nome do item"
                      className="col-item input-field"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      step="0.1"
                      className="col-qty input-field"
                    />
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      className="col-price input-field"
                    />
                    <div className="col-total">
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="col-action btn-delete"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>

              <div className="summary-total">
                <div className="total-row">
                  <span>Total do Orçamento:</span>
                  <span className="total-value">R$ {totalValue.toFixed(2)}</span>
                </div>
                <div className="total-per-person">
                  <span>Valor por pessoa:</span>
                  <span>R$ {(guestCount > 0 ? totalValue / guestCount : 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCreateQuotation}
                disabled={creating}
                className="btn-primary-large"
              >
                {creating ? 'Criando...' : 'Criar Orçamento'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Integração WhatsApp */}
      {clientName && (
        <WhatsAppIntegration
          quotation={{
            event_type: EVENT_PRESETS[eventType].name,
            event_date: eventDate,
            guests: guestCount,
            items: items,
            company_name: 'ChronosTek Buffet',
            phone: '(11) 99999-9999'
          }}
          client={{
            name: clientName,
            phone: clientPhone
          }}
        />
      )}

      {/* Gerador de PDF */}
      {clientName && items.length > 0 && (
        <PDFGenerator
          quotation={{
            event_type: EVENT_PRESETS[eventType].name,
            event_date: eventDate,
            guests: guestCount,
            items: items,
            notes: notes
          }}
          client={{
            name: clientName,
            phone: clientPhone
          }}
        />
      )}

      <style jsx>{`
        .mode-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          justify-content: center;
        }

        .mode-btn {
          padding: 10px 20px;
          border: 2px solid #ecf0f1;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .mode-btn.active {
          background: #3498db;
          color: white;
          border-color: #3498db;
        }

        .mode-btn:hover {
          border-color: #3498db;
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .template-btn {
          padding: 15px;
          border: 2px solid #ecf0f1;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }

        .template-btn:hover {
          border-color: #3498db;
        }

        .template-btn.active {
          background: #3498db;
          color: white;
          border-color: #3498db;
        }

        .template-name {
          font-weight: 600;
          margin-bottom: 5px;
        }

        .template-items-count {
          font-size: 12px;
          opacity: 0.8;
        }

        .total-row.final {
          background: #fff3cd;
          padding: 12px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}

