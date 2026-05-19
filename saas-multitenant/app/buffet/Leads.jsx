'use client';

import { useState, useEffect } from 'react';
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  getLeadPipelineStats,
  getLeadStatusStats,
  getLeadSourceStats,
  getLeadMonthlyMetrics,
  getInactiveLeads,
} from '../lib/leadsAPI.js';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  value: 0,
  status: 'novo',
  source: 'web',
  stage: 'lead',
};

const statusOptions = ['novo', 'contactado', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'];
const sourceOptions = ['web', 'indicação', 'parceiro', 'evento', 'outro'];

export default function BuffetLeads() {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingLead, setEditingLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [pipelineStats, setPipelineStats] = useState(null);
  const [statusStats, setStatusStats] = useState([]);
  const [sourceStats, setSourceStats] = useState([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState([]);
  const [inactiveLeads, setInactiveLeads] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, pipelineData, statusData, sourceData, monthlyData, inactiveData] = await Promise.all([
        getLeads(),
        getLeadPipelineStats().catch(() => null),
        getLeadStatusStats().catch(() => []),
        getLeadSourceStats().catch(() => []),
        getLeadMonthlyMetrics(6).catch(() => []),
        getInactiveLeads(7).catch(() => []),
      ]);
      setLeads(leadsData || []);
      setPipelineStats(pipelineData || {});
      setStatusStats(statusData || []);
      setSourceStats(sourceData || []);
      setMonthlyMetrics(monthlyData || []);
      setInactiveLeads(inactiveData || []);
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
      setMessage('Não foi possível carregar os leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingLead(null);
    setForm(initialForm);
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.email) {
      setMessage('Nome e e-mail são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0,
      };
      if (editingLead) {
        await updateLead(editingLead.id, payload);
        setMessage('Lead atualizado com sucesso.');
      } else {
        await createLead(payload);
        setMessage('Lead criado com sucesso.');
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      setMessage(err.message || 'Erro ao salvar lead.');
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      value: lead.value || 0,
      status: lead.status || 'novo',
      source: lead.source || 'web',
      stage: lead.stage || 'lead',
    });
    setMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este lead?')) return;
    try {
      await deleteLead(id);
      setMessage('Lead removido com sucesso.');
      if (editingLead && editingLead.id === id) resetForm();
      loadData();
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      setMessage(err.message || 'Erro ao excluir lead.');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm = !term || [lead.name, lead.email, lead.phone, lead.company].some((value) => value?.toLowerCase().includes(term));
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesSource = !filterSource || lead.source === filterSource;
    return matchesTerm && matchesStatus && matchesSource;
  });

  return (
    <div className="section-card">
      <div className="section-header">
        <h2>Leads Buffet</h2>
      </div>

      {message && <div className="notice-message">{message}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Nome</label>
          <input type="text" value={form.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="Nome do lead" />
        </div>

        <div className="form-row">
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => handleFieldChange('email', e.target.value)} placeholder="email@exemplo.com" />
        </div>

        <div className="form-row">
          <label>Telefone</label>
          <input type="text" value={form.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} placeholder="(00) 00000-0000" />
        </div>

        <div className="form-row">
          <label>Empresa</label>
          <input type="text" value={form.company} onChange={(e) => handleFieldChange('company', e.target.value)} placeholder="Empresa" />
        </div>

        <div className="form-row">
          <label>Valor estimado</label>
          <input type="number" min="0" value={form.value} onChange={(e) => handleFieldChange('value', Number(e.target.value) || 0)} placeholder="R$ 0,00" />
        </div>

        <div className="form-row">
          <label>Status</label>
          <select value={form.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Origem</label>
          <select value={form.source} onChange={(e) => handleFieldChange('source', e.target.value)}>
            {sourceOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Etapa</label>
          <input type="text" value={form.stage} onChange={(e) => handleFieldChange('stage', e.target.value)} placeholder="Ex: lead, proposta, negociação" />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">{editingLead ? 'Atualizar lead' : 'Criar lead'}</button>
          {editingLead && (
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
          )}
        </div>
      </form>

      <div className="summary-grid">
        <div className="summary-item">
          <strong>🎯 Total de leads</strong>
          <span>{pipelineStats?.total_leads ?? 0}</span>
        </div>
        <div className="summary-item">
          <strong>💰 Valor no pipeline</strong>
          <span>R$ {Number(pipelineStats?.total_pipeline_value ?? 0).toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <strong>✅ Leads ganhos</strong>
          <span>{pipelineStats?.gained_leads ?? 0}</span>
        </div>
        <div className="summary-item">
          <strong>📈 Receita gerada</strong>
          <span>R$ {Number(pipelineStats?.total_revenue ?? 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="section-block">
        <div className="section-header">
          <h3>Filtros</h3>
        </div>
        <div className="form-grid">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, e-mail ou empresa" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">Todas as origens</option>
            {sourceOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button type="button" className="btn-small" onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterSource(''); }}>Limpar filtros</button>
        </div>
      </div>

      <div className="section-block">
        <div className="section-header">
          <h3>Leads</h3>
          <button className="btn-small" onClick={loadData} disabled={loading}>
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar'}
          </button>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="loading-card" />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>Nenhum lead encontrado</h3>
            <p>Comece captando seu primeiro lead usando o formulário acima.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Origem</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.email || '-'}</td>
                    <td>{lead.phone || '-'}</td>
                    <td>{lead.company || '-'}</td>
                    <td>{lead.status || '-'}</td>
                    <td>{lead.source || '-'}</td>
                    <td>R$ {Number(lead.value || 0).toFixed(2)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => handleEdit(lead)} title="Editar">
                          ✏️
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(lead.id)} title="Excluir">
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

      <div className="section-block">
        <div className="section-header">
          <h3>Métricas mensais</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Total de leads</th>
                <th>Leads ganhos</th>
                <th>Receita</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {monthlyMetrics.length === 0 ? (
                <tr><td colSpan="5">Nenhuma métrica disponível.</td></tr>
              ) : monthlyMetrics.map((metric) => (
                <tr key={metric.month}>
                  <td>{metric.month}</td>
                  <td>{metric.total_leads ?? 0}</td>
                  <td>{metric.gained_leads ?? 0}</td>
                  <td>R$ {Number(metric.revenue || 0).toFixed(2)}</td>
                  <td>R$ {Number(metric.pipeline_value || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-block">
        <div className="section-header">
          <h3>Leads inativos</h3>
        </div>
        {inactiveLeads.length === 0 ? (
          <p>Sem leads inativos para mostrar.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Última atividade</th>
                  <th>Dias inativos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inactiveLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.last_activity ? new Date(lead.last_activity).toLocaleDateString() : 'Sem atividade'}</td>
                    <td>{lead.days_inactive ?? '-'}</td>
                    <td>{lead.status || '-'}</td>
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
