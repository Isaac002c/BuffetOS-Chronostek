# 🚀 Setup Rápido - BuffetOS

## 1️⃣ Parar o Backend (Ctrl+C)

## 2️⃣ Criar Usuário de Teste

Existem 3 formas:

### Opção A: Via Curl (Recomendado)

```bash
curl -X POST http://localhost:3000/setup/create-test-user
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Usuário de teste criado com sucesso!",
  "data": {
    "email": "admin@teste.com",
    "password": "Teste123!",
    "tenant": "Buffet Teste",
    "name": "Admin Teste"
  }
}
```

### Opção B: Via Navegador

Abra em uma aba nova:
```
http://localhost:3000/setup/create-test-user
```

### Opção C: Via Node Script (Terminal)

No terminal do backend (depois de parar npm run dev):
```bash
node create-test-user-simple.js
```

---

## 3️⃣ Credenciais de Teste

Depois de executar uma das opções acima, use:

📧 **Email:** `admin@teste.com`  
🔑 **Senha:** `Teste123!`

---

## 4️⃣ Rodar o Backend Novamente

```bash
npm run dev
```

---

## 5️⃣ Fazer Login

Acesse: **http://localhost:3001/login**

E use as credenciais acima.

---

## ⚠️ Troubleshooting

**Erro: "Cannot POST /setup/create-test-user"**
- Backend não está rodando
- Execute: `npm run dev`

**Erro: "Usuário já existe"**
- Já foi criado uma vez
- Use as credenciais padrão

**Erro de conexão com banco de dados**
- Verifique se a DATABASE_URL está correta em `.env`
- Deve conectar ao Neon: `postgresql://neondb_owner:...`

---

✅ **Pronto!** Agora você pode testar o BuffetOS localmente.
