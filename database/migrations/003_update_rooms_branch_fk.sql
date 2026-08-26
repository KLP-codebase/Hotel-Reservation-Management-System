-- ── Migration 003: Add branch_id FK to rooms ──────────────────────────────────
ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(branch_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms(branch_id);
