-- Migration: Criar tabelas de event_templates e template_items para o módulo de simulação de orçamentos
-- Safe: usa IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de templates de eventos
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_templates_tenant_id ON event_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_event_type ON event_templates(event_type);

-- Tabela de itens do template
CREATE TABLE IF NOT EXISTS template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'unidade',
  quantity_per_person DECIMAL(10,4) NOT NULL DEFAULT 1,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_tenant_id ON template_items(tenant_id);

-- Habilitar Row Level Security
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança por tenant
DROP POLICY IF EXISTS "Tenant can only see own event_templates" ON event_templates;
CREATE POLICY "Tenant can only see own event_templates" ON event_templates
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "Tenant can only see own template_items" ON template_items;
CREATE POLICY "Tenant can only see own template_items" ON template_items
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));
