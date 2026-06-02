# Deploy em Produção — ChronosTek CRM BuffetOS

Guia passo a passo para implantação em produção. Leia até o fim antes de começar, especialmente o checklist final.

---

## Pré-requisitos

- Node.js 18+ instalado no servidor
- PostgreSQL 14+ acessível (ou conta no Neon DB)
- Domínio com HTTPS configurado (certificado TLS válido)
- Variáveis de ambiente definidas (ver seção abaixo)

---

## 1. Variáveis de Ambiente

### Backend (`saas-multitenant/backend/.env`)

```env
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@host:5432/buffetos?sslmode=require

# JWT — OBRIGATÓRIO gerar valor aleatório seguro (ver passo 2)
JWT_SECRET=<gerar com openssl>

# Ambiente
NODE_ENV=production
PORT=3001

# CORS — lista de origens do frontend, separadas por vírgula
CORS_ORIGIN=https://seudominio.com,https://www.seudominio.com

# Setup — DESATIVAR após o primeiro deploy
ALLOW_SETUP=false
SETUP_SECRET=<string aleatória para proteger /setup se precisar reativar>
```

### Frontend (`saas-multitenant/.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com
```

---

## 2. Gerar JWT_SECRET

O segredo JWT deve ter no mínimo 32 caracteres aleatórios. Gere com:

```bash
# Linux/Mac
openssl rand -base64 48

# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Cole o resultado no `JWT_SECRET` do `.env`. **Nunca use uma string previsível.**

---

## 3. Configurar o Banco de Dados

### Neon DB (recomendado para produção)

1. Criar projeto em [neon.tech](https://neon.tech)
2. Copiar a connection string no formato `postgresql://...?sslmode=require`
3. Definir como `DATABASE_URL` no `.env`

### PostgreSQL self-hosted

```sql
-- Criar banco e usuário
CREATE DATABASE buffetos;
CREATE USER buffetos_user WITH ENCRYPTED PASSWORD 'senha_forte';
GRANT ALL PRIVILEGES ON DATABASE buffetos TO buffetos_user;
```

As tabelas são criadas automaticamente pelo backend no primeiro startup.

---

## 4. Build do Frontend (Next.js)

```bash
cd saas-multitenant

# Instalar dependências
npm install

# Build de produção
npm run build
```

Se o build falhar, verifique:
- `NEXT_PUBLIC_API_URL` está definido no `.env.local`
- Não há imports de módulos inexistentes
- `npm run lint` não retorna erros bloqueadores

---

## 5. Iniciar o Backend

```bash
cd saas-multitenant/backend

# Instalar dependências
npm install

# Iniciar (as migrations rodam automaticamente)
node app.js
```

Acompanhe o log de inicialização — você deve ver:

```
✓ Conectado ao PostgreSQL
✓ Migrations executadas
✓ Servidor rodando na porta 3001
```

Se aparecer erro de conexão com o banco, verifique `DATABASE_URL`.

---

## 6. Setup Inicial (apenas no primeiro deploy)

Com `ALLOW_SETUP=true` temporariamente no `.env`:

```bash
# Criar o primeiro tenant e usuário admin
curl -X POST https://api.seudominio.com/setup/init \
  -H "Content-Type: application/json" \
  -H "X-Setup-Secret: <valor de SETUP_SECRET>" \
  -d '{
    "tenantName": "Buffet Exemplo",
    "adminEmail": "admin@buffetexemplo.com",
    "adminPassword": "SenhaForte123!"
  }'
```

Após receber `200 OK`:

1. Definir `ALLOW_SETUP=false` no `.env`
2. Reiniciar o backend

---

## 7. Configurar Proxy Reverso (Nginx)

Exemplo de configuração para expor backend e frontend:

```nginx
# Frontend Next.js
server {
    listen 443 ssl;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Backend Express
server {
    listen 443 ssl;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

O header `X-Forwarded-For` é necessário para o rate limiting por IP funcionar corretamente atrás do proxy. Configure `trust proxy` no Express:

```javascript
// app.js
app.set('trust proxy', 1);
```

---

## 8. Verificar Cookie Secure

Com `NODE_ENV=production`, o cookie JWT é automaticamente configurado com `Secure: true`, exigindo HTTPS. Verifique no browser (DevTools → Application → Cookies) que o cookie `token` aparece com o flag `Secure` ativo.

---

## 9. Verificar Dependências de Segurança

```bash
cd saas-multitenant/backend
npm audit

cd ..
npm audit
```

Corrija vulnerabilidades `high` e `critical` antes de ir a produção.

---

## 10. Iniciar o Frontend

```bash
cd saas-multitenant

# Iniciar servidor Next.js em modo produção
npm start
```

Ou use `pm2` para gerenciar os processos:

```bash
npm install -g pm2

# Backend
pm2 start saas-multitenant/backend/app.js --name buffetos-backend

# Frontend
pm2 start npm --name buffetos-frontend -- start --prefix saas-multitenant

# Salvar para reiniciar no boot
pm2 save
pm2 startup
```

---

## Checklist Pré-Deploy

Execute este checklist antes de cada deploy em produção:

### Configuração

- [ ] `DATABASE_URL` definido e testado (conexão OK)
- [ ] `JWT_SECRET` definido com no mínimo 32 chars aleatórios
- [ ] `NODE_ENV=production` definido no backend
- [ ] `NEXT_PUBLIC_API_URL` aponta para o backend de produção
- [ ] `CORS_ORIGIN` lista apenas os domínios do frontend de produção
- [ ] `ALLOW_SETUP=false` (ou variável removida do `.env`)
- [ ] `SETUP_SECRET` definido (para caso precise reativar setup)

### Build e Qualidade

- [ ] `npm run build` no frontend concluiu sem erros
- [ ] `npm audit` no backend e frontend: sem vulnerabilidades `high`/`critical`
- [ ] Sem chaves de API ou senhas hardcoded no código
- [ ] Logs de debug removidos (sem `console.log` de dados sensíveis)

### Banco de Dados

- [ ] Backup do banco realizado antes do deploy
- [ ] Migrations testadas em ambiente de staging primeiro
- [ ] Índices de performance criados (ver `DATABASE.md`)

### Infraestrutura

- [ ] HTTPS ativo no domínio do frontend e do backend
- [ ] Certificado TLS válido (não expirado)
- [ ] Proxy reverso configurado com `X-Forwarded-For`
- [ ] `trust proxy` configurado no Express
- [ ] Processo gerenciado por `pm2` ou equivalente (reinício automático)
- [ ] Firewall: porta 3001 fechada para acesso externo direto (apenas via proxy)

### Pós-Deploy

- [ ] Fazer login como admin e verificar dashboard
- [ ] Criar um orçamento de teste e convertê-lo em evento
- [ ] Verificar que viewer não acessa `/api/billing`
- [ ] Verificar que cookie `token` tem flag `Secure` e `HttpOnly` no browser
- [ ] Monitorar logs do backend nas primeiras horas

---

## Variáveis Opcionais

| Variável          | Padrão | Uso                                          |
|-------------------|--------|----------------------------------------------|
| `PORT`            | 3001   | Porta do backend                             |
| `LOG_LEVEL`       | info   | Nível de log (`debug`, `info`, `warn`, `error`) |
| `MAX_FILE_SIZE`   | 10mb   | Tamanho máximo de upload                     |
