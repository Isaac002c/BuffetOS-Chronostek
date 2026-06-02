/**
 * auditLog.js
 * Helper para registrar ações de segurança e negócio na tabela audit_logs.
 *
 * A escrita é fire-and-forget (não bloqueia a resposta HTTP).
 * Erros de log NÃO interrompem a operação — apenas são reportados no console.
 *
 * Tabela esperada (criada automaticamente no startup via app.js):
 *   audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, metadata, ip, created_at)
 */

const pool = require('../config/db');

/**
 * Registra uma ação de auditoria.
 *
 * @param {object} req       - Express request (para extrair tenantId, userId, IP)
 * @param {string} action    - Ação realizada (ex: 'login', 'password_changed', 'quotation_approved')
 * @param {string} resourceType - Tipo do recurso afetado (ex: 'user', 'quotation', 'event')
 * @param {string|number|null} resourceId - ID do recurso afetado
 * @param {object} [metadata] - Dados extras (não incluir senhas ou dados sensíveis)
 */
async function logAudit(req, action, resourceType, resourceId, metadata = {}) {
  try {
    const tenantId    = req.tenantId || null;
    const userId      = req.userId   || null;
    const ip          = req.ip || req.headers['x-forwarded-for'] || null;

    await pool.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata, ip, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        tenantId,
        userId,
        action,
        resourceType || null,
        resourceId   ? String(resourceId) : null,
        JSON.stringify(metadata),
        ip,
      ]
    );
  } catch (err) {
    // Nunca deixar falha de log derrubar a operação principal
    console.error('[auditLog] Falha ao registrar auditoria:', err.message);
  }
}

module.exports = { logAudit };
