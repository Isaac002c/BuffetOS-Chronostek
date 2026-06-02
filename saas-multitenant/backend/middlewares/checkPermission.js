// middlewares/checkPermission.js
// Middleware para verificar permissões do usuário
const { logAudit } = require('../utils/auditLog');

// Definição de permissões por role
const rolePermissions = {
  admin: [
    // users
    'users:create', 'users:read', 'users:update', 'users:delete',
    // clients
    'clients:create', 'clients:read', 'clients:update', 'clients:delete',
    // contracts
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete',
    // documents
    'documents:create', 'documents:read', 'documents:update', 'documents:delete',
    // reports
    'reports:read', 'reports:export',
    // settings
    'settings:read', 'settings:update',
    // billing / finance
    'billing:read', 'billing:update',
    'finance:read', 'finance:update', 'finance:delete',
    // quotations
    'quotations:read', 'quotations:create', 'quotations:update', 'quotations:delete',
    'quotations:approve', 'quotations:cancel', 'quotations:convert',
    // events
    'events:read', 'events:create', 'events:update', 'events:delete',
    // team
    'team:read', 'team:create', 'team:update', 'team:delete',
    // leads
    'leads:read', 'leads:create', 'leads:update', 'leads:delete',
    // templates
    'templates:read', 'templates:create', 'templates:update', 'templates:delete',
  ],
  manager: [
    'clients:create', 'clients:read', 'clients:update',
    'contracts:create', 'contracts:read', 'contracts:update',
    'documents:create', 'documents:read', 'documents:update',
    'reports:read', 'reports:export',
    'finance:read',
    'quotations:read', 'quotations:create', 'quotations:update',
    'quotations:approve', 'quotations:cancel', 'quotations:convert',
    'events:read', 'events:create', 'events:update',
    'team:read', 'team:create', 'team:update',
    'leads:read', 'leads:create', 'leads:update', 'leads:delete',
    'templates:read', 'templates:create', 'templates:update',
  ],
  operator: [
    'clients:create', 'clients:read', 'clients:update',
    'contracts:create', 'contracts:read', 'contracts:update',
    'documents:create', 'documents:read',
    'quotations:read', 'quotations:create', 'quotations:update',
    'quotations:cancel',
    'events:read', 'events:create', 'events:update',
    'team:read',
    'leads:read', 'leads:create', 'leads:update',
    'templates:read',
  ],
  seller: [
    'clients:create', 'clients:read', 'clients:update',
    'contracts:create', 'contracts:read', 'contracts:update',
    'documents:create', 'documents:read',
    'quotations:read', 'quotations:create', 'quotations:update',
    'quotations:approve', 'quotations:cancel', 'quotations:convert',
    'events:read',
    'leads:read', 'leads:create', 'leads:update',
    'templates:read',
  ],
  viewer: [
    'clients:read',
    'contracts:read',
    'documents:read',
    'reports:read',
    'finance:read',
    'quotations:read',
    'events:read',
    'team:read',
    'leads:read',
    'templates:read',
  ],
};

/**
 * Middleware para verificar se o usuário tem uma permissão específica
 * @param {string} permission - Permissão necessária (ex: 'contracts:create')
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      const userRole = req.userRole || 'viewer';
      
      // Admin tem acesso a tudo
      if (userRole === 'admin') {
        return next();
      }
      
      // Verificar se a role existe
      const permissions = rolePermissions[userRole] || [];
      
      // Verificar permissão específica
      if (!permissions.includes(permission)) {
        console.warn(`[Permission] Usuário role=${userRole} tentou acessar ${permission}`);
        // Audit log: acesso negado
        logAudit(req, 'permission_denied', null, null, {
          required: permission,
          role: userRole,
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          success: false,
          error: 'Você não tem permissão para realizar esta ação'
        });
      }
      
      next();
    } catch (error) {
      console.error('[Permission] Erro ao verificar permissão:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao verificar permissão' 
      });
    }
  };
};

/**
 * Middleware para verificar se o usuário é admin ou manager
 */
const requireAdminOrManager = (req, res, next) => {
  const userRole = req.userRole || 'viewer';
  
  if (userRole === 'admin' || userRole === 'manager') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Acesso restrito a administradores e gerentes' 
  });
};

/**
 * Middleware para verificar se o usuário é admin
 */
const requireAdmin = (req, res, next) => {
  const userRole = req.userRole || 'viewer';
  
  if (userRole === 'admin') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Acesso restrito a administradores' 
  });
};

/**
 * Retorna as permissões de uma role
 */
const getPermissionsByRole = (role) => {
  return rolePermissions[role] || [];
};

/**
 * Retorna todas as roles disponíveis
 */
const getAllRoles = () => {
  return Object.keys(rolePermissions);
};

module.exports = {
  checkPermission,
  requireAdminOrManager,
  requireAdmin,
  getPermissionsByRole,
  getAllRoles,
  rolePermissions
};

