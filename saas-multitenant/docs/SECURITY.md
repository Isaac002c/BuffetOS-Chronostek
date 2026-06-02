# Segurança — ChronosTek CRM BuffetOS

Este documento descreve todos os controles de segurança implementados no sistema, incluindo riscos residuais conhecidos.

---

## 1. Autenticação — JWT em Cookie httpOnly

### Configuração do Cookie

```
Name:     token
HttpOnly: true   → inacessível via JavaScript (mitiga XSS)
Secure:   true   → apenas HTTPS (automático quando NODE_ENV=production)
SameSite: Strict → cookie não enviado em requests cross-site (mitiga CSRF)
Max-Age:  28800  → 8 horas de TTL
```

### Revogação de Token — `token_version`

O JWT carrega o campo `tokenVersion` no momento do login. A cada request, o `tenantContext` faz:

```
JWT.tokenVersion === users.token_version no DB?
  Sim → token válido, continua
  Não → 401, limpa cookie
```

No **logout**, `token_version` é incrementado no banco. Todos os tokens anteriores do usuário tornam-se inválidos imediatamente — sem precisar de blacklist.

Também incrementado em: troca de senha, desativação do usuário pelo admin.

### Verificações no `tenantContext` (a cada request autenticado)

1. Cookie `token` presente
2. JWT válido (assinatura + expiração)
3. `jwt.tokenVersion === db.token_version`
4. `db.is_active === true`
5. Injeta `req.user` e `req.tenantId` → próximos middlewares

Qualquer falha retorna **401** e limpa o cookie.

---

## 2. RBAC — Controle de Acesso por Papel

### Papéis Disponíveis

| Role       | Descrição                                              |
|------------|--------------------------------------------------------|
| `admin`    | Acesso total, incluindo gestão de usuários e planos    |
| `manager`  | Gestão operacional completa, sem acesso a admin do sistema |
| `operator` | Cria e edita eventos e orçamentos, sem aprovação       |
| `seller`   | Foco em leads, orçamentos e clientes                   |
| `viewer`   | Somente leitura — sem escrita em nenhum módulo         |

### Matriz de Permissões

| Permissão              | admin | manager | operator | seller | viewer |
|------------------------|-------|---------|----------|--------|--------|
| `quotations:read`      | ✓     | ✓       | ✓        | ✓      | ✓      |
| `quotations:create`    | ✓     | ✓       | ✓        | ✓      | -      |
| `quotations:update`    | ✓     | ✓       | ✓        | ✓      | -      |
| `quotations:approve`   | ✓     | ✓       | -        | -      | -      |
| `quotations:cancel`    | ✓     | ✓       | -        | -      | -      |
| `events:read`          | ✓     | ✓       | ✓        | ✓      | ✓      |
| `events:create`        | ✓     | ✓       | ✓        | -      | -      |
| `events:update`        | ✓     | ✓       | ✓        | -      | -      |
| `events:delete`        | ✓     | ✓       | -        | -      | -      |
| `finance:read`         | ✓     | ✓       | -        | -      | -      |
| `team:read`            | ✓     | ✓       | ✓        | -      | ✓      |
| `team:create`          | ✓     | ✓       | -        | -      | -      |
| `team:update`          | ✓     | ✓       | ✓        | -      | -      |
| `team:delete`          | ✓     | ✓       | -        | -      | -      |
| `leads:read`           | ✓     | ✓       | ✓        | ✓      | ✓      |
| `leads:create`         | ✓     | ✓       | ✓        | ✓      | -      |
| `leads:update`         | ✓     | ✓       | ✓        | ✓      | -      |
| `leads:delete`         | ✓     | ✓       | -        | -      | -      |
| `leads:convert`        | ✓     | ✓       | ✓        | ✓      | -      |
| `clients:read`         | ✓     | ✓       | ✓        | ✓      | ✓      |
| `clients:create`       | ✓     | ✓       | ✓        | ✓      | -      |
| `clients:update`       | ✓     | ✓       | ✓        | ✓      | -      |
| `clients:delete`       | ✓     | ✓       | -        | -      | -      |
| `templates:read`       | ✓     | ✓       | ✓        | ✓      | ✓      |
| `templates:create`     | ✓     | ✓       | -        | -      | -      |
| `templates:update`     | ✓     | ✓       | -        | -      | -      |
| `templates:delete`     | ✓     | ✓       | -        | -      | -      |
| `users:read`           | ✓     | ✓       | -        | -      | -      |
| `users:create`         | ✓     | ✓       | -        | -      | -      |
| `users:update`         | ✓     | ✓       | -        | -      | -      |
| `users:delete`         | ✓     | -       | -        | -      | -      |

### Implementação

```javascript
// middlewares/checkPermission.js
router.post('/quotations', tenantContext, checkPermission('quotations:create'), handler);

// Se falhar:
// 1. Retorna 403
// 2. Registra { action: 'permission_denied', resource: 'quotations' } em audit_logs
```

---

## 3. Isolamento Multi-Tenant

Toda query de negócio inclui `tenant_id` como parâmetro explícito:

```sql
SELECT * FROM quotations WHERE id = $1 AND tenant_id = $2
```

O `tenantId` vem de `req.tenantId`, injetado pelo `tenantContext` a partir do JWT verificado — nunca do body ou query params do request. Isso impede que um usuário de um tenant acesse dados de outro simplesmente manipulando parâmetros.

