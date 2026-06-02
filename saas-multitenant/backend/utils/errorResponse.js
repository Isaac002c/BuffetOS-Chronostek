/**
 * Retorna a mensagem de erro para o cliente.
 * - Em desenvolvimento: exibe err.message para facilitar debug.
 * - Em produção: retorna mensagem genérica para não vazar detalhes internos
 *   (nomes de tabelas, SQL, stack traces, connection strings, etc.).
 *
 * Uso nos routes:
 *   res.status(500).json({ success: false, error: safeError(err) });
 */
const isDev = process.env.NODE_ENV !== 'production';

const safeError = (err) =>
  isDev ? (err?.message || 'Erro interno') : 'Erro interno do servidor';

module.exports = { safeError };
