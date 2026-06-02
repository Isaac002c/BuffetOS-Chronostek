# Manutenção — ChronosTek CRM BuffetOS

Guia prático para as tarefas de manutenção mais comuns. Cada seção é independente — vá direto para o que você precisa.

---

## Adicionando uma Nova Rota de API

### 1. Criar o arquivo de rota

```javascript
// backend/routes/meuModuloRoutes.js
const express = require('express');
const router = express.Router();
const { tenantContext } = require('../middlewares/tenantContext');
const { checkPermission } = require('../middlewares/checkPermission');
const { safeError } = require('../utils/errorResponse');

// GET /api/meu-modulo
router.get('/', tenantContext, checkPermission('meumodulo:read'), async (req, res) => {
  try {
    const { tenantId } = req;
    const resultado = await MeuModuloModel.listar(tenantId);
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao listar meu-modulo:', err);
    res.status(500).json({ error: safeError(err, 'Erro ao buscar dados') });
  }
});

// POST /api/meu-modulo
router.post('/', tenantContext, checkPermission('meumodulo:create'), async (req, res) => {
  try {
    const { tenantId, user } = req;
    const { campo1, campo2 } = req.body;

    // Validar campos obrigatórios
    if (!campo1 || !campo2) {
      return res.status(400).json({ error: 'campo1 e campo2 são obrigatórios' });
    }

    const novo = await MeuModuloModel.criar({ tenantId, campo1, campo2, createdBy: user.id });
    res.status(201).json(novo);
  } catch (err) {
    console.error('Erro ao criar meu-modulo:', err);
    res.status(500).json({ error: safeError(err, 'Erro ao criar registro') });
  }
});

module.exports = router;
```

### 2. Criar o model

```javascript
// backend/models/meuModuloModel.js
const { pool } = require('../db');

const MeuModuloModel = {
  async listar(tenantId) {
    const result = await pool.query(
      'SELECT * FROM meu_modulo WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows;
  },

  async criar({ tenantId, campo1, campo2, createdBy }) {
    const result = await pool.query(
      `INSERT INTO meu_modulo (id, tenant_id, campo1, campo2, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [tenantId, campo1, campo2, createdBy]
    );
    return result.rows[0];
  }
};

module.exports = MeuModuloModel;
```

### 3. Registrar no app.js

```javascript
// backend/app.js — na seção de rotas
const meuModuloRoutes = require('./routes/meuModuloRoutes');
app.use('/api/meu-modulo', meuModuloRoutes);
```

### Padrão obrigatório em toda rota

- `tenantContext` sempre antes de `checkPermission`
- `checkPermission` com a permissão correta antes do handler
- `try/catch` em todo handler async
- `safeError()` em todo bloco catch antes do `res.status(500)`
- Nunca retornar `err.stack` ou `err.message` direto — sempre via `safeError()`

---

## Adicionando uma Nova Permissão ao RBAC

### 1. Adicionar ao `checkPermission.js`

```javascript
// backend/middlewares/checkPermission.js
const rolePermissions = {
  admin: [
    // ... permissões existentes ...
    'meumodulo:read',
    'meumodulo:create',
    'meumodulo:update',
    'meumodulo:delete',
  ],
  manager: [
    // ... permissões existentes ...
    'meumodulo:read',
    'meumodulo:create',
    'meumodulo:update',
  ],
  operator: [
    // ... permissões existentes ...
    'meumodulo:read',
  ],
  seller: [
    // ... permissões existentes ...
  ],
  viewer: [
    // ... permissões existentes ...
    'meumodulo:read',  // se viewer deve ter leitura
  ],
};
```

### 2. Atualizar a matriz em `SECURITY.md`

Adicionar a nova linha de permissão na tabela da seção RBAC do `docs/SECURITY.md`.

### Como adicionar um novo papel (role)

1. Adicionar o role ao objeto `rolePermissions` em `checkPermission.js`
2. Adicionar ao enum de validação em `userManagementRoutes.js` (ou onde roles são validados)
3. Atualizar a constraint no banco se necessário:
   ```sql
   -- Se role for um CHECK constraint
   ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
   ALTER TABLE users ADD CONSTRAINT users_role_check
     CHECK (role IN ('admin', 'manager', 'operator', 'seller', 'viewer', 'novo_role'));
   ```
4. Atualizar a documentação em `SECURITY.md` e `DATABASE.md`

---

## Adicionando uma Nova Coluna ao Banco

Use o padrão de migration automática no startup do `app.js`:

```javascript
// backend/app.js — dentro da função runMigrations() ou equivalente
await pool.query(`
  ALTER TABLE meu_modulo
  ADD COLUMN IF NOT EXISTS nova_coluna VARCHAR(255)
`);

// Para colunas NOT NULL com valor padrão:
await pool.query(`
  ALTER TABLE events
  ADD COLUMN IF NOT EXISTS status_motivo TEXT
`);

// Para adicionar índice junto:
await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_meu_modulo_tenant
  ON meu_modulo(tenant_id)
`);
```

**Importante:**
- `ADD COLUMN IF NOT EXISTS` é idempotente — pode rodar quantas vezes quiser
- Para colunas `NOT NULL` sem default: adicione primeiro com `DEFAULT ''`, preencha os dados, depois remova o default
- Nunca use `DROP COLUMN` via migration automática sem garantir que nenhum código acessa a coluna

---

## Adicionando uma Nova Chamada de API no Frontend

### Padrão com `lib/api.js`

