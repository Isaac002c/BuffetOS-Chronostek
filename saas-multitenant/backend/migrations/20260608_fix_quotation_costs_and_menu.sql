-- Safe migration for quotation totals, costs and optional buffet menu notes.
-- Idempotent: it only adds missing columns used by the quotations module.

BEGIN;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buffet_menu TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_costs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variable_costs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_margin NUMERIC(5,2) DEFAULT 40;

ALTER TABLE quotations
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS sheet_id UUID,
  ADD COLUMN IF NOT EXISTS sheet_cost NUMERIC(12,2) DEFAULT 0;

UPDATE quotations
SET
  buffet_menu = COALESCE(buffet_menu, ''),
  discount_percent = COALESCE(discount_percent, 0),
  default_margin = COALESCE(default_margin, 40);

UPDATE quotation_items
SET sheet_cost = COALESCE(sheet_cost, 0);

CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON quotations(lead_id);

COMMIT;
