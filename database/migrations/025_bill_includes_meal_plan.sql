-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 025: One bill formula — spec tax cascade, meal plan in the base
-- ══════════════════════════════════════════════════════════════════════════════
-- The website, the front desk bill and sp_generate_final_bill computed different
-- totals (meal plan billed or not, compounding or not). All of them now follow
-- ARCHITECTURE.md §5.1 with the meal plan included in the base:
--
--   Base  = rate_at_booking × nights + meal plan price × nights + Σ services
--   SC    = Base × 10%          (exempt from VAT)
--   TDL   = Base × 1%
--   SSCL  = Base × 2.5%
--   VAT   = (Base + TDL + SSCL) × 18%
--   Total = Base + SC + TDL + SSCL + VAT
--
-- Every amount is rounded to cents the same way the TypeScript does, so the
-- function and the API agree to the cent. Nights are never fewer than one.
-- invoices.room_charges holds room tariff + meal plan (as the API stores it).
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION sp_generate_final_bill(p_booking_room_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_nights          INT;
  v_room_tariff     NUMERIC(12,2);
  v_meal_charges    NUMERIC(12,2);
  v_room_charges    NUMERIC(12,2);
  v_service_charges NUMERIC(12,2);
  v_base            NUMERIC(12,2);
  v_sc_pct          NUMERIC(6,4);
  v_tdl_pct         NUMERIC(6,4);
  v_sscl_pct        NUMERIC(6,4);
  v_vat_pct         NUMERIC(6,4);
  v_sc_amt          NUMERIC(12,2);
  v_tdl_amt         NUMERIC(12,2);
  v_sscl_amt        NUMERIC(12,2);
  v_vat_amt         NUMERIC(12,2);
  v_invoice_id      UUID;
BEGIN
  -- 1. Room tariff and meal plan (frozen rate_at_booking, B8)
  SELECT GREATEST(1, br.check_out_date - br.check_in_date),
         ROUND(GREATEST(1, br.check_out_date - br.check_in_date) * COALESCE(br.rate_at_booking, 0), 2),
         ROUND(GREATEST(1, br.check_out_date - br.check_in_date) * COALESCE(mp.price_per_night, 0), 2)
    INTO v_nights, v_room_tariff, v_meal_charges
    FROM booking_rooms br
    LEFT JOIN meal_plans mp ON mp.plan_id = br.plan_id
   WHERE br.booking_room_id = p_booking_room_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_room_charges := v_room_tariff + v_meal_charges;

  -- 2. Services (frozen price_at_usage, B10)
  SELECT ROUND(COALESCE(SUM(quantity * price_at_usage), 0), 2)
    INTO v_service_charges
    FROM service_usage
   WHERE booking_room_id = p_booking_room_id;

  v_base := v_room_charges + v_service_charges;

  -- 3. Currently effective statutory rates (B13), with the statutory fallbacks
  SELECT tax_percentage INTO v_sc_pct FROM tax_configurations
   WHERE UPPER(tax_name) IN ('SERVICE CHARGE', 'SERVICE_CHARGE') AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;
  SELECT tax_percentage INTO v_tdl_pct FROM tax_configurations
   WHERE UPPER(tax_name) IN ('TDL', 'TOURISM DEVELOPMENT LEVY') AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;
  SELECT tax_percentage INTO v_sscl_pct FROM tax_configurations
   WHERE UPPER(tax_name) IN ('SSCL', 'SSC LEVY', 'SOCIAL SECURITY CONTRIBUTION LEVY') AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;
  SELECT tax_percentage INTO v_vat_pct FROM tax_configurations
   WHERE UPPER(tax_name) IN ('VAT', 'VALUE ADDED TAX') AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  v_sc_pct   := COALESCE(v_sc_pct, 0.10);
  v_tdl_pct  := COALESCE(v_tdl_pct, 0.01);
  v_sscl_pct := COALESCE(v_sscl_pct, 0.025);
  v_vat_pct  := COALESCE(v_vat_pct, 0.18);
  IF v_sc_pct   > 1 THEN v_sc_pct   := v_sc_pct / 100;   END IF;
  IF v_tdl_pct  > 1 THEN v_tdl_pct  := v_tdl_pct / 100;  END IF;
  IF v_sscl_pct > 1 THEN v_sscl_pct := v_sscl_pct / 100; END IF;
  IF v_vat_pct  > 1 THEN v_vat_pct  := v_vat_pct / 100;  END IF;

  -- 4. Cascade (§5.1): SC exempt from VAT
  v_sc_amt   := ROUND(v_base * v_sc_pct, 2);
  v_tdl_amt  := ROUND(v_base * v_tdl_pct, 2);
  v_sscl_amt := ROUND(v_base * v_sscl_pct, 2);
  v_vat_amt  := ROUND((v_base + v_tdl_amt + v_sscl_amt) * v_vat_pct, 2);

  -- 5. One invoice per room line (B11)
  INSERT INTO invoices (
    booking_room_id, room_charges, service_charges,
    service_charge_tax, tdl_amount, ssc_amount, vat_amount,
    total_amount, status, generated_at
  ) VALUES (
    p_booking_room_id, v_room_charges, v_service_charges,
    v_sc_amt, v_tdl_amt, v_sscl_amt, v_vat_amt,
    v_base + v_sc_amt + v_tdl_amt + v_sscl_amt + v_vat_amt, 'OPEN', CURRENT_TIMESTAMP
  )
  ON CONFLICT (booking_room_id) DO UPDATE SET
    room_charges       = EXCLUDED.room_charges,
    service_charges    = EXCLUDED.service_charges,
    service_charge_tax = EXCLUDED.service_charge_tax,
    tdl_amount         = EXCLUDED.tdl_amount,
    ssc_amount         = EXCLUDED.ssc_amount,
    vat_amount         = EXCLUDED.vat_amount,
    total_amount       = EXCLUDED.total_amount,
    generated_at       = CURRENT_TIMESTAMP
  RETURNING invoice_id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- Early check-out refunds an overpayment as a negative payment, so a payment may
-- be negative but never zero. (init.sql declared CHECK (amount > 0).) NOT VALID:
-- existing rows are not re-checked.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'payments'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) ~* 'amount\s*>\s*\(?0'
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_nonzero;
ALTER TABLE payments ADD CONSTRAINT payments_amount_nonzero CHECK (amount <> 0) NOT VALID;

COMMIT;
