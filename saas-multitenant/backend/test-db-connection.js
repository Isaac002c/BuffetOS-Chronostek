#!/usr/bin/env node

/**
 * Script para testar conexão com banco Neon
 * Execute com: node test-db-connection.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║      🔌 TESTANDO CONEXÃO COM BANCO DE DADOS NEON         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const testConnection = async () => {
  try {
    // Obter a URL do banco
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ ERRO: DATABASE_URL não definida no arquivo .env\n');
      process.exit(1);
    }
    
    console.log('📊 INFORMAÇÕES DA CONEXÃO:');
    console.log(`   URL: ${databaseUrl.substring(0, 80)}...`);
    console.log('');
    
    // Criar pool com config
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000, // 10 segundos
    });
    
    console.log('⏳ [1/5] Testando conexão ao banco...');
    const client = await pool.connect();
    console.log('✅ [1/5] Conectado ao banco!\n');
    
    // Teste 1: Version
    console.log('⏳ [2/5] Verificando versão do PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(',')[0];
    console.log(`✅ [2/5] ${version}\n`);
    
    // Teste 2: Listar tabelas
    console.log('⏳ [3/5] Verificando tabelas do banco...');
    const tablesResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  [3/5] Nenhuma tabela encontrada no banco\n');
    } else {
      console.log(`✅ [3/5] ${tablesResult.rows.length} tabelas encontradas:\n`);
      tablesResult.rows.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
      console.log('');
    }
    
    // Teste 3: Conectar e fazer query simples
    console.log('⏳ [4/5] Fazendo query de teste...');
    const testResult = await client.query('SELECT NOW() as current_time');
    console.log(`✅ [4/5] Query bem-sucedida: ${testResult.rows[0].current_time}\n`);
    
    // Teste 4: Verificar tabela de usuários
    console.log('⏳ [5/5] Verificando estrutura da tabela users...');
    const usersTableResult = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'users' 
       ORDER BY ordinal_position`
    );
    
    if (usersTableResult.rows.length === 0) {
      console.log('⚠️  [5/5] Tabela "users" não existe ou está vazia\n');
    } else {
      console.log(`✅ [5/5] Tabela "users" encontrada com ${usersTableResult.rows.length} colunas:\n`);
      usersTableResult.rows.forEach(row => {
        console.log(`   • ${row.column_name} (${row.data_type})`);
      });
      console.log('');
    }
    
    // Liberar cliente
    await client.release();
    
    // Fechar pool
    await pool.end();
    
    // Resultado final
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║            ✅ CONEXÃO COM BANCO BEM-SUCEDIDA!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('🟢 Status: PRONTO PARA CRIAR USUÁRIO\n');
    console.log('Próximo passo: Execute o comando para criar usuário\n');
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║             ❌ ERRO NA CONEXÃO COM O BANCO               ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    
    console.error('💥 ERRO:', err.message);
    console.error('');
    
    // Diagnosticar erro
    if (err.code === 'ENOTFOUND') {
      console.error('⚠️  Problema: Host não encontrado');
      console.error('   Verifique se a URL do banco está correta');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('⚠️  Problema: Conexão recusada');
      console.error('   Verifique se o servidor PostgreSQL está rodando');
    } else if (err.message.includes('password')) {
      console.error('⚠️  Problema: Senha inválida');
      console.error('   Verifique as credenciais no arquivo .env');
    } else if (err.message.includes('certificate')) {
      console.error('⚠️  Problema: Certificado SSL inválido');
      console.error('   Verifique a configuração SSL');
    }
    
    console.error('');
    console.error('📋 DETALHES TÉCNICOS:');
    console.error(`   Código: ${err.code}`);
    console.error(`   Mensagem: ${err.message}`);
    console.error('');
    
    process.exit(1);
  }
};

testConnection().catch(console.error);

