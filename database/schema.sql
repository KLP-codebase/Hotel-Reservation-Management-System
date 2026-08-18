-- ── Raw PostgreSQL DDL Schema ──────────────────────────────────────────────────
-- Hotel Reservation Management System
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loyalty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_source AS ENUM ('DIRECT', 'BOOKING_COM', 'AGODA', 'WALK_IN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'RECEPTIONIST',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    nationality VARCHAR(100),
    passport_number VARCHAR(100) UNIQUE,
    date_of_birth DATE,
    loyalty_tier loyalty_tier DEFAULT 'BRONZE',
    loyalty_points INT DEFAULT 0,
    total_stays INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    number VARCHAR(20) UNIQUE NOT NULL,
    type room_type NOT NULL,
    status room_status DEFAULT 'AVAILABLE',
    floor INT NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_guests INT DEFAULT 2,
    amenities TEXT[] DEFAULT '{}',
    description TEXT,
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_ref VARCHAR(50) UNIQUE NOT NULL,
    guest_id VARCHAR(36) NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status booking_status DEFAULT 'PENDING',
    payment_status payment_status DEFAULT 'PENDING',
    adults INT DEFAULT 1,
    children INT DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    source booking_source DEFAULT 'DIRECT',
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_id VARCHAR(36) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    loyalty_discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    line_items JSONB DEFAULT '[]'::jsonb,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
