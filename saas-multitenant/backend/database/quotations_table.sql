-- Quotations/Orçamentos Table (multi-tenant)
-- Execute este SQL no seu PostgreSQL/Supabase

-- Requisitos
-- - Existe a tabela tenants(id)
-- - Existe leads(id, tenant_id)

CREATE TYPE IF NOT EXISTS quotation_status AS ENUM ('draft', 'sent', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  guest_count INTEGER,
  event_date DATE,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  status quotation_status DEFAULT 'draft',
  notes TEXT,
  validity_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_event_date ON quotations(event_date);
CREATE INDEX IF NOT EXISTS idx_quotations_event_type ON quotations(event_type);

-- Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2),
  subtotal DECIMAL(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_tenant_id ON quotation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- Events
CREATE TYPE IF NOT EXISTS event_status AS ENUM ('confirmed', 'cancelled', 'completed');

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  guest_count INTEGER,
  location VARCHAR(500),
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  status event_status DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_quotation_id ON events(quotation_id);

-- RLS (se suportado/ativado no projeto)
-- Se você usa RLS em leads, replique aqui.
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Política por tenant (padrão similar ao leads_table.sql)
-- Obs: current_setting('app.tenant_id', true) depende de você setar app.tenant_id no Postgres.
DROP POLICY IF EXISTS "Tenant can only see own quotations" ON quotations;
CREATE POLICY "Tenant can only see own quotations" ON quotations
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "Tenant can only see own quotation_items" ON quotation_items;
CREATE POLICY "Tenant can only see own quotation_items" ON quotation_items
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "Tenant can only see own events" ON events;
CREATE POLICY "Tenant can only see own events" ON events
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));
