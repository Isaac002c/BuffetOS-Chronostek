# Referência de API — ChronosTek CRM BuffetOS

Todos os endpoints (exceto os marcados como **público**) exigem autenticação via cookie JWT httpOnly. O cookie é enviado automaticamente pelo browser.

**Base URL do backend:** configurada em `NEXT_PUBLIC_API_URL` (ex: `http://localhost:3001`)

---

## Erros Comuns

| Código | Significado                                                               |
|--------|---------------------------------------------------------------------------|
| 400    | Payload inválido, campo obrigatório faltando ou valor fora do enum        |
| 401    | Sem token, token expirado, token_version inválida ou usuário inativo      |
| 403    | Autenticado, mas sem permissão para esta ação (RBAC)                      |
| 404    | Recurso não encontrado (ou não pertence ao tenant)                        |
| 409    | Conflito — ex: orçamento já convertido em evento, CPF duplicado           |
| 429    | Rate limit atingido                                                        |
| 500    | Erro interno — em produção retorna mensagem genérica (safeError)          |

---

## Auth (`/auth`)

### POST `/auth/login` — público

Autentica o usuário e define o cookie JWT.

**Body:**
```json
{
  "email": "usuario@empresa.com",
  "password": "senhaSegura123"
}
```

**Sucesso (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Nome",
    "email": "usuario@empresa.com",
    "role": "manager",
    "tenantId": "uuid-do-tenant"
  }
}
```

**Falha (401):** credenciais inválidas ou usuário inativo.
**Rate limit:** 10 tentativas/15min por IP (geral) + 30/15min na rota /auth.

---

### POST `/auth/logout` — requer autenticação

Invalida o token atual via incremento de `token_version` e limpa o cookie.

**Sucesso (200):** `{ "message": "Logout realizado com sucesso" }`

---

### POST `/auth/register` — público (requer ALLOW_SETUP ou convite)

Cria um novo tenant e usuário admin inicial. Usar somente via rota `/setup` em ambiente controlado.

---

### GET `/auth/validate` — requer autenticação

Valida se o token atual é válido e retorna dados do usuário logado.

**Sucesso (200):** mesmo formato de `/auth/login`.
**Uso:** chamado pelo frontend no carregamento para checar sessão ativa.

---

## Usuários (`/api/users/management`)

### GET `/api/users/management` — `users:read`

Lista todos os usuários do tenant.

**Resposta:** array de `{ id, name, email, role, is_active, created_at }`.

---

### POST `/api/users/management` — `users:create`

Cria um novo usuário no tenant.

**Body:**
```json
{
  "name": "Nome Completo",
  "email": "email@empresa.com",
  "password": "senha123",
  "role": "operator"
}
```

**Regra:** apenas `admin` pode criar outro `admin`. `manager` pode criar `operator`, `seller`, `viewer`.

---

### PUT `/api/users/management/:id` — `users:update`

Atualiza dados do usuário (nome, email, role, is_active).

---

### DELETE `/api/users/management/:id` — `users:delete`

Desativa o usuário (soft delete: `is_active = false`). Apenas `admin`.

---

### PUT `/api/users/management/:id/password` — autenticação própria

Troca de senha. Exige `currentPassword` + `newPassword`.

**Body:**
```json
{
  "currentPassword": "senhaAtual",
  "newPassword": "novaSenha123"
}
```

**Rate limit:** 5 tentativas/hora por usuário.

---

## Orçamentos (`/api/quotations`)

### GET `/api/quotations` — `quotations:read`

Lista orçamentos do tenant. Suporta query params: `?status=approved&page=1&limit=20`.

**Resposta:** `{ data: [...], total, page, limit }`

---

### POST `/api/quotations` — `quotations:create`

Cria novo orçamento.

**Body:**
```json
{
  "client_id": "uuid",
  "event_date": "2026-08-15",
  "guest_count": 150,
  "event_type": "Casamento",
  "notes": "Observações opcionais",
  "items": [
    { "service_id": "uuid", "quantity": 1, "unit_price": 5000 }
  ],
  "discount": 500
}
```

**Validações:** `guest_count` > 0, `discount` >= 0, `items` não vazio, `event_date` válida.
**Rate limit:** 60 criações/hora por usuário.

---

### GET `/api/quotations/:id` — `quotations:read`

Retorna orçamento com itens e dados do cliente.

---

### PUT `/api/quotations/:id` — `quotations:update`

Atualiza orçamento (somente se status for `draft` ou `pending`).

---

### POST `/api/quotations/:id/approve` — `quotations:approve`

Muda status para `approved`. Registra em `audit_logs`.

---

### POST `/api/quotations/:id/cancel` — `quotations:cancel`

Muda status para `cancelled`. Requer motivo no body: `{ "reason": "Cliente desistiu" }`.

---

### POST `/api/quotations/:id/simulate` — `quotations:read`

Retorna simulação de cálculo sem salvar: total, impostos, comissão.

---

### GET `/api/quotations/:id/pdf` — `quotations:read`

Gera e retorna PDF da proposta via `pdfService.js`.

---

## Eventos (`/api/events`)

### GET `/api/events` — `events:read`

Lista eventos do tenant. Suporta filtros: `?status=confirmed&month=2026-05`.

---

### POST `/api/events` — `events:create`

Cria evento (manual ou conversão de orçamento).

**Body (conversão):**
```json
{
  "quotation_id": "uuid",
  "event_date": "2026-08-15",
  "event_time": "18:00",
  "venue": "Salão Principal",
  "total_value": 12500
}
```

**Verificações:**
- Se `quotation_id` informado: verifica se já existe evento para este orçamento (409 se duplicado)
- Verifica conflito de data/horário com outros eventos do tenant (409 se conflito)

**Rate limit:** 30 criações/hora por usuário.

---

### GET `/api/events/:id` — `events:read`

Retorna evento com detalhes completos.

---

### PUT `/api/events/:id` — `events:update`

Atualiza evento. Repete verificação de conflito de data.

---

### DELETE `/api/events/:id` — `events:delete`

Remove evento (hard delete). Registra em `audit_logs`.

---

### GET `/api/events/calendar` — `events:read`

Retorna eventos no formato otimizado para o calendário: `{ date, title, status, id }[]`.

---

## Financeiro (`/api/billing`)

Todos requerem permissão `finance:read`.

### GET `/api/billing/summary` — `finance:read`

Resumo financeiro do tenant.

**Query params:** `?month=2026-05`

**Resposta:**
```json
{
  "receita": 85000,
  "eventos": 12,
  "ticketMedio": 7083,
  "comparativoMesAnterior": "+12%"
}
```

---

### GET `/api/billing/monthly` — `finance:read`

Receita agregada mês a mês para o gráfico (últimos 12 meses).

---

### GET `/api/billing/forecast` — `finance:read`

Previsão de receita baseada em eventos confirmados futuros.

---

## Equipe (`/api/team`)

### GET `/api/team` — `team:read`

Lista membros da equipe do tenant.

---

### POST `/api/team` — `team:create`

Cria membro da equipe.

**Body:**
```json
{
  "name": "Nome Completo",
  "cpf": "000.000.000-00",
  "email": "membro@empresa.com",
  "funcao": "Garçom",
  "status": "ativo",
  "phone": "11999999999"
}
```

**Validações:** CPF válido e único no tenant, email único no tenant, `funcao` e `status` obrigatórios.

---

### PUT `/api/team/:id` — `team:update`

Atualiza membro da equipe.

---

### DELETE `/api/team/:id` — `team:delete`

Remove membro da equipe.

---

### GET `/api/team/:id/availability` — `team:read`

Verifica disponibilidade do membro em datas específicas.

---

## Leads (`/api/leads`)

### GET `/api/leads` — `leads:read`

Lista leads do tenant com status do pipeline.

---

### POST `/api/leads` — `leads:create`

Cria lead.

**Body:**
```json
{
  "name": "Nome do Lead",
  "email": "lead@email.com",
  "phone": "11999999999",
  "event_type": "Formatura",
  "estimated_date": "2026-12-01",
  "estimated_guests": 200,
  "status": "novo",
  "notes": "Contato via Instagram"
}
```

---

### PUT `/api/leads/:id` — `leads:update`

Atualiza lead. Usado para mover no pipeline (ex: `status: "em_negociacao"`).

---

### DELETE `/api/leads/:id` — `leads:delete`

Remove lead.

---

### POST `/api/leads/:id/convert` — `leads:convert`

Converte lead em orçamento. Verifica se já existe orçamento ativo para este lead (409 se duplicado).

**Resposta:** `{ quotation_id: "uuid" }` — frontend redireciona para edição do orçamento.

---

## Clientes (`/api/clients`)

### GET `/api/clients` — `clients:read`

Lista clientes do tenant. Suporta busca: `?search=João`.

---

### POST `/api/clients` — `clients:create`

Cria cliente.

**Body:**
```json
{
  "name": "Nome Completo",
  "email": "cliente@email.com",
  "phone": "11999999999",
  "cpf": "000.000.000-00",
  "address": "Rua X, 123"
}
```

**Validação:** CPF único por tenant.

---

### GET `/api/clients/:id` — `clients:read`

Retorna cliente com histórico de eventos/orçamentos.

---

### PUT `/api/clients/:id` — `clients:update`

Atualiza dados do cliente.

---

### DELETE `/api/clients/:id` — `clients:delete`

Remove cliente (verifica vínculos com eventos ativos antes de deletar).

---

## Templates de Evento (`/api/event-templates`)

### GET `/api/event-templates` — `templates:read`

Lista templates do tenant (pacotes pré-configurados de serviços).

---

### POST `/api/event-templates` — `templates:create`

Cria template com itens pré-definidos.

---

### PUT `/api/event-templates/:id` — `templates:update`

Atualiza template.

---

### DELETE `/api/event-templates/:id` — `templates:delete`

Remove template.

---

## SaaS / Assinatura (`/api/subscription`, `/api/activity`)

### GET `/api/subscription` — autenticação

Retorna plano atual do tenant, limites e uso.

**Resposta:**
```json
{
  "plan": "professional",
  "events_limit": 100,
  "events_used": 43,
  "users_limit": 10,
  "users_used": 5,
  "valid_until": "2027-01-01"
}
```

---

### GET `/api/activity` — autenticação

Retorna log de atividades recentes do tenant (últimas 50 entradas de `audit_logs`).

---

## Admin Multi-Tenant (`/api/admin/tenants`)

Rotas restritas a usuários com role `admin` do tenant raiz (super-admin da plataforma).

### GET `/api/admin/tenants` — super-admin

Lista todos os tenants da plataforma.

---

### POST `/api/admin/tenants` — super-admin

Cria novo tenant manualmente.

---

### PUT `/api/admin/tenants/:id` — super-admin

Atualiza dados ou plano do tenant.

---

### DELETE `/api/admin/tenants/:id` — super-admin

Desativa tenant.

---

## Setup (`/setup`)

### POST `/setup/init` — público (requer `ALLOW_SETUP=true` + header `X-Setup-Secret`)

Inicializa o banco de dados com as tabelas e cria o primeiro tenant + admin.

**IMPORTANTE:** Desativar `ALLOW_SETUP` após o setup inicial em produção.

**Header obrigatório em produção:** `X-Setup-Secret: <valor de SETUP_SECRET no .env>`
