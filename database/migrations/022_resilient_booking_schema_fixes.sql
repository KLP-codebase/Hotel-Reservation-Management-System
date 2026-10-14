-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 022: Resilient Booking Schema Fixes & Audit Mutation Parity
-- ══════════════════════════════════════════════════════════════════════════════
-- Addresses parity and constraint edge cases between local/Railway and
-- Azure PostgreSQL production container:
--
-- 1. change_log schema harmonization:
--    - Adds missing columns (operation, db_user, change_id, created_at, action, changed_at)
--    - Synchronizes operation <-> action and created_at <-> changed_at
--    - Replaces fn_log_table_changes() with an exception-shielded trigger function
--      so audit ledger errors never block operational transactions (guests, bookings, etc.)
--
-- 2. guests identity column guarantee:
--    - Ensures guests.id VARCHAR(36) exists, is backfilled from guest_id, and has unique constraint
--
-- 3. Drop legacy foreign key constraints on bookings & booking_rooms:
--    - Drops foreign key on bookings.booked_by_guest_id (supports both guests.id and guests.guest_id)
--    - Drops foreign key on booking_rooms.primary_guest_id
--    - Ensures booked_by_guest_id and primary_guest_id are VARCHAR(36)
--
-- 4. service_usage flexibility:
--    - Drops rigid INT FK constraint on service_usage.service_id so UUID and catalogue IDs are accepted
--    - Ensures service_usage.service_id is VARCHAR(100)
--
-- 5. payments schema harmonization:
--    - Ensures amount, amount_paid, payment_method, and reference_number exist and are kept in sync
--
-- 6. sp_generate_final_bill function:
--    - Ensures sp_generate_final_bill(UUID) is present with fallback statutory tax rates
--
-- 7. Reports schema parity:
--    - Ensures rooms has both number and room_number
--    - Ensures bookings has id (VARCHAR)
--    - Harmonizes report_snapshots branch_id and snapshot_id
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. change_log Schema Harmonization ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_log (
    change_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name  VARCHAR(64) NOT NULL,
    record_id   VARCHAR(64) NOT NULL,
    operation   VARCHAR(20) NOT NULL DEFAULT 'INSERT',
    old_data    JSONB,
    new_data    JSONB,
    db_user     VARCHAR(64) NOT NULL DEFAULT CURRENT_USER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE change_log ADD COLUMN IF NOT EXISTS operation   VARCHAR(20);
ALTER TABLE change_log ADD COLUMN IF NOT EXISTS action      VARCHAR(20);
ALTER TABLE change_log ADD COLUMN IF NOT EXISTS db_user     VARCHAR(64) DEFAULT CURRENT_USER;
ALTER TABLE change_log ADD COLUMN IF NOT EXISTS change_id   UUID DEFAULT uuid_generate_v4();
ALTER TABLE change_log ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE change_log ADD COLUMN IF NOT EXISTS changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill cross-compatible columns
UPDATE change_log SET operation = action WHERE operation IS NULL AND action IS NOT NULL;
UPDATE change_log SET action = operation WHERE action IS NULL AND operation IS NOT NULL;
UPDATE change_log SET created_at = changed_at WHERE created_at IS NULL AND changed_at IS NOT NULL;

-- Make fn_log_table_changes bulletproof with exception protection
CREATE OR REPLACE FUNCTION fn_log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_key    TEXT;
    v_rec_id TEXT;
    v_op     TEXT;
BEGIN
    v_key := CASE TG_TABLE_NAME
        WHEN 'bookings'      THEN 'booking_id'
        WHEN 'booking_rooms' THEN 'booking_room_id'
        WHEN 'guests'        THEN 'guest_id'
        WHEN 'invoices'      THEN 'invoice_id'
        WHEN 'service_usage' THEN 'usage_id'
        ELSE 'booking_room_id'
    END;

    v_op := TG_OP;

    IF TG_OP = 'DELETE' THEN
        v_rec_id := COALESCE(to_jsonb(OLD) ->> v_key, to_jsonb(OLD) ->> 'id', 'UNKNOWN');
        BEGIN
            INSERT INTO change_log (table_name, record_id, operation, action, old_data, new_data, db_user)
            VALUES (TG_TABLE_NAME, v_rec_id, v_op, v_op, to_jsonb(OLD), NULL, CURRENT_USER);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'change_log insert failed: %', SQLERRM;
        END;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_rec_id := COALESCE(to_jsonb(NEW) ->> v_key, to_jsonb(NEW) ->> 'id', 'UNKNOWN');
        BEGIN
            INSERT INTO change_log (table_name, record_id, operation, action, old_data, new_data, db_user)
            VALUES (TG_TABLE_NAME, v_rec_id, v_op, v_op, to_jsonb(OLD), to_jsonb(NEW), CURRENT_USER);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'change_log insert failed: %', SQLERRM;
        END;
        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        v_rec_id := COALESCE(to_jsonb(NEW) ->> v_key, to_jsonb(NEW) ->> 'id', 'UNKNOWN');
        BEGIN
            INSERT INTO change_log (table_name, record_id, operation, action, old_data, new_data, db_user)
            VALUES (TG_TABLE_NAME, v_rec_id, v_op, v_op, NULL, to_jsonb(NEW), CURRENT_USER);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'change_log insert failed: %', SQLERRM;
        END;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;


-- ── 2. guests Identity Guarantee ─────────────────────────────────────────────
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id VARCHAR(36);
UPDATE guests SET id = guest_id::text WHERE id IS NULL;
ALTER TABLE guests ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text;
DO $$ BEGIN
    ALTER TABLE guests ADD CONSTRAINT guests_id_key UNIQUE (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;


-- ── 3. Drop Foreign Keys on bookings & booking_rooms ─────────────────────────
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'bookings'::regclass AND attname = 'booked_by_guest_id')]
    LOOP
        EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'booking_rooms'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'booking_rooms'::regclass AND attname = 'primary_guest_id')]
    LOOP
        EXECUTE format('ALTER TABLE booking_rooms DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;
END $$;

-- Ensure column types are VARCHAR(36)
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booked_by_guest_id') <> 'character varying' THEN
        ALTER TABLE bookings ALTER COLUMN booked_by_guest_id TYPE VARCHAR(36) USING booked_by_guest_id::text;
    END IF;

    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'booking_rooms' AND column_name = 'primary_guest_id') <> 'character varying' THEN
        ALTER TABLE booking_rooms ALTER COLUMN primary_guest_id TYPE VARCHAR(36) USING primary_guest_id::text;
    END IF;
