# Arquitetura — ChronosTek CRM BuffetOS

## Visão Geral

O BuffetOS é um SaaS multi-tenant para empresas de buffet e eventos. Cada empresa (tenant) tem seus dados isolados por `tenant_id` em todas as tabelas do banco. O sistema é composto por um frontend Next.js 14 e um backend Express.js separados, comunicando-se via API REST com autenticação por JWT em cookie httpOnly.

---

## Stack

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14 (App Router), React      |
| Backend       | Node.js + Express.js                |
| Banco de dados| PostgreSQL (Neon DB em produção)    |
| Autenticação  | JWT em cookie httpOnly (8h TTL)     |
| Deploy        | Node.js standalone + Vercel/Railway |

---

## Estrutura de Diretórios

```
saas-multitenant/
├── app/                        # Frontend Next.js (App Router)
│   ├── buffet/                 # Páginas principais do CRM
│   │   ├── Billing.jsx
│   │   ├── Calendar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Events.jsx
│   │   ├── Leads.jsx
│   │   ├── Quotations.jsx
│   │   └── Team.jsx
│   ├── components/             # Componentes compartilhados
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── dashboard/page.jsx      # Layout raiz autenticado
│   ├── login/page.jsx
│   ├── lib/                    # Clientes de API (frontend)
│   │   ├── api.js              # Cliente base com fetch + cookie
│   │   ├── quotationsAPI.js
│   │   └── templatesAPI.js
│   └── globals.css
├── backend/
│   ├── app.js                  # Entry point, migrations, Express setup
│   ├── routes/                 # Rotas Express por módulo
│   ├── models/                 # Queries SQL por entidade
│   ├── middlewares/            # tenantContext, checkPermission, rateLimit
│   ├── utils/                  # errorResponse.js, auditLog.js
│   └── services/               # calculationService.js, pdfService.js
└── docs/                       # Esta documentação
```

---

## Frontend — Next.js 14 App Router

### Roteamento

O App Router do Next.js 14 é usado. As páginas autenticadas vivem em `app/dashboard/` (layout raiz) e os componentes de feature em `app/buffet/`.

### Clientes de API (`lib/`)

Todos os requests ao backend passam pelos arquivos em `app/lib/`. O arquivo base é `api.js`, que configura:
- `credentials: 'include'` em todos os `fetch` para enviar o cookie httpOnly automaticamente
- URL base do backend via variável de ambiente `NEXT_PUBLIC_API_URL`
- Tratamento de erros HTTP (401, 403, 500)

Arquivos específicos (`quotationsAPI.js`, `templatesAPI.js`) exportam funções de alto nível como `createQuotation()`, `getTemplates()` etc., chamando `api.js` internamente.

### Estado e Navegação

Sem Redux ou Zustand — o estado é local por componente com `useState`/`useEffect`. Navegação entre módulos é feita pelo `Sidebar.jsx`.

---

## Backend — Express.js

### Entry Point (`app.js`)

Na inicialização, o `app.js`:
1. Conecta ao PostgreSQL
2. Executa migrations automáticas (`ALTER TABLE IF NOT EXISTS ...`)
3. Configura middlewares globais: `cors → helmet → rateLimit global`
4. Registra todas as rotas

### Chain de Middlewares por Request

```
Request
  └─> CORS (whitelist em prod)
        └─> Helmet (headers de segurança)
              └─> Rate Limit Global (IP, 2000/15min)
                    └─> Route Handler
                          └─> tenantContext (JWT verify + token_version + is_active)
                                └─> checkPermission (RBAC)
                                      └─> Model/Query
                                            └─> Response
```

### Rotas Disponíveis

| Prefixo                    | Arquivo de Rota              | Módulo               |
|----------------------------|------------------------------|----------------------|
| `/auth`                    | authRoutes                   | Autenticação         |
| `/api/users/management`    | userManagementRoutes         | Gestão de usuários   |
| `/api/quotations`          | quotationsRoutes             | Orçamentos           |
| `/api/events`              | eventsRoutes                 | Eventos              |
| `/api/billing`             | billingRoutes                | Financeiro           |
| `/api/team`                | teamRoutes                   | Equipe               |
| `/api/leads`               | leadRoutes                   | Leads                |
| `/api/clients`             | clientRoutes                 | Clientes             |
| `/api/event-templates`     | templatesRoutes              | Templates de evento  |
| `/api/subscription`        | saasRoutes                   | SaaS/Planos          |
| `/api/admin/tenants`       | saasRoutes                   | Admin multi-tenant   |
| `/api/sellers`             | sellersRoutes                | Vendedores           |
| `/api/contracts`           | contractRoutes               | Contratos            |
| `/api/documents`           | documentRoutes               | Documentos           |
| `/api/services`            | serviceRoutes                | Serviços             |
| `/api/dashboard`           | dashboardRoutes              | Dados do dashboard   |
| `/setup`                   | setupRoutes                  | Setup inicial        |

