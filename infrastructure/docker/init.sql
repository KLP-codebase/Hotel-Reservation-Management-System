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
    ('TDL',            0.0100, TRUE, '2024-01-01'),
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
    tdl_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
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

\echo '>>> [SEED] Seeding room_types...'
INSERT INTO room_types (type_name, base_daily_rate, capacity, description) VALUES
    ('Standard',     120.00, 2, 'Comfortable standard room with garden view'),
    ('Deluxe',       220.00, 2, 'Spacious deluxe room with partial ocean view'),
    ('Suite',        450.00, 4, 'Luxury suite with living area and full ocean view'),
    ('Presidential', 950.00, 6, 'Top-floor presidential suite with private terrace')
ON CONFLICT (type_name) DO NOTHING;

\echo '>>> [SEED] Seeding meal_plans...'
INSERT INTO meal_plans (plan_name, description, price_per_night) VALUES
    ('Room Only',      'No meals included',                       0.00),
    ('Bed & Breakfast','Breakfast included',                      25.00),
    ('Half Board',     'Breakfast and dinner included',           55.00),
    ('Full Board',     'All three meals included',                80.00)
ON CONFLICT (plan_name) DO NOTHING;

\echo '>>> [SEED] Seeding rooms...'
INSERT INTO rooms (branch_id, room_type_id, room_number, floor, status) VALUES
    -- Colombo (branch_id = 1)
    (1, 1, '101', 1, 'AVAILABLE'),
    (1, 2, '201', 2, 'AVAILABLE'),
    (1, 3, '301', 3, 'AVAILABLE'),
    (1, 4, '401', 4, 'AVAILABLE'),
    (1, 1, '102', 1, 'AVAILABLE'),
    -- Kandy (branch_id = 2)
    (2, 1, '101', 1, 'AVAILABLE'),
    (2, 2, '201', 2, 'AVAILABLE'),
    (2, 3, '301', 3, 'AVAILABLE'),
    (2, 1, '102', 1, 'AVAILABLE'),
    (2, 2, '202', 2, 'AVAILABLE'),
    -- Galle (branch_id = 3)
    (3, 1, '101', 1, 'AVAILABLE'),
    (3, 2, '201', 2, 'AVAILABLE'),
    (3, 3, '301', 3, 'AVAILABLE'),
    (3, 4, '401', 4, 'AVAILABLE'),
    (3, 1, '102', 1, 'AVAILABLE')
ON CONFLICT (branch_id, room_number) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [GUARD] Adding double-booking prevention...'
-- ═══════════════════════════════════════════════════════════════════

-- btree_gist lets us use EXCLUDE on a mix of = and && (range overlap) operators
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking_rooms
    ADD CONSTRAINT no_double_booking
    EXCLUDE USING gist (
        room_id   WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
    )
    WHERE (status <> 'CANCELLED');

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [INDEXES] Adding indexes for booking module...'
-- ═══════════════════════════════════════════════════════════════════

-- bookings table — common filter columns
CREATE INDEX IF NOT EXISTS idx_bookings_branch    ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest     ON bookings(booked_by_guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff     ON bookings(booked_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status);

-- booking_rooms table — the most queried table in your module
CREATE INDEX IF NOT EXISTS idx_brooms_booking    ON booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_brooms_room       ON booking_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_brooms_guest      ON booking_rooms(primary_guest_id);
CREATE INDEX IF NOT EXISTS idx_brooms_dates      ON booking_rooms(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_brooms_status     ON booking_rooms(status);

-- guests table — for fast search by email/name
CREATE INDEX IF NOT EXISTS idx_guests_email      ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_name       ON guests(first_name, last_name);

-- accompanying_guests — for lookup by booking_room
CREATE INDEX IF NOT EXISTS idx_accompanying_broom ON accompanying_guests(booking_room_id);

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [FUNCTION] Creating fn_check_room_availability...'
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_check_room_availability(
    p_room_id      INT,
    p_check_in     DATE,
    p_check_out    DATE,
    p_exclude_booking_room_id UUID DEFAULT NULL  -- used when modifying an existing booking
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    -- Validate: check-out must be after check-in
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'check_out_date must be after check_in_date';
    END IF;

    -- Count any active bookings on this room that overlap the requested dates
    SELECT COUNT(*) INTO v_conflict_count
    FROM booking_rooms
    WHERE room_id        = p_room_id
      AND status        <> 'CANCELLED'
      AND booking_room_id <> COALESCE(p_exclude_booking_room_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND check_in_date  < p_check_out   -- existing booking starts before new one ends
      AND check_out_date > p_check_in;   -- existing booking ends after new one starts

    -- Return TRUE (available) if no conflicts found
    RETURN v_conflict_count = 0;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
\echo '>>> [VIEW] Creating v_booking_details...'
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_booking_details AS
SELECT
    -- Booking header
    b.booking_id,
    b.status              AS booking_status,
    b.notes,
    b.created_at          AS booked_at,

    -- Branch
    br.branch_id,
    br.branch_name,
    br.city               AS branch_city,

    -- Who made the booking
    g_booker.guest_id     AS booker_guest_id,
    g_booker.first_name   AS booker_first_name,
    g_booker.last_name    AS booker_last_name,
    g_booker.email        AS booker_email,
    g_booker.phone        AS booker_phone,

    -- Room line item
    br_room.booking_room_id,
    br_room.check_in_date,
    br_room.check_out_date,
    (br_room.check_out_date - br_room.check_in_date) AS nights,
    br_room.rate_at_booking,
    (br_room.check_out_date - br_room.check_in_date)
        * br_room.rate_at_booking    AS room_total,
    br_room.status        AS room_status,

    -- Room details
    r.room_id,
    r.room_number,
    r.floor,

    -- Room type
    rt.type_name          AS room_type,
    rt.capacity,

    -- Meal plan
    mp.plan_name          AS meal_plan,
    mp.price_per_night    AS meal_price_per_night,

    -- Primary guest on this room
    g_primary.guest_id    AS primary_guest_id,
    g_primary.first_name  AS primary_guest_first_name,
    g_primary.last_name   AS primary_guest_last_name

FROM bookings b
JOIN branches   br         ON b.branch_id           = br.branch_id
LEFT JOIN guests g_booker  ON b.booked_by_guest_id  = g_booker.guest_id
JOIN booking_rooms br_room ON b.booking_id           = br_room.booking_id
JOIN rooms         r       ON br_room.room_id        = r.room_id
JOIN room_types    rt      ON br_room.room_type_id   = rt.room_type_id
JOIN meal_plans    mp      ON br_room.plan_id        = mp.plan_id
JOIN guests  g_primary     ON br_room.primary_guest_id = g_primary.guest_id;