END $$;

-- Ensure legacy single-room columns and guest_id column exist on bookings
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS guest_id         VARCHAR(36),
    ADD COLUMN IF NOT EXISTS special_requests TEXT,
    ADD COLUMN IF NOT EXISTS adults           INT,
    ADD COLUMN IF NOT EXISTS children         INT,
    ADD COLUMN IF NOT EXISTS room_id          VARCHAR(36),
    ADD COLUMN IF NOT EXISTS check_in         TIMESTAMP,
    ADD COLUMN IF NOT EXISTS check_out        TIMESTAMP,
    ADD COLUMN IF NOT EXISTS id               VARCHAR(36);

UPDATE bookings SET id = booking_id::text WHERE id IS NULL;


-- ── 4. service_usage Harmonization ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_usage (
    usage_id         SERIAL PRIMARY KEY,
    booking_room_id  UUID,
    service_id       VARCHAR(100),
    quantity         INT DEFAULT 1,
    price_at_usage   NUMERIC(10, 2) NOT NULL,
    notes            TEXT,
    appointment_time VARCHAR(5),
    meal_time        VARCHAR(20),
    used_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'service_usage'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'service_usage'::regclass AND attname = 'service_id')]
    LOOP
        EXECUTE format('ALTER TABLE service_usage DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'service_usage' AND column_name = 'service_id') <> 'character varying' THEN
        ALTER TABLE service_usage ALTER COLUMN service_id TYPE VARCHAR(100) USING service_id::text;
    END IF;
END $$;


-- ── 5. payments Table Harmonization ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    payment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id       UUID,
    amount           NUMERIC(12,2),
    amount_paid      NUMERIC(12,2),
    payment_date     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method   VARCHAR(50) NOT NULL DEFAULT 'CARD',
    reference_number VARCHAR(100)
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount           NUMERIC(12, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paid      NUMERIC(12, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method   VARCHAR(50) DEFAULT 'CARD';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

UPDATE payments SET amount = amount_paid WHERE amount IS NULL AND amount_paid IS NOT NULL;
UPDATE payments SET amount_paid = amount WHERE amount_paid IS NULL AND amount IS NOT NULL;


-- ── 5b. invoices Table Harmonization & Constraint ────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id    UUID,
    room_charges       NUMERIC(12, 2) DEFAULT 0.00,
    service_charges    NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount    NUMERIC(12, 2) DEFAULT 0.00,
    service_charge_tax NUMERIC(12, 2) DEFAULT 0.00,
    tdl_amount         NUMERIC(12, 2) DEFAULT 0.00,
    ssc_amount         NUMERIC(12, 2) DEFAULT 0.00,
    vat_amount         NUMERIC(12, 2) DEFAULT 0.00,
    total_amount       NUMERIC(12, 2) DEFAULT 0.00,
    status             VARCHAR(50)    DEFAULT 'OPEN',
    generated_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS room_charges       NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_charges    NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_charge_tax NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tdl_amount         NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ssc_amount         NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount         NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount       NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status             VARCHAR(50)    DEFAULT 'OPEN';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS generated_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'total_room_charges') THEN
        UPDATE invoices SET room_charges = total_room_charges WHERE room_charges IS NULL OR room_charges = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'total_service_charges') THEN
        UPDATE invoices SET service_charges = total_service_charges WHERE service_charges IS NULL OR service_charges = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'net_amount') THEN
        UPDATE invoices SET total_amount = net_amount WHERE total_amount IS NULL OR total_amount = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
        UPDATE invoices SET generated_at = created_at WHERE generated_at IS NULL;
    END IF;
