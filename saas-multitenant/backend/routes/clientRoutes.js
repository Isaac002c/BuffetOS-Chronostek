const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const clientModel = require('../models/clientModels');
const { checkPermission } = require('../middlewares/checkPermission');

// GET /api/clients - Listar todos os clientes
router.get('/', checkPermission('clients:read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const clients = await clientModel.getAllClients(tenantId);
    res.json({ success: true, data: clients });
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/clients/search - Pesquisar clientes
router.get('/search', checkPermission('clients:read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }
    
    const clients = await clientModel.searchClients(tenantId, q);
    res.json({ success: true, data: clients });
  } catch (err) {
    console.error('Erro ao pesquisar clientes:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/clients/stats - Estatísticas de clientes
router.get('/stats', checkPermission('clients:read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const total = await clientModel.countClients(tenantId);
    res.json({ success: true, data: { total } });
  } catch (err) {
    console.error('Erro ao buscar stats:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/clients/:id - Buscar cliente por ID
router.get('/:id', checkPermission('clients:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const client = await clientModel.getClientById(id, tenantId);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }
    
    res.json({ success: true, data: client });
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// POST /api/clients - Criar novo cliente
router.post('/', checkPermission('clients:create'), async (req, res) => {
  try {
    const { name, birth_date, cpf, cnh, first_cnh, phone, email, address, notes } = req.body;
    const tenantId = req.tenantId;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    
    // Verificar se CPF já existe
    if (cpf) {
      const existingClient = await clientModel.getClientByCPF(cpf, tenantId);
      if (existingClient) {
        return res.status(400).json({ success: false, error: 'CPF já cadastrado' });
      }
    }
    
    const client = await clientModel.createClient({
      tenant_id: tenantId,
      name,
      birth_date,
      cpf,
      cnh,
      first_cnh,
      phone,
      email,
      address,
      notes
    });
    
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    console.error('Erro ao criar cliente:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// PUT /api/clients/:id - Atualizar cliente
router.put('/:id', checkPermission('clients:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, birth_date, cpf, cnh, first_cnh, phone, email, address, notes } = req.body;
    const tenantId = req.tenantId;
    
    const existingClient = await clientModel.getClientById(id, tenantId);
    
    if (!existingClient) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }
    
    // Verificar se CPF já existe em outro cliente
    if (cpf && cpf !== existingClient.cpf) {
      const existingCPF = await clientModel.getClientByCPF(cpf, tenantId);
      if (existingCPF) {
        return res.status(400).json({ success: false, error: 'CPF já cadastrado para outro cliente' });
      }
    }
    
    const client = await clientModel.updateClient(id, {
      name,
      birth_date,
      cpf,
      cnh,
      first_cnh,
      phone,
      email,
      address,
      notes
    }, tenantId);
    
    res.json({ success: true, data: client });
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// DELETE /api/clients/:id - Deletar cliente
router.delete('/:id', checkPermission('clients:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const client = await clientModel.deleteClient(id, tenantId);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }
    
    res.json({ success: true, data: client, message: 'Cliente deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar cliente:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;

