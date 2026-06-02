/**
 * rateLimitByUser.js
 * Rate limiting composto por tenant_id + user_id + endpoint.
 * Usa um Map em memória (suficiente para single-process; trocar por Redis em multi-instance).
 */

const windows = new Map(); // key => { count, resetAt }

/**
 * Cria um middleware de rate limit por usuário/tenant.
 * @param {object} options
 * @param {number} options.windowMs     Janela de tempo em ms (padrão: 3600000 = 1h)
 * @param {number} options.max          Máx. de requisições por janela (padrão: 20)
 * @param {string} options.message      Mensagem de erro
 */
function rateLimitByUser({ windowMs = 60 * 60 * 1000, max = 20, message = 'Muitas requisições. Tente mais tarde.' } = {}) {
  return (req, res, next) => {
    const userId   = req.userId   || 'anon';
    const tenantId = req.tenantId || 'unknown';
    const endpoint = `${req.method}:${req.path}`;
    const key      = `${tenantId}::${userId}::${endpoint}`;

    const now  = Date.now();
    const slot = windows.get(key);

    if (!slot || now > slot.resetAt) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    slot.count += 1;

    if (slot.count > max) {
      const retryAfter = Math.ceil((slot.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ success: false, error: message });
    }

    next();
  };
}

// Limpeza periódica para evitar vazamento de memória (remove entradas expiradas a cada 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, slot] of windows.entries()) {
    if (now > slot.resetAt) windows.delete(key);
  }
}, 10 * 60 * 1000);

module.exports = { rateLimitByUser };
