-- ── Migration 009: Billing, Invoicing & Sri Lankan Statutory Taxes ──────────
-- Hotel Reservation Management System — Module: Person 4 & Person 5
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure prerequisite billing & tax tables exist before alterations
CREATE TABLE IF NOT EXISTS tax_configurations (
    tax_id SERIAL PRIMARY KEY,
    tax_name VARCHAR(50) NOT NULL,
    tax_percentage NUMERIC(6, 4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    CONSTRAINT uq_tax_name_effective_from UNIQUE (tax_name, effective_from)
);

CREATE TABLE IF NOT EXISTS service_catalogue (
    service_id SERIAL PRIMARY KEY,
    branch_id UUID REFERENCES branches(branch_id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    base_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_branch_service_name UNIQUE (branch_id, service_name)
);

CREATE TABLE IF NOT EXISTS invoices (
    invoice_id SERIAL PRIMARY KEY,
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE CASCADE,
    booking_room_id UUID,
    total_room_charges NUMERIC(12, 2) DEFAULT 0.00,
    total_service_charges NUMERIC(12, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    tdl_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    net_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_status payment_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_usage (
    usage_id SERIAL PRIMARY KEY,
    booking_room_id UUID,
    service_id INT REFERENCES service_catalogue(service_id),
    quantity INT DEFAULT 1,
    price_at_usage NUMERIC(10, 2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure TDL column exists if table pre-existed
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tdl_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 3. Seed 4 Sri Lankan Statutory Hospitality Taxes
INSERT INTO tax_configurations (tax_name, tax_percentage, is_active, effective_from, effective_to) VALUES
    ('Service Charge', 0.1000, true, '2024-01-01', NULL),
    ('TDL',            0.0100, true, '2024-01-01', NULL),
    ('SSCL',           0.0250, true, '2024-01-01', NULL),
    ('VAT',            0.1800, true, '2024-01-01', NULL)
ON CONFLICT (tax_name, effective_from)
DO UPDATE SET
    tax_percentage = EXCLUDED.tax_percentage,
    is_active      = EXCLUDED.is_active,
    effective_to   = EXCLUDED.effective_to;

-- Deactivate legacy 'SSC Levy' row if present
UPDATE tax_configurations SET is_active = false WHERE tax_name = 'SSC Levy';

-- 4. Seed initial hotel services using dynamic branch UUID lookups
DO $$
DECLARE
    v_colombo_id UUID;
    v_kandy_id   UUID;
    v_galle_id   UUID;
BEGIN
    SELECT branch_id INTO v_colombo_id FROM branches WHERE branch_name LIKE '%Colombo%' LIMIT 1;
    SELECT branch_id INTO v_kandy_id   FROM branches WHERE branch_name LIKE '%Kandy%'   LIMIT 1;
    SELECT branch_id INTO v_galle_id   FROM branches WHERE branch_name LIKE '%Galle%'   LIMIT 1;

    -- Seed Colombo Services
    IF v_colombo_id IS NOT NULL THEN
        INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
            (v_colombo_id, 'Airport Chauffeur Transfer', 'Transport', 45.00, true),
            (v_colombo_id, 'Ayurvedic Full Body Spa',    'Wellness',  75.00, true),
            (v_colombo_id, 'Luxury Champagne Breakfast', 'Dining',    30.00, true),
            (v_colombo_id, 'Express Laundry & Pressing', 'Housekeeping', 20.00, true),
            (v_colombo_id, 'Premium Suite Minibar Restock','Dining',  50.00, true)
        ON CONFLICT (branch_id, service_name) DO UPDATE SET base_price = EXCLUDED.base_price, is_active = EXCLUDED.is_active;
    END IF;

    -- Seed Kandy Services
    IF v_kandy_id IS NOT NULL THEN
        INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
            (v_kandy_id, 'Airport Chauffeur Transfer', 'Transport', 55.00, true),
            (v_kandy_id, 'Tea Estate Guided Tour',     'Experience',40.00, true),
            (v_kandy_id, 'Ayurvedic Herbal Treatment', 'Wellness',  65.00, true)
        ON CONFLICT (branch_id, service_name) DO UPDATE SET base_price = EXCLUDED.base_price, is_active = EXCLUDED.is_active;
    END IF;

    -- Seed Galle Services
    IF v_galle_id IS NOT NULL THEN
        INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
            (v_galle_id, 'Whale Watching Excursion',   'Experience',85.00, true),
            (v_galle_id, 'Fort Walking Tour & High Tea','Experience',35.00, true)
        ON CONFLICT (branch_id, service_name) DO UPDATE SET base_price = EXCLUDED.base_price, is_active = EXCLUDED.is_active;
    END IF;
END $$;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tax_active_dates   ON tax_configurations(is_active, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_invoices_b_room    ON invoices(booking_room_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_room ON service_usage(booking_room_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice   ON payments(invoice_id);