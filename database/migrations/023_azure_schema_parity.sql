-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 023: Azure production schema parity
-- ══════════════════════════════════════════════════════════════════════════════
-- The Azure database is the legacy Railway schema. Earlier migrations are recorded
-- as applied there but several of their changes never landed, so 41 backend queries
-- fail on it while compiling fine on init.sql / Neon. This brings Azure in line with
-- the schema the backend is written against:
--
--   rooms          + room_id (int, unique), room_type_id, room_number, kept in sync
--                    with the legacy id / number / type / price_per_night columns
--   service_usage  booking_room_id VARCHAR -> UUID referencing booking_rooms
--   invoices       booking_room_id VARCHAR -> UUID UNIQUE referencing booking_rooms,
--                    + room_charges, service_charges, discount_amount,
--                      service_charge_tax, ssc_amount, status, generated_at
--   payments       + payment_date; amount/amount_paid and payment_method/method synced
--   booking_rooms  + updated_at
--   guests         phone becomes optional (the booking form does not require it)
--   audit_logs     + actor_role; entity_id optional
--   triggers       updated_at, change_log and room-status triggers that Azure lacks
--   views          v_booking_details, v_invoice_estimate, v_admin_audit_activity
--
-- Legacy rows whose booking_room_id points at bookings.id are remapped to that
-- booking's first room line. Rows that cannot be mapped are copied to
-- _migration_023_* tables before removal, so no data is lost.
--
-- Every step checks the current schema first, so it is a no-op where the change
-- already exists (Neon, a fresh init.sql database). One transaction.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Views depend on the columns converted below; all three are recreated at the end.
DROP VIEW IF EXISTS v_booking_details;
DROP VIEW IF EXISTS v_invoice_estimate;
DROP VIEW IF EXISTS v_admin_audit_activity;


-- ── Helpers ─────────────────────────────────────────────────────────────────────
-- Drops every foreign key on one column, whatever it is named.
CREATE OR REPLACE FUNCTION pg_temp.drop_column_fks(p_table regclass, p_column text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = p_table AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                WHERE attrelid = p_table AND attname = p_column)]
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_table, c.conname);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.column_type(p_table text, p_column text)
RETURNS text LANGUAGE sql AS $$
    SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column
$$;

-- room_types.type_name ('Presidential Suite') -> rooms.type enum label ('PRESIDENTIAL')
CREATE OR REPLACE FUNCTION fn_room_type_label(p_type_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN upper(p_type_name) LIKE '%PRESIDENTIAL%' THEN 'PRESIDENTIAL'
        WHEN upper(p_type_name) LIKE '%SUITE%'        THEN 'SUITE'
        WHEN upper(p_type_name) LIKE '%DELUXE%'       THEN 'DELUXE'
        ELSE 'STANDARD'
    END
$$;


-- ── 1. guests / audit_logs / booking_rooms ──────────────────────────────────────
ALTER TABLE guests        ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE audit_logs    ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50);
ALTER TABLE audit_logs    ALTER COLUMN entity_id DROP NOT NULL;
ALTER TABLE booking_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


-- ── 2. rooms ────────────────────────────────────────────────────────────────────
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS number      VARCHAR(20);
UPDATE rooms SET room_number = number WHERE room_number IS NULL AND number IS NOT NULL;
UPDATE rooms SET number = room_number WHERE number IS NULL AND room_number IS NOT NULL;

-- room_id: integer surrogate key the backend addresses rooms by. The legacy
-- rooms.id stays the primary key because booking_rooms/bookings reference it.
DO $$
BEGIN
    IF pg_temp.column_type('rooms', 'room_id') IS NULL THEN
        ALTER TABLE rooms ADD COLUMN room_id INT;
        UPDATE rooms r SET room_id = n.rn
          FROM (SELECT id, row_number() OVER (ORDER BY branch_id, number, id) AS rn FROM rooms) n
         WHERE n.id = r.id;
        CREATE SEQUENCE IF NOT EXISTS rooms_room_id_seq OWNED BY rooms.room_id;
        PERFORM setval('rooms_room_id_seq', COALESCE((SELECT max(room_id) FROM rooms), 0) + 1, false);
        ALTER TABLE rooms ALTER COLUMN room_id SET DEFAULT nextval('rooms_room_id_seq');
        ALTER TABLE rooms ALTER COLUMN room_id SET NOT NULL;
        ALTER TABLE rooms ADD CONSTRAINT rooms_room_id_key UNIQUE (room_id);
    END IF;
END $$;

