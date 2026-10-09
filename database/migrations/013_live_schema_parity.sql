-- ════════════════════════════════════════════════════════════════════════════
-- 013 — Live-schema parity (in place, no DROP SCHEMA)
-- ════════════════════════════════════════════════════════════════════════════
-- The backend is written against the live schema, where guest/room references
-- are VARCHAR ids (guests.id, rooms.id) and bookings still carries the legacy
-- single-room columns. The older init.sql had INT/UUID keys. This migration
-- brings such a database in line; init.sql already declares the same end state.
--
--   guests.id                    new VARCHAR(36) UNIQUE (backfilled from guest_id)
--   bookings.booked_by_guest_id  UUID FK -> VARCHAR(36) holding guests.id, FK dropped
--   bookings                     + guest_id, special_requests, adults, children,
--                                  room_id, check_in, check_out
--   booking_rooms.room_id        INT -> VARCHAR(36) referencing rooms(id)
--   booking_rooms.room_type_id   NOT NULL dropped
--   fn_check_room_availability / fn_sync_room_status / v_booking_details rebuilt
--
-- Idempotent, one transaction. Existing room/guest links are preserved.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Objects that block the type changes; all are recreated below.
DROP VIEW IF EXISTS v_booking_details;
DROP TRIGGER IF EXISTS trg_sync_room_status ON booking_rooms;
ALTER TABLE booking_rooms DROP CONSTRAINT IF EXISTS no_double_booking;
DROP FUNCTION IF EXISTS fn_check_room_availability(INT, DATE, DATE, UUID);

-- ── guests.id ───────────────────────────────────────────────────────────────
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id VARCHAR(36);
UPDATE guests SET id = guest_id::text WHERE id IS NULL;
ALTER TABLE guests ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text;
DO $$ BEGIN
    ALTER TABLE guests ADD CONSTRAINT guests_id_key UNIQUE (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

-- ── bookings ────────────────────────────────────────────────────────────────
DO $$
DECLARE c TEXT;
BEGIN
    IF (SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'bookings'
           AND column_name = 'booked_by_guest_id') = 'uuid' THEN
        FOR c IN
            SELECT conname FROM pg_constraint
             WHERE conrelid = 'bookings'::regclass AND contype = 'f'
               AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                    WHERE attrelid = 'bookings'::regclass
                                      AND attname = 'booked_by_guest_id')]
        LOOP
            EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', c);
        END LOOP;
        ALTER TABLE bookings ALTER COLUMN booked_by_guest_id TYPE VARCHAR(36)
            USING booked_by_guest_id::text;
        -- the column held guests.guest_id; the live convention is guests.id
        UPDATE bookings b SET booked_by_guest_id = g.id
          FROM guests g WHERE g.guest_id::text = b.booked_by_guest_id;
    END IF;
END $$;

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS guest_id         VARCHAR(36),
    ADD COLUMN IF NOT EXISTS special_requests TEXT,
    ADD COLUMN IF NOT EXISTS adults           INT,
    ADD COLUMN IF NOT EXISTS children         INT,
    ADD COLUMN IF NOT EXISTS room_id          VARCHAR(36),
    ADD COLUMN IF NOT EXISTS check_in         TIMESTAMP,
    ADD COLUMN IF NOT EXISTS check_out        TIMESTAMP;
DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT bookings_room_id_fkey
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── booking_rooms.room_id : INT -> VARCHAR(36) referencing rooms(id) ───────
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'booking_rooms'
           AND column_name = 'room_id') = 'integer' THEN
        ALTER TABLE booking_rooms DROP CONSTRAINT IF EXISTS booking_rooms_room_id_fkey;
        ALTER TABLE booking_rooms ADD COLUMN room_id_new VARCHAR(36);
        UPDATE booking_rooms br SET room_id_new = r.id
          FROM rooms r WHERE r.room_id = br.room_id;
        ALTER TABLE booking_rooms DROP COLUMN room_id;   -- also drops idx_brooms_room
        ALTER TABLE booking_rooms RENAME COLUMN room_id_new TO room_id;
        ALTER TABLE booking_rooms ADD CONSTRAINT booking_rooms_room_id_fkey
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;
    END IF;
END $$;
ALTER TABLE booking_rooms ALTER COLUMN room_type_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brooms_room ON booking_rooms(room_id);

-- DB-level double-booking backstop, now on the varchar room id
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE booking_rooms
    ADD CONSTRAINT no_double_booking
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
    )
    WHERE (status <> 'CANCELLED');

-- ── functions ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_room_availability(
    p_room_id      VARCHAR,
    p_check_in     DATE,
    p_check_out    DATE,
    p_exclude_booking_room_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'check_out_date must be after check_in_date';
    END IF;

    SELECT COUNT(*) INTO v_conflict_count
    FROM booking_rooms
    WHERE room_id        = p_room_id
      AND status        <> 'CANCELLED'
      AND booking_room_id <> COALESCE(p_exclude_booking_room_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND check_in_date  < p_check_out
      AND check_out_date > p_check_in;

    RETURN v_conflict_count = 0;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
END;
$$;

CREATE TRIGGER trg_sync_room_status
    AFTER INSERT OR UPDATE OF status, room_id ON booking_rooms
    FOR EACH ROW EXECUTE FUNCTION fn_sync_room_status();

-- ── view (same text as init.sql) ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_booking_details AS
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
JOIN branches brk ON brk.branch_id = b.branch_id
LEFT JOIN guests g ON g.id = b.booked_by_guest_id
LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id
LEFT JOIN rooms r ON r.id = br.room_id
LEFT JOIN room_types rt ON rt.room_type_id = br.room_type_id
LEFT JOIN meal_plans mp ON mp.plan_id = br.plan_id
LEFT JOIN invoices inv ON inv.booking_room_id = br.booking_room_id;

COMMIT;
