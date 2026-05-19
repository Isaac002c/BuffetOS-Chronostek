#!/usr/bin/env node

/**
 * Script para verificar e exibir todas as tabelas e esquema do banco
 * Execute com: node check-db-schema.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║        🗂️  VERIFICAR ESQUEMA DO BANCO - NEON             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const checkSchema = async () => {
  let client;
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não definida');
    }
    
    console.log('⏳ Conectando ao banco...\n');
    
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    
    client = await pool.connect();
    
    // Listar todas as tabelas
    console.log('📋 TABELAS DO BANCO:\n');
    const tablesResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ Nenhuma tabela encontrada!\n');
      console.log('ℹ️  As migrations não foram executadas.');
      console.log('Execute: npm run db:migrate\n');
    } else {
      console.log(`✅ ${tablesResult.rows.length} tabelas encontradas:\n`);
      
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        
        // Obter colunas da tabela
        const columnsResult = await client.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position`,
          [tableName]
        );
        
        console.log(`📌 ${tableName} (${columnsResult.rows.length} colunas)`);
        columnsResult.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(obrigatório)';
          console.log(`   • ${col.column_name}: ${col.data_type} ${nullable}`);
        });
        console.log('');
      }
    }
    
    // Contar registros
    console.log('📊 CONTAGEM DE REGISTROS:\n');
    for (const table of tablesResult.rows) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      const count = countResult.rows[0].count;
      const icon = count > 0 ? '📦' : '⚪';
      console.log(`${icon} ${table.table_name}: ${count} registros`);
    }
    
    console.log('');
    
    await pool.end();
    console.log('✅ Verificação completa!\n');
    
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error('');
    process.exit(1);
  }
};

checkSchema().catch(console.error);

