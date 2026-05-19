#!/usr/bin/env node

/**
 * Script completo de diagnóstico e criação de usuário
 * Execute com: node full-setup.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║    🚀 CONFIGURAÇÃO COMPLETA - BUFFETOS + NEON             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const runSetup = async () => {
  try {
    console.log('📋 ETAPAS:\n');
    console.log('  1. Testar conexão com Neon');
    console.log('  2. Verificar esquema do banco');
    console.log('  3. Criar usuário de teste\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Etapa 1
    console.log('⏳ ETAPA 1/3: Testando conexão com Neon...\n');
    try {
      await execPromise('node test-db-connection.js', {
        cwd: __dirname,
        timeout: 30000,
      });
    } catch (err) {
      console.error('❌ Falha na conexão com Neon');
      console.error('Erro:', err.message);
      process.exit(1);
    }
    
    // Etapa 2
    console.log('\n⏳ ETAPA 2/3: Verificando esquema do banco...\n');
    try {
      await execPromise('node check-db-schema.js', {
        cwd: __dirname,
        timeout: 30000,
      });
    } catch (err) {
      console.error('⚠️  Aviso ao verificar esquema');
      console.error('Continuando mesmo assim...\n');
    }
    
    // Etapa 3
    console.log('⏳ ETAPA 3/3: Criando usuário de teste...\n');
    try {
      await execPromise('node create-test-user-improved.js', {
        cwd: __dirname,
        timeout: 30000,
      });
    } catch (err) {
      console.error('❌ Falha ao criar usuário');
      console.error('Erro:', err.message);
      process.exit(1);
    }
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          ✅ SETUP COMPLETO - TUDO FUNCIONANDO!           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Erro durante setup:', err.message);
    process.exit(1);
  }
};

runSetup().catch(console.error);

