-- ═══════════════════════════════════════════════════════════════════
-- Sky Nest Hotel — Database Initialization Script
-- Runs automatically on first `docker compose up`
-- Order matters: extensions, enums, schema, views, stored functions, seed data
-- ═══════════════════════════════════════════════════════════════════

\echo '>>> [1/8] Enabling extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

\echo '>>> [2/8] Creating Enums...'
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'GUEST', 'RECEPTIONIST', 'SERVICE_STAFF', 'MANAGER', 'ADMINISTRATOR', 'DBA'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

\echo '>>> [3/8] Creating Tables...'
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

CREATE TABLE IF NOT EXISTS guests (
    guest_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) UNIQUE,
    phone      VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_types (
    room_type_id    SERIAL PRIMARY KEY,
    type_name       VARCHAR(100) UNIQUE NOT NULL,
    base_daily_rate NUMERIC(10,2) NOT NULL CHECK (base_daily_rate > 0),
    capacity        SMALLINT NOT NULL CHECK (capacity > 0),
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id         SERIAL PRIMARY KEY,
    plan_name       VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
    room_id      SERIAL PRIMARY KEY,
    branch_id    UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    room_type_id INT NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    room_number  VARCHAR(20) NOT NULL,
    floor        INT,
    status       VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, room_number)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID NOT NULL,
    action      VARCHAR(50) NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_configurations (
    tax_id                 SERIAL PRIMARY KEY,
    tax_name               VARCHAR(100) NOT NULL,
    tax_percentage         NUMERIC(5,4) NOT NULL CHECK (tax_percentage >= 0),
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from         DATE NOT NULL,
    effective_to           DATE,
    external_api_reference VARCHAR(255),
    last_synced_at         TIMESTAMP,
    UNIQUE(tax_name, effective_from)
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id           UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    booked_by_guest_id  UUID REFERENCES guests(guest_id) ON DELETE SET NULL,
    booked_by_staff_id  UUID REFERENCES staff(staff_id) ON DELETE SET NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_rooms (
    booking_room_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id       UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    primary_guest_id UUID NOT NULL REFERENCES guests(guest_id) ON DELETE RESTRICT,
    room_type_id     INT  NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    room_id          INT  REFERENCES rooms(room_id) ON DELETE RESTRICT,
    plan_id          INT  NOT NULL REFERENCES meal_plans(plan_id) ON DELETE RESTRICT,
    check_in_date    DATE NOT NULL,
    check_out_date   DATE NOT NULL,
    rate_at_booking  NUMERIC(10,2) NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (check_out_date > check_in_date)
);

\echo '>>> [4/8] Creating Views...'
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
    WHERE ua.is_active = true
      AND s.is_active  = true;

\echo '>>> [5/8] Creating Stored Functions...'
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
        RAISE EXCEPTION 'Singleton Violation: An Administrator account already exists.'
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

\echo '>>> [6/8] Creating Indexes & Singleton Guard...'
CREATE UNIQUE INDEX IF NOT EXISTS uq_singleton_admin_account
    ON user_accounts (account_type)
    WHERE account_type = 'ADMINISTRATOR';

CREATE INDEX IF NOT EXISTS idx_staff_branch_id ON staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_email     ON staff(email);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_staff_id ON user_accounts(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

\echo '>>> [7/8] Seeding System Data...'
INSERT INTO branches (branch_name, city, address, phone, email) VALUES
    ('Sky Nest Colombo', 'Colombo', '45 Galle Road, Colombo 03',          '+94 11 234 5678', 'colombo@skynest.lk'),
    ('Sky Nest Kandy',   'Kandy',   '12 Dalada Veediya, Kandy',           '+94 81 234 5678', 'kandy@skynest.lk'),
    ('Sky Nest Galle',   'Galle',   '8 Church Street, Galle Fort, Galle', '+94 91 234 5678', 'galle@skynest.lk')
ON CONFLICT (branch_name) DO NOTHING;

INSERT INTO tax_configurations (tax_name, tax_percentage, is_active, effective_from) VALUES
    ('VAT',            0.1800, TRUE, '2024-01-01'),
    ('Service Charge', 0.1000, TRUE, '2024-01-01'),
    ('SSC Levy',       0.0250, TRUE, '2024-01-01')
ON CONFLICT (tax_name, effective_from) DO NOTHING;

INSERT INTO room_types (type_name, base_daily_rate, capacity, description) VALUES
    ('Standard',     120.00, 2, 'Comfortable standard room with garden view'),
    ('Deluxe',       220.00, 2, 'Spacious deluxe room with partial ocean view'),
    ('Suite',        450.00, 4, 'Luxury suite with living area and full ocean view'),
    ('Presidential', 950.00, 6, 'Top-floor presidential suite with private terrace')
ON CONFLICT (type_name) DO NOTHING;

INSERT INTO meal_plans (plan_name, description, price_per_night) VALUES
    ('Room Only',      'No meals included',                       0.00),
    ('Bed & Breakfast','Breakfast included',                      25.00),
    ('Half Board',     'Breakfast and dinner included',           55.00),
    ('Full Board',     'All three meals included',                80.00)
ON CONFLICT (plan_name) DO NOTHING;

\echo '>>> [8/8] Seeding Staff & User Accounts...'
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

    -- Valid bcrypt hashes generated with cost 10:
    -- SkyNest2025! -> $2a$10$gfnZjAQKOiHC440DClg.Wu0PkHb.vJ959HHZmZ3eEQP117LE.jZ.2
    -- admin2025    -> $2a$10$xm85S0x8C/4XYA6KxrX3eeGZ3N1eifAuxcsKMZYAjMuKz5lidYt8K
    v_seed_hash  TEXT := '$2a$10$gfnZjAQKOiHC440DClg.Wu0PkHb.vJ959HHZmZ3eEQP117LE.jZ.2';
    v_admin_hash TEXT := '$2a$10$xm85S0x8C/4XYA6KxrX3eeGZ3N1eifAuxcsKMZYAjMuKz5lidYt8K';
BEGIN
    SELECT branch_id INTO v_colombo_id FROM branches WHERE branch_name = 'Sky Nest Colombo';
    SELECT branch_id INTO v_kandy_id   FROM branches WHERE branch_name = 'Sky Nest Kandy';
    SELECT branch_id INTO v_galle_id   FROM branches WHERE branch_name = 'Sky Nest Galle';

    -- Guest
    INSERT INTO staff (first_name, last_name, email, role)
    VALUES ('Guest', 'User', 'guest@skynest.lk', 'GUEST')
    ON CONFLICT (email) DO NOTHING;

    -- Receptionist — Colombo
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_colombo_id, 'Amara', 'Perera', 'receptionist@skynest.lk', '+94 77 100 0001', 'RECEPTIONIST')
    ON CONFLICT (email) DO NOTHING;

    -- Service Staff — Kandy
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_kandy_id, 'Nuwan', 'Silva', 'service@skynest.lk', '+94 77 100 0002', 'SERVICE_STAFF')
    ON CONFLICT (email) DO NOTHING;

    -- Manager — Galle
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_galle_id, 'Dilshan', 'Fernando', 'manager@skynest.lk', '+94 77 100 0003', 'MANAGER')
    ON CONFLICT (email) DO NOTHING;

    -- Administrator — Colombo
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (v_colombo_id, 'Kavindi', 'Jayawardena', 'admin@skynest.lk', '+94 77 100 0004', 'ADMINISTRATOR')
    ON CONFLICT (email) DO NOTHING;

    -- DBA
    INSERT INTO staff (first_name, last_name, email, phone, role)
    VALUES ('System', 'DBA', 'dba@skynest.lk', '+94 77 100 0005', 'DBA')
    ON CONFLICT (email) DO NOTHING;

    SELECT staff_id INTO v_guest_staff_id        FROM staff WHERE email = 'guest@skynest.lk';
    SELECT staff_id INTO v_receptionist_staff_id FROM staff WHERE email = 'receptionist@skynest.lk';
    SELECT staff_id INTO v_service_staff_id      FROM staff WHERE email = 'service@skynest.lk';
    SELECT staff_id INTO v_manager_staff_id      FROM staff WHERE email = 'manager@skynest.lk';
    SELECT staff_id INTO v_admin_staff_id        FROM staff WHERE email = 'admin@skynest.lk';
    SELECT staff_id INTO v_dba_staff_id          FROM staff WHERE email = 'dba@skynest.lk';

    INSERT INTO user_accounts (staff_id, username, password_hash, account_type) VALUES
        (v_guest_staff_id,        'guest',        v_seed_hash,  'GUEST'),
        (v_receptionist_staff_id, 'receptionist', v_seed_hash,  'RECEPTIONIST'),
        (v_service_staff_id,      'service',      v_seed_hash,  'SERVICE_STAFF'),
        (v_manager_staff_id,      'manager',      v_seed_hash,  'MANAGER'),
        (v_admin_staff_id,        'admin',        v_admin_hash, 'ADMINISTRATOR'),
        (v_dba_staff_id,          'dba',          v_seed_hash,  'DBA')
    ON CONFLICT (username) DO NOTHING;
END;
$$;

\echo '>>> ✅ Database initialization complete!'
