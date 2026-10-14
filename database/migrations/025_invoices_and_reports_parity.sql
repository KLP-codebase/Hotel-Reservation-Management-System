-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 023: Invoices, Rooms & Reports Schema Parity Guarantee
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotent schema reconciliation for production and development:
-- 1. Harmonizes invoices table columns (room_charges, service_charges, generated_at, etc.)
-- 2. Ensures uq_invoices_booking_room_id UNIQUE constraint exists
-- 3. Harmonizes rooms table columns (number, room_number, type)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Invoices Table Parity
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_room_id    UUID,
    room_charges       NUMERIC(12, 2) DEFAULT 0.00,
    service_charges    NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount    NUMERIC(12, 2) DEFAULT 0.00,
    service_charge_tax NUMERIC(12, 2) DEFAULT 0.00,
    tdl_amount         NUMERIC(12, 2) DEFAULT 0.00,
    ssc_amount         NUMERIC(12, 2) DEFAULT 0.00,
    vat_amount         NUMERIC(12, 2) DEFAULT 0.00,
    total_amount       NUMERIC(12, 2) DEFAULT 0.00,
    status             VARCHAR(50)    DEFAULT 'OPEN',
    generated_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS room_charges       NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_charges    NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_charge_tax NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tdl_amount         NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ssc_amount         NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount         NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount       NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status             VARCHAR(50)    DEFAULT 'OPEN';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS generated_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'total_room_charges') THEN
        UPDATE invoices SET room_charges = total_room_charges WHERE room_charges IS NULL OR room_charges = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'total_service_charges') THEN
        UPDATE invoices SET service_charges = total_service_charges WHERE service_charges IS NULL OR service_charges = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'net_amount') THEN
        UPDATE invoices SET total_amount = net_amount WHERE total_amount IS NULL OR total_amount = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
        UPDATE invoices SET generated_at = created_at WHERE generated_at IS NULL;
    END IF;
END $$;

DO $$ BEGIN
    ALTER TABLE invoices ADD CONSTRAINT uq_invoices_booking_room_id UNIQUE (booking_room_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 2. Rooms Table Parity
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS number VARCHAR(20);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);
UPDATE rooms SET number = room_number WHERE number IS NULL AND room_number IS NOT NULL;
UPDATE rooms SET room_number = number WHERE room_number IS NULL AND number IS NOT NULL;

DO $$ BEGIN
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS type VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'type' AND data_type = 'USER-DEFINED'
    ) THEN
        UPDATE rooms r 
        SET type = rt.type_name::room_type 
        FROM room_types rt 
        WHERE r.room_type_id = rt.room_type_id AND r.type IS NULL;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'type'
    ) THEN
        UPDATE rooms r 
        SET type = rt.type_name 
        FROM room_types rt 
        WHERE r.room_type_id = rt.room_type_id AND r.type IS NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;
