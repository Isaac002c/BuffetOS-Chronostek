-- Migration: tabela de vínculo entre eventos e membros da equipe

CREATE TABLE IF NOT EXISTS event_team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role_note  TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_event_team_event   ON event_team_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_member  ON event_team_members(member_id);
CREATE INDEX IF NOT EXISTS idx_event_team_tenant  ON event_team_members(tenant_id);
