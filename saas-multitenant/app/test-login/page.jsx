// Frontend - Página de Login de Teste com Auto-Redirect
// app/page.jsx (ou criar app/test-login/page.jsx)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Auto-login ao carregar a página
  useEffect(() => {
    const autoLogin = async () => {
      setLoading(true);
      setMessage('🔄 Fazendo login automático...');
      setMessageType('info');

      try {
        const response = await fetch('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'teste@buffetos.com',
            password: 'senha123'
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          // Salvar dados
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          localStorage.setItem('tenantId', data.data.tenantId);

          setMessage('✅ Login bem-sucedido! Redirecionando...');
          setMessageType('success');

          // Redirecionar após 1 segundo
          setTimeout(() => {
            router.push('/dashboard?tab=dashboard');
          }, 1000);
        } else {
          throw new Error(data.message || 'Erro ao fazer login');
        }
      } catch (error) {
        console.error('Erro:', error);
        setMessage(`❌ Erro: ${error.message}`);
        setMessageType('error');
        setLoading(false);
      }
    };

    autoLogin();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        minWidth: '300px'
      }}>
        <h1 style={{ marginBottom: '20px', color: '#333' }}>
          🧪 Login de Teste
        </h1>

        {loading && (
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            ⏳
          </div>
        )}

        <div style={{
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          backgroundColor: messageType === 'success' ? '#d4edda' :
                          messageType === 'error' ? '#f8d7da' : '#d1ecf1',
          color: messageType === 'success' ? '#155724' :
                messageType === 'error' ? '#721c24' : '#0c5460',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' :
                              messageType === 'error' ? '#f5c6cb' : '#bee5eb'}`
        }}>
          {message}
        </div>

        <div style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '20px',
          lineHeight: '1.6'
        }}>
          <p><strong>Credenciais:</strong></p>
          <p>📧 Email: <code style={{
            background: '#f0f0f0',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>teste@buffetos.com</code></p>
          <p>🔑 Senha: <code style={{
            background: '#f0f0f0',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>senha123</code></p>
        </div>

        {!loading && messageType === 'error' && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Tentar Novamente
          </button>
        )}

        {!loading && (
          <div style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#999'
          }}>
            <p>Se não redirecionar em 5 segundos, clique <a href="/dashboard?tab=dashboard" style={{ color: '#007bff' }}>aqui</a></p>
          </div>
        )}
      </div>
    </div>
  );
}
