#!/usr/bin/env node

/**
 * Script para criar usuário de teste no BuffetOS
 * Execute com: node create-test-user-simple.js
 */

const pool = require('./config/db');
const bcrypt = require('bcryptjs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         🚀 CRIANDO USUÁRIO DE TESTE - BUFFETOS           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const createTestUser = async () => {
  let client;
  try {
    console.log('⏳ Conectando ao banco de dados...');
    client = await pool.connect();
    console.log('✅ Conectado!\n');
    
    // 1. Criar Tenant
    console.log('📝 [1/3] Criando tenant...');
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, email, phone, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING id, name`,
      ['Buffet Teste', 'buffet@teste.com', '(11) 99999-9999']
    );
    
    const tenant = tenantResult.rows[0];
    console.log(`✅ Tenant criado: ${tenant.name} (ID: ${tenant.id})\n`);
    
    // 2. Criar Usuário
    console.log('📝 [2/3] Criando usuário admin...');
    const password = 'Teste123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
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
    
    // 3. Criar alguns membros de equipe para teste
    console.log('📝 [3/3] Criando membros da equipe...');
    const teamMembers = [
      { nome: 'João da Silva', funcao: 'Garcom' },
      { nome: 'Maria da Cozinha', funcao: 'Cozinha' },
      { nome: 'Carlos Churrasco', funcao: 'Churrasqueiro' }
    ];
    
    for (const member of teamMembers) {
      await client.query(
        `INSERT INTO team_members (tenant_id, nome, funcao, is_active)
         VALUES ($1, $2, $3, true)`,
        [tenant.id, member.nome, member.funcao]
      );
    }
    console.log(`✅ ${teamMembers.length} membros da equipe criados\n`);
    
    // Resultado final
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      ✨ USUÁRIO DE TESTE CRIADO COM SUCESSO!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 INFORMAÇÕES DO USUÁRIO:');
    console.log(`   👤 Nome:      ${user.name}`);
    console.log(`   📧 Email:     ${user.email}`);
    console.log(`   🔑 Senha:     ${password}`);
    console.log(`   🎯 Role:      ${user.role}\n`);
    
    console.log('🌐 COMO USAR:');
    console.log('   1. Abra: http://localhost:3001');
    console.log(`   2. Email: ${user.email}`);
    console.log(`   3. Senha: ${password}\n`);
    
    console.log('════════════════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ ERRO ao criar usuário:\n');
    console.error(`   ${err.message}\n`);
    
    if (err.code === '42P01') {
      console.error('⚠️  As tabelas não existem.');
      console.error('   Execute as migrations do banco de dados primeiro.\n');
    }
    
    if (err.code === 'ECONNREFUSED') {
      console.error('⚠️  Não conseguiu conectar ao banco de dados.');
      console.error('   Verifique se:');
      console.error('   - O banco de dados está rodando');
      console.error('   - A URL de conexão está correta no arquivo .env\n');
    }
    
    process.exit(1);
    
  } finally {
    if (client) {
      await client.release();
    }
  }
};

createTestUser().catch(console.error);

