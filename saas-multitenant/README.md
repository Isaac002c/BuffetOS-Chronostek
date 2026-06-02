# ChronosTek CRM — BuffetOS

Sistema CRM SaaS multi-tenant desenvolvido pela Chronostek para gestão completa de buffets e empresas de eventos. Centraliza orçamentos, eventos, clientes, equipe, financeiro e leads em uma única plataforma.

---

## O que é o sistema

O BuffetOS é uma aplicação web full-stack que permite a múltiplos clientes (tenants) gerenciarem suas operações de forma isolada. Cada buffet tem seu próprio ambiente com usuários, dados e configurações independentes, compartilhando a mesma infraestrutura de forma transparente.

---

## Módulos

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Visão geral com KPIs, eventos próximos e alertas |
| **Orçamentos** | Criação, edição, simulação, aprovação e conversão para evento |
| **Eventos** | Calendário, agenda e gestão de eventos confirmados |
| **Financeiro** | Receita mensal, comparativos, forecast e métricas de conversão |
| **Clientes** | Cadastro, histórico e pesquisa de clientes |
| **Leads** | Pipeline comercial, funil de vendas e conversão |
| **Equipe** | Cadastro de funcionários, custo/diária e disponibilidade |
| **Templates** | Templates de cardápio com itens e custos por pessoa |
| **Usuários** | Gerenciamento de usuários com RBAC por role |

---

## Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Lucide React (ícones)

**Backend:**
- Node.js + Express.js
- PostgreSQL (Neon DB em produção)
- JWT em cookie `httpOnly`
- bcryptjs, express-validator
- helmet, express-rate-limit

---

## Estrutura de pastas

```
saas-multitenant/
├── app/                      # Frontend Next.js
│   ├── buffet/               # Módulos principais (Quotations, Events, Billing, etc.)
│   ├── components/           # Header, Sidebar, ModuleLayout
│   ├── dashboard/            # Página de dashboard
│   ├── hooks/                # Custom hooks (useIsMobile)
│   ├── lib/                  # Clientes de API (api.js, quotationsAPI.js, etc.)
│   ├── login/ register/      # Páginas de autenticação
│   ├── templates/            # Templates locais de cardápio (dados estáticos)
│   └── layout.jsx            # Layout raiz
│
├── backend/                  # API Express.js
│   ├── config/               # Configuração do banco (db.js)
│   ├── controllers/          # Controllers específicos (dashboard)
│   ├── middlewares/          # tenantContext, checkPermission, rateLimitByUser
│   ├── models/               # Queries SQL organizadas por entidade
│   ├── routes/               # Rotas REST da API
│   ├── scripts/              # Scripts utilitários (seed, smoke test)
│   ├── services/             # calculationService, pdfService
│   ├── utils/                # errorResponse, auditLog
│   ├── app.js                # Entry point e configuração do servidor
│   ├── .env.example          # Template de variáveis de ambiente
│   └── SECURITY_CHECKLIST.md # Status dos controles de segurança
│
└── docs/                     # Documentação técnica
    ├── ARCHITECTURE.md       # Arquitetura e fluxos
    ├── API.md                # Referência da API REST
    ├── DATABASE.md           # Schema e tabelas
    ├── SECURITY.md           # Controles de segurança
    ├── DEPLOY.md             # Guia de deploy
    ├── MAINTENANCE.md        # Guia de manutenção
    ├── CHANGELOG.md          # Histórico de versões
    ├── CHECKLIST_QA.md       # Testes manuais de qualidade
    └── SSS_SECURITY_CHECKLIST.md  # Checklist de segurança avançada
```

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+ (ou conta [Neon DB](https://neon.tech))
- npm 9+

### Backend

```bash
cd backend
cp .env.example .env
# Editar .env: preencher DATABASE_URL e JWT_SECRET
npm install
node app.js
# Servidor disponível em http://localhost:5000
```

### Frontend

```bash
# Na raiz do projeto (saas-multitenant/)
npm install
npm run dev
# Aplicação disponível em http://localhost:3001
```

---

## Comandos principais

```bash
# Frontend
npm run dev          # Servidor de desenvolvimento (porta 3001)
npm run build        # Build de produção
npm run start        # Servir build de produção
npm run lint         # Verificar lint

# Backend
node app.js                                              # Iniciar servidor
node list-users.js                                       # Listar usuários do banco
node reset-password.js <email> <nova_senha>             # Resetar senha (dev only)
node scripts/security-smoke-test.js                     # Testes de segurança rápidos
node scripts/seed_valeria_buffet.js                     # Seed de dados de demonstração
```

---

## Variáveis de ambiente

Ver [`backend/.env.example`](./backend/.env.example) para lista completa e comentada.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NODE_ENV` | Sim | `development` ou `production` |
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `JWT_SECRET` | Sim | Mín. 32 chars — gerar: `openssl rand -hex 64` |
| `ALLOWED_ORIGINS` | Prod | Origens CORS permitidas (separadas por vírgula) |
| `ALLOW_SETUP` | Não | `true` apenas no primeiro setup |

---

## Documentação adicional

| Documento | Conteúdo |
|-----------|----------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura, fluxos e decisões técnicas |
| [`docs/API.md`](docs/API.md) | Referência dos endpoints da API REST |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema, tabelas e migrações |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Controles de segurança implementados |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Guia de deploy em produção |
| [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) | Como manter e evoluir o sistema |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Histórico de mudanças |
| [`docs/CHECKLIST_QA.md`](docs/CHECKLIST_QA.md) | Checklist manual de qualidade |
