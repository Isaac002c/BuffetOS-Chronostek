// Frontend - Hook para Login Automático de Teste
// app/lib/useTestLogin.js

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const useTestLogin = () => {
  const router = useRouter();

  const loginAsTestUser = async (email = 'teste@buffetos.com', password = 'senha123') => {
    try {
      // 1. Fazer login
      const loginResponse = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!loginResponse.ok) {
        console.error('Erro ao fazer login:', loginResponse.status);
        return false;
      }

      const { data } = await loginResponse.json();
      
      // 2. Salvar token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenantId', data.tenantId);

      // 3. Redirecionar para dashboard
      router.push('/dashboard?tab=dashboard');
      
      return true;
    } catch (error) {
      console.error('Erro no login de teste:', error);
      return false;
    }
  };

  return { loginAsTestUser };
};

// ============================================
// Usar assim em um componente:
// ============================================

/*
import { useTestLogin } from '@/lib/useTestLogin';

export default function TestLoginButton() {
  const { loginAsTestUser } = useTestLogin();

  const handleTestLogin = async () => {
    await loginAsTestUser('teste@buffetos.com', 'senha123');
  };

  return (
    <button onClick={handleTestLogin}>
      🧪 Login Teste (Dashboard)
    </button>
  );
}
*/
