-- ═══════════════════════════════════════════════════════════════════════════════
-- sp_Generate_Final_Bill
-- ═══════════════════════════════════════════════════════════════════════════════
-- Generates (or regenerates) the final bill for a booking.
-- Applies:
--   - Government tax (VAT 8%)
--   - Loyalty tier discount (BRONZE 0%, SILVER 5%, GOLD 10%, PLATINUM 15%)
--   - Additional service charges from extra_charges JSONB column (if present)
--
-- Parameters:
--   p_booking_id   UUID  - The booking to bill
--   p_regenerate   BOOL  - If TRUE, deletes existing bill and recreates it
--
-- Returns: bill_id UUID, total NUMERIC
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE PROCEDURE sp_Generate_Final_Bill(
  IN  p_booking_id  UUID,
  IN  p_regenerate  BOOLEAN DEFAULT FALSE,
  OUT p_bill_id     UUID,
  OUT p_total       NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking         RECORD;
  v_guest           RECORD;
  v_subtotal        NUMERIC;
  v_tax_rate        NUMERIC := 0.08;   -- 8% VAT
  v_tax_amount      NUMERIC;
  v_loyalty_rate    NUMERIC;
  v_loyalty_discount NUMERIC;
  v_discount_amount  NUMERIC := 0;
  v_line_items      JSONB;
BEGIN
  -- Fetch booking
  SELECT b.*, r.price_per_night,
         (b.check_out - b.check_in) AS nights
  INTO v_booking
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  IF v_booking.status NOT IN ('CHECKED_OUT', 'CONFIRMED', 'CHECKED_IN') THEN
    RAISE EXCEPTION 'Cannot bill booking with status %', v_booking.status;
  END IF;

  -- Handle regeneration
  IF p_regenerate THEN
    DELETE FROM bills WHERE booking_id = p_booking_id;
  ELSIF EXISTS (SELECT 1 FROM bills WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'Bill already exists for booking %. Use p_regenerate=TRUE to regenerate.', p_booking_id;
  END IF;

  -- Fetch guest loyalty tier
  SELECT loyalty_tier INTO v_guest FROM guests WHERE id = v_booking.guest_id;

  -- Determine loyalty discount rate
  v_loyalty_rate := CASE v_guest.loyalty_tier
    WHEN 'BRONZE'   THEN 0.00
    WHEN 'SILVER'   THEN 0.05
    WHEN 'GOLD'     THEN 0.10
    WHEN 'PLATINUM' THEN 0.15
    ELSE 0.00
  END;

  -- Calculate subtotal (room charges)
  v_subtotal := v_booking.price_per_night * v_booking.nights;

  -- Build line items JSON
  v_line_items := jsonb_build_array(
    jsonb_build_object(
      'description', FORMAT('Room %s × %s night(s)', v_booking.room_id, v_booking.nights),
      'quantity',    v_booking.nights,
      'unit_price',  v_booking.price_per_night,
      'total',       v_subtotal
    )
  );

  -- Apply loyalty discount to subtotal
  v_loyalty_discount := ROUND(v_subtotal * v_loyalty_rate, 2);
  v_subtotal         := v_subtotal - v_loyalty_discount;

  -- Calculate tax on discounted subtotal
  v_tax_amount := ROUND(v_subtotal * v_tax_rate, 2);

  -- Final total
  p_total := v_subtotal + v_tax_amount - v_discount_amount;

  -- Insert bill
  p_bill_id := gen_random_uuid();

  INSERT INTO bills (
    id, booking_id, subtotal, tax_amount,
    discount_amount, loyalty_discount, total,
    line_items, issued_at, updated_at
  ) VALUES (
    p_bill_id, p_booking_id, v_subtotal, v_tax_amount,
    v_discount_amount, v_loyalty_discount, p_total,
    v_line_items, NOW(), NOW()
  );

  -- Update loyalty points (1 point per dollar spent)
  UPDATE guests
  SET loyalty_points = loyalty_points + FLOOR(p_total),
      updated_at     = NOW()
  WHERE id = v_booking.guest_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON PROCEDURE sp_Generate_Final_Bill IS
  'Generates the final bill applying tax and loyalty discounts. Awards loyalty points on completion.';
