const pool = require('./config/db');
const bcryptjs = require('bcryptjs');

const resetUserPassword = async () => {
  let client;
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔄 RESETANDO PASSWORD DO USUÁRIO admin@teste.com        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    client = await pool.connect();
    
    // Hash da nova senha
    const newPassword = '123456';
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    
    console.log('⏳ Atualizando senha...');
    
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, name',
      [hashedPassword, 'admin@teste.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ SENHA ATUALIZADA COM SUCESSO!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📧 Email: admin@teste.com');
    console.log('🔐 Nova Senha: 123456');
    console.log('\n✅ Pode fazer login agora!\n');
    
    client.release();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    pool.end();
  }
};

resetUserPassword();
