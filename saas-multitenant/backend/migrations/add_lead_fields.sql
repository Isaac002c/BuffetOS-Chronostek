-- Migration: adicionar campos de tipo de evento, data e próxima ação em leads

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS event_type  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS event_date  DATE,
  ADD COLUMN IF NOT EXISTS next_action TEXT;
