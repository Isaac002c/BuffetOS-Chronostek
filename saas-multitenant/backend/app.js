require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const tenantContext = require('./middlewares/tenantContext');
const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const setupRoutes = require('./routes/setupRoutes');
const sellersRoutes = require('./routes/sellersRoutes');
const clientRoutes = require('./routes/clientRoutes');
const leadRoutes = require('./routes/leadRoutes');
const contractRoutes = require('./routes/contractRoutes');
const documentRoutes = require('./routes/documentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const saasRoutes = require('./routes/saasRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const quotationsRoutes = require('./routes/quotationsRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const teamRoutes = require('./routes/teamRoutes');
const templatesRoutes = require('./routes/templatesRoutes');
const technicalSheetsRoutes = require('./routes/technicalSheetsRoutes');

const app = express();

// ============================================
// TRUST PROXY
// ============================================
// Necessário para que req.ip e o rate-limiter usem o IP real do cliente
// quando o Express está atrás de Nginx ou Vercel (que enviam X-Forwarded-For).
// '1' = confia em 1 nível de proxy (Nginx → Express).
app.set('trust proxy', 1);

// ============================================
// CORS
// ============================================

const isProd = process.env.NODE_ENV === 'production';

// Em produção: aceitar apenas origens explícitas definidas em ALLOWED_ORIGINS.
// Em dev: adicionar localhost e GitHub Codespaces para facilitar desenvolvimento.
const buildAllowedOrigins = () => {
  const base = [
    'https://buffetos.chronostek.com.br',
    'https://crm.chronostek.com.br',
  ];

  // ALLOWED_ORIGINS no .env pode adicionar origens extras separadas por vírgula
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
      const trimmed = o.trim();
      if (trimmed) base.push(trimmed);
    });
  }

  // Em dev: adicionar origens de desenvolvimento
  if (!isProd) {
    base.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    );
  }

  return base;
};

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // Requisições sem origin (ex: chamadas server-side, Postman, curl)
    if (!origin) return callback(null, true);

    // Whitelist estática
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // GitHub Codespaces — APENAS em desenvolvimento
    if (!isProd && origin.includes('.app.github.dev')) return callback(null, true);

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================
// SECURITY HEADERS
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.app.github.dev', 'https://crm.chronostek.com.br', 'http://localhost:3000', 'http://localhost:3001', 'ws://localhost:*'],
      frameAncestors: ["'none'"]
    }
  },
  // HSTS: força HTTPS por 1 ano em produção (browsers ignoram em HTTP/dev)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

//  Remove header que revela tecnologia
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.set('Cache-Control', 'no-store');
  next();
});

// ============================================
// RATE LIMIT
// ============================================

