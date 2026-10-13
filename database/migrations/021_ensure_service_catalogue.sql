-- ============================================================================
-- Migration 021: Ensure Service Catalogue & Add-on Services Schema & Seeds
-- ============================================================================
-- Guarantees the existence of the service_catalogue table, its columns,
-- unique constraint, and curated add-on services for all branches
-- (Colombo, Kandy, Galle).
-- ============================================================================

-- 1. Ensure service_catalogue table exists
CREATE TABLE IF NOT EXISTS service_catalogue (
    service_id   SERIAL PRIMARY KEY,
    branch_id    UUID REFERENCES branches(branch_id) ON DELETE CASCADE,
    service_name VARCHAR(200) NOT NULL,
    category     VARCHAR(100),
    base_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure columns exist if table was created in an older revision
ALTER TABLE service_catalogue ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE service_catalogue ADD COLUMN IF NOT EXISTS service_name VARCHAR(200);
ALTER TABLE service_catalogue ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE service_catalogue ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE service_catalogue ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Ensure unique constraint on (branch_id, service_name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname IN ('uq_branch_service', 'uq_branch_service_name')
    ) THEN
        ALTER TABLE service_catalogue ADD CONSTRAINT uq_branch_service UNIQUE (branch_id, service_name);
    END IF;
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 4. Ensure service_usage table exists with folio columns
CREATE TABLE IF NOT EXISTS service_usage (
    usage_id         SERIAL PRIMARY KEY,
    booking_room_id  UUID,
    service_id       INT REFERENCES service_catalogue(service_id) ON DELETE SET NULL,
    quantity         INT DEFAULT 1,
    price_at_usage   NUMERIC(10, 2) NOT NULL,
    notes            TEXT,
    appointment_time VARCHAR(5),
    meal_time        VARCHAR(20),
    used_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE service_usage ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE service_usage ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(5);
ALTER TABLE service_usage ADD COLUMN IF NOT EXISTS meal_time VARCHAR(20);

-- 5. Seed Curated Services for all active branches dynamically by branch name
DO $$
DECLARE
    v_colombo_id UUID;
    v_kandy_id   UUID;
    v_galle_id   UUID;
BEGIN
    SELECT branch_id INTO v_colombo_id FROM branches WHERE branch_name ILIKE '%Colombo%' LIMIT 1;
    SELECT branch_id INTO v_kandy_id   FROM branches WHERE branch_name ILIKE '%Kandy%'   LIMIT 1;
    SELECT branch_id INTO v_galle_id   FROM branches WHERE branch_name ILIKE '%Galle%'   LIMIT 1;

    -- Seed Colombo Services (6 Luxury Add-ons)
    IF v_colombo_id IS NOT NULL THEN
        INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
            (v_colombo_id, 'Airport Chauffeur Transfer',    'Transport',    45.00, true),
            (v_colombo_id, 'Ayurvedic Full Body Spa',       'Wellness',     75.00, true),
            (v_colombo_id, 'Luxury Champagne Breakfast',    'Dining',       30.00, true),
            (v_colombo_id, 'Express Laundry & Pressing',    'Housekeeping', 20.00, true),
            (v_colombo_id, 'Premium Suite Minibar Restock',  'Dining',       50.00, true),
            (v_colombo_id, 'Colombo Heritage & City Tour',  'Experience',   40.00, true)
        ON CONFLICT (branch_id, service_name) DO UPDATE SET base_price = EXCLUDED.base_price, is_active = EXCLUDED.is_active;
    END IF;

    -- Seed Galle Services (6 Luxury Add-ons)
    IF v_galle_id IS NOT NULL THEN
        INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
            (v_galle_id, 'Whale Watching Excursion',      'Experience',   85.00, true),
            (v_galle_id, 'Fort Walking Tour & High Tea',   'Experience',   35.00, true),
            (v_galle_id, 'Airport Chauffeur Transfer',    'Transport',    75.00, true),
            (v_galle_id, 'Ayurvedic Oceanfront Spa',      'Wellness',     80.00, true),
            (v_galle_id, 'Luxury Champagne Breakfast',    'Dining',       30.00, true),
            (v_galle_id, 'Express Laundry & Pressing',    'Housekeeping', 20.00, true)
        ON CONFLICT (branch_id, service_name) DO UPDATE SET base_price = EXCLUDED.base_price, is_active = EXCLUDED.is_active;
    END IF;

    -- Seed Kandy Services (6 Luxury Add-ons)
    IF v_kandy_id IS NOT NULL THEN
        INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
            (v_kandy_id, 'Tea Estate Guided Tour',        'Experience',   40.00, true),
            (v_kandy_id, 'Ayurvedic Herbal Treatment',    'Wellness',     65.00, true),
            (v_kandy_id, 'Kandy Lake Sunset Cruise',      'Experience',   30.00, true),
            (v_kandy_id, 'Airport Chauffeur Transfer',    'Transport',    55.00, true),
            (v_kandy_id, 'Luxury Champagne Breakfast',    'Dining',       30.00, true),
            (v_kandy_id, 'Express Laundry & Pressing',    'Housekeeping', 20.00, true)
        ON CONFLICT (branch_id, service_name) DO UPDATE SET base_price = EXCLUDED.base_price, is_active = EXCLUDED.is_active;
    END IF;
END $$;
