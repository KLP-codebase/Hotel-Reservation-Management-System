-- ── Migration 005: Triggers (GoF Observer at PostgreSQL level) ────────────────
-- Three triggers:
--   1. fn_set_updated_at    — auto-stamp updated_at on every relevant table
--   2. fn_audit_staff_changes — write audit_logs row on staff mutations
--   3. fn_sync_room_status  — keep room status aligned with booking state
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Trigger 1: auto updated_at ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_updated_at        ON staff;
DROP TRIGGER IF EXISTS trg_branches_updated_at     ON branches;
DROP TRIGGER IF EXISTS trg_user_accounts_updated_at ON user_accounts;
DROP TRIGGER IF EXISTS trg_rooms_updated_at        ON rooms;
DROP TRIGGER IF EXISTS trg_bookings_updated_at     ON bookings;
DROP TRIGGER IF EXISTS trg_bills_updated_at        ON bills;

CREATE TRIGGER trg_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_user_accounts_updated_at
    BEFORE UPDATE ON user_accounts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Trigger 2: audit staff mutations ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_staff_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
    VALUES (
        'staff',
        COALESCE(NEW.staff_id, OLD.staff_id),
        TG_OP,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_staff ON staff;
CREATE TRIGGER trg_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_audit_staff_changes();

-- ── Trigger 3: sync room status with booking state ───────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_room_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'CHECKED_IN' THEN
        UPDATE rooms SET status = 'OCCUPIED'  WHERE id = NEW.room_id;
    ELSIF NEW.status IN ('CHECKED_OUT', 'CANCELLED') THEN
        UPDATE rooms SET status = 'AVAILABLE' WHERE id = NEW.room_id;
    ELSIF NEW.status = 'CONFIRMED' THEN
        UPDATE rooms SET status = 'RESERVED'  WHERE id = NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_status ON bookings;
CREATE TRIGGER trg_sync_room_status
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW EXECUTE FUNCTION fn_sync_room_status();