```javascript
// app/lib/meuModuloAPI.js
import api from './api';

export async function listarMeuModulo() {
  const res = await api.get('/api/meu-modulo');
  return res.data;
}

export async function criarMeuModulo(dados) {
  const res = await api.post('/api/meu-modulo', dados);
  return res.data;
}

export async function atualizarMeuModulo(id, dados) {
  const res = await api.put(`/api/meu-modulo/${id}`, dados);
  return res.data;
}
```

### Padrão de uso no componente

```javascript
// app/buffet/MeuModulo.jsx
import { listarMeuModulo } from '../lib/meuModuloAPI';

export default function MeuModulo() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listarMeuModulo()
      .then(setDados)
      .catch(err => {
        // api.js já trata 401 (redireciona para login)
        // Para outros erros:
        setError(err.response?.data?.error || 'Erro ao carregar dados');
      })
      .finally(() => setLoading(false));
  }, []);

  // ...
}
```

O `api.js` já configura `credentials: 'include'` automaticamente — não é necessário passar o cookie manualmente.

---

## Investigando um Erro 500

### Passo a passo

**1. Checar o console do backend**

O erro completo (com stack trace) sempre aparece no console do servidor:
```
Erro ao criar orçamento: Error: null value in column "client_id"
    at Object.criar (/app/backend/models/quotationModel.js:45:12)
```

**2. Checar `audit_logs` no banco**

```sql
-- Ver erros de permissão recentes
SELECT * FROM audit_logs
WHERE action = 'permission_denied'
  AND tenant_id = 'uuid-do-tenant'
ORDER BY created_at DESC
LIMIT 20;

-- Ver todas as ações do usuário suspeito
SELECT * FROM audit_logs
WHERE user_id = 'uuid-do-usuario'
ORDER BY created_at DESC
LIMIT 50;
```

**3. Verificar se `err.message` está sendo vazado**

Em produção, o cliente deve receber apenas:
```json
{ "error": "Erro ao processar orçamento" }
```

Se receber a mensagem real de erro (ex: detalhe do SQL), verifique se `safeError()` está sendo usado no catch:
```javascript
// ERRADO — vaza detalhes do banco em produção
res.status(500).json({ error: err.message });

// CORRETO
res.status(500).json({ error: safeError(err, 'Erro ao processar orçamento') });
```

**4. Testar endpoint isoladamente**

```bash
curl -X POST https://api.seudominio.com/api/quotations \
  -H "Content-Type: application/json" \
  -b "token=<jwt>" \
  -d '{ "guest_count": 100, ... }'
```

---

## Resetando a Senha de um Usuário

Se o usuário esqueceu a senha e não há fluxo de recuperação automático:

```bash
# No diretório do backend
cd saas-multitenant/backend

# Criar script temporário ou usar o existente:
node reset-password.js --email usuario@empresa.com --password NovaSenha123!
```

Se não houver o script, execute direto no banco:

```sql
-- Gerar hash no Node.js primeiro:
-- node -e "const b = require('bcryptjs'); b.hash('NovaSenha123!', 10).then(console.log)"
-- Cole o hash abaixo:

UPDATE users
SET password_hash = '$2b$10$...hash-gerado...',
    token_version = token_version + 1,  -- invalida sessões ativas
    updated_at = NOW()
WHERE email = 'usuario@empresa.com'
  AND tenant_id = 'uuid-do-tenant';
```

**Atenção:** sempre incremente `token_version` ao resetar senha para invalidar sessões abertas.

---

## Armadilhas Comuns de Isolamento Multi-Tenant

### Erro 1: Query sem tenant_id

```javascript
// ERRADO — busca em todos os tenants
const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);

// CORRETO
const result = await pool.query(
  'SELECT * FROM events WHERE id = $1 AND tenant_id = $2',
  [id, tenantId]
);
```

### Erro 2: Usar tenant_id do body em vez do JWT

```javascript
// ERRADO — usuário pode manipular o tenant_id no body
const { tenantId } = req.body;

// CORRETO — tenant_id vem sempre do JWT verificado pelo tenantContext
const { tenantId } = req; // injetado pelo tenantContext
```

### Erro 3: JOIN sem restrição de tenant no JOIN

```javascript
// ERRADO — o JOIN pode trazer itens de outro tenant
SELECT q.*, qi.* FROM quotations q
JOIN quotation_items qi ON qi.quotation_id = q.id
WHERE q.id = $1 AND q.tenant_id = $2

-- CORRETO — garantir tenant_id nos dois lados
SELECT q.*, qi.* FROM quotations q
JOIN quotation_items qi ON qi.quotation_id = q.id AND qi.tenant_id = $2
WHERE q.id = $1 AND q.tenant_id = $2
```

### Erro 4: Contar ou agregar sem tenant_id

```javascript
// ERRADO — conta eventos de todos os tenants
SELECT COUNT(*) FROM events WHERE status = 'confirmed'

// CORRETO
SELECT COUNT(*) FROM events WHERE status = 'confirmed' AND tenant_id = $1
```

---

## Verificando Saúde do Sistema

```bash
# Checar se o backend está respondendo
curl https://api.seudominio.com/health

# Contar registros por tenant (no banco)
SELECT tenant_id, COUNT(*) as eventos
FROM events
GROUP BY tenant_id
ORDER BY eventos DESC;

# Verificar usuários inativos com token_version alta (muitos logouts/senhas)
SELECT email, role, is_active, token_version, updated_at
FROM users
WHERE tenant_id = 'uuid-do-tenant'
ORDER BY updated_at DESC;

# Verificar audit_logs dos últimos 7 dias
SELECT action, COUNT(*) as total
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY total DESC;
```