END $$;

DO $$ BEGIN
    ALTER TABLE invoices ADD CONSTRAINT uq_invoices_booking_room_id UNIQUE (booking_room_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;


-- ── 6. Ensure sp_generate_final_bill Procedure ───────────────────────────────
CREATE OR REPLACE FUNCTION sp_generate_final_bill(p_booking_room_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_nights           INT;
  v_rate             NUMERIC(10,2);
  v_room_charges     NUMERIC(12,2);
  v_service_charges  NUMERIC(12,2);
  v_base             NUMERIC(12,2);
  v_sc_pct           NUMERIC(5,4);
  v_tdl_pct          NUMERIC(5,4);
  v_sscl_pct         NUMERIC(5,4);
  v_vat_pct          NUMERIC(5,4);
  v_sc_amt           NUMERIC(12,2);
  v_tdl_amt          NUMERIC(12,2);
  v_sscl_amt         NUMERIC(12,2);
  v_vat_amt          NUMERIC(12,2);
  v_total            NUMERIC(12,2);
  v_invoice_id       UUID;
BEGIN
  -- 1. Calculate room charges (frozen rate_at_booking x nights)
  SELECT COALESCE(check_out_date - check_in_date, 1), COALESCE(rate_at_booking, 0)
    INTO v_nights, v_rate
  FROM booking_rooms
  WHERE booking_room_id = p_booking_room_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_room_charges := v_nights * v_rate;

  -- 2. Calculate service charges (frozen price_at_usage, already snapshotted per B10)
  SELECT COALESCE(SUM(quantity * price_at_usage), 0)
    INTO v_service_charges
  FROM service_usage
  WHERE booking_room_id = p_booking_room_id;

  v_base := v_room_charges + v_service_charges;

  -- 3. Pull currently-effective statutory tax rates (B13: versioned configuration)
  BEGIN
    SELECT tax_percentage INTO v_sc_pct FROM tax_configurations
     WHERE UPPER(tax_name) IN ('SERVICE CHARGE', 'SERVICE_CHARGE') AND is_active
       AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
     ORDER BY effective_from DESC LIMIT 1;

    SELECT tax_percentage INTO v_tdl_pct FROM tax_configurations
     WHERE UPPER(tax_name) IN ('TDL', 'TOURISM DEVELOPMENT LEVY') AND is_active
       AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
     ORDER BY effective_from DESC LIMIT 1;

    SELECT tax_percentage INTO v_sscl_pct FROM tax_configurations
     WHERE UPPER(tax_name) IN ('SSCL', 'SSC LEVY', 'SOCIAL SECURITY CONTRIBUTION LEVY') AND is_active
       AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
     ORDER BY effective_from DESC LIMIT 1;

    SELECT tax_percentage INTO v_vat_pct FROM tax_configurations
     WHERE UPPER(tax_name) IN ('VAT', 'VALUE ADDED TAX') AND is_active
       AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
     ORDER BY effective_from DESC LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_sc_pct   := NULL;
    v_tdl_pct  := NULL;
    v_sscl_pct := NULL;
    v_vat_pct  := NULL;
  END;

  -- Statutory fallback rates if not dynamically configured
  v_sc_pct   := COALESCE(v_sc_pct, 0.10);
  v_tdl_pct  := COALESCE(v_tdl_pct, 0.01);
  v_sscl_pct := COALESCE(v_sscl_pct, 0.025);
  v_vat_pct  := COALESCE(v_vat_pct, 0.18);

  -- Normalize tax percentages if stored as whole numbers (e.g., 10 vs 0.10)
  IF v_sc_pct > 1 THEN v_sc_pct := v_sc_pct / 100; END IF;
  IF v_tdl_pct > 1 THEN v_tdl_pct := v_tdl_pct / 100; END IF;
  IF v_sscl_pct > 1 THEN v_sscl_pct := v_sscl_pct / 100; END IF;
  IF v_vat_pct > 1 THEN v_vat_pct := v_vat_pct / 100; END IF;

  -- 4. Execute Template Method statutory tax cascade
  v_sc_amt   := ROUND(v_base * v_sc_pct, 2);
  v_tdl_amt  := ROUND(v_base * v_tdl_pct, 2);
  v_sscl_amt := ROUND(v_base * v_sscl_pct, 2);
  v_vat_amt  := ROUND((v_base + v_tdl_amt + v_sscl_amt) * v_vat_pct, 2);
  v_total    := v_base + v_sc_amt + v_tdl_amt + v_sscl_amt + v_vat_amt;

  -- 5. Upsert the 1:1 invoice record (B11)
  INSERT INTO invoices (
    booking_room_id, room_charges, service_charges,
    service_charge_tax, tdl_amount, ssc_amount, vat_amount,
    total_amount, status, generated_at
  ) VALUES (
    p_booking_room_id, v_room_charges, v_service_charges,
    v_sc_amt, v_tdl_amt, v_sscl_amt, v_vat_amt,
    v_total, 'OPEN', CURRENT_TIMESTAMP
  )
  ON CONFLICT (booking_room_id) DO UPDATE SET
    room_charges       = EXCLUDED.room_charges,
    service_charges    = EXCLUDED.service_charges,
    service_charge_tax = EXCLUDED.service_charge_tax,
    tdl_amount         = EXCLUDED.tdl_amount,
    ssc_amount         = EXCLUDED.ssc_amount,
    vat_amount         = EXCLUDED.vat_amount,
    total_amount       = EXCLUDED.total_amount,
    generated_at       = CURRENT_TIMESTAMP
  RETURNING invoice_id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;


-- ── 7. Rooms, Bookings & Report Snapshots Schema Parity ───────────────────────
-- Ensure rooms has both 'number' and 'room_number' and 'type'
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS number VARCHAR(20);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS type VARCHAR(50);
UPDATE rooms SET number = room_number WHERE number IS NULL AND room_number IS NOT NULL;
UPDATE rooms SET room_number = number WHERE room_number IS NULL AND number IS NOT NULL;
DO 26907 BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'type' AND data_type = 'USER-DEFINED'
    ) THEN
        UPDATE rooms r 
        SET type = rt.type_name::room_type 
        FROM room_types rt 
        WHERE r.room_type_id = rt.room_type_id AND r.type IS NULL;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'type'
    ) THEN
        UPDATE rooms r 
        SET type = rt.type_name 
        FROM room_types rt 
        WHERE r.room_type_id = rt.room_type_id AND r.type IS NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END 26907;
