-- Migration: criar tabela de equipe

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(50),
  rg VARCHAR(50),
  email VARCHAR(255),
  chave_pix VARCHAR(255),
  funcao VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_cpf_tenant ON team_members(cpf, tenant_id);
