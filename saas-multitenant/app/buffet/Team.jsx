'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export default function Team() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    email: '',
    chave_pix: '',
    funcao: 'garcom',
  });

  const funcoes = ['Garcom', 'Cozinha', 'Churrasqueiro', 'Confeitaria', 'Bartender', 'Gerente', 'Outro'];

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/team');
      setTeam(data?.data || data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar equipe:', error.message);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `/team/${editingId}` : '/team';
      const method = editingId ? 'PUT' : 'POST';

      await apiRequest(url, {
        method,
        body: formData,
      });
      
      setFormData({
        nome: '',
        cpf: '',
        rg: '',
        email: '',
        chave_pix: '',
        funcao: 'garcom',
      });
      setEditingId(null);
      setShowForm(false);
      await loadTeam();
    } catch (error) {
      console.error('❌ Erro ao salvar membro:', error.message);
      alert('Erro ao salvar membro da equipe');
    }
  };

  const handleEdit = (member) => {
    setFormData({
      nome: member.nome || '',
      cpf: member.cpf || '',
      rg: member.rg || '',
      email: member.email || '',
      chave_pix: member.chave_pix || '',
      funcao: member.funcao || 'garcom',
    });
    setEditingId(member.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    try {
      await apiRequest(`/team/${id}`, { method: 'DELETE' });
      await loadTeam();
    } catch (error) {
      console.error('❌ Erro ao deletar membro:', error.message);
      alert('Erro ao remover membro da equipe');
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: '',
      cpf: '',
      rg: '',
      email: '',
      chave_pix: '',
      funcao: 'garcom',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="team-container" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Gerenciamento da Equipe</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            ...styles.button,
            backgroundColor: showForm ? '#dc3545' : '#28a745',
          }}
        >
          {showForm ? 'Cancelar' : 'Adicionar Membro'}
        </button>
      </div>

      {showForm && (
        <div style={styles.formContainer}>
          <h3>{editingId ? 'Editar Membro' : 'Novo Membro da Equipe'}</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label>Nome *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Nome completo"
                />
              </div>

              <div style={styles.formGroup}>
                <label>CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="000.000.000-00"
                />
              </div>

              <div style={styles.formGroup}>
                <label>RG *</label>
                <input
                  type="text"
                  name="rg"
                  value={formData.rg}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="RG"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Chave PIX *</label>
                <input
                  type="text"
                  name="chave_pix"
                  value={formData.chave_pix}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Chave PIX"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Função *</label>
                <select
                  name="funcao"
                  value={formData.funcao}
                  onChange={handleInputChange}
                  style={styles.input}
                >
                  {funcoes.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formButtons}>
              <button
                type="submit"
                style={{ ...styles.button, backgroundColor: '#007bff' }}
              >
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{ ...styles.button, backgroundColor: '#6c757d' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '20px' }}>Carregando...</p>
      ) : (
        <div style={styles.tableContainer}>
          {team.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Nenhum membro cadastrado ainda
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>CPF</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Função</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id} style={styles.tableRow}>
                    <td style={styles.td}>{member.nome}</td>
                    <td style={styles.td}>{member.cpf}</td>
                    <td style={styles.td}>{member.email}</td>
                    <td style={styles.td}>{member.funcao}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleEdit(member)}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#007bff',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#dc3545',
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    transition: 'opacity 0.2s',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
  },
  form: {
    marginTop: '15px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    marginTop: '5px',
  },
  formButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-start',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e0e0e0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#333',
    borderBottom: '2px solid #e0e0e0',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    color: '#666',
  },
  tableRow: {
    transition: 'backgroundColor 0.2s',
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'white',
    marginRight: '5px',
    transition: 'opacity 0.2s',
  },
};
