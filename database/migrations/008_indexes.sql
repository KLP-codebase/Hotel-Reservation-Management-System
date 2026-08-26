-- ── Migration 008: Indexes for new tables ─────────────────────────────────────

-- staff
CREATE INDEX IF NOT EXISTS idx_staff_branch_id ON staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_role       ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_email      ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_is_active  ON staff(is_active);

-- user_accounts
CREATE INDEX IF NOT EXISTS idx_accounts_staff_id   ON user_accounts(staff_id);
CREATE INDEX IF NOT EXISTS idx_accounts_username   ON user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_type       ON user_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active  ON user_accounts(is_active);

-- GoF Singleton Pattern: Guarantee exactly ONE Administrator account instance
CREATE UNIQUE INDEX IF NOT EXISTS uq_singleton_admin_account
    ON user_accounts (account_type)
    WHERE account_type = 'ADMINISTRATOR';


-- branches
CREATE INDEX IF NOT EXISTS idx_branches_city      ON branches(city);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs(action);
