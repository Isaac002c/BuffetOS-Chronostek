const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const permissionModel = require('../models/permissionModels');
const { checkPermission, requireAdminOrManager, getAllRoles } = require('../middlewares/checkPermission');
const saasModel = require('../models/saasModels');
const pool = require('../config/db');
const { rateLimitByUser } = require('../middlewares/rateLimitByUser');
const { logAudit } = require('../utils/auditLog');

// Rate limit específico para troca de senha: 5 tentativas/hora/usuário
const passwordChangeLimiter = rateLimitByUser({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: 'Muitas trocas de senha. Aguarde 1 hora.',
});

// GET /api/users/management - Listar usuários do tenant
router.get('/', checkPermission('users:read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const users = await permissionModel.getUsersWithRoles(tenantId);
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/users/management/stats - Estatísticas de usuários
router.get('/stats', checkPermission('users:read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const [stats, total] = await Promise.all([
      permissionModel.getUsersStats(tenantId),
      permissionModel.countUsers(tenantId)
    ]);
    res.json({ success: true, data: { stats, total } });
  } catch (err) {
    console.error('Erro ao buscar stats:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/users/management/roles - Listar roles disponíveis (requer permissão)
router.get('/roles', checkPermission('users:read'), async (req, res) => {
  try {
    const roles = getAllRoles();
    const permissionsMap = {
      admin: 'Acesso total ao sistema',
      manager: 'Gerenciamento de clientes, contratos e documentos',
      operator: 'Operação básica: criar e editar',
      viewer: 'Apenas visualização'
    };
    
    const rolesWithDesc = roles.map(role => ({
      name: role,
      description: permissionsMap[role] || ''
    }));
    
    res.json({ success: true, data: rolesWithDesc });
  } catch (err) {
    console.error('Erro ao buscar roles:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/users/management/:id - Buscar usuário por ID
router.get('/:id', checkPermission('users:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const user = await permissionModel.getUserById(id, tenantId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// POST /api/users/management - Criar novo usuário
router.post('/', requireAdminOrManager, async (req, res) => {
  try {
    const { name, email, password, role = 'viewer' } = req.body;
    const tenantId = req.tenantId;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nome, email e senha são obrigatórios'
      });
    }

    // Apenas admin pode criar outro admin
    const ALLOWED_ROLES = ['admin', 'manager', 'operator', 'seller', 'viewer'];
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Role inválida' });
    }
    if (role === 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem criar outro administrador' });
    }

    // Validação de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Email inválido' });
    }

    // Complexidade mínima de senha
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 8 caracteres' });
    }
    
    // Verificar se email já existe
    const emailExists = await permissionModel.checkEmailExists(email, tenantId);
    if (emailExists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email já está em uso' 
      });
    }
    
    const user = await permissionModel.createUser({
      tenant_id: tenantId,
      name,
      email,
      password,
      role
    });
    
    // Log de atividade
    await saasModel.createActivityLog({
      tenant_id: tenantId,
      user_id: req.userId,
      action: 'create',
      entity_type: 'user',
      entity_id: user.id,
      description: `Usuário ${name} (${role}) criado`,
      metadata: { user_email: email }
    });
    
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// PUT /api/users/management/:id - Atualizar usuário
router.put('/:id', checkPermission('users:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;
    const tenantId = req.tenantId;
    
    // Usuário só pode ser atualizado por admin/manager ou pelo próprio usuário
    // String() garante comparação correta mesmo se userId vier como número no JWT
    const currentUserRole = req.userRole;
    if (currentUserRole !== 'admin' && currentUserRole !== 'manager' && String(req.userId) !== String(id)) {
      return res.status(403).json({
        success: false,
        error: 'Você só pode atualizar seu próprio perfil'
      });
    }
    
    // Verificar se o usuário pertence ao tenant
    const existingUser = await permissionModel.getUserById(id, tenantId);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    // Se não for admin, não pode mudar role de outros usuários
    if (currentUserRole !== 'admin' && String(req.userId) !== String(id) && role) {
      return res.status(403).json({ 
        success: false, 
        error: 'Você não pode alterar a função de outros usuários' 
      });
    }
    
    const user = await permissionModel.updateUser(id, {
      name,
      email,
      role,
      is_active
    }, tenantId);
    
    // Log de atividade
    await saasModel.createActivityLog({
      tenant_id: tenantId,
      user_id: req.userId,
      action: 'update',
      entity_type: 'user',
      entity_id: id,
      description: `Usuário ${name || existingUser.name} atualizado`,
      metadata: { changes: { name, email, role, is_active } }
    });
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// PATCH /api/users/management/:id/password - Alterar senha
router.patch('/:id/password', passwordChangeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const tenantId = req.tenantId;
    
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Senha é obrigatória' 
      });
    }
    
    // Usuário só pode alterar senha do próprio usuário ou admin
    if (req.userRole !== 'admin' && String(req.userId) !== String(id)) {
      return res.status(403).json({
        success: false,
        error: 'Você só pode alterar sua própria senha'
      });
    }

    // Complexidade mínima de senha
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve ter no mínimo 8 caracteres'
      });
    }
    
    await permissionModel.updateUserPassword(id, password, tenantId);

    // Invalida todos os tokens anteriores do usuário (segurança pós-troca de senha)
    await pool.query(
      'UPDATE users SET token_version = token_version + 1 WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    // Log de atividade
    await saasModel.createActivityLog({
      tenant_id: tenantId,
      user_id: req.userId,
      action: 'update_password',
      entity_type: 'user',
      entity_id: id,
      description: 'Senha atualizada'
    });

    // Audit log de segurança
    logAudit(req, 'password_changed', 'user', id, { changed_by: req.userId });

    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// DELETE /api/users/management/:id - Deletar usuário
router.delete('/:id', requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    // Não pode deletar a si mesmo
    if (String(req.userId) === String(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Você não pode excluir seu próprio usuário' 
      });
    }
    
    // Verificar se o usuário pertence ao tenant
    const existingUser = await permissionModel.getUserById(id, tenantId);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    await permissionModel.deleteUser(id, tenantId);
    
    // Log de atividade
    await saasModel.createActivityLog({
      tenant_id: tenantId,
      user_id: req.userId,
      action: 'delete',
      entity_type: 'user',
      entity_id: id,
      description: `Usuário ${existingUser.name} excluído`
    });
    
    res.json({ success: true, message: 'Usuário deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;

