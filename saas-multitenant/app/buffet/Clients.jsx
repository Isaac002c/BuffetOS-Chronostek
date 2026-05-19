'use client';

import { useState, useEffect } from 'react';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '../lib/clientsAPI.js';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export default function BuffetClients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getClients();
      setClients(data || []);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setMessage('Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingClient(null);
    setForm(initialForm);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
    });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name) {
      setMessage('O nome do cliente é obrigatório.');
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, form);
        setMessage('Cliente atualizado com sucesso.');
      } else {
        await createClient(form);
        setMessage('Cliente criado com sucesso.');
      }
      resetForm();
      loadClients();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      setMessage(err.message || 'Erro ao salvar cliente.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este cliente?')) return;
    try {
      await deleteClient(id);
      setMessage('Cliente removido com sucesso.');
      loadClients();
      if (editingClient && editingClient.id === id) {
        resetForm();
      }
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      setMessage(err.message || 'Erro ao excluir cliente.');
    }
  };

  const filteredClients = clients.filter((client) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [client.name, client.email, client.phone, client.address]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  return (
    <div className="section-card">
      <div className="section-header">
        <h2>Clientes Buffet</h2>
      </div>

      {message && <div className="notice-message">{message}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Nome</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Nome do cliente"
          />
        </div>

        <div className="form-row">
          <label>E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="form-row">
          <label>Telefone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="form-row">
          <label>Endereço</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="Rua, número, bairro"
          />
        </div>

        <div className="form-row">
          <label>Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Observações adicionais"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingClient ? 'Atualizar cliente' : 'Criar cliente'}
          </button>
          {editingClient && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="section-block">
        <div className="section-header">
          <h3>Lista de clientes</h3>
          <button className="btn-small" onClick={loadClients} disabled={loading}>
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar'}
          </button>
        </div>

        <div className="form-row">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente por nome, e-mail ou telefone"
          />
        </div>

        {loading ? (
          <div className="loading-grid">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="loading-card" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>Nenhum cliente encontrado</h3>
            <p>Comece cadastrando seu primeiro cliente usando o formulário acima.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Endereço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email || '-'}</td>
                    <td>{client.phone || '-'}</td>
                    <td>{client.address || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => handleEdit(client)} title="Editar">
                          ✏️
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(client.id)} title="Excluir">
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
    </div>
  );
}
