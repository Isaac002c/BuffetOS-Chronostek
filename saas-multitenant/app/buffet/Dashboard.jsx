'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    quotations: 0,
    events: 0,
    revenue: 0,
    teamMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      try {
        const quotationsRes = await apiRequest('/quotations');
        const eventsRes = await apiRequest('/events');
        const billingRes = await apiRequest('/billing');
        const teamRes = await apiRequest('/team');

        const quotations = quotationsRes?.data || quotationsRes || [];
        const events = eventsRes?.data || eventsRes || [];
        const billing = billingRes?.data || billingRes || [];
        const team = teamRes?.data || teamRes || [];

        // Calculate totals
        const totalRevenue = (Array.isArray(billing) ? billing : [])
          .filter(b => b.status === 'paid')
          .reduce((sum, b) => sum + (b.amount || 0), 0);

        setMetrics({
          quotations: Array.isArray(quotations) ? quotations.length : 0,
          events: Array.isArray(events) ? events.length : 0,
          revenue: totalRevenue,
          teamMembers: Array.isArray(team) ? team.length : 0,
        });
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error.message);
        // Manter métricas zeradas se houver erro
        setMetrics({
          quotations: 0,
          events: 0,
          revenue: 0,
          teamMembers: 0,
        });
      }
    } catch (error) {
      console.error('Erro geral ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon, color }) => (
    <div style={{
      ...styles.card,
      borderLeftColor: color,
    }}>
      <div style={styles.cardContent}>
        <div style={styles.cardIcon}>{icon}</div>
        <div>
          <div style={styles.cardValue}>{value}</div>
          <div style={styles.cardTitle}>{title}</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Visão Geral</h2>
        <button
          onClick={loadMetrics}
          style={styles.refreshButton}
        >
          Atualizar
        </button>
      </div>

      <div style={styles.metricsGrid}>
        <MetricCard
          title="Orçamentos"
          value={metrics.quotations}
          icon="📋"
          color="#007bff"
        />
        <MetricCard
          title="Eventos"
          value={metrics.events}
          icon="📅"
          color="#28a745"
        />
        <MetricCard
          title="Receita Total"
          value={`R$ ${metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon="💰"
          color="#ffc107"
        />
        <MetricCard
          title="Membros da Equipe"
          value={metrics.teamMembers}
          icon="👥"
          color="#e83e8c"
        />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Resumo de Atividades</h3>
        <div style={styles.summaryCard}>
          <p style={styles.summaryText}>
            Seu negócio está funcionando bem! Você tem <strong>{metrics.quotations}</strong> orçamentos em andamento,
            <strong> {metrics.events}</strong> eventos agendados e uma equipe de <strong>{metrics.teamMembers}</strong> pessoas.
          </p>
          <p style={styles.summaryText}>
            Receita acumulada: <strong>R$ {metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Ações Rápidas</h3>
        <div style={styles.quickActionsGrid}>
          <QuickActionButton
            label="Ver Orçamentos"
            href="/dashboard?module=buffet&tab=quotations"
            color="#007bff"
          />
          <QuickActionButton
            label="Ver Eventos"
            href="/dashboard?module=buffet&tab=events"
            color="#28a745"
          />
          <QuickActionButton
            label="Financeiro"
            href="/dashboard?module=buffet&tab=billing"
            color="#ffc107"
          />
          <QuickActionButton
            label="Gerenciar Equipe"
            href="/dashboard?module=buffet&tab=team"
            color="#e83e8c"
          />
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ label, href, color }) {
  const handleClick = () => {
    window.location.href = href;
  };

  return (
    <button
      onClick={handleClick}
      style={{
        ...styles.quickButton,
        backgroundColor: color,
      }}
    >
      {label}
    </button>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  cardIcon: {
    fontSize: '32px',
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
  },
  cardTitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '15px',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  summaryText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
    margin: '10px 0',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
  },
  quickButton: {
    padding: '15px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'opacity 0.2s',
  },
  loadingContainer: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#666',
  },
};
