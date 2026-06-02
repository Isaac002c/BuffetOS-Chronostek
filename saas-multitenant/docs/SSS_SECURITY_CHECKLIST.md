# SSS+ Security Checklist — ChronosTek CRM

Checklist avançado de segurança para auditoria e pré-deploy.
Atualizado em: 2026-05-27

Legenda:
- ✅ Implementado e verificado
- ⚠️ Parcialmente implementado
- ❌ Pendente / Não implementado

---

## 1. Autenticação

| Item | Status | Observação |
|------|--------|------------|
| JWT não armazenado em localStorage | ✅ | Apenas cookie httpOnly |
| Cookie com flag `httpOnly` | ✅ | Configurado em authRoutes.js |
| Cookie com flag `Secure` em produção | ✅ | `secure: NODE_ENV === 'production'` |
| Cookie com `SameSite=Strict` em produção | ✅ | `sameSite: 'strict'` em prod, `'lax'` em dev |
| TTL do token adequado (≤ 8h) | ✅ | `TOKEN_TTL_SEC = 8 * 60 * 60` |
| Token não retornado no body do login | ✅ | Apenas no cookie |
| Rate limit no login (brute force) | ✅ | 10 tentativas / 15min por IP |
| Mensagem de erro genérica em login falho | ✅ | "Credenciais inválidas" — sem indicar qual campo |
| Verificação de usuário ativo no login | ✅ | `is_active === false → 403` |
| Sessões invalidadas após desativação | ✅ | `is_active` verificado no `tenantContext` |

---

## 2. Token Revocation

| Item | Status | Observação |
|------|--------|------------|
| Mecanismo de revogação de token | ✅ | `token_version` na tabela `users` |
| `tokenVersion` incluído no payload JWT | ✅ | Emitido no login |
| `token_version` verificado no banco a cada request | ✅ | No `tenantContext.js` |
| Token revogado no logout | ✅ | `token_version + 1` no logout |
| Token revogado na troca de senha | ✅ | `token_version + 1` em `PATCH /:id/password` |
| Todos os dispositivos deslogados em troca de senha | ✅ | Consequência do token_version global |

---

## 3. RBAC / Autorização

| Item | Status | Observação |
|------|--------|------------|
| Sistema de permissões por role (RBAC) | ✅ | `checkPermission.js` com 5 roles |
| Admin com acesso total | ✅ | |
| Roles: admin, manager, operator, seller, viewer | ✅ | |
| `checkPermission` em todos os GETs sensíveis | ✅ | clients, leads, quotations, events, billing, team, templates |
| `checkPermission` em todos os POSTs | ✅ | |
| `checkPermission` em todos os PUTs/PATCHs | ✅ | |
| `checkPermission` em todos os DELETEs | ✅ | |
| Permissões granulares por ação | ✅ | `quotations:approve`, `quotations:cancel`, `quotations:convert` separados |
| Não-admin não pode criar admin | ✅ | Validado em `POST /api/users/management` |
| Usuário não pode alterar role de outros sem ser admin | ✅ | Verificado no PUT |
| Log de `permission_denied` | ✅ | Via `logAudit` no `checkPermission` |

---

## 4. Isolamento Multi-Tenant

| Item | Status | Observação |
|------|--------|------------|
| `tenant_id` em todas as queries | ✅ | Passado como parâmetro em todos os models |
| `tenantContext` em todas as rotas protegidas | ✅ | `app.use('/api', tenantContext)` |
| Admin cross-tenant bloqueado | ✅ | `requireAdmin` verifica `tenant_id` em `saasRoutes` |
| Endpoint de debug cross-tenant removido | ✅ | `/debug/all` em sellersRoutes removido |
| Sem `SELECT` sem `WHERE tenant_id` em rotas | ✅ | |
| Sem queries com template string (sem parâmetro) | ✅ | Apenas queries parametrizadas |

---

## 5. Proteção contra Ataques

| Item | Status | Observação |
|------|--------|------------|
| SQL Injection: queries parametrizadas | ✅ | `$1, $2, ...` em todas as queries |
| XSS: headers CSP via Helmet | ✅ | `Content-Security-Policy` configurado |
| XSS: `X-Content-Type-Options: nosniff` | ✅ | Helm padrão |
| Clickjacking: `frameAncestors: none` | ✅ | Via CSP |
| CSRF: proteção explícita | ⚠️ | SameSite=Strict mitiga em produção, sem token CSRF explícito |
| Mass assignment: campos explícitos | ✅ | Todos os POST/PUT com destructuring explícito |
| Validação de payload (quotations) | ✅ | `validateQuotationBody` com ranges e enums |
| Validação de payload (team) | ✅ | CPF, email, funcao/status enums |
| Validação de payload (users) | ✅ | role enum, email format, senha ≥8 chars |

---

## 6. Rate Limiting

