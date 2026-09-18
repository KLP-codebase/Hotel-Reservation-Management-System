-- ── Migration 002: Staff, user_accounts, new account_type enum ────────────────
-- Hotel Reservation Management System
-- Replaces old user_role enum with 6-value account_type enum.
-- Creates staff + user_accounts tables. Seeds one account per role.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'GUEST',
        'RECEPTIONIST',
        'SERVICE_STAFF',
        'MANAGER',
        'ADMINISTRATOR',
        'DBA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
    staff_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id  UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    phone      VARCHAR(50),
    role       account_type NOT NULL,
    is_active  BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_accounts (
    user_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id        UUID UNIQUE REFERENCES staff(staff_id) ON DELETE CASCADE, -- NULL for external guests
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    account_type    account_type NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── GoF Decorator: Check Constraints ─────────────────────────────────────────
-- Layered validation on top of base table definitions.
-- These hold even if the API is bypassed (e.g., direct DB access).

DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_checkout_after_checkin CHECK (check_out > check_in);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_total_non_negative CHECK (total_amount >= 0);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_adults_positive CHECK (adults >= 1);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE rooms ADD CONSTRAINT chk_price_positive CHECK (price_per_night > 0);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE rooms ADD CONSTRAINT chk_max_guests_positive CHECK (max_guests >= 1);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bills ADD CONSTRAINT chk_bill_total_non_negative CHECK (total >= 0);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bills ADD CONSTRAINT chk_tax_non_negative CHECK (tax_amount >= 0);
EXCEPTION WHEN undefined_table THEN null; WHEN duplicate_object THEN null; END $$;

-- ── GoF Singleton Pattern: Administrator Uniqueness Constraint ─────────────────
-- Guarantees at the database engine level that only ONE single Administrator
-- account can exist in the system at any time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_singleton_admin_account
    ON user_accounts (account_type)
    WHERE account_type = 'ADMINISTRATOR';

-- ── Seeds ─────────────────────────────────────────────────────────────────────
-- Admin seed password: admin2025 (hash: $2a$10$xm85S0x8C/4XYA6KxrX3eeGZ3N1eifAuxcsKMZYAjMuKz5lidYt8K)
-- Other seed accounts password: SkyNest2025!

DO $$
DECLARE
    v_colombo_id UUID;
    v_kandy_id   UUID;
    v_galle_id   UUID;

    v_guest_staff_id        UUID;
    v_receptionist_staff_id UUID;
    v_service_staff_id      UUID;
    v_manager_staff_id      UUID;
    v_admin_staff_id        UUID;
    v_dba_staff_id          UUID;

    v_seed_hash  TEXT := '$2a$10$gfnZjAQKOiHC440DClg.Wu0PkHb.vJ959HHZmZ3eEQP117LE.jZ.2'; -- SkyNest2025!
    v_admin_hash TEXT := '$2a$10$xm85S0x8C/4XYA6KxrX3eeGZ3N1eifAuxcsKMZYAjMuKz5lidYt8K'; -- admin2025
BEGIN
    SELECT branch_id INTO v_colombo_id FROM branches WHERE branch_name = 'Sky Nest Colombo';
    SELECT branch_id INTO v_kandy_id   FROM branches WHERE branch_name = 'Sky Nest Kandy';
    SELECT branch_id INTO v_galle_id   FROM branches WHERE branch_name = 'Sky Nest Galle';

    -- Guest (no branch)
    INSERT INTO staff (first_name, last_name, email, role)
    VALUES ('Guest', 'User', 'guest@skynest.lk', 'GUEST')
    ON CONFLICT (email) DO NOTHING
    RETURNING staff_id INTO v_guest_staff_id;

    -- Receptionist — Colombo
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_colombo_id, 'Amara', 'Perera', 'receptionist@skynest.lk', '+94 77 100 0001', 'RECEPTIONIST')
    ON CONFLICT (email) DO NOTHING
    RETURNING staff_id INTO v_receptionist_staff_id;

    -- Service Staff — Kandy
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_kandy_id, 'Nuwan', 'Silva', 'service@skynest.lk', '+94 77 100 0002', 'SERVICE_STAFF')
    ON CONFLICT (email) DO NOTHING
    RETURNING staff_id INTO v_service_staff_id;

    -- Manager — Galle
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_galle_id, 'Dilshan', 'Fernando', 'manager@skynest.lk', '+94 77 100 0003', 'MANAGER')
    ON CONFLICT (email) DO NOTHING
    RETURNING staff_id INTO v_manager_staff_id;

    -- Administrator — Colombo (GoF Singleton instance)
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_colombo_id, 'Kavindi', 'Jayawardena', 'admin@skynest.lk', '+94 77 100 0004', 'ADMINISTRATOR')
    ON CONFLICT (email) DO NOTHING
    RETURNING staff_id INTO v_admin_staff_id;

    -- DBA — no branch
    INSERT INTO staff (first_name, last_name, email, phone, role)
    VALUES ('System', 'DBA', 'dba@skynest.lk', '+94 77 100 0005', 'DBA')
    ON CONFLICT (email) DO NOTHING
    RETURNING staff_id INTO v_dba_staff_id;

    -- Re-fetch IDs in case of ON CONFLICT (RETURNING won't fire on conflict)
    SELECT staff_id INTO v_guest_staff_id        FROM staff WHERE email = 'guest@skynest.lk';
    SELECT staff_id INTO v_receptionist_staff_id FROM staff WHERE email = 'receptionist@skynest.lk';
    SELECT staff_id INTO v_service_staff_id      FROM staff WHERE email = 'service@skynest.lk';
    SELECT staff_id INTO v_manager_staff_id      FROM staff WHERE email = 'manager@skynest.lk';
    SELECT staff_id INTO v_admin_staff_id        FROM staff WHERE email = 'admin@skynest.lk';
    SELECT staff_id INTO v_dba_staff_id          FROM staff WHERE email = 'dba@skynest.lk';

    -- User accounts
    INSERT INTO user_accounts (staff_id, username, password_hash, account_type) VALUES
        (NULL,                    'guest',        v_seed_hash,  'GUEST'),
        (v_receptionist_staff_id, 'receptionist', v_seed_hash,  'RECEPTIONIST'),
        (v_service_staff_id,      'service',      v_seed_hash,  'SERVICE_STAFF'),
        (v_manager_staff_id,      'manager',      v_seed_hash,  'MANAGER'),
        (v_admin_staff_id,        'admin',        v_admin_hash, 'ADMINISTRATOR'),
        (v_dba_staff_id,          'dba',          v_seed_hash,  'DBA')
    ON CONFLICT (username) DO NOTHING;
END;
$$;