-- ═══════════════════════════════════════════════════════════════════
-- Sky Nest Hotel — Database Initialization Script
-- Runs automatically on first `docker compose up`
-- Order matters: schema first, then migrations 001 → 008
-- ═══════════════════════════════════════════════════════════════════

\echo '>>> [1/9] Loading base schema (enums + core tables)...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── Enums ─────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'GUEST', 'RECEPTIONIST', 'SERVICE_STAFF', 'MANAGER', 'ADMINISTRATOR', 'DBA'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ── Core Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    role          user_role DEFAULT 'RECEPTIONIST',
    is_active     BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rooms (
    id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    number          VARCHAR(20) UNIQUE NOT NULL,
    type            room_type NOT NULL,
    status          room_status DEFAULT 'AVAILABLE',
    floor           INT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    max_guests      INT DEFAULT 2,
    amenities       TEXT[] DEFAULT '{}',
    description     TEXT,
    images          TEXT[] DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
