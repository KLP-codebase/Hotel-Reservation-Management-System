-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 010: change_log, Booking Triggers, Facade Views
-- ══════════════════════════════════════════════════════════════════════════════
-- Implements three GoF patterns at the PostgreSQL layer:
--
--   1. Observer Pattern (Two-Tier)
--        Tier 1 (DB):  fn_log_table_changes → change_log
--                      Captures every INSERT/UPDATE/DELETE as an immutable
--                      JSONB snapshot — even for mutations outside Express.
--        Tier 2 (App): Node.js auditEmitter → audit_logs
--                      Captures rich HTTP context (actor, IP, route, JWT role).
--      These are architecturally distinct and must never be conflated.
--
--   2. Template Method Pattern
--        sp_generate_final_bill (defined in database/procedures/) runs the
--        unalterable 4-tier Sri Lankan tax cascade:
--            Base → SC → TDL → SSCL → VAT → Upsert Invoice
--        Invoked by fn_auto_bill_on_checkout when status transitions to
--        CHECKED_OUT — never at booking creation.
--
--   3. Facade Pattern
--        v_booking_details      — 7-table JOIN behind one clean projection
--        v_admin_audit_activity — audit_logs enriched with actor names
--        v_invoice_estimate     — live folio preview (read-only, pre-checkout)
-- ══════════════════════════════════════════════════════════════════════════════


-- ── PART A: change_log table (ARCHITECTURE.md §6 & §9 B16) ───────────────────
-- Stores database-level mutation snapshots generated exclusively by triggers.
-- Distinct from audit_logs which stores application-level events (Node.js).

CREATE TABLE IF NOT EXISTS change_log (
    change_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  VARCHAR(64)  NOT NULL,
    record_id   VARCHAR(64)  NOT NULL,
    operation   VARCHAR(10)  NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    db_user     VARCHAR(64)  NOT NULL DEFAULT CURRENT_USER,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE change_log IS
    'Immutable database-level mutation ledger. Populated exclusively by PostgreSQL triggers (Observer Tier 1). Never written by application code.';

CREATE INDEX IF NOT EXISTS idx_change_log_table_record
    ON change_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_change_log_created_at
    ON change_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_change_log_operation
    ON change_log (operation);


-- ── PART B: Observer Tier 1 — fn_log_table_changes() ─────────────────────────
-- Generic trigger function: attaches to any table and writes a change_log row.

CREATE OR REPLACE FUNCTION fn_log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_record_id VARCHAR(64);
    v_old_data  JSONB;
    v_new_data  JSONB;
BEGIN
    CASE TG_TABLE_NAME
        WHEN 'bookings'      THEN v_record_id := COALESCE(NEW.booking_id, OLD.booking_id)::VARCHAR;
        WHEN 'booking_rooms' THEN v_record_id := COALESCE(NEW.booking_room_id, OLD.booking_room_id)::VARCHAR;
        WHEN 'guests'        THEN v_record_id := COALESCE(NEW.guest_id, OLD.guest_id)::VARCHAR;
        WHEN 'invoices'      THEN v_record_id := COALESCE(NEW.invoice_id, OLD.invoice_id)::VARCHAR;
        WHEN 'service_usage' THEN v_record_id := COALESCE(NEW.usage_id, OLD.usage_id)::VARCHAR;
        ELSE v_record_id := 'unknown';
    END CASE;

    v_old_data := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new_data := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

    INSERT INTO change_log (table_name, record_id, operation, old_data, new_data)
    VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old_data, v_new_data);

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION fn_log_table_changes IS
    'GoF Observer (Tier 1): Generic trigger function writing an immutable change_log row for every INSERT, UPDATE, or DELETE on monitored transactional tables.';


