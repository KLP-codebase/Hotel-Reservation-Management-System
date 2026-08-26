-- ── Migration 004: Create audit_logs table ────────────────────────────────────
-- Stores events emitted by AuditEventEmitter (Node.js Observer) AND
-- by fn_audit_staff_changes trigger (PostgreSQL Observer).
-- Both layers write here — defence in depth.

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID,           -- user_account_id of the person who made the change
    entity_type VARCHAR(50)  NOT NULL,
    entity_id   UUID         NOT NULL,
    action      VARCHAR(50)  NOT NULL,  -- 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
