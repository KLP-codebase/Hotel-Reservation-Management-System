-- ── Fix: Missing ENUMs and Tables ────────────────────────────────────────────
-- Run this ONCE to repair the Railway DB after the initial schema run errors.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create missing ENUMs (were accidentally removed from schema.sql)
DO $$ BEGIN
    CREATE TYPE loyalty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_source AS ENUM ('DIRECT', 'ONLINE', 'AGENT', 'WALK_IN', 'PHONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Create guests table (failed earlier due to missing loyalty_tier)
CREATE TABLE IF NOT EXISTS guests (
    id               VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    phone            VARCHAR(50) NOT NULL,
    nationality      VARCHAR(100),
    passport_number  VARCHAR(100) UNIQUE,
    date_of_birth    DATE,
    loyalty_tier     loyalty_tier DEFAULT 'BRONZE',
    loyalty_points   INT DEFAULT 0,
    total_stays      INT DEFAULT 0,
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create bookings table (failed due to missing booking_status etc.)
CREATE TABLE IF NOT EXISTS bookings (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_ref         VARCHAR(50) UNIQUE NOT NULL,
    guest_id            VARCHAR(36) NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    room_id             VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    check_in            DATE NOT NULL,
    check_out           DATE NOT NULL,
    status              booking_status DEFAULT 'PENDING',
    payment_status      payment_status DEFAULT 'PENDING',
    adults              INT DEFAULT 1,
    children            INT DEFAULT 0,
    total_amount        DECIMAL(10, 2) NOT NULL,
    special_requests    TEXT,
    source              booking_source DEFAULT 'DIRECT',
    cancellation_reason TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create bills table (depends on bookings)
CREATE TABLE IF NOT EXISTS bills (
    id               VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_id       VARCHAR(36) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    subtotal         DECIMAL(10, 2) NOT NULL,
    tax_amount       DECIMAL(10, 2) DEFAULT 0,
    discount_amount  DECIMAL(10, 2) DEFAULT 0,
    loyalty_discount DECIMAL(10, 2) DEFAULT 0,
    total            DECIMAL(10, 2) NOT NULL,
    line_items       JSONB DEFAULT '[]'::jsonb,
    issued_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Booking indexes (failed earlier because bookings didn't exist)
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id  ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates    ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);

-- ── Billing Module Tables (needed by migration 009) ───────────────────────────

-- 6. tax_configurations
CREATE TABLE IF NOT EXISTS tax_configurations (
    tax_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_name       VARCHAR(100) NOT NULL,
    tax_percentage NUMERIC(6,4) NOT NULL,
    is_active      BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL,
    effective_to   DATE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tax_name_date UNIQUE (tax_name, effective_from)
);

-- 7. service_catalogue
CREATE TABLE IF NOT EXISTS service_catalogue (
    service_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id    INT,
    service_name VARCHAR(200) NOT NULL,
    category     VARCHAR(100),
    base_price   NUMERIC(10,2) NOT NULL,
    is_active    BOOLEAN DEFAULT true,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_service UNIQUE (branch_id, service_name)
);

-- 8. invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    sc_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    tdl_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    sscl_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. service_usage
CREATE TABLE IF NOT EXISTS service_usage (
    usage_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
    service_id      UUID REFERENCES service_catalogue(service_id) ON DELETE SET NULL,
    quantity        INT NOT NULL DEFAULT 1,
    price_at_usage  NUMERIC(10,2) NOT NULL,
    used_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id   UUID REFERENCES invoices(invoice_id) ON DELETE SET NULL,
    amount_paid  NUMERIC(12,2) NOT NULL,
    method       VARCHAR(50),
    paid_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
