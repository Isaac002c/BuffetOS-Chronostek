// Em desenvolvimento: detecta ambiente e rota corretamente
// - localhost: usa /api (reescrito pelo Next.js para http://127.0.0.1:5000/api)
// - GitHub Codespace: substitui porta 3001 → 3000
// - Produção: usa variável de ambiente
let API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Desenvolvimento local — usa proxy do Next.js (next.config.js repassa /api → porta 5000)
    API_URL = '';
  } else if (window.location.hostname.includes('app.github.dev')) {
    // GitHub Codespace — substitui porta 3001 pela 3000
    const origin = window.location.origin;
    API_URL = origin.replace(/:3001($|[^\d])/, ':3000');
  } else {
    // Fallback produção
    API_URL = '';
  }
}

API_URL = API_URL || '';

export const getApiUrl = () => API_URL;

const getAuthHeaders = () => {
  // O token JWT trafega apenas via cookie httpOnly (definido pelo backend no login).
  // credentials: 'include' em cada fetch garante o envio automático do cookie.
  // Não lemos nem escrevemos o JWT em localStorage — isso previne roubo via XSS.
  return { 'Content-Type': 'application/json' };
};

export const apiRequest = async (endpoint, options = {}) => {
  // endpoint já deve vir com /api/... (ex: /api/leads, /api/quotations)
  const url = `${API_URL}${endpoint}`;

  const authHeaders = getAuthHeaders();

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;

    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error(`❌ [${res.status}] ${endpoint}:`, errorMessage);
    }
    throw new Error(errorMessage);
  }

  // Evita crash quando backend retorna vazio
  if (!text) {
    return { success: true, data: null };
  }

  // Evita erro "Unexpected token <" (HTML retornado em vez de JSON)
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('❌ Resposta não é JSON válido:', text.substring(0, 200));
    throw new Error('Resposta inválida do servidor');
  }
};