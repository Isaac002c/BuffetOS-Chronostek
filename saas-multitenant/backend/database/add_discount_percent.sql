-- Migration: adiciona coluna discount_percent na tabela quotations
-- Execute este SQL no PostgreSQL/Supabase antes de ativar o desconto no model

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0;
