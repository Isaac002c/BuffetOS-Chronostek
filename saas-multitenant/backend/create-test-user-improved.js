#!/usr/bin/env node

/**
 * Script melhorado para criar usuário de teste
 * Com verificação de banco de dados antes
 */

const pool = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🚀 CRIANDO USUÁRIO DE TESTE - BUFFETOS (COM DIAGNÓSTICO) ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const createTestUser = async () => {
  let client;
  try {
    // 0. Verificar DATABASE_URL
    console.log('⏳ [0/4] Verificando configurações...');
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não definida no arquivo .env');
    }
    console.log('✅ [0/4] DATABASE_URL configurada\n');
    
    // 1. Conectar ao banco
    console.log('⏳ [1/4] Conectando ao banco de dados...');
    client = await pool.connect();
    console.log('✅ [1/4] Conectado ao banco com sucesso!\n');
    
    // 2. Criar Tenant
    console.log('⏳ [2/4] Criando tenant de teste...');
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, email, phone, is_active) 
       VALUES ($1, $2, $3, true) 
       ON CONFLICT (email) DO UPDATE SET is_active = true
       RETURNING id, name`,
      ['Buffet Teste', 'buffet@teste.com', '(11) 99999-9999']
    );
    
    const tenant = tenantResult.rows[0];
    console.log(`✅ [2/4] Tenant criado/atualizado: ${tenant.name}\n`);
    
    // 3. Criar Usuário
    console.log('⏳ [3/4] Criando usuário admin...');
    const password = 'Teste123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, tenant_id, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, true) 
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, is_active = true
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
    console.log(`✅ [3/4] Usuário criado/atualizado: ${user.name}\n`);
    
    // 4. Criar membros de equipe
    console.log('⏳ [4/4] Criando membros de equipe...');
    const teamMembers = [
      { nome: 'João da Silva', funcao: 'Garcom' },
      { nome: 'Maria da Cozinha', funcao: 'Cozinha' },
      { nome: 'Carlos Churrasco', funcao: 'Churrasqueiro' }
    ];
    
    for (const member of teamMembers) {
      await client.query(
        `INSERT INTO team_members (tenant_id, nome, funcao, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT DO NOTHING`,
        [tenant.id, member.nome, member.funcao]
      );
    }
    console.log(`✅ [4/4] ${teamMembers.length} membros de equipe criados\n`);
    
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
    
    // Diagnosticar erro específico
    if (err.code === 'ENOTFOUND') {
      console.error('🔴 PROBLEMA: Host do banco não encontrado');
      console.error('   • Verifique se a URL do banco está correta');
      console.error('   • Verifique a conexão com a internet');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('🔴 PROBLEMA: Conexão recusada');
      console.error('   • Verifique se o servidor PostgreSQL está rodando');
      console.error('   • Verifique o host e porta');
    } else if (err.message.includes('password')) {
      console.error('🔴 PROBLEMA: Senha inválida');
      console.error('   • Verifique as credenciais no arquivo .env');
    } else if (err.code === '42P01') {
      console.error('🔴 PROBLEMA: Tabela não existe');
      console.error('   • Execute as migrations do banco primeiro');
      console.error('   • Execute: npm run db:migrate');
    } else if (err.code === '23505') {
      console.error('🔴 PROBLEMA: Registro duplicado');
      console.error('   • O usuário já existe no banco');
      console.error('   • Pode usar as mesmas credenciais para login');
    } else if (err.message.includes('certificate')) {
      console.error('🔴 PROBLEMA: Certificado SSL');
      console.error('   • Problema com SSL do banco de dados');
    }
    
    console.error('');
    console.error('📋 INFORMAÇÕES TÉCNICAS:');
    console.error(`   Código: ${err.code || 'UNKNOWN'}`);
    console.error(`   Mensagem: ${err.message}`);
    if (err.detail) console.error(`   Detalhes: ${err.detail}`);
    console.error('');
    
    console.error('💡 PRÓXIMOS PASSOS:');
    console.error('   1. Verifique o arquivo .env');
    console.error('   2. Teste a conexão: node test-db-connection.js');
    console.error('   3. Verifique as migrations: npm run db:migrate');
    console.error('');
    
    process.exit(1);
    
  } finally {
    if (client) {
      try {
        await client.release();
      } catch (e) {
        console.error('Erro ao liberar cliente:', e.message);
      }
    }
  }
};

createTestUser().catch(console.error);