-- ── Attach change_log triggers ────────────────────────────────────────────────
DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_change_log_bookings ON bookings;
    CREATE TRIGGER trg_change_log_bookings
        AFTER INSERT OR UPDATE OR DELETE ON bookings
        FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "bookings" not found — trg_change_log_bookings skipped.';
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_change_log_booking_rooms ON booking_rooms;
    CREATE TRIGGER trg_change_log_booking_rooms
        AFTER INSERT OR UPDATE OR DELETE ON booking_rooms
        FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "booking_rooms" not found — trg_change_log_booking_rooms skipped.';
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_change_log_guests ON guests;
    CREATE TRIGGER trg_change_log_guests
        AFTER INSERT OR UPDATE OR DELETE ON guests
        FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "guests" not found — trg_change_log_guests skipped.';
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_change_log_invoices ON invoices;
    CREATE TRIGGER trg_change_log_invoices
        AFTER INSERT OR UPDATE OR DELETE ON invoices
        FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "invoices" not found — trg_change_log_invoices skipped.';
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_change_log_service_usage ON service_usage;
    CREATE TRIGGER trg_change_log_service_usage
        AFTER INSERT OR UPDATE OR DELETE ON service_usage
        FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "service_usage" not found — trg_change_log_service_usage skipped.';
END $$;


-- ── PART C: fn_sync_room_status() ─────────────────────────────────────────────
-- GoF Observer (Tier 1): Synchronises rooms.status on booking_rooms transitions.

CREATE OR REPLACE FUNCTION fn_sync_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    CASE NEW.status
        WHEN 'CHECKED_IN' THEN
            UPDATE rooms SET status = 'OCCUPIED'   WHERE room_id = NEW.room_id;
        WHEN 'CHECKED_OUT' THEN
            UPDATE rooms SET status = 'DIRTY'      WHERE room_id = NEW.room_id;
        WHEN 'CANCELLED' THEN
            UPDATE rooms SET status = 'AVAILABLE'  WHERE room_id = NEW.room_id;
        ELSE
            NULL;
    END CASE;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_sync_room_status IS
    'GoF Observer (Tier 1): Synchronises rooms.status when booking_room status transitions (CHECKED_IN→OCCUPIED, CHECKED_OUT→DIRTY, CANCELLED→AVAILABLE).';

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_sync_room_status ON booking_rooms;
    CREATE TRIGGER trg_sync_room_status
        AFTER UPDATE OF status ON booking_rooms
        FOR EACH ROW EXECUTE FUNCTION fn_sync_room_status();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "booking_rooms" not found — trg_sync_room_status skipped.';
END $$;


-- ── PART D: fn_auto_bill_on_checkout() ───────────────────────────────────────
-- GoF Template Method invocation: fires sp_generate_final_bill on CHECKED_OUT.
-- Safety net only — primary bill generation is via POST /api/v1/invoices/:id/generate.

CREATE OR REPLACE FUNCTION fn_auto_bill_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id UUID;
BEGIN
    IF NEW.status = 'CHECKED_OUT' AND OLD.status IS DISTINCT FROM 'CHECKED_OUT' THEN
        BEGIN
            SELECT sp_generate_final_bill(NEW.booking_room_id) INTO v_invoice_id;
            RAISE NOTICE 'Invoice % generated for booking_room %', v_invoice_id, NEW.booking_room_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fn_auto_bill_on_checkout: sp_generate_final_bill failed for %: %',
                NEW.booking_room_id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_auto_bill_on_checkout IS
    'GoF Template Method invocation: fires sp_generate_final_bill when booking_room status transitions to CHECKED_OUT.';

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_auto_bill_on_checkout ON booking_rooms;
    CREATE TRIGGER trg_auto_bill_on_checkout
        AFTER UPDATE OF status ON booking_rooms
        FOR EACH ROW
        WHEN (NEW.status = 'CHECKED_OUT')
        EXECUTE FUNCTION fn_auto_bill_on_checkout();
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table "booking_rooms" not found — trg_auto_bill_on_checkout skipped.';
END $$;

-- Restore updated_at stamping for bookings and booking_rooms (removed in 005)
DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_booking_rooms_updated_at ON booking_rooms;
    CREATE TRIGGER trg_booking_rooms_updated_at
        BEFORE UPDATE ON booking_rooms
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
    CREATE TRIGGER trg_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ── PART E: Facade Views (GoF Facade Pattern) ─────────────────────────────────

-- View 1: v_booking_details — 7-table JOIN Facade
DROP VIEW IF EXISTS v_booking_details CASCADE;