| Item | Status | Observação |
|------|--------|------------|
| Rate limit global por IP | ✅ | 2000 req / 15min |
| Rate limit nas rotas de auth | ✅ | 30 req / 15min por IP |
| Rate limit no login (específico) | ✅ | 10 req / 15min por IP |
| Rate limit por usuário: troca de senha | ✅ | 5 / 1h por usuário+tenant |
| Rate limit por usuário: criar orçamento | ✅ | 60 / 1h por usuário+tenant |
| Rate limit por usuário: criar evento | ✅ | 30 / 1h por usuário+tenant |
| Rate limit distribuído (Redis) | ❌ | Em memória — não funciona em multi-instância |

---

## 7. CORS

| Item | Status | Observação |
|------|--------|------------|
| CORS com whitelist explícita em produção | ✅ | Sem wildcards |
| `*.app.github.dev` apenas em desenvolvimento | ✅ | Bloqueado quando `NODE_ENV=production` |
| `ALLOWED_ORIGINS` configurável via env var | ✅ | |
| `credentials: true` | ✅ | Necessário para cookies |

---

## 8. Headers de Segurança

| Item | Status | Observação |
|------|--------|------------|
| Helmet configurado | ✅ | |
| Content-Security-Policy | ✅ | Configurado no backend |
| HSTS (Strict-Transport-Security) | ✅ | `maxAge: 31536000; includeSubDomains` |
| X-Content-Type-Options | ✅ | `nosniff` |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ | `geolocation=(), microphone=(), camera=()` |
| Cache-Control | ✅ | `no-store` |
| X-Powered-By removido | ✅ | `app.disable('x-powered-by')` |

---

## 9. Setup Route

| Item | Status | Observação |
|------|--------|------------|
| `/setup` bloqueado por padrão | ✅ | Exige `ALLOW_SETUP=true` |
| `X-Setup-Secret` em produção | ✅ | Verificado quando `NODE_ENV=production` |
| Endpoint nunca retorna senhas | ✅ | |

---

## 10. Logs e Auditoria

| Item | Status | Observação |
|------|--------|------------|
| Logs de erro sem `err.message` em produção | ✅ | `safeError()` aplicado em todas as rotas |
| Sem `SELECT *` em rotas sensíveis | ✅ | Colunas explícitas |
| Audit logs: login | ✅ | `logAudit(..., 'login', ...)` |
| Audit logs: logout | ✅ | |
| Audit logs: troca de senha | ✅ | `password_changed` |
| Audit logs: permission_denied | ✅ | No `checkPermission` |
| Audit logs: quotation_approved | ✅ | |
| Audit logs: event_created/deleted | ✅ | |
| Logs de debug removidos de produção | ✅ | `log()` helper guarda por `isDev` |

---

## 11. Secrets e Configuração

| Item | Status | Observação |
|------|--------|------------|
| JWT_SECRET forte (≥ 64 bytes hex) | ✅ | Guard no startup impede inicialização com secret fraco |
| `DATABASE_URL` obrigatório no startup | ✅ | `process.exit(1)` se ausente |
| Sem secrets hardcoded no código | ✅ | Removidos de reset-password.js e seed.js |
| `.env` no `.gitignore` | ✅ | Verificar antes de cada commit |
| `.env.example` com placeholders | ✅ | `backend/.env.example` |

---

## 12. Dependências e Build

| Item | Status | Observação |
|------|--------|------------|
| `npm audit` zerado (0 vulnerabilidades) | ✅ | Executado após correções |
| Dependências desatualizadas | ⚠️ | Verificar periodicamente com `npm outdated` |
| Build de produção funcional | ✅ | `npm run build` sem erros |

---

## 13. Banco de Dados

| Item | Status | Observação |
|------|--------|------------|
| Migrations automáticas e idempotentes | ✅ | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` no startup |
| Backup configurado | ⚠️ | Depende do provedor (Neon tem backups automáticos) |
| Retenção de audit_logs definida | ❌ | Não há TTL ou limpeza automática implementada |

---

## Resumo

| Categoria | ✅ | ⚠️ | ❌ |
|-----------|----|----|-----|
| Autenticação | 10 | 0 | 0 |
| Token Revocation | 6 | 0 | 0 |
| RBAC | 11 | 0 | 0 |
| Isolamento Multi-Tenant | 6 | 0 | 0 |
| Proteção contra Ataques | 8 | 1 | 0 |
| Rate Limiting | 6 | 0 | 1 |
| CORS | 4 | 0 | 0 |
| Headers | 8 | 0 | 0 |
| Setup Route | 3 | 0 | 0 |
| Logs e Auditoria | 10 | 0 | 0 |
| Secrets | 5 | 0 | 0 |
| Dependências | 2 | 1 | 0 |
| Banco | 1 | 1 | 1 |
| **Total** | **80** | **3** | **2** |

### Pendências prioritárias

1. ⚠️ **CSRF**: implementar Double Submit Cookie ou `csurf` middleware e atualizar frontend para enviar `X-CSRF-Token`
2. ❌ **Rate limit com Redis**: substituir `rateLimitByUser.js` por Redis para ambientes multi-instância
3. ❌ **Retenção de audit_logs**: definir política de limpeza (ex: manter 90 dias)
