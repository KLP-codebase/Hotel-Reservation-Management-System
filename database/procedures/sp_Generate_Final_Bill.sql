-- ═══════════════════════════════════════════════════════════════════════════════
-- sp_generate_final_bill (PL/pgSQL Function / Procedure)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Reconciled for SkyNest HRGSMS 17-table IEEE SRS compliant schema.
-- Calculates the final invoice for a room stay (booking_rooms line item).
-- Enforces:
--   1. Frozen room rate (rate_at_booking × nights)
--   2. Frozen service usage prices (quantity × price_at_usage)
--   3. Versioned statutory Sri Lankan 4-tax cascade:
--        - Service Charge (10%)
--        - Tourism Development Levy (TDL) (1%)
--        - Social Security Contribution Levy (SSCL) (2.5%)
--        - Value Added Tax (VAT) (18%) on (Base + TDL + SSCL)
--   4. Atomic upsert into the 1:1 invoices table (status: 'OPEN')
--
-- Parameters:
--   p_booking_room_id UUID - The specific room stay reservation
-- Returns:
--   UUID - The generated/updated invoice_id
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sp_generate_final_bill(p_booking_room_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_nights           INT;
  v_rate             NUMERIC(10,2);
  v_room_charges     NUMERIC(12,2);
  v_service_charges  NUMERIC(12,2);
  v_base             NUMERIC(12,2);
  v_sc_pct           NUMERIC(5,4);
  v_tdl_pct          NUMERIC(5,4);
  v_sscl_pct         NUMERIC(5,4);
  v_vat_pct          NUMERIC(5,4);
  v_sc_amt           NUMERIC(12,2);
  v_tdl_amt          NUMERIC(12,2);
  v_sscl_amt         NUMERIC(12,2);
  v_vat_amt          NUMERIC(12,2);
  v_total            NUMERIC(12,2);
  v_invoice_id       UUID;
BEGIN
  -- 1. Calculate room charges (frozen rate_at_booking x nights)
  SELECT (check_out_date - check_in_date), rate_at_booking
    INTO v_nights, v_rate
  FROM booking_rooms
  WHERE booking_room_id = p_booking_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_room % not found', p_booking_room_id;
  END IF;

  v_room_charges := v_nights * v_rate;

  -- 2. Calculate service charges (frozen price_at_usage, already snapshotted per B10)
  SELECT COALESCE(SUM(quantity * price_at_usage), 0)
    INTO v_service_charges
  FROM service_usage
  WHERE booking_room_id = p_booking_room_id;

  v_base := v_room_charges + v_service_charges;

  -- 3. Pull currently-effective statutory tax rates (B13: versioned configuration)
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

  IF v_sc_pct IS NULL OR v_tdl_pct IS NULL OR v_sscl_pct IS NULL OR v_vat_pct IS NULL THEN
    RAISE EXCEPTION 'One or more active tax_configurations rows missing for booking_room %', p_booking_room_id;
  END IF;

  -- Normalize tax percentages if stored as whole numbers (e.g., 10 vs 0.10)
  IF v_sc_pct > 1 THEN v_sc_pct := v_sc_pct / 100; END IF;
  IF v_tdl_pct > 1 THEN v_tdl_pct := v_tdl_pct / 100; END IF;
  IF v_sscl_pct > 1 THEN v_sscl_pct := v_sscl_pct / 100; END IF;
  IF v_vat_pct > 1 THEN v_vat_pct := v_vat_pct / 100; END IF;

  -- 4. Execute Template Method statutory tax cascade
  v_sc_amt   := ROUND(v_base * v_sc_pct, 2);
  v_tdl_amt  := ROUND(v_base * v_tdl_pct, 2);
  v_sscl_amt := ROUND(v_base * v_sscl_pct, 2);
  v_vat_amt  := ROUND((v_base + v_tdl_amt + v_sscl_amt) * v_vat_pct, 2);
  v_total    := v_base + v_sc_amt + v_tdl_amt + v_sscl_amt + v_vat_amt;

  -- 5. Upsert the 1:1 invoice record (B11)
  INSERT INTO invoices (
    booking_room_id, room_charges, service_charges,
    service_charge_tax, tdl_amount, ssc_amount, vat_amount,
    total_amount, status, generated_at
  ) VALUES (
    p_booking_room_id, v_room_charges, v_service_charges,
    v_sc_amt, v_tdl_amt, v_sscl_amt, v_vat_amt,
    v_total, 'OPEN', CURRENT_TIMESTAMP
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

COMMENT ON FUNCTION sp_generate_final_bill IS
  'Generates or recalculates the final bill for a room stay, computing the 4-tier Sri Lankan statutory tax cascade and upserting the invoice.';
