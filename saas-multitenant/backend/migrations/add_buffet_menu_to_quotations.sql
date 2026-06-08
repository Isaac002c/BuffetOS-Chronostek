-- Adiciona campo opcional para cardápio/itens ofertados no buffet
-- Aparece na proposta PDF apenas quando preenchido
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS buffet_menu TEXT DEFAULT '';
