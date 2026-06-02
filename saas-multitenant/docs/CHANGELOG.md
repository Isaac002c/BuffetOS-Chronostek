# Changelog — ChronosTek CRM BuffetOS

Todas as mudanças significativas do projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
Versionamento baseado em [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [0.1.0] — Hardening e Estabilização — 2026-05-27

Esta versão marca a conclusão da fase de hardening de segurança e estabilização funcional do CRM. O foco foi transformar um protótipo funcional em um sistema pronto para uso em produção multi-tenant real.

### Segurança

- **JWT em cookie httpOnly**: autenticação migrada de localStorage para cookie httpOnly com flags `Secure`, `SameSite=Strict` e TTL de 8 horas — elimina superfície de ataque XSS no token
- **Revogação de token via `token_version`**: cada logout incrementa o campo `token_version` do usuário no banco, invalidando todos os tokens emitidos anteriormente sem necessidade de blacklist
- **Verificação de `is_active` em todo request**: middleware `tenantContext` verifica se o usuário está ativo antes de cada request — usuários desativados são bloqueados imediatamente sem precisar aguardar o token expirar
- **RBAC em todas as rotas**: implementado `checkPermission` em 100% dos endpoints autenticados; nenhuma rota autenticada sem verificação de papel
- **Rate limiting por usuário**: limites compostos (userId + IP) para operações críticas: troca de senha (5/hora), criação de orçamento (60/hora), criação de evento (30/hora)
- **Rate limiting global e por rota**: 2000 req/15min por IP (global), 30 req/15min em `/auth`, 10 tentativas de login por IP
- **Audit logs**: registro automático de login, logout, troca de senha, negação de permissão (403), aprovação de orçamento, criação e exclusão de eventos
- **Setup route guard**: rota `/setup/init` protegida por `ALLOW_SETUP` env var + header `X-Setup-Secret` — sem exposição acidental em produção
- **CORS sem wildcard em produção**: lista branca explícita via `CORS_ORIGIN`; sem `*` em nenhum cenário de produção
- **`safeError()`**: erros internos nunca expõem `err.message` ou stack trace para o cliente em produção — apenas mensagens genéricas seguras
- **Helmet configurado**: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy e Permissions-Policy ativos

### Orçamentos

- **Botão de cancelamento**: adicionado botão e endpoint `POST /api/quotations/:id/cancel` com campo de motivo obrigatório
- **Validação de payload**: `validateQuotationBody` valida `guest_count` (> 0), `discount` (>= 0), `status` contra enum explícito, `items` não vazio quando enviado, e `event_date` válida
- **Simulação de cálculo**: endpoint `POST /api/quotations/:id/simulate` retorna projeção de total, impostos e comissão sem salvar
- **Proteção de status**: orçamentos com status `active`, `completed` ou `cancelled` não podem ser editados

### Eventos

- **RBAC granular**: `events:create`, `events:update`, `events:delete` com permissões distintas por papel
- **Detecção de conflito de data**: verificação de sobreposição de data/horário antes de criar ou atualizar evento — retorna 409 com detalhes do conflito
- **Prevenção de duplicata orçamento→evento**: constraint `UNIQUE(quotation_id, tenant_id)` + verificação na lógica de negócio — tentativa de criar segundo evento para o mesmo orçamento retorna 409

### Financeiro

- **RBAC `finance:read`**: módulo financeiro completamente protegido — apenas admin e manager têm acesso
- Viewer e operator não conseguem acessar `/api/billing` mesmo conhecendo a URL

### Equipe

- **RBAC completo**: `team:create`, `team:update`, `team:delete` com papéis distintos
- **Validação de CPF**: formato e unicidade por tenant validados no backend
- **Validação de email**: unicidade por tenant verificada
- **Validação de `funcao` e `status`**: campos obrigatórios com valores controlados

### Leads

- **RBAC completo**: todas as operações CRUD + conversão protegidas por permissão
- **Conversão sem duplicata**: `POST /api/leads/:id/convert` verifica se já existe orçamento ativo para o lead antes de criar — retorna 409 se duplicado, com link para o orçamento existente

### Templates

- **RBAC**: criação, edição e exclusão de templates restritas a admin e manager
- Leitura disponível para operator, seller e viewer

### Infraestrutura

- **Migrations automáticas no startup**: eliminada necessidade de rodar scripts manuais de banco — `app.js` executa `ALTER TABLE IF NOT EXISTS` idempotentemente a cada inicialização
- **`.env.example` atualizado**: todas as variáveis de ambiente documentadas com descrição e exemplos
- **Script de smoke test de segurança**: `backend/security-smoke-test.js` verifica: cookie flags, rate limit, CORS, headers Helmet, setup route guard

### Documentação

- `README.md` reescrito com quickstart, arquitetura e links para docs
- `docs/ARCHITECTURE.md`: arquitetura completa com diagramas de fluxo
- `docs/API.md`: referência completa de todos os endpoints
- `docs/DATABASE.md`: esquema de tabelas, enums de status, padrão de migrations
- `docs/SECURITY.md`: todos os controles implementados e riscos residuais
- `docs/DEPLOY.md`: guia passo a passo de deploy em produção com checklist
- `docs/MAINTENANCE.md`: padrões de código e procedimentos operacionais
- `docs/CHANGELOG.md`: este arquivo
- `docs/CHECKLIST_QA.md`: checklist manual de QA por feature

---

## [0.0.1] — Commit Inicial — 2026-01-01

- Estrutura inicial do projeto Next.js + Express
- CRUD básico de orçamentos, eventos, leads, clientes e equipe
- Autenticação com JWT (sem cookie httpOnly — migrado em 0.1.0)
- Interface de dashboard com métricas básicas
- Calendário de eventos
- Módulo financeiro básico

---

## Próximas Versões (Planejado)

### [0.2.0] — Planejado

- [ ] Fluxo de recuperação de senha por email
- [ ] Redis para rate limiting distribuído (suporte a múltiplas instâncias)
- [ ] CSRF token explícito (complementar ao SameSite=Strict)
- [ ] Autenticação em dois fatores (2FA) via TOTP
- [ ] Webhooks para integração com sistemas externos
- [ ] Exportação de relatórios em Excel

### [0.3.0] — Planejado

- [ ] Módulo de contratos digitais com assinatura
- [ ] Integração com gateway de pagamento
- [ ] Notificações em tempo real (WebSocket)
- [ ] App mobile (React Native)
