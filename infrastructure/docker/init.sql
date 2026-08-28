-- ═══════════════════════════════════════════════════════════════════
-- Sky Nest Hotel — Database Initialization Script
-- Runs automatically on first `docker compose up`
-- Order matters: schema first, then migrations 001 → 008
-- ═══════════════════════════════════════════════════════════════════

\echo '>>> [1/17] Enabling UUID extension...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [2/17] Creating branches table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS branches (
    branch_id   SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) UNIQUE NOT NULL,
    city        VARCHAR(100) NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: the 3 real Sky Nest hotel locations

INSERT INTO branches (branch_name, city, address, phone, email) VALUES
    ('Sky Nest Colombo', 'Colombo', '45 Galle Road, Colombo 03',          '+94 11 234 5678', 'colombo@skynest.lk'),
    ('Sky Nest Kandy',   'Kandy',   '12 Dalada Veediya, Kandy',           '+94 81 234 5678', 'kandy@skynest.lk'),
    ('Sky Nest Galle',   'Galle',   '8 Church Street, Galle Fort, Galle', '+94 91 234 5678', 'galle@skynest.lk')
ON CONFLICT (branch_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [3/17] Creating guests table...'
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS guests (
    guest_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) UNIQUE,
    phone      VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [4/17] Creating staff table...'
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS staff (
    staff_id   SERIAL PRIMARY KEY,
    branch_id  INT REFERENCES branches(branch_id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    phone      VARCHAR(50),
    role       VARCHAR(50) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [5/17] Creating user_accounts table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_accounts (
    account_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(), --used uuid_generator because this might expose to public
    username     VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    staff_id     INT  REFERENCES staff(staff_id)   ON DELETE CASCADE,
    guest_id     UUID REFERENCES guests(guest_id)  ON DELETE CASCADE,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (account_type = 'Staff'  AND staff_id IS NOT NULL AND guest_id IS NULL) OR
        (account_type = 'Member' AND guest_id IS NOT NULL AND staff_id IS NULL)
    )
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [6/17] Creating room_types table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS room_types (
    room_type_id    SERIAL PRIMARY KEY,
    type_name       VARCHAR(100) UNIQUE NOT NULL,
    base_daily_rate NUMERIC(10,2) NOT NULL CHECK (base_daily_rate > 0),
    capacity        SMALLINT NOT NULL CHECK (capacity > 0),
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [7/17] Creating meal_plans table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id         SERIAL PRIMARY KEY,
    plan_name       VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [8/17] Creating rooms table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rooms (
    room_id      SERIAL PRIMARY KEY,
    branch_id    INT NOT NULL REFERENCES branches(branch_id)    ON DELETE RESTRICT,
    room_type_id INT NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    room_number  VARCHAR(20) NOT NULL,
    floor        INT,
    status       VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, room_number)
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [9/17] Creating service_catalogue table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_catalogue (
    service_id   SERIAL PRIMARY KEY,
    branch_id    INT NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    service_name VARCHAR(100) NOT NULL,
    category     VARCHAR(50),
    base_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(branch_id, service_name)
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [10/17] Creating tax_configurations table...'
-- ═══════════════════════════════════════════════════════════════════

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

-- Seed: Sri Lanka statutory tax rates (2024)
INSERT INTO tax_configurations (tax_name, tax_percentage, is_active, effective_from) VALUES
    ('VAT',            0.1800, TRUE, '2024-01-01'),
    ('Service Charge', 0.1000, TRUE, '2024-01-01'),
    ('SSC Levy',       0.0250, TRUE, '2024-01-01')
ON CONFLICT (tax_name, effective_from) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [11/17] Creating bookings table (YOUR MODULE)...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bookings (
    booking_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id           INT NOT NULL REFERENCES branches(branch_id)   ON DELETE RESTRICT,
    booked_by_guest_id  UUID REFERENCES guests(guest_id)              ON DELETE SET NULL,
    booked_by_staff_id  INT  REFERENCES staff(staff_id)               ON DELETE SET NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (booked_by_guest_id IS NOT NULL OR booked_by_staff_id IS NOT NULL)
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [12/17] Creating booking_rooms table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS booking_rooms (
    booking_room_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id       UUID NOT NULL REFERENCES bookings(booking_id)          ON DELETE CASCADE, --If the master booking is deleted, all its room line items should also be deleted — they have no meaning without the parent booking. That's the one place CASCADE makes sense here.
    primary_guest_id UUID NOT NULL REFERENCES guests(guest_id)              ON DELETE RESTRICT,
    room_type_id     INT  NOT NULL REFERENCES room_types(room_type_id)      ON DELETE RESTRICT,
    room_id          INT           REFERENCES rooms(room_id)                ON DELETE RESTRICT,
    plan_id          INT  NOT NULL REFERENCES meal_plans(plan_id)           ON DELETE RESTRICT,
    check_in_date    DATE NOT NULL,
    check_out_date   DATE NOT NULL,
    rate_at_booking  NUMERIC(10,2) NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (check_out_date > check_in_date)
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [13/17] Creating accompanying_guests table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS accompanying_guests (
    verification_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id     UUID NOT NULL REFERENCES booking_rooms(booking_room_id) ON DELETE CASCADE,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    id_passport_no      VARCHAR(100) NOT NULL,
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [14/17] Creating service_usage table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_usage (
    usage_id             SERIAL PRIMARY KEY,
    booking_room_id      UUID NOT NULL REFERENCES booking_rooms(booking_room_id) ON DELETE CASCADE,
    service_id           INT  NOT NULL REFERENCES service_catalogue(service_id)  ON DELETE RESTRICT,
    quantity             SMALLINT NOT NULL CHECK (quantity > 0),
    price_at_usage       NUMERIC(10,2) NOT NULL,
    recorded_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by_staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [15/17] Creating invoices table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoices (
    invoice_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id     UUID NOT NULL UNIQUE REFERENCES booking_rooms(booking_room_id) ON DELETE RESTRICT,
    room_charges        NUMERIC(12,2) NOT NULL DEFAULT 0,
    service_charges     NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    service_charge_tax  NUMERIC(12,2) NOT NULL DEFAULT 0,
    ssc_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    status              VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    generated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [16/17] Creating payments table...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payments (
    payment_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id           UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE RESTRICT,
    amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method       VARCHAR(50) NOT NULL,
    reference_number     VARCHAR(100),
    recorded_by_staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [17/17] Creating report_snapshots + change_log tables...'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_snapshots (
    snapshot_id           SERIAL PRIMARY KEY,
    report_type           VARCHAR(100) NOT NULL,
    report_period_start   DATE NOT NULL,
    report_period_end     DATE NOT NULL,
    branch_id             INT REFERENCES branches(branch_id) ON DELETE SET NULL,
    report_data           JSONB NOT NULL,
    generated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by_staff_id INT REFERENCES staff(staff_id)   ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS change_log (
    log_id              BIGSERIAL PRIMARY KEY,
    table_name          VARCHAR(100) NOT NULL,
    record_id           VARCHAR(100) NOT NULL,
    action              VARCHAR(20)  NOT NULL,
    old_data            JSONB,
    new_data            JSONB,
    changed_by_account_id UUID REFERENCES user_accounts(account_id) ON DELETE SET NULL,
    changed_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

\echo '>>> ✅ All 17 tables created successfully!'
\echo '>>> Sky Nest database is ready.'
