-- ══════════════════════════════════════════════════════════════════════════════
-- Sky Nest Hotel — Database Initialization Script
-- Comprehensive schema + migrations (001 → 010) + procedures + views + seeds
-- Runs automatically on first `docker compose up`
-- ══════════════════════════════════════════════════════════════════════════════

\echo '>>> [1/10] Enabling PostgreSQL Extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [2/10] Creating Domain ENUM Types...'
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'GUEST',
        'RECEPTIONIST',
        'SERVICE_STAFF',
        'MANAGER',
        'ADMINISTRATOR',
        'DBA'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM (
        'STANDARD',
        'DELUXE',
        'SUITE',
        'PRESIDENTIAL'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM (
        'AVAILABLE',
        'OCCUPIED',
        'MAINTENANCE',
        'RESERVED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE loyalty_tier AS ENUM (
        'BRONZE',
        'SILVER',
        'GOLD',
        'PLATINUM'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'PENDING',
        'CONFIRMED',
        'CHECKED_IN',
        'CHECKED_OUT',
        'CANCELLED',
        'NO_SHOW'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'PENDING',
        'PARTIAL',
        'PAID',
        'REFUNDED',
        'WAIVED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_source AS ENUM (
        'DIRECT',
        'ONLINE',
        'AGENT',
        'WALK_IN',
        'PHONE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [3/10] Creating Core Tables (18 Relations)...'
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
    branch_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_name VARCHAR(100) UNIQUE NOT NULL,
    city        VARCHAR(100) NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Guests
CREATE TABLE IF NOT EXISTS guests (
    guest_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id              VARCHAR(36) UNIQUE DEFAULT uuid_generate_v4()::text,  -- legacy id; bookings.booked_by_guest_id holds this
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50),
    nationality     VARCHAR(100),
    passport_number VARCHAR(100) UNIQUE,
    date_of_birth   DATE,
    loyalty_tier    loyalty_tier DEFAULT 'BRONZE',
    loyalty_points  INT DEFAULT 0,
    total_stays     INT DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Staff
CREATE TABLE IF NOT EXISTS staff (
    staff_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id  UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    phone      VARCHAR(50),
    role       account_type NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Accounts
CREATE TABLE IF NOT EXISTS user_accounts (
    user_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id        UUID UNIQUE REFERENCES staff(staff_id) ON DELETE CASCADE,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    account_type    account_type NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Room Types
CREATE TABLE IF NOT EXISTS room_types (
    room_type_id    SERIAL PRIMARY KEY,
    type_name       VARCHAR(100) UNIQUE NOT NULL,
    base_daily_rate NUMERIC(10,2) NOT NULL,
    capacity        INT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Meal Plans
CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id         SERIAL PRIMARY KEY,
    plan_name       VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 7. Rooms (Physical Inventory)
CREATE TABLE IF NOT EXISTS rooms (
    room_id         SERIAL PRIMARY KEY,
    id              VARCHAR(36) UNIQUE DEFAULT uuid_generate_v4()::text,
    branch_id       UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    room_type_id    INT REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    room_number     VARCHAR(20) NOT NULL,
    number          VARCHAR(20),
    type            room_type,
    floor           INT DEFAULT 1,
    price_per_night DECIMAL(10,2) DEFAULT 120.00,
    max_guests      INT DEFAULT 2,
    amenities       TEXT[] DEFAULT ARRAY['WiFi', 'AC', 'TV'],
    description     TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, room_number)
);

-- 8. Service Catalogue
CREATE TABLE IF NOT EXISTS service_catalogue (
    service_id   SERIAL PRIMARY KEY,
    branch_id    UUID REFERENCES branches(branch_id) ON DELETE RESTRICT,
    service_name VARCHAR(200) NOT NULL,
    category     VARCHAR(100),
    base_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_service UNIQUE (branch_id, service_name)
);

-- 9. Tax Configurations (Sri Lankan 4-Tier Cascade) /(P04-N)
CREATE TABLE IF NOT EXISTS tax_configurations (
    tax_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(), --Genarate the Tax ID
    tax_name       VARCHAR(100) NOT NULL,
    tax_percentage NUMERIC(7,4) NOT NULL,
    CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_to   DATE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tax_name_date UNIQUE (tax_name, effective_from),
    CONSTRAINT chk_effective_dates
        CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- 10. Bookings (Header)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id                  VARCHAR(36) UNIQUE DEFAULT uuid_generate_v4()::text,
    branch_id           UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    -- Live-schema parity: guest refs are VARCHAR holding guests.id (no FK; seed data may hold non-UUID ids)
    booked_by_guest_id  VARCHAR(36),
    guest_id            VARCHAR(36),
    booked_by_staff_id  UUID REFERENCES staff(staff_id) ON DELETE SET NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes               TEXT,
    special_requests    TEXT,
    adults              INT,
    children            INT,
    -- Legacy single-room columns, still read by availability/overlap checks
    room_id             VARCHAR(36) REFERENCES rooms(id) ON DELETE SET NULL,
    check_in            TIMESTAMP,
    check_out           TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (booked_by_guest_id IS NOT NULL OR booked_by_staff_id IS NOT NULL)
);

-- 11. Booking Rooms (Line items)
CREATE TABLE IF NOT EXISTS booking_rooms (
    booking_room_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id       UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    primary_guest_id VARCHAR(36) NOT NULL,  -- guests.id (varchar), no FK — live-schema convention
    room_type_id     INT REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    room_id          VARCHAR(36) REFERENCES rooms(id) ON DELETE RESTRICT,  -- rooms.id (varchar), as on the live schema
    plan_id          INT NOT NULL REFERENCES meal_plans(plan_id) ON DELETE RESTRICT,
    check_in_date    DATE NOT NULL,
    check_out_date   DATE NOT NULL,
    rate_at_booking  NUMERIC(10,2) NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (check_out_date > check_in_date)
);

-- 12. Accompanying Guests
CREATE TABLE IF NOT EXISTS accompanying_guests (
    verification_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id      UUID NOT NULL REFERENCES booking_rooms(booking_room_id) ON DELETE CASCADE,
    first_name           VARCHAR(100) NOT NULL,
    last_name            VARCHAR(100) NOT NULL,
    id_passport_no       VARCHAR(100) NOT NULL,
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_staff_id UUID REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- 13. Service Usage (P04-N)
CREATE TABLE IF NOT EXISTS service_usage (
    usage_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id  UUID NOT NULL REFERENCES booking_rooms(booking_room_id) ON DELETE CASCADE,
    service_id       INT NOT NULL REFERENCES service_catalogue(service_id) ON DELETE RESTRICT,
    quantity         INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price_at_usage   NUMERIC(10,2) NOT NULL,
    CHECK (price_at_usage >= 0),
    used_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes            TEXT,                -- migration 016
    appointment_time VARCHAR(5),          -- spa slot HH:MM; date is used_at::date
    meal_time        VARCHAR(20)          -- BREAKFAST / LUNCH / DINNER / ALL_DAY
);

-- 14. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id     UUID NOT NULL UNIQUE REFERENCES booking_rooms(booking_room_id) ON DELETE RESTRICT,
    room_charges        NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (room_charges >= 0),
    service_charges     NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (service_charges >= 0),
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (discount_amount >= 0),
    service_charge_tax  NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (service_charge_tax >= 0),
    tdl_amount          NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (tdl_amount >= 0),
    ssc_amount          NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (ssc_amount >= 0),
    vat_amount          NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (vat_amount >= 0),
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0, CHECK (total_amount >= 0),
    status              VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    generated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id       UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE RESTRICT,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method   VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100)
);

-- 16. Report Snapshots
CREATE TABLE IF NOT EXISTS report_snapshots (
    snapshot_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type          VARCHAR(50) NOT NULL,
    report_period_start  DATE NOT NULL,
    report_period_end    DATE NOT NULL,
    branch_id            UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    report_data          JSONB NOT NULL,
    generated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Audit Logs (App-level Observer: Node.js auditEmitter)
-- 18. Login Challenges (2FA Sign-In Authorization)
CREATE TABLE IF NOT EXISTS login_challenges (
    challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_account_id UUID NOT NULL REFERENCES user_accounts(user_account_id) ON DELETE CASCADE,
    auth_token VARCHAR(128) NOT NULL UNIQUE,
    otp_code VARCHAR(10) NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_token ON login_challenges(auth_token);
CREATE INDEX IF NOT EXISTS idx_login_challenges_status ON login_challenges(challenge_id, status);

-- 19. Trusted Guest Devices (30-Day Device Trust for 2FA Bypass)
CREATE TABLE IF NOT EXISTS trusted_guest_devices (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_account_id UUID NOT NULL REFERENCES user_accounts(user_account_id) ON DELETE CASCADE,
    device_token_hash VARCHAR(64) NOT NULL UNIQUE,
    device_name VARCHAR(255),
    ip_address VARCHAR(50),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_lookup ON trusted_guest_devices(device_token_hash, user_account_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_guest_devices(user_account_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID,
    action      VARCHAR(50) NOT NULL,
    actor_id    UUID REFERENCES user_accounts(user_account_id) ON DELETE SET NULL,
    actor_role  VARCHAR(50),
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Change Log (DB-level Observer: Trigger-driven immutable ledger)
CREATE TABLE IF NOT EXISTS change_log (
    change_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  VARCHAR(64) NOT NULL,
    record_id   VARCHAR(64) NOT NULL,
    operation   VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    db_user     VARCHAR(64) NOT NULL DEFAULT CURRENT_USER,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [4/10] Creating Stored Functions & Procedures...'
-- ══════════════════════════════════════════════════════════════════════════════

-- sp_generate_final_bill (GoF Template Method Pattern: 4-tier Sri Lankan Tax Cascade)
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
  SELECT (check_out_date - check_in_date), rate_at_booking
    INTO v_nights, v_rate
  FROM booking_rooms
  WHERE booking_room_id = p_booking_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_room % not found', p_booking_room_id;
  END IF;

  v_room_charges := v_nights * v_rate;

  SELECT COALESCE(SUM(quantity * price_at_usage), 0)
    INTO v_service_charges
  FROM service_usage
  WHERE booking_room_id = p_booking_room_id;

  v_base := v_room_charges + v_service_charges;

  SELECT tax_percentage INTO v_sc_pct   FROM tax_configurations WHERE tax_name = 'Service Charge' AND is_active = true LIMIT 1;
  SELECT tax_percentage INTO v_tdl_pct  FROM tax_configurations WHERE tax_name = 'TDL'            AND is_active = true LIMIT 1;
  SELECT tax_percentage INTO v_sscl_pct FROM tax_configurations WHERE tax_name = 'SSCL'           AND is_active = true LIMIT 1;
  SELECT tax_percentage INTO v_vat_pct  FROM tax_configurations WHERE tax_name = 'VAT'            AND is_active = true LIMIT 1;

  v_sc_pct   := COALESCE(v_sc_pct,   0.1000);
  v_tdl_pct  := COALESCE(v_tdl_pct,  0.0100);
  v_sscl_pct := COALESCE(v_sscl_pct, 0.0250);
  v_vat_pct  := COALESCE(v_vat_pct,  0.1800);

  v_sc_amt   := ROUND(v_base * v_sc_pct, 2);
  v_tdl_amt  := ROUND((v_base + v_sc_amt) * v_tdl_pct, 2);
  v_sscl_amt := ROUND((v_base + v_sc_amt + v_tdl_amt) * v_sscl_pct, 2);
  v_vat_amt  := ROUND((v_base + v_sc_amt + v_tdl_amt + v_sscl_amt) * v_vat_pct, 2);

  v_total    := v_base + v_sc_amt + v_tdl_amt + v_sscl_amt + v_vat_amt;

  INSERT INTO invoices (
    booking_room_id,
    room_charges,
    service_charges,
    discount_amount,
    service_charge_tax,
    tdl_amount,
    ssc_amount,
    vat_amount,
    total_amount,
    status,
    generated_at
  ) VALUES (
    p_booking_room_id,
    v_room_charges,
    v_service_charges,
    0,
    v_sc_amt,
    v_tdl_amt,
    v_sscl_amt,
    v_vat_amt,
    v_total,
    'OPEN',
    CURRENT_TIMESTAMP
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

-- fn_create_staff_account (GoF Singleton enforcement + Atomic Creation)
CREATE OR REPLACE FUNCTION fn_create_staff_account(
    p_branch_id      UUID,
    p_first_name     VARCHAR,
    p_last_name      VARCHAR,
    p_email          VARCHAR,
    p_phone          VARCHAR,
    p_role           account_type,
    p_username       VARCHAR,
    p_password_hash  VARCHAR
) RETURNS TABLE(out_staff_id UUID, out_user_account_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
    v_staff_id        UUID;
    v_user_account_id UUID;
BEGIN
    IF p_role = 'ADMINISTRATOR' AND EXISTS (
        SELECT 1 FROM user_accounts WHERE account_type = 'ADMINISTRATOR'
    ) THEN
        RAISE EXCEPTION 'Singleton Violation: An Administrator account already exists. Only one Administrator instance is permitted.'
            USING ERRCODE = '23505';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM branches WHERE branch_id = p_branch_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Branch % not found or inactive', p_branch_id
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (p_branch_id, p_first_name, p_last_name, p_email, p_phone, p_role)
    RETURNING staff_id INTO v_staff_id;

    INSERT INTO user_accounts (staff_id, username, password_hash, account_type)
    VALUES (v_staff_id, p_username, p_password_hash, p_role)
    RETURNING user_account_id INTO v_user_account_id;

    RETURN QUERY SELECT v_staff_id, v_user_account_id;
END;
$$;

-- fn_deactivate_staff
CREATE OR REPLACE FUNCTION fn_deactivate_staff(p_staff_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM staff WHERE staff_id = p_staff_id) THEN
        RAISE EXCEPTION 'Staff % not found', p_staff_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE staff SET is_active = false WHERE staff_id = p_staff_id;
    UPDATE user_accounts SET is_active = false WHERE staff_id = p_staff_id;
END;
$$;

-- fn_update_staff
CREATE OR REPLACE FUNCTION fn_update_staff(
    p_staff_id   UUID,
    p_first_name VARCHAR DEFAULT NULL,
    p_last_name  VARCHAR DEFAULT NULL,
    p_phone      VARCHAR DEFAULT NULL,
    p_role       account_type DEFAULT NULL,
    p_branch_id  UUID DEFAULT NULL
) RETURNS TABLE(
    staff_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    role account_type,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    branch_id UUID,
    branch_name VARCHAR,
    branch_city VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE staff SET
        first_name = COALESCE(p_first_name, first_name),
        last_name  = COALESCE(p_last_name,  last_name),
        phone      = COALESCE(p_phone,      phone),
        role       = COALESCE(p_role,       role),
        branch_id  = COALESCE(p_branch_id,  branch_id)
    WHERE staff.staff_id = p_staff_id;

    RETURN QUERY
    SELECT
        s.staff_id, s.first_name, s.last_name, s.email, s.phone, s.role,
        s.is_active, s.created_at, s.updated_at,
        b.branch_id, b.branch_name, b.city AS branch_city
    FROM staff s
    LEFT JOIN branches b ON s.branch_id = b.branch_id
    WHERE s.staff_id = p_staff_id;
END;
$$;

-- fn_audit_staff_changes (Auditing staff mutations to audit_logs - Migration 005)
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

-- fn_check_room_availability
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

-- fn_set_updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- fn_log_table_changes (Generic Observer Tier 1 Ledger)
CREATE OR REPLACE FUNCTION fn_log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_key    TEXT;
    v_rec_id TEXT;
BEGIN
    v_key := CASE TG_TABLE_NAME
        WHEN 'bookings'      THEN 'booking_id'
        WHEN 'booking_rooms' THEN 'booking_room_id'
        WHEN 'guests'        THEN 'guest_id'
        WHEN 'invoices'      THEN 'invoice_id'
        WHEN 'service_usage' THEN 'usage_id'
        ELSE 'booking_room_id'
    END;

    IF TG_OP = 'DELETE' THEN
        v_rec_id := COALESCE(to_jsonb(OLD) ->> v_key, 'UNKNOWN');

        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, db_user)
        VALUES (TG_TABLE_NAME, v_rec_id, 'DELETE', to_jsonb(OLD), NULL, CURRENT_USER);
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_rec_id := COALESCE(to_jsonb(NEW) ->> v_key, 'UNKNOWN');

        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, db_user)
        VALUES (TG_TABLE_NAME, v_rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_USER);
        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        v_rec_id := COALESCE(to_jsonb(NEW) ->> v_key, 'UNKNOWN');

        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, db_user)
        VALUES (TG_TABLE_NAME, v_rec_id, 'INSERT', NULL, to_jsonb(NEW), CURRENT_USER);
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- fn_sync_room_status
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

-- fn_auto_bill_on_checkout
CREATE OR REPLACE FUNCTION fn_auto_bill_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'CHECKED_OUT' THEN
        PERFORM sp_generate_final_bill(NEW.booking_room_id);
    END IF;
    RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [5/10] Creating Facade Views (GoF Facade Pattern)...'
-- ══════════════════════════════════════════════════════════════════════════════

-- View 1: Staff Details
CREATE OR REPLACE VIEW v_staff_details AS
SELECT
    s.staff_id,
    s.first_name,
    s.last_name,
    s.email,
    s.phone,
    s.role,
    s.is_active,
    s.created_at,
    s.updated_at,
    b.branch_id,
    b.branch_name,
    b.city AS branch_city
FROM staff s
LEFT JOIN branches b ON s.branch_id = b.branch_id;

-- View 2: Active Accounts
CREATE OR REPLACE VIEW v_active_accounts AS
SELECT
    ua.user_account_id,
    ua.username,
    ua.account_type,
    ua.is_active,
    ua.last_login_at,
    ua.created_at,
    s.staff_id,
    s.first_name,
    s.last_name,
    s.email,
    s.phone,
    s.role AS staff_role,
    b.branch_id,
    b.branch_name,
    b.city AS branch_city
FROM user_accounts ua
JOIN staff s ON ua.staff_id = s.staff_id
LEFT JOIN branches b ON s.branch_id = b.branch_id
WHERE ua.is_active = true AND s.is_active = true;

-- View 3: Comprehensive Booking Details (7-Table JOIN Facade - Migration 010)
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

-- View 4: Admin Audit Activity (Enriched Application Events - Migration 010)
CREATE OR REPLACE VIEW v_admin_audit_activity AS
SELECT
    a.audit_id,
    a.entity_type,
    a.entity_id,
    a.action,
    a.actor_id,
    COALESCE(a.actor_role, s.role::TEXT) AS actor_role,
    a.old_value,
    a.new_value,
    a.ip_address,
    a.created_at,
    ua.username   AS actor_username,
    s.first_name  AS actor_first_name,
    s.last_name   AS actor_last_name,
    b.branch_name AS actor_branch_name
FROM audit_logs a
LEFT JOIN user_accounts ua ON ua.user_account_id = a.actor_id
LEFT JOIN staff s ON s.staff_id = ua.staff_id
LEFT JOIN branches b ON b.branch_id = s.branch_id
ORDER BY a.created_at DESC;

-- View 5: Invoice Folio Estimate (Live pre-checkout preview)
CREATE OR REPLACE VIEW v_invoice_estimate AS
SELECT
    br.booking_room_id,
    br.booking_id,
    br.status AS room_status,
    (br.check_out_date - br.check_in_date) AS nights,
    br.rate_at_booking,
    (br.check_out_date - br.check_in_date) * br.rate_at_booking AS room_charges,
    COALESCE(su.services_total, 0.00) AS service_charges,
    ((br.check_out_date - br.check_in_date) * br.rate_at_booking) + COALESCE(su.services_total, 0.00) AS base_total,
    ROUND((((br.check_out_date - br.check_in_date) * br.rate_at_booking) + COALESCE(su.services_total, 0.00)) * 0.1000, 2) AS estimated_service_charge,
    ROUND(((((br.check_out_date - br.check_in_date) * br.rate_at_booking) + COALESCE(su.services_total, 0.00)) * 1.1000) * 0.0100, 2) AS estimated_tdl,
    ROUND(((((br.check_out_date - br.check_in_date) * br.rate_at_booking) + COALESCE(su.services_total, 0.00)) * 1.1100) * 0.0250, 2) AS estimated_sscl,
    ROUND(((((br.check_out_date - br.check_in_date) * br.rate_at_booking) + COALESCE(su.services_total, 0.00)) * 1.1350) * 0.1800, 2) AS estimated_vat,
    ROUND((((br.check_out_date - br.check_in_date) * br.rate_at_booking) + COALESCE(su.services_total, 0.00)) * 1.3393, 2) AS estimated_grand_total
FROM booking_rooms br
LEFT JOIN (
    SELECT booking_room_id, SUM(quantity * price_at_usage) AS services_total
    FROM service_usage
    GROUP BY booking_room_id
) su ON su.booking_room_id = br.booking_room_id;

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [6/10] Registering Triggers (GoF Observer Pattern)...'
-- ══════════════════════════════════════════════════════════════════════════════

-- UpdatedAt Triggers (Migration 005 & 010)
DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER trg_user_accounts_updated_at BEFORE UPDATE ON user_accounts FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON rooms;
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_guests_updated_at ON guests;
CREATE TRIGGER trg_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_booking_rooms_updated_at ON booking_rooms;
CREATE TRIGGER trg_booking_rooms_updated_at BEFORE UPDATE ON booking_rooms FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Staff Audit Trigger (Migration 005)
DROP TRIGGER IF EXISTS trg_audit_staff ON staff;
CREATE TRIGGER trg_audit_staff AFTER INSERT OR UPDATE OR DELETE ON staff FOR EACH ROW EXECUTE FUNCTION fn_audit_staff_changes();

-- Operational Sync Triggers (Migration 010)
DROP TRIGGER IF EXISTS trg_sync_room_status ON booking_rooms;
CREATE TRIGGER trg_sync_room_status AFTER INSERT OR UPDATE OF status, room_id ON booking_rooms FOR EACH ROW EXECUTE FUNCTION fn_sync_room_status();

DROP TRIGGER IF EXISTS trg_auto_bill_on_checkout ON booking_rooms;
CREATE TRIGGER trg_auto_bill_on_checkout AFTER UPDATE OF status ON booking_rooms FOR EACH ROW EXECUTE FUNCTION fn_auto_bill_on_checkout();

-- Mutation Change Ledger Triggers (Tier 1 Observer - Migration 010)
DROP TRIGGER IF EXISTS trg_change_log_bookings ON bookings;
DROP TRIGGER IF EXISTS trg_log_bookings_changes ON bookings;
CREATE TRIGGER trg_change_log_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();

DROP TRIGGER IF EXISTS trg_change_log_booking_rooms ON booking_rooms;
DROP TRIGGER IF EXISTS trg_log_booking_rooms_changes ON booking_rooms;
CREATE TRIGGER trg_change_log_booking_rooms AFTER INSERT OR UPDATE OR DELETE ON booking_rooms FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();

DROP TRIGGER IF EXISTS trg_change_log_guests ON guests;
DROP TRIGGER IF EXISTS trg_log_guests_changes ON guests;
CREATE TRIGGER trg_change_log_guests AFTER INSERT OR UPDATE OR DELETE ON guests FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();

DROP TRIGGER IF EXISTS trg_change_log_invoices ON invoices;
DROP TRIGGER IF EXISTS trg_log_invoices_changes ON invoices;
CREATE TRIGGER trg_change_log_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();

DROP TRIGGER IF EXISTS trg_change_log_service_usage ON service_usage;
DROP TRIGGER IF EXISTS trg_log_service_usage_changes ON service_usage;
CREATE TRIGGER trg_change_log_service_usage AFTER INSERT OR UPDATE OR DELETE ON service_usage FOR EACH ROW EXECUTE FUNCTION fn_log_table_changes();

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [7/10] Adding Constraints & Performance Indexes...'
-- ══════════════════════════════════════════════════════════════════════════════

-- Double booking prevention constraint
DO $$ BEGIN
    ALTER TABLE booking_rooms
        ADD CONSTRAINT no_double_booking
        EXCLUDE USING gist (
            room_id WITH =,
            daterange(check_in_date, check_out_date, '[)') WITH &&
        )
        WHERE (status <> 'CANCELLED');
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

-- GoF Singleton Pattern: Guarantee exactly ONE Administrator account instance (Migration 008)
CREATE UNIQUE INDEX IF NOT EXISTS uq_singleton_admin_account
    ON user_accounts (account_type)
    WHERE account_type = 'ADMINISTRATOR';

-- staff indexes (Migration 008)
CREATE INDEX IF NOT EXISTS idx_staff_branch_id     ON staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch        ON staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_role          ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_email         ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_is_active     ON staff(is_active);

-- user_accounts indexes (Migration 008)
CREATE INDEX IF NOT EXISTS idx_accounts_staff_id   ON user_accounts(staff_id);
CREATE INDEX IF NOT EXISTS idx_accounts_username   ON user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_type       ON user_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active  ON user_accounts(is_active);

-- branches indexes (Migration 008)
CREATE INDEX IF NOT EXISTS idx_branches_city       ON branches(city);
CREATE INDEX IF NOT EXISTS idx_branches_is_active  ON branches(is_active);

-- audit_logs indexes (Migration 008)
CREATE INDEX IF NOT EXISTS idx_audit_entity        ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor         ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action        ON audit_logs(action);

-- change_log indexes (Migration 010)
CREATE INDEX IF NOT EXISTS idx_change_log_table    ON change_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_change_log_created  ON change_log(created_at DESC);

-- bookings & booking_rooms indexes
CREATE INDEX IF NOT EXISTS idx_bookings_branch     ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest      ON bookings(booked_by_guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff      ON bookings(booked_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_brooms_booking      ON booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_brooms_room         ON booking_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_brooms_guest        ON booking_rooms(primary_guest_id);
CREATE INDEX IF NOT EXISTS idx_brooms_dates        ON booking_rooms(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_brooms_status       ON booking_rooms(status);

-- guests indexes
CREATE INDEX IF NOT EXISTS idx_guests_email        ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_name         ON guests(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_accompanying_broom  ON accompanying_guests(booking_room_id);

-- taxes, invoices, services, payments indexes (Migration 009)
CREATE INDEX IF NOT EXISTS idx_tax_active_dates    ON tax_configurations(is_active, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_invoices_b_room     ON invoices(booking_room_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_room  ON service_usage(booking_room_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice    ON payments(invoice_id);

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [8/10] Seeding Core Data (Branches, Room Types, Meal Plans, Taxes)...'
-- ══════════════════════════════════════════════════════════════════════════════

-- Seed Branches (Consistent deterministic UUIDs matching codebase)
INSERT INTO branches (branch_id, branch_name, city, address, phone, email) VALUES
    ('b1111111-1111-1111-1111-111111111111', 'Sky Nest Colombo', 'Colombo', '45 Galle Road, Colombo 03',          '+94 11 234 5678', 'colombo@skynest.lk'),
    ('b2222222-2222-2222-2222-222222222222', 'Sky Nest Galle',   'Galle',   '8 Church Street, Galle Fort, Galle', '+94 91 234 5678', 'galle@skynest.lk'),
    ('b3333333-3333-3333-3333-333333333333', 'Sky Nest Kandy',   'Kandy',   '12 Dalada Veediya, Kandy',           '+94 81 234 5678', 'kandy@skynest.lk')
ON CONFLICT (branch_name) DO NOTHING;

-- Seed Room Types
INSERT INTO room_types (room_type_id, type_name, base_daily_rate, capacity, description) VALUES
    (1, 'Standard Room',       120.00, 2, 'Refined standard room with handcrafted teak accents and city view.'),
    (2, 'Deluxe Room',         180.00, 3, 'Spacious deluxe room with ocean or garden views and marble bath.'),
    (3, 'Executive Suite',     280.00, 4, 'Dual-chamber executive suite featuring separate lounge and private plunge spa.'),
    (4, 'Presidential Suite',  500.00, 6, 'Uncompromising luxury penthouse with bespoke butler service and panoramic vistas.')
ON CONFLICT (type_name) DO UPDATE SET
    base_daily_rate = EXCLUDED.base_daily_rate,
    capacity        = EXCLUDED.capacity,
    description     = EXCLUDED.description;

SELECT setval('room_types_room_type_id_seq', (SELECT MAX(room_type_id) FROM room_types));

-- Seed Meal Plans
INSERT INTO meal_plans (plan_id, plan_name, description, price_per_night) VALUES
    (1, 'Room Only',       'Room stay only. Meals available à la carte.',     0.00),
    (2, 'Bed & Breakfast', 'Daily artisanal buffet breakfast included.',     25.00),
    (3, 'Half Board',      'Daily breakfast and four-course dinner included.', 55.00),
    (4, 'Full Board',      'All daily meals (breakfast, lunch, dinner).',     80.00)
ON CONFLICT (plan_name) DO NOTHING;

SELECT setval('meal_plans_plan_id_seq', (SELECT MAX(plan_id) FROM meal_plans));

-- Seed Sri Lankan Statutory Taxes (Cascade: SC -> TDL -> SSCL -> VAT)
INSERT INTO tax_configurations (tax_name, tax_percentage, is_active, effective_from, effective_to) VALUES
    ('Service Charge', 0.1000, true, '2024-01-01', NULL),
    ('TDL',            0.0100, true, '2024-01-01', NULL),
    ('SSCL',           0.0250, true, '2024-01-01', NULL),
    ('VAT',            0.1800, true, '2024-01-01', NULL)
ON CONFLICT (tax_name, effective_from) DO UPDATE SET
    tax_percentage = EXCLUDED.tax_percentage,
    is_active      = EXCLUDED.is_active;

-- Seed Service Catalogue
INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
    -- Colombo (b1111111-...) - 6 Curated Luxury Services
    ('b1111111-1111-1111-1111-111111111111', 'Airport Chauffeur Transfer',   'Transport',    45.00, true),
    ('b1111111-1111-1111-1111-111111111111', 'Ayurvedic Full Body Spa',      'Wellness',     75.00, true),
    ('b1111111-1111-1111-1111-111111111111', 'Luxury Champagne Breakfast',   'Dining',       30.00, true),
    ('b1111111-1111-1111-1111-111111111111', 'Express Laundry & Pressing',   'Housekeeping', 20.00, true),
    ('b1111111-1111-1111-1111-111111111111', 'Premium Suite Minibar Restock', 'Dining',       50.00, true),
    ('b1111111-1111-1111-1111-111111111111', 'Colombo Heritage & City Tour', 'Experience',   40.00, true),
    -- Galle (b2222222-...) - 6 Curated Luxury Services
    ('b2222222-2222-2222-2222-222222222222', 'Whale Watching Excursion',     'Experience',   85.00, true),
    ('b2222222-2222-2222-2222-222222222222', 'Fort Walking Tour & High Tea',  'Experience',   35.00, true),
    ('b2222222-2222-2222-2222-222222222222', 'Airport Chauffeur Transfer',   'Transport',    75.00, true),
    ('b2222222-2222-2222-2222-222222222222', 'Ayurvedic Oceanfront Spa',     'Wellness',     80.00, true),
    ('b2222222-2222-2222-2222-222222222222', 'Luxury Champagne Breakfast',   'Dining',       30.00, true),
    ('b2222222-2222-2222-2222-222222222222', 'Express Laundry & Pressing',   'Housekeeping', 20.00, true),
    -- Kandy (b3333333-...) - 6 Curated Luxury Services
    ('b3333333-3333-3333-3333-333333333333', 'Tea Estate Guided Tour',       'Experience',   40.00, true),
    ('b3333333-3333-3333-3333-333333333333', 'Ayurvedic Herbal Treatment',   'Wellness',     65.00, true),
    ('b3333333-3333-3333-3333-333333333333', 'Kandy Lake Sunset Cruise',     'Experience',   30.00, true),
    ('b3333333-3333-3333-3333-333333333333', 'Airport Chauffeur Transfer',   'Transport',    55.00, true),
    ('b3333333-3333-3333-3333-333333333333', 'Luxury Champagne Breakfast',   'Dining',       30.00, true),
    ('b3333333-3333-3333-3333-333333333333', 'Express Laundry & Pressing',   'Housekeeping', 20.00, true)
ON CONFLICT (branch_id, service_name) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    is_active  = EXCLUDED.is_active;

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [9/10] Seeding Physical Rooms (48 Rooms Across 3 Branches)...'
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO rooms (branch_id, room_type_id, room_number, number, type, floor, status, price_per_night, max_guests, amenities, description) VALUES
    -- Colombo (b1111111-...)
    ('b1111111-1111-1111-1111-111111111111', 1, '101', '101', 'STANDARD',     1, 'AVAILABLE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'], 'Standard Room with Colombo city views'),
    ('b1111111-1111-1111-1111-111111111111', 1, '102', '102', 'STANDARD',     1, 'AVAILABLE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'], 'Standard Room with garden views'),
    ('b1111111-1111-1111-1111-111111111111', 1, '103', '103', 'STANDARD',     1, 'MAINTENANCE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV'], 'Standard Room under regular maintenance'),
    ('b1111111-1111-1111-1111-111111111111', 2, '201', '201', 'DELUXE',       2, 'AVAILABLE', 180.00, 3, ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'], 'Deluxe Room with ocean view'),
    ('b1111111-1111-1111-1111-111111111111', 2, '202', '202', 'DELUXE',       2, 'OCCUPIED',   180.00, 3, ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'], 'Deluxe Room with ocean balcony'),
    ('b1111111-1111-1111-1111-111111111111', 3, '301', '301', 'SUITE',        3, 'AVAILABLE', 280.00, 4, ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi'], 'Executive Suite with lounge'),
    ('b1111111-1111-1111-1111-111111111111', 3, '302', '302', 'SUITE',        3, 'OCCUPIED',   280.00, 4, ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi'], 'Executive Suite with terrace'),
    ('b1111111-1111-1111-1111-111111111111', 4, '401', '401', 'PRESIDENTIAL', 4, 'AVAILABLE', 500.00, 6, ARRAY['WiFi', 'AC', 'Smart TV', 'Full Bar', 'Butler Service'], 'Presidential Suite with private rooftop'),

    -- Galle (b2222222-...)
    ('b2222222-2222-2222-2222-222222222222', 1, '101', '101', 'STANDARD',     1, 'AVAILABLE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'], 'Galle Fort view standard room'),
    ('b2222222-2222-2222-2222-222222222222', 1, '102', '102', 'STANDARD',     1, 'AVAILABLE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'], 'Colonial courtyard standard room'),
    ('b2222222-2222-2222-2222-222222222222', 2, '201', '201', 'DELUXE',       2, 'AVAILABLE', 180.00, 3, ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'], 'Heritage deluxe room'),
    ('b2222222-2222-2222-2222-222222222222', 2, '202', '202', 'DELUXE',       2, 'AVAILABLE', 180.00, 3, ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'], 'Heritage ocean deluxe room'),
    ('b2222222-2222-2222-2222-222222222222', 3, '301', '301', 'SUITE',        3, 'AVAILABLE', 280.00, 4, ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi'], 'Lighthouse view suite'),
    ('b2222222-2222-2222-2222-222222222222', 4, '401', '401', 'PRESIDENTIAL', 4, 'AVAILABLE', 500.00, 6, ARRAY['WiFi', 'AC', 'Smart TV', 'Full Bar', 'Butler Service'], 'Presidential Ocean Pavilion'),

    -- Kandy (b3333333-...)
    ('b3333333-3333-3333-3333-333333333333', 1, '101', '101', 'STANDARD',     1, 'AVAILABLE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'], 'Kandy mountain standard room'),
    ('b3333333-3333-3333-3333-333333333333', 1, '102', '102', 'STANDARD',     1, 'AVAILABLE', 120.00, 2, ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'], 'Lake view standard room'),
    ('b3333333-3333-3333-3333-333333333333', 2, '201', '201', 'DELUXE',       2, 'AVAILABLE', 180.00, 3, ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'], 'Hilltop deluxe room'),
    ('b3333333-3333-3333-3333-333333333333', 2, '202', '202', 'DELUXE',       2, 'AVAILABLE', 180.00, 3, ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'], 'Pine forest deluxe room'),
    ('b3333333-3333-3333-3333-333333333333', 3, '301', '301', 'SUITE',        3, 'AVAILABLE', 280.00, 4, ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi'], 'Mist Valley luxury suite'),
    ('b3333333-3333-3333-3333-333333333333', 4, '401', '401', 'PRESIDENTIAL', 4, 'AVAILABLE', 500.00, 6, ARRAY['WiFi', 'AC', 'Smart TV', 'Full Bar', 'Butler Service'], 'Presidential Mountain Villa')
ON CONFLICT (branch_id, room_number) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
\echo '>>> [10/10] Seeding Staff & User Accounts...'
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_colombo_id UUID := 'b1111111-1111-1111-1111-111111111111';
    v_galle_id   UUID := 'b2222222-2222-2222-2222-222222222222';
    v_kandy_id   UUID := 'b3333333-3333-3333-3333-333333333333';

    -- Bcrypt hashes:
    -- bcrypt hash of 'SkyNest2025!' (shared by all seed accounts)
    v_hash VARCHAR := '$2a$10$7/eAi7.sf96JRCdmbPKkPugkC5Cg53h/O8bd4Gt.lUIfzK8IF9y.C';

    v_admin_staff_id        UUID;
    v_manager_staff_id      UUID;
    v_receptionist_staff_id UUID;
    v_service_staff_id      UUID;
    v_guest_staff_id        UUID;
    v_dba_staff_id          UUID;
BEGIN
    -- 1. Administrator (Colombo)
    INSERT INTO staff (staff_id, branch_id, first_name, last_name, email, phone, role)
    VALUES ('c1111111-1111-1111-1111-111111111111', v_colombo_id, 'Kavindi', 'Jayawardena', 'admin@skynest.lk', '+94 77 100 0004', 'ADMINISTRATOR')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING staff_id INTO v_admin_staff_id;

    -- 2. Manager (Galle)
    INSERT INTO staff (staff_id, branch_id, first_name, last_name, email, phone, role)
    VALUES ('c2222222-2222-2222-2222-222222222222', v_galle_id, 'Dilshan', 'Fernando', 'manager@skynest.lk', '+94 77 100 0003', 'MANAGER')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING staff_id INTO v_manager_staff_id;

    -- 3. Receptionist (Colombo)
    INSERT INTO staff (staff_id, branch_id, first_name, last_name, email, phone, role)
    VALUES ('c3333333-3333-3333-3333-333333333333', v_colombo_id, 'Amara', 'Perera', 'receptionist@skynest.lk', '+94 77 100 0001', 'RECEPTIONIST')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING staff_id INTO v_receptionist_staff_id;

    -- 4. Service Staff (Kandy)
    INSERT INTO staff (staff_id, branch_id, first_name, last_name, email, phone, role)
    VALUES ('c4444444-4444-4444-4444-444444444444', v_kandy_id, 'Nuwan', 'Silva', 'service@skynest.lk', '+94 77 100 0002', 'SERVICE_STAFF')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING staff_id INTO v_service_staff_id;

    -- 5. Guest Portal User
    INSERT INTO staff (staff_id, branch_id, first_name, last_name, email, phone, role)
    VALUES ('c5555555-5555-5555-5555-555555555555', NULL, 'Guest', 'User', 'guest@skynest.lk', NULL, 'GUEST')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING staff_id INTO v_guest_staff_id;

    -- 6. DBA
    INSERT INTO staff (staff_id, branch_id, first_name, last_name, email, phone, role)
    VALUES ('c6666666-6666-6666-6666-666666666666', NULL, 'System', 'DBA', 'dba@skynest.lk', '+94 77 100 0005', 'DBA')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING staff_id INTO v_dba_staff_id;

    -- Seed User Accounts
    INSERT INTO user_accounts (user_account_id, staff_id, username, password_hash, account_type) VALUES
        ('d1111111-1111-1111-1111-111111111111', v_admin_staff_id,        'admin',        v_hash, 'ADMINISTRATOR'),
        ('d2222222-2222-2222-2222-222222222222', v_manager_staff_id,      'manager',      v_hash, 'MANAGER'),
        ('d3333333-3333-3333-3333-333333333333', v_receptionist_staff_id, 'receptionist', v_hash, 'RECEPTIONIST'),
        ('d4444444-4444-4444-4444-444444444444', v_service_staff_id,      'service',      v_hash, 'SERVICE_STAFF'),
        ('d5555555-5555-5555-5555-555555555555', v_guest_staff_id,        'guest',        v_hash, 'GUEST'),
        ('d6666666-6666-6666-6666-666666666666', v_dba_staff_id,          'dba',          v_hash, 'DBA')
    ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        account_type  = EXCLUDED.account_type;
END;
$$;

\echo '>>> ✅ Sky Nest database initialization script completed successfully!'
