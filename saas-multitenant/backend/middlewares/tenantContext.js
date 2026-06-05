// middlewares/tenantContext.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const isDev = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (isDev) console.log(...args); };

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
  return secret;
};

module.exports = async function tenantContext(req, res, next) {
  try {
    let token = null;

    // 1️⃣ Header Authorization
    const authHeader = req.headers['authorization'];
    log('[TENANT CONTEXT] Authorization Header:', authHeader ? 'Presente' : 'Ausente');

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      log('[TENANT CONTEXT] Token extraído do header Authorization');
    }
    // 2️⃣ Cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
      log('[TENANT CONTEXT] Token extraído do cookie "token"');
    }
    else if (req.cookies?.['auth-token']) {
      token = req.cookies['auth-token'];
      log('[TENANT CONTEXT] Token extraído do cookie "auth-token"');
    }

    log('[TENANT CONTEXT] Cookies disponíveis:', Object.keys(req.cookies || {}));
    log('[TENANT CONTEXT] Token encontrado:', token ? 'SIM' : 'NÃO');

    // Nunca aceitar token em URL — aparece em logs de servidor, histórico do browser, analytics

    if (!token) {
      log('[TENANT CONTEXT] ERRO: Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    // 3️⃣ Verifica assinatura e expiração
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
      log('[TENANT CONTEXT] Token verificado com sucesso');
    } catch (err) {
      log('[TENANT CONTEXT] ERRO ao verificar token:', err.message);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado.' });
      }
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // 4️⃣ Valida tenantId
    if (!decoded.tenantId) {
      log('[TENANT CONTEXT] ERRO: Tenant inválido');
      return res.status(401).json({ error: 'Tenant inválido.' });
    }

    // 5️⃣ Verifica token_version e is_active no banco (revogação de sessão)
    if (decoded.userId) {
      try {
        const userCheck = await pool.query(
          'SELECT token_version, is_active FROM users WHERE id = $1 AND tenant_id = $2',
          [decoded.userId, String(decoded.tenantId)]
        );
        const dbUser = userCheck.rows[0];

        if (!dbUser) {
          return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        if (dbUser.is_active === false) {
          return res.status(403).json({ error: 'Conta desativada.' });
        }

        const tokenVersionInJWT = decoded.tokenVersion ?? 0;
        const tokenVersionInDB  = dbUser.token_version   ?? 0;
        if (tokenVersionInJWT < tokenVersionInDB) {
          log('[TENANT CONTEXT] token_version inválido — sessão revogada');
          return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
        }

        // Verifica se a sessão deste dispositivo ainda está ativa
        if (decoded.sessionId) {
          const sessionCheck = await pool.query(
            'SELECT id FROM user_sessions WHERE id = $1 AND user_id = $2',
            [decoded.sessionId, decoded.userId]
          );
          if (!sessionCheck.rows[0]) {
            log('[TENANT CONTEXT] sessionId não encontrado — sessão encerrada');
            return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
          }
        }
      } catch (dbErr) {
        console.error('[tenantContext] Erro ao verificar token_version:', dbErr.message);
        return res.status(500).json({ error: 'Erro interno no middleware.' });
      }
    }

    log('[TENANT CONTEXT] Tenant aceito:', decoded.tenantId);

    // 6️⃣ Popula request
    req.tenantId  = String(decoded.tenantId);
    req.userId    = decoded.userId   || null;
    req.userEmail = decoded.email    || null;
    req.userRole  = decoded.role     || 'seller';
    req.sellerId  = decoded.sellerId || null;

    log('[tenantContext] Autenticado:', {
      userId:   req.userId,
      tenantId: req.tenantId,
      role:     req.userRole,
    });

    next();

  } catch (error) {
    console.error('[tenantContext] Erro inesperado:', error.message);
    return res.status(500).json({ error: 'Erro interno no middleware.' });
  }
};