UPDATE rooms SET number = room_number WHERE number IS NULL AND room_number IS NOT NULL;
UPDATE rooms SET room_number = number WHERE room_number IS NULL AND number IS NOT NULL;

-- Ensure report_snapshots table and columns accept UUID / VARCHAR
CREATE TABLE IF NOT EXISTS report_snapshots (
    snapshot_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type          VARCHAR(100) NOT NULL,
    report_period_start  DATE NOT NULL,
    report_period_end    DATE NOT NULL,
    branch_id            VARCHAR(36),
    report_data          JSONB NOT NULL,
    generated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE
    v_branch_type text;
    v_snap_type text;
    c RECORD;
BEGIN
    SELECT data_type INTO v_branch_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'report_snapshots' AND column_name = 'branch_id';

    IF v_branch_type IS NOT NULL AND v_branch_type <> 'uuid' AND v_branch_type <> 'character varying' THEN
        FOR c IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'report_snapshots'::regclass
              AND contype = 'f'
              AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'report_snapshots'::regclass AND attname = 'branch_id')]
        LOOP
            EXECUTE format('ALTER TABLE report_snapshots DROP CONSTRAINT IF EXISTS %I', c.conname);
        END LOOP;

        ALTER TABLE report_snapshots ALTER COLUMN branch_id TYPE VARCHAR(36) USING branch_id::text;
    END IF;

    SELECT data_type INTO v_snap_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'report_snapshots' AND column_name = 'snapshot_id';

    IF v_snap_type IS NOT NULL AND v_snap_type <> 'uuid' AND v_snap_type <> 'character varying' THEN
        ALTER TABLE report_snapshots ALTER COLUMN snapshot_id TYPE VARCHAR(36) USING snapshot_id::text;
    END IF;
END $$;

COMMIT;
