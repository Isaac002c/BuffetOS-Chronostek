#!/usr/bin/env node

/**
 * Script ULTRA-SIMPLES para criar usuário - Sem nenhuma complexidade
 * Execute com: node setup-user.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         🚀 SETUP SIMPLES - CRIAR USUÁRIO TESTE           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const setup = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  let client;
  try {
    // Conectar
    console.log('⏳ Conectando ao banco...');
    client = await pool.connect();
    console.log('✅ Conectado!\n');
    
    // Criar tenant
    console.log('⏳ Criando tenant...');
    const tenantRes = await client.query(
      `INSERT INTO tenants (name, email, phone, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      ['Buffet Teste', 'buffet@teste.com', '(11) 99999-9999', true, new Date()]
    );
    const tenantId = tenantRes.rows[0].id;
    console.log(`✅ Tenant criado (ID: ${tenantId})\n`);
    
    // Criar usuário
    console.log('⏳ Criando usuário...');
    const password = 'Teste123!';
    const hash = await bcrypt.hash(password, 10);
    
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, tenant_id, role, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email`,
      ['Admin Teste', 'admin@teste.com', hash, tenantId, 'admin', true, new Date()]
    );
    console.log(`✅ Usuário criado!\n`);
    
    // Resultado
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✨ SUCESSO!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📧 Email: admin@teste.com');
    console.log('🔑 Senha: Teste123!\n');
    
    console.log('🌐 Acesse: http://localhost:3001\n');
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    if (err.code === '42P01') {
      console.error('\n⚠️  Tabelas não existem. Você precisa rodar as migrations.');
    }
    process.exit(1);
  } finally {
    if (client) await client.release();
    await pool.end();
  }
};

setup();

