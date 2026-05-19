const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function seed() {
  try {
    const hash = await bcrypt.hash('123456', 10);
    
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
      ['Admin Teste', 'admin@teste.com', hash, 'admin', '430498c8-aba8-4b50-ab40-12e99d210a2e']
    );
    
    console.log('Usuário criado com sucesso!');
    console.log('Email: admin@teste.com');
    console.log('Senha: 123456');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

seed();