CREATE OR REPLACE VIEW v_booking_details AS
SELECT
    b.booking_id,
    b.branch_id,
    b.status          AS booking_status,
    b.notes,
    b.created_at      AS booking_created_at,
    br.branch_name,
    br.city           AS branch_city,
    g.guest_id,
    g.first_name      AS guest_first_name,
    g.last_name        AS guest_last_name,
    g.email           AS guest_email,
    g.phone           AS guest_phone,
    broom.booking_room_id,
    broom.room_id,
    broom.room_type_id,
    broom.check_in_date,
    broom.check_out_date,
    broom.rate_at_booking,
    broom.status      AS room_status,
    (broom.check_out_date - broom.check_in_date) AS nights,
    r.room_number,
    r.floor_number,
    r.status          AS physical_room_status,
    rt.type_name      AS room_type_name,
    rt.base_price     AS room_type_base_price,
    inv.invoice_id,
    inv.room_charges,
    inv.service_charges,
    inv.service_charge_tax,
    inv.tdl_amount,
    inv.ssc_amount,
    inv.vat_amount,
    inv.total_amount,
    inv.status        AS invoice_status,
    inv.generated_at  AS invoice_generated_at
FROM bookings b
JOIN  branches         br    ON br.branch_id       = b.branch_id
JOIN  guests           g     ON g.guest_id         = b.booked_by_guest_id
LEFT JOIN booking_rooms broom ON broom.booking_id  = b.booking_id
LEFT JOIN rooms         r     ON r.room_id         = broom.room_id
LEFT JOIN room_types    rt    ON rt.room_type_id   = broom.room_type_id
LEFT JOIN invoices      inv   ON inv.booking_room_id = broom.booking_room_id;

COMMENT ON VIEW v_booking_details IS
    'GoF Facade: Unified projection over 7 normalized tables. BookingRepository and the dashboard query this view — raw JOIN logic is never duplicated.';


-- View 2: v_admin_audit_activity — Application-level event feed
CREATE OR REPLACE VIEW v_admin_audit_activity AS
SELECT
    al.audit_id,
    al.entity_type,
    al.entity_id,
    al.action,
    al.old_value,
    al.new_value,
    al.ip_address,
    al.created_at,
    al.actor_id,
    ua.username       AS actor_username,
    s.first_name      AS actor_first_name,
    s.last_name        AS actor_last_name,
    s.role            AS actor_role
FROM audit_logs al
LEFT JOIN user_accounts ua ON ua.user_account_id = al.actor_id
LEFT JOIN staff         s  ON s.staff_id         = ua.staff_id
ORDER BY al.created_at DESC;

COMMENT ON VIEW v_admin_audit_activity IS
    'GoF Facade: Enriched projection of audit_logs with actor name and role. Powers the Application Activity Stream tab in the admin dashboard.';


-- View 3: v_invoice_estimate — Live folio preview (pre-checkout, read-only)
CREATE OR REPLACE VIEW v_invoice_estimate AS
SELECT
    broom.booking_room_id,
    broom.booking_id,
    broom.check_in_date,
    broom.check_out_date,
    broom.rate_at_booking,
    (broom.check_out_date - broom.check_in_date)                          AS nights,
    (broom.check_out_date - broom.check_in_date) * broom.rate_at_booking  AS estimated_room_charges,
    COALESCE(su_agg.total_service, 0)                                     AS estimated_service_charges,
    ((broom.check_out_date - broom.check_in_date) * broom.rate_at_booking
        + COALESCE(su_agg.total_service, 0))                              AS estimated_subtotal,
    inv.invoice_id,
    inv.total_amount  AS final_total,
    inv.status        AS invoice_status
FROM booking_rooms broom
LEFT JOIN (
    SELECT booking_room_id,
           SUM(quantity * price_at_usage) AS total_service
    FROM service_usage
    GROUP BY booking_room_id
) su_agg ON su_agg.booking_room_id = broom.booking_room_id
LEFT JOIN invoices inv ON inv.booking_room_id = broom.booking_room_id;

COMMENT ON VIEW v_invoice_estimate IS
    'Read-only live folio estimate: room charges + service_usage before checkout. Does not invoke sp_generate_final_bill.';
