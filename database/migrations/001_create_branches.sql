-- ── Migration 001: Create branches table ──────────────────────────────────────
-- Hotel Reservation Management System
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS branches (
    branch_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_name VARCHAR(100) UNIQUE NOT NULL,
    city        VARCHAR(100) NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Seeds ─────────────────────────────────────────────────────────────────────
INSERT INTO branches (branch_name, city, address, phone, email) VALUES
    ('Sky Nest Colombo',  'Colombo', '45 Galle Road, Colombo 03',          '+94 11 234 5678', 'colombo@skynest.lk'),
    ('Sky Nest Kandy',    'Kandy',   '12 Dalada Veediya, Kandy',           '+94 81 234 5678', 'kandy@skynest.lk'),
    ('Sky Nest Galle',    'Galle',   '8 Church Street, Galle Fort, Galle', '+94 91 234 5678', 'galle@skynest.lk')
ON CONFLICT (branch_name) DO NOTHING;
