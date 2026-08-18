-- ═══════════════════════════════════════════════════════════════════════════════
-- sp_CreateBooking
-- ═══════════════════════════════════════════════════════════════════════════════
-- Atomically creates a new booking after verifying room availability.
-- Uses advisory locks to prevent race conditions in high-concurrency scenarios.
-- Calls function_Check_Room_Availability internally before inserting.
--
-- Parameters:
--   p_guest_id         UUID
--   p_room_id          UUID
--   p_check_in         DATE
--   p_check_out        DATE
--   p_adults           INTEGER
--   p_children         INTEGER
--   p_special_requests TEXT
--   p_source           TEXT  (DIRECT | BOOKING_COM | AGODA | WALK_IN)
--
-- Returns: booking_id UUID, booking_ref TEXT, total_amount NUMERIC
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE PROCEDURE sp_CreateBooking(
  IN  p_guest_id         UUID,
  IN  p_room_id          UUID,
  IN  p_check_in         DATE,
  IN  p_check_out        DATE,
  IN  p_adults           INTEGER,
  IN  p_children         INTEGER DEFAULT 0,
  IN  p_special_requests TEXT    DEFAULT NULL,
  IN  p_source           TEXT    DEFAULT 'DIRECT',
  OUT p_booking_id       UUID,
  OUT p_booking_ref      TEXT,
  OUT p_total_amount     NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_price_per_night NUMERIC;
  v_nights          INTEGER;
  v_lock_key        BIGINT;
BEGIN
  -- Acquire advisory lock scoped to the room (prevents double booking under load)
  v_lock_key := hashtext(p_room_id::TEXT);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Verify availability (also enforced by trigger, but check here for better error message)
  IF NOT function_Check_Room_Availability(p_room_id, p_check_in, p_check_out) THEN
    RAISE EXCEPTION 'Room is not available for the requested dates (% to %)',
      p_check_in, p_check_out;
  END IF;

  -- Fetch room price
  SELECT price_per_night INTO v_price_per_night
  FROM rooms
  WHERE id = p_room_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room % not found or inactive', p_room_id;
  END IF;

  -- Verify guest exists
  PERFORM 1 FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest % not found', p_guest_id;
  END IF;

  -- Calculate totals
  v_nights       := (p_check_out - p_check_in);
  p_total_amount := v_price_per_night * v_nights;

  -- Generate booking reference (YYYYMMDD-RAND)
  p_booking_ref  := TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

  -- Insert booking
  p_booking_id := gen_random_uuid();

  INSERT INTO bookings (
    id, booking_ref, guest_id, room_id,
    check_in, check_out, adults, children,
    total_amount, special_requests, source,
    status, payment_status, created_at, updated_at
  ) VALUES (
    p_booking_id, p_booking_ref, p_guest_id, p_room_id,
    p_check_in, p_check_out, p_adults, p_children,
    p_total_amount, p_special_requests, p_source::BookingSource,
    'CONFIRMED', 'PENDING', NOW(), NOW()
  );

  -- Update room status to RESERVED
  UPDATE rooms SET status = 'RESERVED', updated_at = NOW()
  WHERE id = p_room_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON PROCEDURE sp_CreateBooking IS
  'Atomically creates a booking with advisory lock and availability verification.';
