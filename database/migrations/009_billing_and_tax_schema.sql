-- ── Migration 009: Billing, Invoicing & Sri Lankan Statutory Taxes ──────────
-- Hotel Reservation Management System — Module: Person 4
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure invoices table has a column for TDL (Tourism Development Levy)
--    The cascading formula needs: Room + Services + SC + TDL + SSCL + VAT
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tdl_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Seed the 4 Sri Lankan Statutory Hospitality Taxes
--    Each has an effective_from date of 2024-01-01 and effective_to = NULL (currently active)
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

-- Deactivate legacy 'SSC Levy' row to standardize on 'SSCL'
UPDATE tax_configurations SET is_active = false WHERE tax_name = 'SSC Levy';

-- 3. Seed initial hotel services into service_catalogue
--    These services will be used by receptionists when guests order items
INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active) VALUES
    (1, 'Airport Chauffeur Transfer', 'Transport', 45.00, true),
    (1, 'Ayurvedic Full Body Spa',    'Wellness',  75.00, true),
    (1, 'Luxury Champagne Breakfast', 'Dining',    30.00, true),
    (1, 'Express Laundry & Pressing', 'Housekeeping', 20.00, true),
    (1, 'Premium Suite Minibar Restock','Dining',  50.00, true),
    (2, 'Airport Chauffeur Transfer', 'Transport', 55.00, true),
    (2, 'Tea Estate Guided Tour',     'Experience',40.00, true),
    (2, 'Ayurvedic Herbal Treatment', 'Wellness',  65.00, true),
    (3, 'Whale Watching Excursion',   'Experience',85.00, true),
    (3, 'Fort Walking Tour & High Tea','Experience',35.00, true)
ON CONFLICT (branch_id, service_name) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    is_active  = EXCLUDED.is_active;

-- 4. Create helpful performance indexes for billing queries
CREATE INDEX IF NOT EXISTS idx_tax_active_dates   ON tax_configurations(is_active, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_invoices_b_room    ON invoices(booking_room_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_room ON service_usage(booking_room_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice   ON payments(invoice_id);
