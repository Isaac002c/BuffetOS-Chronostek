const pool = require('./config/db');

pool.query('SELECT id, email, name, role, is_active FROM users LIMIT 10', (err, res) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('\n📋 USUÁRIOS EXISTENTES:\n');
    if (res.rows.length === 0) {
      console.log('Nenhum usuário encontrado');
    } else {
      res.rows.forEach(u => {
        console.log(`Email: ${u.email} | Nome: ${u.name} | Role: ${u.role} | Ativo: ${u.is_active}`);
      });
    }
  }
  pool.end();
});