---

## Banco de Dados — PostgreSQL Multi-Tenant

### Isolamento por Tenant

Toda tabela que contém dados de negócio tem a coluna `tenant_id UUID NOT NULL`. Todas as queries passam `tenant_id` como parâmetro:

```sql
-- Exemplo correto
SELECT * FROM quotations WHERE id = $1 AND tenant_id = $2;

-- NUNCA faça assim (sem tenant_id = vazamento entre tenants)
SELECT * FROM quotations WHERE id = $1;
```

### Migrations Automáticas

As migrations rodam no startup do backend via `ALTER TABLE IF NOT EXISTS` no `app.js`. Não há ferramenta de migration separada — novas colunas são adicionadas de forma idempotente.

---

## Autenticação — Fluxo Completo

```
[Frontend] POST /auth/login { email, password }
      |
      v
[Backend] authRoutes → verifica email + senha (bcrypt)
      |
      ├─ Falha: 401 Unauthorized
      |
      └─ Sucesso:
            |
            v
         Gera JWT payload: { userId, tenantId, role, tokenVersion }
            |
            v
         Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict; Max-Age=8h
            |
            v
[Frontend] Recebe 200 OK → navega para /dashboard
            |
            v
[Requests subsequentes] Cookie enviado automaticamente
            |
            v
[tenantContext] Verifica:
  1. Cookie presente e JWT válido
  2. token_version do JWT bate com users.token_version no DB
  3. users.is_active = true
            |
            ├─ Qualquer falha: 401 + limpa cookie
            └─ Sucesso: injeta req.user, req.tenantId → próximo middleware
```

---

## RBAC — Controle de Acesso por Papel

O middleware `checkPermission.js` verifica se o papel (`role`) do usuário autenticado possui a permissão necessária para a rota acessada.

### Hierarquia de Papéis

```
admin
  └─> manager
        └─> operator
        └─> seller
              └─> viewer
```

### Verificação

```javascript
// Exemplo de uso em rota
router.post('/', tenantContext, checkPermission('quotations:create'), handler);
```

Se o papel não tiver a permissão: retorna 403 + registra `permission_denied` em `audit_logs`.

---

## Fluxo de Orçamento → Evento

```
[Leads] Lead qualificado
      |
      v
[Quotations] Criar orçamento (status: draft)
      |
      v
[Quotations] Adicionar itens (pacotes, serviços extras)
      |
      v
[Quotations] Simulação de cálculo (calculationService.js)
      |
      v
[Quotations] Aprovação (status: approved) → requer quotations:approve
      |
      v
[Events] Converter orçamento em evento (POST /api/events com quotation_id)
      |        └─ Verifica se evento já existe para este orçamento (anti-duplicata)
      |        └─ Verifica conflito de data/horário
      v
[Events] Evento criado (status: confirmed)
      |
      v
[Calendar] Evento aparece no calendário
      |
      v
[Billing] Evento aparece no financeiro (receita agregada por mês)
```

---

## Fluxo de Agregação Financeira (Billing)

```
[Frontend] GET /api/billing?month=2026-05&view=monthly
      |
      v
[billingRoutes] → checkPermission('finance:read')
      |
      v
[billingModel] Query:
  SELECT
    SUM(e.total_value) as receita,
    COUNT(e.id) as eventos,
    AVG(e.total_value) as ticket_medio
  FROM events e
  WHERE e.tenant_id = $1
    AND e.status IN ('confirmed', 'completed')
    AND DATE_TRUNC('month', e.event_date) = $2
      |
      v
[Response] { receita, eventos, ticketMedio, comparativoMesAnterior }
      |
      v
[Frontend] Billing.jsx renderiza cards + gráficos
```

---

## Variáveis de Ambiente Relevantes

| Variável              | Uso                                                  |
|-----------------------|------------------------------------------------------|
| `DATABASE_URL`        | Connection string PostgreSQL                         |
| `JWT_SECRET`          | Assinar/verificar JWTs (min 32 chars aleatórios)     |
| `NODE_ENV`            | `production` ativa Secure cookie, CORS restrito      |
| `NEXT_PUBLIC_API_URL` | URL do backend no frontend                           |
| `CORS_ORIGIN`         | Origens permitidas (separadas por vírgula)           |
| `ALLOW_SETUP`         | `true` para habilitar rota /setup (desativar em prod)|
| `SETUP_SECRET`        | Header X-Setup-Secret para proteger /setup em prod   |
| `PORT`                | Porta do backend (padrão: 3001)                      |
