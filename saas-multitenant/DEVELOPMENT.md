# 🚀 Guia de Desenvolvimento - BuffetOS

## Arquitetura

```
Frontend (Next.js) ← porta 3001
    ↓
    └→ Rewrite /api → Backend (Express) porta 3000
       ↓
       └→ PostgreSQL (Neon)
```

## Setup Inicial

### 1. Backend

```bash
cd backend
npm install

# Criar arquivo .env com variáveis de banco
# (verificar config/database.js para referência)

npm run dev
```

✅ Backend estará em `http://localhost:3000`

### 2. Frontend (novo terminal)

```bash
npm install

# Criar .env.local se quiser (pode deixar vazio)
cp .env.local.example .env.local

npm run dev
```

✅ Frontend estará em `http://localhost:3001`

## Como Funciona a Comunicação

### Frontend → Backend

1. Frontend faz fetch para `/api/auth/login`
2. Next.js reescreve para `http://localhost:3000/auth/login`
3. Resposta volta para o Frontend

**Arquivo responsável**: `app/lib/api.js`
- Detecta se está em localhost e usa `/api` como base
- Em produção, usa variável `NEXT_PUBLIC_API_URL`

### CSP (Content Security Policy)

Configurado em `next.config.js` para aceitar:
- `http://localhost:3000` (Backend)
- `http://localhost:3001` (Frontend)
- Equivalentes com `127.0.0.1`

## Estrutura de Pastas

```
saas-multitenant/
├── app/                    # Next.js App Router
│   ├── layout.jsx         # Layout principal
│   ├── page.jsx           # Home
│   ├── buffet/            # Módulos do BuffetOS
│   ├── login/             # Página de login
│   └── lib/
│       └── api.js         # Cliente HTTP
│
├── components/            # Componentes reutilizáveis
│   ├── Header.jsx
│   ├── ModuleLayout.jsx
│   └── ...
│
├── backend/               # Express API
│   ├── app.js            # Servidor principal
│   ├── routes/           # Endpoints
│   ├── controllers/      # Lógica dos endpoints
│   ├── models/           # Modelos de dados
│   └── config/
│       └── database.js
│
├── next.config.js        # Configuração Next.js (CSP + rewrites)
├── jsconfig.json         # Aliases de importação
└── package.json
```

## Variáveis de Ambiente

### Frontend (`.env.local`)

```bash
# API URL (deixe vazio para usar /api em desenvolvimento)
NEXT_PUBLIC_API_URL=

# Opcional: para produção
# NEXT_PUBLIC_API_URL=https://sua-api.com
```

### Backend (`.env` na pasta backend)

```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=sua_chave_secreta
NODE_ENV=development
PORT=3000
```

## Testes Rápidos

### 1. Testar Backend

```bash
curl http://localhost:3000/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'
```

### 2. Testar Frontend

Abra http://localhost:3001 e teste o login

## Troubleshooting

### ❌ "Cannot load resource ... violates CSP"

**Solução**: CSP foi configurado para aceitar localhost
- Limpe cache (Ctrl+Shift+Delete) e refresque
- Verifique se Backend e Frontend estão rodando nas portas corretas

### ❌ "Connection refused on localhost:3000"

**Solução**: Backend não está rodando
```bash
cd backend
npm run dev
```

### ❌ Favicon 404

**Solução**: Adicione um `favicon.ico` na pasta `public/`

### ❌ Erro de CORS

**Solução**: Backend tem CORS configurado em `app.js`
- Verifique `middlewares/` para configurações de segurança

## Workflow de Desenvolvimento

1. **Frontend**: Edite em `app/` ou `components/`
   - Hot Reload automático em `http://localhost:3001`

2. **Backend**: Edite em `backend/routes/` ou `backend/controllers/`
   - Precisa reiniciar manualmente (ou use nodemon)

3. **Testes**: Use curl ou Postman para testar endpoints
   - Base URL: `http://localhost:3000`

## Build para Produção

```bash
# Frontend
npm run build
npm start

# Backend
cd backend
npm start
```

---

**Dúvidas?** Verifique os logs do navegador (F12) e do terminal.
