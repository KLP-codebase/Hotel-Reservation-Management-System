DO $$ BEGIN
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(branch_id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms(branch_id);
EXCEPTION WHEN undefined_table THEN null; END $$;
