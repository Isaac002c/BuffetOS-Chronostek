# Security Checklist — ChronosTek CRM

Última revisão: 2026-05-27

## ✅ Controles implementados

### Autenticação & Sessão
- [x] JWT com TTL de 8h (jornada de trabalho)
- [x] Token apenas em cookie `httpOnly; Secure; SameSite`
- [x] Token NÃO retornado no body do login
- [x] Token NÃO armazenado em localStorage
- [x] `token_version` no payload JWT — qualquer troca de senha ou logout invalida tokens anteriores
- [x] Verificação de `token_version` no banco a cada requisição autenticada
- [x] Verificação de `is_active` do usuário no banco a cada requisição
- [x] Guard de `JWT_SECRET`: servidor recusa iniciar com secret fraco ou ausente
- [x] Rate limit no login: 10 tentativas/15min por IP

### Autorização (RBAC)
- [x] `checkPermission()` aplicado a **todas** as rotas sensíveis:
  - clients, contracts, documents
  - quotations (read/create/update/delete/approve/cancel/convert)
  - events (read/create/update/delete)
  - leads (read/create/update/delete)
  - team (read/create/update/delete)
  - billing / finance (read)
  - templates (read/create/update/delete)
  - users (read/create/update/delete)
- [x] Apenas admin pode criar outro admin
- [x] Não é possível alterar role de outro usuário sem ser admin
- [x] Usuário não pode deletar a si mesmo
- [x] Admin cross-tenant bloqueado em `/api/admin/*`

### Proteção de Dados
- [x] `safeError()` em todos os handlers: em produção retorna string genérica
- [x] Sem `SELECT *` em rotas sensíveis — colunas explícitas
- [x] Mass assignment prevenido: campos explícitos em todos os POST/PUT
- [x] Parâmetros SQL sempre parametrizados (sem interpolação)
- [x] Validação de payload em quotations (guest_count, discount, status enum, items)
- [x] Validação de equipe (CPF 11 dígitos, email format, funcao/status enum)
- [x] Validação de usuário (email format, role enum, senha mínima 8 chars)

### Rate Limiting
- [x] Rate limit global: 2000 req/15min por IP
- [x] Rate limit de auth: 30 req/15min por IP
- [x] Rate limit de troca de senha: 5 tentativas/hora por usuário
- [x] Rate limit de criação de orçamento: 60/hora por usuário
- [x] Rate limit de criação de evento: 30/hora por usuário

### Headers HTTP
- [x] Helmet com CSP configurado
- [x] HSTS: max-age=31536000; includeSubDomains
- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options via CSP frameAncestors: none
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy: geolocation=(), microphone=(), camera=()
- [x] Cache-Control: no-store
- [x] X-Powered-By removido

### CORS
- [x] Em produção: whitelist explícita (sem wildcard)
- [x] `*.app.github.dev` permitido APENAS em desenvolvimento
- [x] `ALLOWED_ORIGINS` env var para adicionar origens via configuração
- [x] credentials: true (necessário para cookies)

### Setup Route
- [x] Bloqueado por padrão (`ALLOW_SETUP !== 'true'`)
- [x] Em produção: requer header `X-Setup-Secret` além de `ALLOW_SETUP=true`

### Auditoria
- [x] Tabela `audit_logs` criada automaticamente no startup
- [x] Logs: login, logout, password_changed, permission_denied
- [x] Logs: quotation_approved, event_created, event_deleted
- [x] IP registrado em todos os logs de auditoria

---

## ⚠️ Pendente / TODO

### FASE 3 — CSRF Protection (não implementado)
- [ ] Implementar Double Submit Cookie ou `csrf` middleware
- [ ] Frontend deve enviar `X-CSRF-Token` header em todas as mutações
- [ ] **ATENÇÃO:** Requer alteração no frontend em todas as chamadas de API
- Risco: MÉDIO (SameSite=Strict mitiga em produção; maior risco em dev com SameSite=Lax)

### Melhorias futuras
- [ ] Redis para rate limiting distribuído (multi-instance)
- [ ] Paginação com cursor em logs de auditoria (escala melhor que OFFSET)
- [ ] Webhook de alerta para permission_denied em volume alto (possível ataque)
- [ ] Rotação automática de JWT_SECRET com período de transição
- [ ] 2FA para contas admin

---

## 🚀 Variáveis de Ambiente necessárias em produção

| Variável        | Obrigatória | Descrição |
|-----------------|-------------|-----------|
| `JWT_SECRET`    | ✅ SIM      | Mínimo 32 chars; gerar com `openssl rand -hex 64` |
| `DATABASE_URL`  | ✅ SIM      | Connection string PostgreSQL |
| `NODE_ENV`      | ✅ SIM      | `production` em produção |
| `ALLOWED_ORIGINS` | Recomendada | URLs do frontend separadas por vírgula |
| `ALLOW_SETUP`   | ❌ NÃO (padrão) | Definir `true` apenas para setup inicial |
| `SETUP_SECRET`  | Se ALLOW_SETUP=true em prod | Header secreto para /setup |
| `PORT`          | Opcional    | Padrão: 5000 |

---

## Rodar smoke test antes do deploy

```bash
# Com o servidor rodando:
node scripts/security-smoke-test.js http://localhost:5000
```