-- room_type_id, mapped from the legacy type enum
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type_id INT;
DO $$
BEGIN
    IF pg_temp.column_type('rooms', 'type') IS NOT NULL THEN
        UPDATE rooms r SET room_type_id = (
            SELECT rt.room_type_id FROM room_types rt
             WHERE fn_room_type_label(rt.type_name) = r.type::text
             ORDER BY rt.room_type_id LIMIT 1)
         WHERE r.room_type_id IS NULL AND r.type IS NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = 'rooms'::regclass AND contype = 'f'
                      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                           WHERE attrelid = 'rooms'::regclass AND attname = 'room_type_id')]) THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_id_fkey
            FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Keeps the legacy columns (still NOT NULL on Azure) consistent with the ones the
-- backend writes, in both directions.
CREATE OR REPLACE FUNCTION fn_rooms_sync_legacy_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    r       JSONB := to_jsonb(NEW);
    v_label TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.room_number := COALESCE(NEW.room_number, NEW.number);
        NEW.number      := COALESCE(NEW.number, NEW.room_number);
    ELSIF NEW.room_number IS DISTINCT FROM OLD.room_number THEN
        NEW.number := NEW.room_number;
    ELSIF NEW.number IS DISTINCT FROM OLD.number THEN
        NEW.room_number := NEW.number;
    END IF;

    IF r ? 'type' THEN
        IF NEW.room_type_id IS NOT NULL
           AND (TG_OP = 'INSERT' OR NEW.room_type_id IS DISTINCT FROM OLD.room_type_id) THEN
            SELECT fn_room_type_label(type_name) INTO v_label
              FROM room_types WHERE room_type_id = NEW.room_type_id;
            IF v_label IS NOT NULL THEN
                NEW := jsonb_populate_record(NEW, jsonb_build_object('type', v_label));
            END IF;
        ELSIF NEW.room_type_id IS NULL AND r->>'type' IS NOT NULL THEN
            SELECT room_type_id INTO NEW.room_type_id FROM room_types
             WHERE fn_room_type_label(type_name) = r->>'type'
             ORDER BY room_type_id LIMIT 1;
        END IF;
    END IF;

    IF NEW.price_per_night IS NULL THEN
        SELECT base_daily_rate INTO NEW.price_per_night
          FROM room_types WHERE room_type_id = NEW.room_type_id;
    END IF;
    NEW.floor := COALESCE(NEW.floor, 1);
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rooms_sync_legacy_columns ON rooms;
CREATE TRIGGER trg_rooms_sync_legacy_columns
    BEFORE INSERT OR UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION fn_rooms_sync_legacy_columns();


-- ── 3. service_usage.booking_room_id -> UUID ────────────────────────────────────
DO $$
DECLARE n INT;
BEGIN
    IF pg_temp.column_type('service_usage', 'booking_room_id') <> 'uuid' THEN
        PERFORM pg_temp.drop_column_fks('service_usage', 'booking_room_id');

        -- Legacy rows reference bookings.id; point them at that booking's first room line.
        UPDATE service_usage su SET booking_room_id = (
            SELECT br.booking_room_id::text
              FROM bookings b JOIN booking_rooms br ON br.booking_id = b.booking_id
             WHERE b.id = su.booking_room_id OR b.booking_id::text = su.booking_room_id
             ORDER BY br.created_at, br.booking_room_id LIMIT 1)
         WHERE NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_room_id::text = su.booking_room_id)
           AND EXISTS (SELECT 1 FROM bookings b JOIN booking_rooms br ON br.booking_id = b.booking_id
                        WHERE b.id = su.booking_room_id OR b.booking_id::text = su.booking_room_id);

        CREATE TABLE IF NOT EXISTS _migration_023_unmapped_service_usage AS
            SELECT * FROM service_usage WITH NO DATA;
        INSERT INTO _migration_023_unmapped_service_usage
            SELECT * FROM service_usage su
             WHERE NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_room_id::text = su.booking_room_id);
        GET DIAGNOSTICS n = ROW_COUNT;
        DELETE FROM service_usage su
         WHERE NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_room_id::text = su.booking_room_id);
        RAISE NOTICE '023: % unmappable service_usage row(s) moved to _migration_023_unmapped_service_usage', n;

        ALTER TABLE service_usage ALTER COLUMN booking_room_id TYPE UUID USING booking_room_id::uuid;
        ALTER TABLE service_usage ALTER COLUMN booking_room_id SET NOT NULL;
        ALTER TABLE service_usage ADD CONSTRAINT service_usage_booking_room_id_fkey
            FOREIGN KEY (booking_room_id) REFERENCES booking_rooms(booking_room_id) ON DELETE CASCADE;
    END IF;
