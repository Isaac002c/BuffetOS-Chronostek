-- Migration: adicionar campos de custo, disponibilidade, status e observações em team_members

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS custo_diaria    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS disponibilidade TEXT,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS observacoes     TEXT;

-- Garantir que registros antigos tenham status padrão
UPDATE team_members SET status = 'ativo' WHERE status IS NULL;