// Auth routes — strict (proteção contra brute-force em login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,                   // 30 tentativas de login por IP
  message: { success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API routes — leniente (SaaS com muitas chamadas paralelas por usuário)
// Limite alto o suficiente para não bloquear uso normal mesmo com proxy Next.js.
// Não há bypass de localhost: o bypass abriria scraping irrestrito em prod
// se backend e frontend rodarem no mesmo host (Docker, Render, etc.).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000,                 // 2000 req/IP — cobre múltiplos usuários
  message: { success: false, message: 'Muitas requisições. Tente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// MIDDLEWARES
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Log simples só em dev
const isDev = process.env.NODE_ENV !== 'production';
app.use((req, res, next) => {
  if (isDev) console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROTAS
// ============================================

app.use('/auth', authLimiter, authRoutes);
app.use('/setup', setupRoutes);

app.use('/api', apiLimiter, tenantContext);

app.use('/api/sellers', sellersRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api', saasRoutes);
app.use('/api/users/management', userManagementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/event-templates', templatesRoutes);
app.use('/api/technical-sheets', technicalSheetsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/team', teamRoutes);

// GET /api/tenant — perfil completo do tenant logado (usado pelo PDF)
app.get('/api/tenant', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, email, cnpj, address FROM tenants WHERE id = $1`,
      [req.tenantId]
    );
    res.json({ success: true, tenant: result.rows[0] || {} });
  } catch (err) {
    console.error('[TENANT PROFILE]', err.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// ============================================
// 404
// ============================================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: 'Erro interno do servidor',
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

// ============================================
// STARTUP SECURITY GUARDS
// ============================================

// JWT_SECRET: recusa iniciar com secret placeholder ou fraco
const INSECURE_SECRETS = ['sua_chave_secreta_super_segura_aqui', 'secret', 'changeme', ''];
const jwtSecretCheck = process.env.JWT_SECRET || '';
if (!jwtSecretCheck || INSECURE_SECRETS.includes(jwtSecretCheck) || jwtSecretCheck.length < 32) {
  console.error('\n🚨 ERRO DE SEGURANÇA: JWT_SECRET inválido ou inseguro.');
  console.error('   Gere um novo secret com:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.error('   e defina JWT_SECRET no arquivo .env\n');
  process.exit(1);
}

// DATABASE_URL: obrigatório
if (!process.env.DATABASE_URL) {
  console.error('🚨 ERRO: DATABASE_URL não definido nas variáveis de ambiente.');
  process.exit(1);
}

// NODE_ENV: avisar se não definido (não fatal em dev)
if (!process.env.NODE_ENV) {
  console.warn('⚠️  NODE_ENV não definido. Assumindo "development". Defina NODE_ENV=production em produção.');
}

// FRONTEND_URL: avisar em produção se não definido
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL && !process.env.ALLOWED_ORIGINS) {
  console.warn('⚠️  FRONTEND_URL ou ALLOWED_ORIGINS não definidos em produção. Configure ALLOWED_ORIGINS para restringir CORS.');
}

(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log(' Conectado ao Banco de Dados');
  } catch (err) {
    console.error(' Erro ao conectar no banco:', err.message);
  }

  // Safe one-time migrations (idempotent — safe to run on every startup)
  try {
    await pool.query(`ALTER TABLE quotations ALTER COLUMN client_id DROP NOT NULL`);
    console.log(' Migration: quotations.client_id agora é nullable');
  } catch (err) {
    if (!err.message.includes('does not exist')) {
      console.warn(' Migration warning (quotations):', err.message);
    }
  }

  // Garante que tenants tem cnpj e address (adicionados após schema inicial)
  try {
    await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cnpj    VARCHAR(20)  DEFAULT ''`);
    await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT ''`);
    console.log(' Migration: tenants.cnpj / tenants.address garantidos');
  } catch (err) {
    console.warn(' Migration warning (tenants cnpj/address):', err.message);
  }

  // FASE 2: token_version para revogação de sessões (logout, troca de senha)
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0`);
    console.log(' Migration: users.token_version garantido');
  } catch (err) {
    console.warn(' Migration warning (token_version):', err.message);
  }

  // FASE 10: is_active para desabilitar usuários sem deletar
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
    console.log(' Migration: users.is_active garantido');
  } catch (err) {
    console.warn(' Migration warning (is_active):', err.message);
  }

  // FASE 7: tabela de auditoria
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     UUID,
        user_id       UUID,
        action        VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id   VARCHAR(100),
        metadata      JSONB        DEFAULT '{}',
        ip            VARCHAR(45),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user   ON audit_logs (user_id,   created_at DESC)`);
    console.log(' Migration: audit_logs garantida');
  } catch (err) {
    console.warn(' Migration warning (audit_logs):', err.message);
  }

  // Margem padrão do orçamento (% de lucro sobre o preço final — padrão buffet: 40%)
  try {
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS default_margin NUMERIC NOT NULL DEFAULT 40`);
    console.log(' Migration: quotations.default_margin garantido');
  } catch (err) {
    console.warn(' Migration warning (default_margin):', err.message);
  }

  // ETAPA A: custos fixos do orçamento (JSONB, retrocompat com DEFAULT '[]')
  try {
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS fixed_costs JSONB NOT NULL DEFAULT '[]'`);
    console.log(' Migration: quotations.fixed_costs garantido');
  } catch (err) {
    console.warn(' Migration warning (fixed_costs):', err.message);
  }

  // ETAPA B: custos variáveis do orçamento
  try {
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS variable_costs JSONB NOT NULL DEFAULT '[]'`);
    console.log(' Migration: quotations.variable_costs garantido');
  } catch (err) {
    console.warn(' Migration warning (variable_costs):', err.message);
  }

  // ETAPA C: módulo Ficha Técnica — tabelas technical_sheets e sheet_ingredients
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS technical_sheets (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID        NOT NULL,
        name       VARCHAR(200) NOT NULL,
        category   VARCHAR(50)  DEFAULT 'outro',
        base_yield NUMERIC      NOT NULL DEFAULT 1,
        yield_unit VARCHAR(30)  DEFAULT 'pessoas',
        notes      TEXT,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_technical_sheets_tenant ON technical_sheets (tenant_id)`);
    console.log(' Migration: technical_sheets garantida');
  } catch (err) {
    console.warn(' Migration warning (technical_sheets):', err.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sheet_ingredients (
        id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        sheet_id  UUID        NOT NULL REFERENCES technical_sheets(id) ON DELETE CASCADE,
        tenant_id UUID        NOT NULL,
        name      VARCHAR(200) NOT NULL,
        quantity  NUMERIC      NOT NULL DEFAULT 0,
        unit      VARCHAR(30)  DEFAULT 'unidade',
        unit_cost NUMERIC      NOT NULL DEFAULT 0,
        waste_pct NUMERIC      NOT NULL DEFAULT 0,
        notes     TEXT
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sheet_ingredients_sheet ON sheet_ingredients (sheet_id)`);
    console.log(' Migration: sheet_ingredients garantida');
  } catch (err) {
    console.warn(' Migration warning (sheet_ingredients):', err.message);
  }

  // ETAPA D: ficha técnica vinculada a itens do orçamento
  try {
    await pool.query(`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS sheet_id UUID REFERENCES technical_sheets(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS sheet_cost NUMERIC NOT NULL DEFAULT 0`);
    console.log(' Migration: quotation_items.sheet_id / sheet_cost garantidos');
  } catch (err) {
    console.warn(' Migration warning (quotation_items sheet):', err.message);
  }

  // ETAPA D2: unidade do custo por ingrediente (conversão kg/g, litro/ml)
  try {
    await pool.query(`ALTER TABLE sheet_ingredients ADD COLUMN IF NOT EXISTS cost_unit VARCHAR(30) DEFAULT NULL`);
    console.log(' Migration: sheet_ingredients.cost_unit garantido');
  } catch (err) {
    console.warn(' Migration warning (sheet_ingredients cost_unit):', err.message);
  }

  // FASE 11: sessões por dispositivo (max 2 simultâneas)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL,
        tenant_id  UUID        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id, created_at DESC)`);
    console.log(' Migration: user_sessions garantida');
  } catch (err) {
    console.warn(' Migration warning (user_sessions):', err.message);
  }

  app.listen(PORT, () => {
    console.log(` CRM rodando na porta ${PORT}`);
  });
})();