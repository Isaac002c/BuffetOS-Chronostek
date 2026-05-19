const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { createUser } = require('../models/userModels');
const { createTenant } = require('../models/tenantModels');
const pool = require('../config/db');

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
                t.name as tenant_name
         FROM users u
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1`,
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Credenciais inválidas' });
      }

      const isValidPassword = await bcryptjs.compare(password, user.password_hash);

      if (!isValidPassword) {
        return sendJson(res, 401, { success: false, message: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          role: user.role || 'admin'
        },
        getJWTSecret(),
        { expiresIn: '30d' }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      };

      res.cookie('token', token, cookieOptions);
      res.cookie('auth-token', token, cookieOptions);
      res.cookie('tenantId', user.tenant_id.toString(), cookieOptions);

      sendJson(res, 200, {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'admin'
        },
        tenant: {
          id: user.tenant_id,
          name: user.tenant_name
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

// 4. LOGOUT
router.post('/logout', async (req, res) => {
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