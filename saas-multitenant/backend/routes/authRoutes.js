const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { createUser } = require('../models/userModels');
const { createTenant } = require('../models/tenantModels');
const pool = require('../config/db');
const { logAudit } = require('../utils/auditLog');

const isDev = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (isDev) console.log(...args); };

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
  return secret;
};

const sendJson = (res, status, data) => {
  res.status(status).setHeader('Content-Type', 'application/json').json(data);
};

// ✅ Rate limit específico pro login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 1. REGISTER
router.post('/register',
  [
    body('tenantName').notEmpty().trim().escape(),
    body('name').notEmpty().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendJson(res, 400, { success: false, message: 'Dados inválidos' });
    }

    try {
      const { tenantName, name, email, password } = req.body;

      const tenant = await createTenant(tenantName);

      const existingUsers = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
        [tenant.id]
      );
      const isFirstUser = parseInt(existingUsers.rows[0].count) === 0;

      await createUser({
        name,
        email,
        password,
        tenant_id: tenant.id,
        role: isFirstUser ? 'admin' : 'seller'
      });

      sendJson(res, 201, {
        success: true,
        tenant_id: tenant.id,
        message: 'Tenant + usuário criado com sucesso!'
      });
    } catch (err) {
      console.error('[REGISTER ERROR]', err.message);
      sendJson(res, 500, { success: false, message: 'Erro ao registrar' });
    }
  }
);

// 2. LOGIN
router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendJson(res, 400, { success: false, message: 'Dados inválidos' });
    }

    let client;
    try {
      const { email, password } = req.body;

      client = await pool.connect();

      const result = await client.query(
        `SELECT u.id, u.name, u.email, u.password_hash, u.tenant_id, u.role,
                u.token_version, u.is_active,
                t.name    as tenant_name,
                t.phone   as tenant_phone,
                t.email   as tenant_email,
                t.cnpj    as tenant_cnpj,
                t.address as tenant_address
         FROM users u
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1`,
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Credenciais inválidas' });
      }

      // Bloquear usuários desativados antes de verificar senha (evita timing side-channel)
      if (user.is_active === false) {
        return sendJson(res, 403, { success: false, message: 'Conta desativada. Entre em contato com o administrador.' });
      }

      const isValidPassword = await bcryptjs.compare(password, user.password_hash);

      if (!isValidPassword) {
        return sendJson(res, 401, { success: false, message: 'Credenciais inválidas' });
      }

      // Token expira em 8 h (jornada de trabalho).
      const TOKEN_TTL_SEC = 8 * 60 * 60;

      // Sessões simultâneas: máximo 2 dispositivos por usuário.
      // Se já há 2, remove a sessão mais antiga antes de criar a nova.
      const MAX_SESSIONS = 2;
      const sessionCountResult = await client.query(
        'SELECT COUNT(*) FROM user_sessions WHERE user_id = $1',
        [user.id]
      );
      if (parseInt(sessionCountResult.rows[0].count) >= MAX_SESSIONS) {
        await client.query(
          `DELETE FROM user_sessions
           WHERE id = (SELECT id FROM user_sessions WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
          [user.id]
        );
      }
      const sessionResult = await client.query(
        'INSERT INTO user_sessions (user_id, tenant_id) VALUES ($1, $2) RETURNING id',
        [user.id, user.tenant_id]
      );
      const sessionId = sessionResult.rows[0].id;

      const token = jwt.sign(
        {
          userId:       user.id,
          tenantId:     user.tenant_id,
          email:        user.email,
          role:         user.role || 'admin',
          tokenVersion: user.token_version ?? 0,
          sessionId,
        },
        getJWTSecret(),
        { expiresIn: TOKEN_TTL_SEC }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: TOKEN_TTL_SEC * 1000   // alinhado com a expiração do JWT
      };

      res.cookie('token', token, cookieOptions);
      res.cookie('auth-token', token, cookieOptions);
      res.cookie('tenantId', user.tenant_id.toString(), cookieOptions);

      // Audit log: login bem-sucedido
      // req.tenantId e req.userId ainda não estão definidos (pré-middleware), então passamos manualmente
      const auditReq = { tenantId: String(user.tenant_id), userId: String(user.id), ip: req.ip, headers: req.headers };
      logAudit(auditReq, 'login', 'user', user.id, { email: user.email, role: user.role });

      // Não retornar o token no body — ele já está no cookie httpOnly.
      // Retornar apenas os dados de exibição (sem credencial).
      sendJson(res, 200, {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'admin'
        },
        tenant: {
          id:      user.tenant_id,
          name:    user.tenant_name,
          phone:   user.tenant_phone   || '',
          email:   user.tenant_email   || '',
          cnpj:    user.tenant_cnpj    || '',
          address: user.tenant_address || '',
        }
      });
    } catch (err) {
      console.error('[LOGIN ERROR]', err.message);
      sendJson(res, 500, { success: false, message: 'Erro no servidor' });
    } finally {
      if (client) client.release();
    }
  }
);

// 3. VALIDATE TOKEN
router.post('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return sendJson(res, 401, { success: false, message: 'Token obrigatório' });
    }

    const decoded = jwt.verify(token, getJWTSecret());
    sendJson(res, 200, {
      success: true,
      user: { id: decoded.userId, email: decoded.email },
      tenant: { id: decoded.tenantId },
      role: decoded.role || 'seller',
      sellerId: decoded.sellerId
    });
  } catch (err) {
    sendJson(res, 401, { success: false, message: 'Token inválido' });
  }
});

// 4. LOGOUT — remove apenas a sessão deste dispositivo (os outros continuam ativos)
router.post('/logout', async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      req.cookies?.['auth-token'] ||
      req.headers['authorization']?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, getJWTSecret());
      // Remove só a sessão deste dispositivo
      if (decoded?.sessionId) {
        await pool.query('DELETE FROM user_sessions WHERE id = $1', [decoded.sessionId]);
      }
    }
  } catch (_) {
    // Token inválido/expirado — não bloquear o logout por isso
  }

  // Audit log logout (best-effort — req.tenantId/userId podem estar undefined aqui)
  if (req.tenantId || req.userId) {
    logAudit(req, 'logout', 'user', req.userId, {});
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };
  res.clearCookie('token', cookieOptions);
  res.clearCookie('auth-token', cookieOptions);
  res.clearCookie('tenantId', cookieOptions);
  sendJson(res, 200, { success: true, message: 'Logout realizado com sucesso' });
});

module.exports = router;