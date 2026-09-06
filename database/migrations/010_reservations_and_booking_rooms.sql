-- ── Migration 010: Reservations, Booking Engine & Room Line Items ──────────────
-- Hotel Reservation Management System — Module: Person 3 (Ashinthya)
-- Aligns Railway DB with Group 40's 17-Table BCNF Architecture.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure room_types catalogue table exists and is seeded
CREATE TABLE IF NOT EXISTS room_types (
    room_type_id    SERIAL PRIMARY KEY,
    type_name       VARCHAR(100) UNIQUE NOT NULL,
    base_daily_rate NUMERIC(10,2) NOT NULL CHECK (base_daily_rate > 0),
    capacity        SMALLINT NOT NULL CHECK (capacity > 0),
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO room_types (type_name, base_daily_rate, capacity, description) VALUES
    ('STANDARD',     120.00, 2, 'Comfortable standard room with garden view'),
    ('DELUXE',       180.00, 2, 'Spacious deluxe room with partial ocean view'),
    ('SUITE',        280.00, 4, 'Luxury suite with living area and full ocean view'),
    ('PRESIDENTIAL', 500.00, 6, 'Top-floor presidential suite with private terrace')
ON CONFLICT (type_name) DO UPDATE SET
    base_daily_rate = EXCLUDED.base_daily_rate,
    capacity        = EXCLUDED.capacity;

-- 2. Ensure meal_plans catalogue table exists and is seeded
CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id         SERIAL PRIMARY KEY,
    plan_name       VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0
);

INSERT INTO meal_plans (plan_id, plan_name, description, price_per_night) VALUES
    (1, 'Room Only',       'No meals included',             0.00),
    (2, 'Bed & Breakfast', 'Daily breakfast included',      25.00),
    (3, 'Half Board',      'Daily breakfast and dinner',    55.00),
    (4, 'Full Board',      'Breakfast, lunch, and dinner',  80.00)
ON CONFLICT (plan_id) DO UPDATE SET
    price_per_night = EXCLUDED.price_per_night;

-- 3. Ensure guests table supports both id and guest_id for full compatibility
ALTER TABLE guests ADD COLUMN IF NOT EXISTS guest_id UUID DEFAULT uuid_generate_v4();
UPDATE guests SET guest_id = id::uuid WHERE guest_id IS NULL AND id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Evolve bookings table to support Group 40 multi-room reservation model
-- Relax legacy columns that moved to booking_rooms
DO $$ BEGIN
    ALTER TABLE bookings ALTER COLUMN room_id DROP NOT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ALTER COLUMN check_in DROP NOT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ALTER COLUMN check_out DROP NOT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ALTER COLUMN total_amount DROP NOT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ALTER COLUMN guest_id DROP NOT NULL;
EXCEPTION WHEN others THEN null; END $$;

-- Add Group 40 reservation columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_id UUID DEFAULT uuid_generate_v4() UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(branch_id) ON DELETE RESTRICT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_by_guest_id VARCHAR(36);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_by_staff_id UUID REFERENCES staff(staff_id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Defaults for convenience
ALTER TABLE bookings ALTER COLUMN booking_ref SET DEFAULT ('SN-' || upper(substr(md5(random()::text), 1, 8)));

-- 5. Create booking_rooms table (Child line items for bookings)
CREATE TABLE IF NOT EXISTS booking_rooms (
    booking_room_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id       UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    primary_guest_id VARCHAR(36) NOT NULL,
    room_type_id     INT REFERENCES room_types(room_type_id),
    room_id          VARCHAR(36) REFERENCES rooms(id) ON DELETE RESTRICT,
    plan_id          INT REFERENCES meal_plans(plan_id) ON DELETE RESTRICT,
    check_in_date    DATE NOT NULL,
    check_out_date   DATE NOT NULL,
    rate_at_booking  NUMERIC(10,2) NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (check_out_date > check_in_date)
);

-- 6. Create accompanying_guests table (Guest verification)
CREATE TABLE IF NOT EXISTS accompanying_guests (
    verification_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id      UUID NOT NULL REFERENCES booking_rooms(booking_room_id) ON DELETE CASCADE,
    first_name           VARCHAR(100) NOT NULL,
    last_name            VARCHAR(100) NOT NULL,
    id_passport_no       VARCHAR(100) NOT NULL,
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_staff_id UUID REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- 7. Performance Indexes for the Booking Module
CREATE INDEX IF NOT EXISTS idx_bookings_branch    ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest     ON bookings(booked_by_guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_brooms_booking     ON booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_brooms_room        ON booking_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_brooms_dates       ON booking_rooms(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_brooms_status      ON booking_rooms(status);

-- 8. Create v_booking_details view (Facade over bookings + booking_rooms + rooms + guests)
CREATE OR REPLACE VIEW v_booking_details AS
SELECT
    b.booking_id,
    b.booking_ref,
    b.status              AS booking_status,
    b.notes,
    b.created_at          AS booked_at,
    br.branch_id,
    br.branch_name,
    br.city               AS branch_city,
    g_booker.id           AS booker_guest_id,
    g_booker.first_name   AS booker_first_name,
    g_booker.last_name    AS booker_last_name,
    g_booker.email        AS booker_email,
    g_booker.phone        AS booker_phone,
    br_room.booking_room_id,
    br_room.check_in_date,
    br_room.check_out_date,
    (br_room.check_out_date - br_room.check_in_date) AS nights,
    br_room.rate_at_booking,
    (br_room.check_out_date - br_room.check_in_date) * br_room.rate_at_booking AS room_total,
    br_room.status        AS room_status,
    r.id                  AS room_id,
    r.number              AS room_number,
    r.floor,
    COALESCE(rt.type_name, r.type::text) AS room_type,
    COALESCE(rt.capacity, r.max_guests)  AS capacity,
    COALESCE(mp.plan_name, 'Room Only')  AS meal_plan,
    COALESCE(mp.price_per_night, 0.00)   AS meal_price_per_night,
    g_primary.id          AS primary_guest_id,
    g_primary.first_name  AS primary_guest_first_name,
    g_primary.last_name   AS primary_guest_last_name
FROM bookings b
JOIN branches br           ON b.branch_id = br.branch_id
LEFT JOIN guests g_booker  ON b.booked_by_guest_id = g_booker.id
JOIN booking_rooms br_room ON b.booking_id = br_room.booking_id
LEFT JOIN rooms r          ON br_room.room_id = r.id
LEFT JOIN room_types rt    ON br_room.room_type_id = rt.room_type_id
LEFT JOIN meal_plans mp    ON br_room.plan_id = mp.plan_id
LEFT JOIN guests g_primary ON br_room.primary_guest_id = g_primary.id;
