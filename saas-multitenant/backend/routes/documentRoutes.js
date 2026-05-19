const express = require('express');
const router = express.Router();
const documentModel = require('../models/documentModels');

// GET /api/documents - Listar todos os documentos
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { category, contract_id, client_id } = req.query;
    
    let documents;
    
    if (contract_id) {
      documents = await documentModel.getDocumentsByContract(contract_id, tenantId);
    } else if (client_id) {
      documents = await documentModel.getDocumentsByClient(client_id, tenantId);
    } else if (category) {
      documents = await documentModel.getDocumentsByCategory(tenantId, category);
    } else {
      documents = await documentModel.getAllDocuments(tenantId);
    }
    
    res.json({ success: true, data: documents });
  } catch (err) {
    console.error('Erro ao buscar documentos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documents/stats - Estatísticas de documentos
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    const total = await documentModel.countDocuments(tenantId);
    const byCategory = await documentModel.countDocumentsByCategory(tenantId);
    
    res.json({ 
      success: true, 
      data: { 
        total,
        byCategory 
      } 
    });
  } catch (err) {
    console.error('Erro ao buscar stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documents/contract/:contractId - Buscar documentos por contrato
router.get('/contract/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const tenantId = req.tenantId;
    
    const documents = await documentModel.getDocumentsByContract(contractId, tenantId);
    res.json({ success: true, data: documents });
  } catch (err) {
    console.error('Erro ao buscar documentos do contrato:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documents/client/:clientId - Buscar documentos por cliente
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const tenantId = req.tenantId;
    
    const documents = await documentModel.getDocumentsByClient(clientId, tenantId);
    res.json({ success: true, data: documents });
  } catch (err) {
    console.error('Erro ao buscar documentos do cliente:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documents/:id - Buscar documento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const document = await documentModel.getDocumentById(id, tenantId);
    
    if (!document) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado' });
    }
    
    res.json({ success: true, data: document });
  } catch (err) {
    console.error('Erro ao buscar documento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/documents - Criar novo documento
router.post('/', async (req, res) => {
  try {
    const { 
      contract_id, client_id, file_url, file_name, 
      file_type, file_size, category, description 
    } = req.body;
    const tenantId = req.tenantId;
    const userId = req.userId;
    
    if (!file_url) {
      return res.status(400).json({ success: false, error: 'URL do arquivo é obrigatória' });
    }
    
    if (!file_name) {
      return res.status(400).json({ success: false, error: 'Nome do arquivo é obrigatório' });
    }
    
    const document = await documentModel.createDocument({
      tenant_id: tenantId,
      contract_id,
      client_id,
      file_url,
      file_name,
      file_type,
      file_size,
      category: category || 'outros',
      description,
      uploaded_by: userId
    });
    
    res.status(201).json({ success: true, data: document });
  } catch (err) {
    console.error('Erro ao criar documento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/documents/:id - Atualizar documento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { file_url, file_name, file_type, file_size, category, description } = req.body;
    const tenantId = req.tenantId;
    
    const existingDocument = await documentModel.getDocumentById(id, tenantId);
    
    if (!existingDocument) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado' });
    }
    
    const document = await documentModel.updateDocument(id, {
      file_url,
      file_name,
      file_type,
      file_size,
      category,
      description
    }, tenantId);
    
    res.json({ success: true, data: document });
  } catch (err) {
    console.error('Erro ao atualizar documento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/documents/:id - Deletar documento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const document = await documentModel.deleteDocument(id, tenantId);
    
    if (!document) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado' });
    }
    
    res.json({ success: true, data: document, message: 'Documento deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar documento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

