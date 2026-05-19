const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const pool = require('../config/db');

/**
 * 🚀 POST /setup/create-test-user
 * Cria um usuário de teste no banco de dados
 * Apenas para DESENVOLVIMENTO!
 */
router.post('/create-test-user', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Endpoint desabilitado em produção'
    });
  }

  let client;
  try {
    console.log('\n📝 Criando usuário de teste...');
    client = await pool.connect();

    // 1. Criar Tenant
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, email, phone, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING id, name`,
      ['Buffet Teste', 'buffet@teste.com', '(11) 99999-9999']
    );

    const tenant = tenantResult.rows[0];
    console.log(`✅ Tenant criado: ${tenant.name} (ID: ${tenant.id})`);

    // 2. Criar Usuário
    const password = 'Teste123!';
    const hashedPassword = await bcryptjs.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, tenant_id, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, true) 
       RETURNING id, name, email, role`,
      [
        'Admin Teste',
        'admin@teste.com',
        hashedPassword,
        tenant.id,
        'admin'
      ]
    );

    const user = userResult.rows[0];
    console.log(`✅ Usuário criado: ${user.name} (ID: ${user.id})\n`);

    res.json({
      success: true,
      message: 'Usuário de teste criado com sucesso!',
      data: {
        email: user.email,
        password: password,
        tenant: tenant.name,
        name: user.name
      }
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);

    // Verificar se já existe
    if (err.code === '23505') { // unique violation
      return res.json({
        success: true,
        message: 'Usuário já existe!',
        data: {
          email: 'admin@teste.com',
          password: 'Teste123!',
          info: 'Use essas credenciais para fazer login'
        }
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
      hint: 'Verifique se as tabelas do banco existem'
    });
  } finally {
    if (client) {
      await client.release();
    }
  }
});

module.exports = router;