END $$;


-- ── 4. invoices ─────────────────────────────────────────────────────────────────
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS room_charges       NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS service_charges    NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS service_charge_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tdl_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ssc_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status             VARCHAR(20)   NOT NULL DEFAULT 'OPEN',
    ADD COLUMN IF NOT EXISTS generated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE n INT;
BEGIN
    IF pg_temp.column_type('invoices', 'booking_room_id') <> 'uuid' THEN
        PERFORM pg_temp.drop_column_fks('invoices', 'booking_room_id');

        -- Carry the legacy amounts over unchanged; sp_generate_final_bill recalculates
        -- an invoice the next time it runs for that room.
        UPDATE invoices SET
            room_charges       = subtotal,
            service_charge_tax = sc_amount,
            ssc_amount         = sscl_amount,
            generated_at       = COALESCE(issued_at, generated_at);

        UPDATE invoices i SET booking_room_id = (
            SELECT br.booking_room_id::text
              FROM bookings b JOIN booking_rooms br ON br.booking_id = b.booking_id
             WHERE b.id = i.booking_room_id OR b.booking_id::text = i.booking_room_id
             ORDER BY br.created_at, br.booking_room_id LIMIT 1)
         WHERE NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_room_id::text = i.booking_room_id)
           AND EXISTS (SELECT 1 FROM bookings b JOIN booking_rooms br ON br.booking_id = b.booking_id
                        WHERE b.id = i.booking_room_id OR b.booking_id::text = i.booking_room_id);

        CREATE TABLE IF NOT EXISTS _migration_023_removed_invoices AS
            SELECT * FROM invoices WITH NO DATA;

        -- One invoice per room line (sp_generate_final_bill upserts on it). Keep the newest;
        -- payments on the older duplicates move to it before the duplicates are removed.
        CREATE TEMP TABLE inv_dupes ON COMMIT DROP AS
            SELECT invoice_id,
                   first_value(invoice_id) OVER w AS keep_id,
                   row_number() OVER w AS rn
              FROM invoices
             WHERE booking_room_id IS NOT NULL
            WINDOW w AS (PARTITION BY booking_room_id ORDER BY generated_at DESC, invoice_id DESC);
        UPDATE payments p SET invoice_id = d.keep_id
          FROM inv_dupes d WHERE d.rn > 1 AND p.invoice_id = d.invoice_id;
        INSERT INTO _migration_023_removed_invoices
            SELECT i.* FROM invoices i JOIN inv_dupes d ON d.invoice_id = i.invoice_id WHERE d.rn > 1;
        GET DIAGNOSTICS n = ROW_COUNT;
        DELETE FROM invoices i USING inv_dupes d WHERE d.invoice_id = i.invoice_id AND d.rn > 1;
        RAISE NOTICE '023: % duplicate invoice(s) merged into the newest invoice for the same room line', n;

        INSERT INTO _migration_023_removed_invoices
            SELECT * FROM invoices i
             WHERE NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_room_id::text = i.booking_room_id);
        GET DIAGNOSTICS n = ROW_COUNT;
        DELETE FROM invoices i
         WHERE NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_room_id::text = i.booking_room_id);
        RAISE NOTICE '023: % unmappable invoice(s) moved to _migration_023_removed_invoices', n;

        ALTER TABLE invoices ALTER COLUMN booking_room_id TYPE UUID USING booking_room_id::uuid;
        ALTER TABLE invoices ALTER COLUMN booking_room_id SET NOT NULL;
        ALTER TABLE invoices ADD CONSTRAINT invoices_booking_room_id_fkey
            FOREIGN KEY (booking_room_id) REFERENCES booking_rooms(booking_room_id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_index ix
                    WHERE ix.indrelid = 'invoices'::regclass AND ix.indisunique
                      AND ix.indkey::text = (SELECT attnum::text FROM pg_attribute
                                              WHERE attrelid = 'invoices'::regclass AND attname = 'booking_room_id')) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_booking_room_id_key UNIQUE (booking_room_id);
    END IF;
END $$;


