#!/usr/bin/env node

/**
 * Script SIMPLES para criar usuário de teste - SEM ON CONFLICT
 * Execute com: node create-test-user-final.js
 */

const pool = require('./config/db');
const bcrypt = require('bcryptjs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🚀 CRIANDO USUÁRIO DE TESTE - BUFFETOS                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const createTestUser = async () => {
  let client;
  try {
    console.log('⏳ [1/4] Conectando ao banco de dados...');
    client = await pool.connect();
    console.log('✅ [1/4] Conectado ao banco!\n');
    
    // 1. Criar Tenant
    console.log('⏳ [2/4] Criando tenant de teste...');
    let tenant;
    try {
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, email, phone, is_active, created_at) 
         VALUES ($1, $2, $3, true, NOW()) 
         RETURNING id, name`,
        ['Buffet Teste', 'buffet@teste.com', '(11) 99999-9999']
      );
      tenant = tenantResult.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        // Constraint violation - tenant já existe
        const tenantResult = await client.query(
          `SELECT id, name FROM tenants WHERE email = $1`,
          ['buffet@teste.com']
        );
        if (tenantResult.rows.length > 0) {
          tenant = tenantResult.rows[0];
          console.log(`✅ [2/4] Tenant existente encontrado\n`);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
    
    if (!tenant) {
      throw new Error('Não foi possível criar ou encontrar o tenant');
    }
    
    console.log(`✅ [2/4] Tenant: ${tenant.name}\n`);
    
    // 2. Criar Usuário
    console.log('⏳ [3/4] Criando usuário admin...');
    const password = 'Teste123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let user;
    try {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, tenant_id, role, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, true, NOW()) 
         RETURNING id, name, email, role`,
        [
          'Admin Teste',
          'admin@teste.com',
          hashedPassword,
          tenant.id,
          'admin'
        ]
      );
      user = userResult.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        // Usuário já existe - atualizar senha
        const userResult = await client.query(
          `UPDATE users SET password_hash = $1 
           WHERE email = $2 AND tenant_id = $3
           RETURNING id, name, email, role`,
          [hashedPassword, 'admin@teste.com', tenant.id]
        );
        if (userResult.rows.length > 0) {
          user = userResult.rows[0];
          console.log(`✅ [3/4] Usuário atualizado (senha resetada)\n`);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
    
    if (!user) {
      throw new Error('Não foi possível criar o usuário');
    }
    
    console.log(`✅ [3/4] Usuário: ${user.name}\n`);
    
    // 3. Criar membros de equipe
    console.log('⏳ [4/4] Criando membros de equipe...');
    const teamMembers = [
      { nome: 'João da Silva', funcao: 'Garcom' },
      { nome: 'Maria da Cozinha', funcao: 'Cozinha' },
      { nome: 'Carlos Churrasco', funcao: 'Churrasqueiro' }
    ];
    
    let memberCount = 0;
    for (const member of teamMembers) {
      try {
        await client.query(
          `INSERT INTO team_members (tenant_id, nome, funcao, is_active, created_at)
           VALUES ($1, $2, $3, true, NOW())`,
          [tenant.id, member.nome, member.funcao]
        );
        memberCount++;
      } catch (err) {
        // Ignore duplicates
        if (err.code !== '23505') {
          throw err;
        }
      }
    }
    
    console.log(`✅ [4/4] ${memberCount} membros adicionados\n`);
    
    // Resultado final
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       ✨ USUÁRIO DE TESTE CRIADO COM SUCESSO!           ║');
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
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║              ❌ ERRO AO CRIAR USUÁRIO                   ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    
    console.error('💥 ERRO:', err.message);
    console.error('');
    
    // Diagnosticar erro
    if (err.code === 'ENOTFOUND') {
      console.error('🔴 PROBLEMA: Host não encontrado');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('🔴 PROBLEMA: Conexão recusada');
    } else if (err.message.includes('password')) {
      console.error('🔴 PROBLEMA: Senha inválida');
    } else if (err.code === '42P01') {
      console.error('🔴 PROBLEMA: Tabela não existe');
      console.error('   Você precisa rodar as migrations do banco');
    } else if (err.code === '23505') {
      console.error('🔴 PROBLEMA: Registro duplicado');
      console.error('   Usuário pode já existir');
    }
    
    console.error('');
    console.error('📋 INFORMAÇÕES TÉCNICAS:');
    console.error(`   Código: ${err.code || 'UNKNOWN'}`);
    console.error(`   Mensagem: ${err.message}`);
    if (err.detail) console.error(`   Detalhes: ${err.detail}`);
    console.error('');
    
    process.exit(1);
    
  } finally {
    if (client) {
      try {
        await client.release();
      } catch (e) {
        // Ignore
      }
    }
  }
};

createTestUser().catch(console.error);

