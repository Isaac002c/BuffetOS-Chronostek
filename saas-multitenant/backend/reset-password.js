/**
 * reset-password.js
 * ─────────────────
 * Ferramenta de DESENVOLVIMENTO para resetar senha de um usuário por email.
 *
 * ⚠️  NUNCA executar em produção com dados reais de clientes.
 * ⚠️  Não passar senhas reais como argumento — ficam visíveis no histórico do shell.
 *
 * Uso:
 *   node reset-password.js <email> <nova_senha>
 *
 * Exemplo:
 *   node reset-password.js admin@meusite.com MinhaNovaSenh@123
 */

require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./config/db');
const bcryptjs = require('bcryptjs');

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('Uso: node reset-password.js <email> <nova_senha>');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('A senha deve ter no mínimo 8 caracteres.');
  process.exit(1);
}

const resetUserPassword = async () => {
  let client;
  try {
    client = await pool.connect();

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    const result = await client.query(
      'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE email = $2 RETURNING id, email, name',
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.log(`Usuário não encontrado: ${email}`);
      return;
    }

    const user = result.rows[0];
    console.log(`Senha atualizada para: ${user.name} (${user.email})`);
    console.log('Todas as sessões ativas deste usuário foram invalidadas.');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    if (client) client.release();
    pool.end();
  }
};

resetUserPassword();