-- ── 5. payments ─────────────────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount         NUMERIC(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'CARD';

DO $$
BEGIN
    IF pg_temp.column_type('payments', 'paid_at') IS NOT NULL THEN
        UPDATE payments SET payment_date = paid_at WHERE paid_at IS NOT NULL;
    END IF;
    IF pg_temp.column_type('payments', 'method') IS NOT NULL THEN
        UPDATE payments SET payment_method = COALESCE(method, payment_method, 'CARD');
    END IF;
    IF pg_temp.column_type('payments', 'amount_paid') IS NOT NULL THEN
        UPDATE payments SET amount = amount_paid WHERE amount IS NULL;
        ALTER TABLE payments ALTER COLUMN amount_paid DROP NOT NULL;
    END IF;
END $$;

-- The backend writes amount / payment_method / payment_date; keep the legacy twins filled.
CREATE OR REPLACE FUNCTION fn_payments_sync_legacy_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- (->> not ->: a NULL column comes back from to_jsonb as JSON null, which COALESCE keeps)
DECLARE r JSONB := to_jsonb(NEW);
BEGIN
    IF r ? 'amount_paid' THEN
        NEW := jsonb_populate_record(NEW, jsonb_build_object(
            'amount_paid', COALESCE(r->>'amount_paid', r->>'amount')));
        NEW.amount := COALESCE(NEW.amount, (r->>'amount_paid')::numeric);
    END IF;
    IF r ? 'method' THEN
        NEW := jsonb_populate_record(NEW, jsonb_build_object(
            'method', COALESCE(r->>'method', NEW.payment_method)));
    END IF;
    IF r ? 'paid_at' THEN
        NEW := jsonb_populate_record(NEW, jsonb_build_object(
            'paid_at', COALESCE(r->>'paid_at', r->>'payment_date')));
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_sync_legacy_columns ON payments;
CREATE TRIGGER trg_payments_sync_legacy_columns
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_payments_sync_legacy_columns();

-- Invoices already covered by their payments are settled.
UPDATE invoices i SET status = 'SETTLED'
 WHERE i.status = 'OPEN' AND i.total_amount > 0
   AND (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.invoice_id) >= i.total_amount;


-- ── 6. Triggers Azure is missing ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_booking_rooms_updated_at ON booking_rooms;
CREATE TRIGGER trg_booking_rooms_updated_at
    BEFORE UPDATE ON booking_rooms FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_guests_updated_at ON guests;
CREATE TRIGGER trg_guests_updated_at
    BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- change_log observers (fn_log_table_changes swallows its own errors, see 022)
DROP TRIGGER IF EXISTS trg_change_log_bookings ON bookings;
CREATE TRIGGER trg_change_log_bookings
    AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
DROP TRIGGER IF EXISTS trg_change_log_booking_rooms ON booking_rooms;
CREATE TRIGGER trg_change_log_booking_rooms
    AFTER INSERT OR UPDATE OR DELETE ON booking_rooms FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
DROP TRIGGER IF EXISTS trg_change_log_guests ON guests;
CREATE TRIGGER trg_change_log_guests
    AFTER INSERT OR UPDATE OR DELETE ON guests FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
DROP TRIGGER IF EXISTS trg_change_log_invoices ON invoices;
CREATE TRIGGER trg_change_log_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();
DROP TRIGGER IF EXISTS trg_change_log_service_usage ON service_usage;
CREATE TRIGGER trg_change_log_service_usage
    AFTER INSERT OR UPDATE OR DELETE ON service_usage FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();

-- Room status follows the stay (same body as 013b)
CREATE OR REPLACE FUNCTION fn_sync_room_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.room_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.status = 'CHECKED_IN' THEN
        UPDATE rooms SET status = 'OCCUPIED' WHERE id = NEW.room_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'CHECKED_IN' THEN
            UPDATE rooms SET status = 'OCCUPIED' WHERE id = NEW.room_id;
        ELSIF NEW.status = 'CHECKED_OUT' THEN
            UPDATE rooms SET status = 'MAINTENANCE' WHERE id = NEW.room_id;
        ELSIF NEW.status = 'CANCELLED' AND OLD.status = 'CHECKED_IN' THEN
            UPDATE rooms SET status = 'AVAILABLE' WHERE id = NEW.room_id;
        END IF;
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_room_status ON booking_rooms;
CREATE TRIGGER trg_sync_room_status
    AFTER INSERT OR UPDATE OF status, room_id ON booking_rooms
    FOR EACH ROW EXECUTE FUNCTION fn_sync_room_status();


-- ── 7. Views ────────────────────────────────────────────────────────────────────
CREATE VIEW v_booking_details AS
SELECT
    b.booking_id,
    b.branch_id,
    b.status              AS booking_status,
    b.notes               AS booking_notes,
    b.notes,
    b.created_at          AS booking_created_at,
    brk.branch_name,
    brk.city              AS branch_city,
    g.guest_id            AS booker_guest_id,
    g.guest_id,
    g.first_name          AS guest_first_name,
    g.last_name           AS guest_last_name,
    g.email               AS guest_email,
    g.phone               AS guest_phone,
    g.loyalty_tier        AS guest_loyalty_tier,
    br.booking_room_id,
    br.room_id,
    br.room_type_id,
    br.check_in_date,
    br.check_out_date,
    (br.check_out_date - br.check_in_date) AS nights,
    br.rate_at_booking,
    br.status             AS room_status,
    br.status             AS room_stay_status,
    r.room_number,
    r.floor,
    r.floor               AS floor_number,
    r.status              AS physical_room_status,
    rt.type_name          AS room_type_name,
    rt.base_daily_rate    AS room_type_base_price,
    rt.base_daily_rate,
    rt.capacity           AS room_capacity,
    mp.plan_id            AS meal_plan_id,
    mp.plan_name          AS meal_plan_name,
    mp.price_per_night    AS meal_plan_price,
    inv.invoice_id,
    inv.room_charges,
    inv.service_charges,
    inv.discount_amount,
    inv.service_charge_tax,
    inv.tdl_amount,
    inv.ssc_amount,
    inv.vat_amount,
    inv.total_amount,
    inv.status            AS invoice_status,
    inv.generated_at      AS invoice_generated_at
FROM bookings b
JOIN branches brk          ON brk.branch_id = b.branch_id
LEFT JOIN guests g         ON g.id::text = b.booked_by_guest_id::text
LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id
LEFT JOIN rooms r          ON r.id::text = br.room_id::text
LEFT JOIN room_types rt    ON rt.room_type_id = br.room_type_id
LEFT JOIN meal_plans mp    ON mp.plan_id = br.plan_id
LEFT JOIN invoices inv     ON inv.booking_room_id = br.booking_room_id;

CREATE VIEW v_invoice_estimate AS
SELECT
    br.booking_room_id,
    br.booking_id,
    br.status AS room_status,
    (br.check_out_date - br.check_in_date) AS nights,
    br.rate_at_booking,
    ((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking) AS estimated_room_charges,
    COALESCE(su.services_total, 0.00) AS estimated_service_charges,
    ((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking + COALESCE(su.services_total, 0.00)) AS estimated_subtotal,
    round(((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking + COALESCE(su.services_total, 0.00)) * 0.1000, 2) AS estimated_service_charge,
    round(((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking + COALESCE(su.services_total, 0.00)) * 1.1000 * 0.0100, 2) AS estimated_tdl,
    round(((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking + COALESCE(su.services_total, 0.00)) * 1.1100 * 0.0250, 2) AS estimated_sscl,
    round(((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking + COALESCE(su.services_total, 0.00)) * 1.1350 * 0.1800, 2) AS estimated_vat,
    round(((br.check_out_date - br.check_in_date)::numeric * br.rate_at_booking + COALESCE(su.services_total, 0.00)) * 1.3393, 2) AS final_total,
    COALESCE(inv.status, 'OPEN'::varchar) AS invoice_status,
    inv.invoice_id
FROM booking_rooms br
LEFT JOIN (SELECT booking_room_id, SUM(quantity::numeric * price_at_usage) AS services_total
             FROM service_usage GROUP BY booking_room_id) su ON su.booking_room_id = br.booking_room_id
LEFT JOIN invoices inv ON inv.booking_room_id = br.booking_room_id;

-- Application-level audit events (audit_logs), in the column shape AuditLogEntry expects.
CREATE VIEW v_admin_audit_activity AS
SELECT
    al.audit_id,
    al.entity_type,
    al.entity_id::text                         AS entity_id,
    al.action,
    al.old_value,
    al.new_value,
    al.ip_address,
    al.created_at::timestamptz                 AS created_at,
    al.actor_id,
    COALESCE(ua.username::text, 'SYSTEM')      AS actor_username,
    COALESCE(s.first_name::text, 'System')     AS actor_first_name,
    COALESCE(s.last_name::text, 'Logger')      AS actor_last_name,
    COALESCE(al.actor_role::text, ua.account_type::text, s.role::text, 'SYSTEM') AS actor_role
FROM audit_logs al
LEFT JOIN user_accounts ua ON ua.user_account_id = al.actor_id
LEFT JOIN staff s          ON s.staff_id = COALESCE(ua.staff_id, al.actor_id)
ORDER BY al.created_at DESC;

COMMIT;