---

## 4. Validação de Input

### Orçamentos (`validateQuotationBody`)

- `guest_count`: inteiro > 0, obrigatório
- `discount`: numérico >= 0
- `status`: deve estar no enum (`draft`, `pending`, `approved`, `active`, `completed`, `cancelled`)
- `items`: array não vazio quando presente
- `event_date`: data válida, não retroativa

### Equipe

- `cpf`: formato válido, único por tenant
- `email`: formato válido, único por tenant
- `funcao` e `status`: obrigatórios, valores do enum

### Usuários

- `role`: deve ser um dos papéis válidos
- Criação de `admin` só permitida por outro `admin`
- Não é possível alterar o próprio `role` ou `is_active`

---

## 5. Rate Limiting

| Escopo                        | Limite           | Chave              |
|-------------------------------|------------------|--------------------|
| Global (todos os IPs)         | 2000 req/15min   | IP                 |
| Rota `/auth` (qualquer método)| 30 req/15min     | IP                 |
| Login específico              | 10 tentativas/15min | IP              |
| Troca de senha                | 5 tentativas/hora| userId + IP        |
| Criar orçamento               | 60/hora          | userId + IP        |
| Criar evento                  | 30/hora          | userId + IP        |

O rate limit por usuário usa composite key `userId:IP` (definido em `middlewares/rateLimitByUser.js`).

**Atenção:** o armazenamento de rate limit está **em memória** (sem Redis). Em múltiplas instâncias do backend, os contadores são independentes por processo — ver riscos residuais.

---

## 6. Headers de Segurança (Helmet)

Configurados globalmente no `app.js` via `helmet()`:

| Header                    | Valor configurado                                         |
|---------------------------|-----------------------------------------------------------|
| `Content-Security-Policy` | Política restrita (sem `unsafe-inline` em produção)       |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (HSTS 1 ano)     |
| `X-Content-Type-Options`  | `nosniff`                                                 |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                         |
| `Permissions-Policy`      | Desabilita câmera, microfone, geolocalização              |
| `X-Frame-Options`         | `DENY` (evita clickjacking)                               |

---

## 7. CORS

Em **desenvolvimento**: permissivo (`localhost:3000`).

Em **produção** (`NODE_ENV=production`):
- Lista branca explícita via `CORS_ORIGIN` no `.env`
- Sem wildcards (`*`)
- Apenas origens conhecidas são aceitas
- Requests sem origin matching retornam 403

---

## 8. Rota de Setup (`/setup`)

A rota `/setup/init` cria o primeiro tenant e admin do sistema. É protegida por:

1. Variável de ambiente `ALLOW_SETUP=true` — se não definida, rota retorna 404
2. Em produção, exige header `X-Setup-Secret: <SETUP_SECRET>` no request

**Ação obrigatória pós-deploy:** remover `ALLOW_SETUP` do `.env` ou definir `ALLOW_SETUP=false`.

---

## 9. Logs de Auditoria (`audit_logs`)

Ações registradas automaticamente via `utils/auditLog.js`:

| Evento                | Trigger                                        |
|-----------------------|------------------------------------------------|
| `login`               | Login bem-sucedido                             |
| `logout`              | Logout explícito                               |
| `password_changed`    | PUT `/api/users/management/:id/password`       |
| `permission_denied`   | `checkPermission` retorna 403                  |
| `quotation_approved`  | POST `/api/quotations/:id/approve`             |
| `event_created`       | POST `/api/events`                             |
| `event_deleted`       | DELETE `/api/events/:id`                       |

Cada registro inclui: `tenant_id`, `user_id`, `action`, `resource`, `resource_id`, `details` (JSONB), `ip`, `created_at`.

---

## 10. `safeError()` — Vazamento de Erros

A utility `utils/errorResponse.js` expõe `safeError()`:

```javascript
// Em desenvolvimento (NODE_ENV !== 'production'):
//   retorna err.message → útil para debug
// Em produção:
//   retorna string genérica → sem leak de stack trace ou detalhes do DB
safeError(err, 'Erro ao processar orçamento')
```

Todos os blocos `catch` nas rotas usam `safeError()` antes de enviar a resposta 500.

---

## 11. Prevenção de SQL Injection

Todas as queries usam **parameterized queries** do `pg` do Node.js:

```javascript
// Correto — jamais concatenar strings SQL
await pool.query(
  'SELECT * FROM quotations WHERE id = $1 AND tenant_id = $2',
  [quotationId, tenantId]
);
```

Não há construção dinâmica de SQL com interpolação de strings de usuário.

---

## 12. Riscos Residuais Conhecidos

| Risco                     | Detalhe                                               | Mitigação atual                          |
|---------------------------|-------------------------------------------------------|------------------------------------------|
| Sem CSRF token explícito  | Cookie httpOnly sem token CSRF                        | `SameSite=Strict` mitiga em prod; sem proteção em ambientes sem HTTPS |
| Sem 2FA                   | Autenticação apenas por senha                         | Rate limit no login                      |
| Rate limit em memória     | Sem Redis — múltiplas instâncias não compartilham contadores | OK para single-instance; problema em horizontal scaling |
| Sem rotação de JWT_SECRET | Secret fixo no `.env`                                 | Trocar manualmente se houver comprometimento |
| Sem expiração de sessão por inatividade | Token válido por 8h mesmo sem uso  | Logout explícito revoga via token_version |
