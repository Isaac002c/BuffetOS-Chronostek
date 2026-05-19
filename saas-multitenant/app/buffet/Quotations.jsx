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

const emptyItem = { item_name: '', quantity: 1, unit_price: 0 };

export default function BuffetQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [form, setForm] = useState({
    client_id: '',
    event_type: '',
    event_date: '',
    guest_count: 0,
    status: 'draft',
    notes: '',
    discount_percent: 0,
  });
  const [items, setItems] = useState([emptyItem]);
  const [approvalInProgress, setApprovalInProgress] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotationsData, clientsData] = await Promise.all([
        getAllQuotations(),
        getClients(),
      ]);
      setQuotations(quotationsData || []);
      setClients(clientsData || []);
    } catch (err) {
      console.error('Erro ao carregar dados de cotações:', err);
      setMessage('Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((current) =>
      current.map((item, idx) =>
        idx === index ? { ...item, [field]: field === 'quantity' || field === 'unit_price' ? Number(value) : value } : item
      )
    );
  };

  const addItem = () => setItems((current) => [...current, emptyItem]);
  const removeItem = (index) => setItems((current) => current.filter((_, idx) => idx !== index));

  const resetForm = () => {
    setEditingQuotation(null);
    setForm({ client_id: '', event_type: '', event_date: '', guest_count: 0, status: 'draft', notes: '', discount_percent: 0 });
    setItems([emptyItem]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.client_id || !form.event_type || !form.event_date) {
      setMessage('Cliente, tipo de evento e data são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...form,
        items,
      };

      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, payload);
        setMessage('Cotação atualizada com sucesso.');
      } else {
        await createQuotation(payload);
        setMessage('Cotação criada com sucesso.');
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error('Erro ao salvar cotação:', err);
      setMessage(err.message || 'Erro ao salvar cotação.');
    }
  };

  const handleEditQuotation = async (quotation) => {
    setEditingQuotation(quotation);
    setForm({
      client_id: quotation.client_id || '',
      event_type: quotation.event_type || '',
      event_date: quotation.event_date ? quotation.event_date.split('T')[0] : '',
      guest_count: quotation.guest_count || 0,
      status: quotation.status || 'draft',
      notes: quotation.notes || '',
    });
    setItems((quotation.items || []).map((item) => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão da cotação?')) return;
    try {
      await deleteQuotation(id);
      setMessage('Cotação removida com sucesso.');
      loadData();
      if (editingQuotation && editingQuotation.id === id) resetForm();
      if (selectedQuotation && selectedQuotation.id === id) setSelectedQuotation(null);
    } catch (err) {
      console.error('Erro ao excluir cotação:', err);
      setMessage(err.message || 'Erro ao excluir cotação.');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const quotation = quotations.find((quote) => quote.id === id);
      if (!quotation) return;
      await duplicateQuotation(id, quotation.client_id);
      setMessage('Cotação duplicada com sucesso.');
      loadData();
    } catch (err) {
      console.error('Erro ao duplicar cotação:', err);
      setMessage(err.message || 'Erro ao duplicar cotação.');
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    setSelectedQuotation(null);
    setMessage('Edição cancelada.');
  };

  const closeQuotationDetails = () => setSelectedQuotation(null);

  const handleApprove = async (quotation) => {
    if (approvalInProgress) return; // Prevent double-click
    
    if (!window.confirm(`Aprovar cotação de ${getClientName(quotation.client_id)}?`)) return;
    
    setApprovalInProgress(quotation.id);
    try {
      await approveQuotation(quotation.id);
      setMessage('✅ Cotação aprovada com sucesso!');
      loadData();
    } catch (err) {
      console.error('Erro ao aprovar cotação:', err);
      setMessage(err.message || 'Erro ao aprovar cotação.');
    } finally {
      setApprovalInProgress(null);
    }
  };

  const handleCancelQuotation = async (quotation) => {
    if (!window.confirm('Deseja realmente cancelar esta cotação?')) return;

    try {
      await cancelQuotation(quotation.id);
      setMessage('Cotação cancelada com sucesso.');
      loadData();
      if (editingQuotation && editingQuotation.id === quotation.id) resetForm();
      if (selectedQuotation && selectedQuotation.id === quotation.id) setSelectedQuotation(null);
    } catch (err) {
      console.error('Erro ao cancelar cotação:', err);
      setMessage(err.message || 'Erro ao cancelar cotação.');
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((client) => client.id === clientId);
    return client ? client.name : 'Sem nome';
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
  const discountAmount = totalAmount * (Number(form.discount_percent || 0) / 100);
  const finalAmount = totalAmount - discountAmount;

  const filteredQuotations = quotations.filter((quotation) => {
    const matchesClient = filterClient ? String(quotation.client_id) === String(filterClient) : true;
    const matchesStatus = filterStatus ? quotation.status === filterStatus : true;
    const eventDate = quotation.event_date ? new Date(quotation.event_date) : null;
    const matchesFrom = filterDateFrom ? eventDate && eventDate >= new Date(filterDateFrom) : true;
    const matchesTo = filterDateTo ? eventDate && eventDate <= new Date(filterDateTo) : true;
    return matchesClient && matchesStatus && matchesFrom && matchesTo;
  });

  return (
    <div className="section-card">
      <div className="section-header">
        <h2>Cotações Buffet</h2>
      </div>

      {message && <div className="notice-message">{message}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Cliente</label>
          <select value={form.client_id} onChange={(e) => handleFieldChange('client_id', e.target.value)}>
            <option value="">Selecione um cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Tipo de evento</label>
          <input
            type="text"
            value={form.event_type}
            onChange={(e) => handleFieldChange('event_type', e.target.value)}
            placeholder="Ex: Casamento, Formatura, Corporativo"
          />
        </div>

        <div className="form-row">
          <label>Data do evento</label>
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => handleFieldChange('event_date', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Convidados</label>
          <input
            type="number"
            min={0}
            value={form.guest_count}
            onChange={(e) => handleFieldChange('guest_count', Number(e.target.value) || 0)}
          />
        </div>

        <div className="form-row">
          <label>Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Informações adicionais"
          />
        </div>

        <div className="form-row">
          <label>Desconto (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.discount_percent}
            onChange={(e) => handleFieldChange('discount_percent', Number(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <div className="form-row">
          <label>Status</label>
          <select value={form.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
            <option value="draft">Rascunho</option>
            <option value="approved">Aprovada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        <div className="section-block">
          <h3>Itens da cotação</h3>
          {items.map((item, index) => (
            <div key={index} className="form-grid">
              <input
                type="text"
                placeholder="Nome do item"
                value={item.item_name}
                onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
              />
              <input
                type="number"
                min={1}
                placeholder="Quantidade"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Preço unitário"
                value={item.unit_price}
                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
              />
              <button type="button" className="btn-small danger" onClick={() => removeItem(index)}>
                Remover
              </button>
            </div>
          ))}
          <button type="button" className="btn-small" onClick={addItem}>
            Adicionar item
          </button>

          {/* Total Preview Card */}
          <div className="total-preview-card">
            <div className="total-preview-row">
              <span className="label">Subtotal</span>
              <span className="value">R$ {totalAmount.toFixed(2)}</span>
            </div>
            {form.discount_percent > 0 && (
              <div className="total-preview-row discount">
                <span className="label">Desconto ({form.discount_percent}%)</span>
                <span className="value">-R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-preview-row total">
              <span className="label">Total</span>
              <span className="value">R$ {finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingQuotation ? 'Atualizar cotação' : 'Criar cotação'}
          </button>
          {editingQuotation && (
            <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="section-block">
        <div className="section-header">
          <h3>Filtros de cotação</h3>
        </div>
        <div className="form-grid">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="approved">Aprovada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            placeholder="Data de"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            placeholder="Data até"
          />
          <button type="button" className="btn-small" onClick={() => {
            setFilterClient('');
            setFilterStatus('');
            setFilterDateFrom('');
            setFilterDateTo('');
          }}>
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="section-block">
        <div className="section-header">
          <h3>Lista de cotações</h3>
          <button onClick={loadData} className="btn-small" disabled={loading}>
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar'}
          </button>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="loading-card" />
            ))}
          </div>
        ) : quotations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Nenhuma cotação encontrada</h3>
            <p>Comece criando sua primeira cotação usando o formulário acima.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Evento</th>
                  <th>Data</th>
                  <th>Convidados</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td>{getClientName(quotation.client_id)}</td>
                    <td>{quotation.event_type || '---'}</td>
                    <td>{quotation.event_date ? new Date(quotation.event_date).toLocaleDateString() : '---'}</td>
                    <td>{quotation.guest_count || '-'}</td>
                    <td>{quotation.total_amount !== null ? `R$ ${Number(quotation.total_amount).toFixed(2)}` : '-'}</td>
                    <td>{quotation.status || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => setSelectedQuotation(quotation)} title="Ver detalhes">
                          👁️
                        </button>
                        <button className="btn-icon" onClick={() => handleEditQuotation(quotation)} title="Editar">
                          ✏️
                        </button>
                        <button className="btn-icon" onClick={() => handleDuplicate(quotation.id)} title="Duplicar">
                          📋
                        </button>
                        {quotation.status !== 'approved' && quotation.status !== 'cancelled' && (
                          <button 
                            className="btn-icon success" 
                            onClick={() => handleApprove(quotation)} 
                            disabled={approvalInProgress === quotation.id}
                            title="Aprovar"
                          >
                            {approvalInProgress === quotation.id ? '⏳' : '✅'}
                          </button>
                        )}
                        {quotation.status !== 'cancelled' && (
                          <button className="btn-icon warning" onClick={() => handleCancelQuotation(quotation)} title="Cancelar">
                            ❌
                          </button>
                        )}
                        <button className="btn-icon danger" onClick={() => handleDelete(quotation.id)} title="Excluir">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedQuotation && (
        <div className="section-block">
          <div className="section-header">
            <h3>Detalhes da cotação</h3>
            <button className="btn-small" onClick={closeQuotationDetails}>
              Fechar
            </button>
          </div>
          <div className="details-grid">
            <div>
              <strong>Cliente:</strong>
              <p>{getClientName(selectedQuotation.client_id)}</p>
            </div>
            <div>
              <strong>Evento:</strong>
              <p>{selectedQuotation.event_type || '---'}</p>
            </div>
            <div>
              <strong>Data:</strong>
              <p>{selectedQuotation.event_date ? new Date(selectedQuotation.event_date).toLocaleDateString() : '---'}</p>
            </div>
            <div>
              <strong>Convidados:</strong>
              <p>{selectedQuotation.guest_count || '-'}</p>
            </div>
            <div>
              <strong>Status:</strong>
              <p>{selectedQuotation.status || '-'}</p>
            </div>
            <div>
              <strong>Notas:</strong>
              <p>{selectedQuotation.notes || 'Sem notas'}</p>
            </div>
          </div>

          <div className="section-block">
            <h4>Itens</h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantidade</th>
                    <th>Preço unitário</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedQuotation.items || []).map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_name || '-'}</td>
                      <td>{item.quantity || 0}</td>
                      <td>R$ {Number(item.unit_price || 0).toFixed(2)}</td>
                      <td>R$ {Number((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="section-note">
              Total: R$ {Number(selectedQuotation.total_amount || 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
