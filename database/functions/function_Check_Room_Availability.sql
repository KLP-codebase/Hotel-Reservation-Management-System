-- ═══════════════════════════════════════════════════════════════════════════════
-- function_Check_Room_Availability
-- ═══════════════════════════════════════════════════════════════════════════════
-- Returns TRUE if the room is available for the requested date range.
-- Checks for overlapping confirmed/checked-in bookings using standard
-- interval overlap logic: existing.check_in < new.check_out AND
--                         existing.check_out > new.check_in
--
-- Parameters:
--   p_room_id        UUID   - The room to check
--   p_check_in       DATE   - Requested check-in date (inclusive)
--   p_check_out      DATE   - Requested check-out date (exclusive)
--   p_exclude_booking UUID  - (Optional) Exclude this booking_id when checking
--                             (used for update operations)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION function_Check_Room_Availability(
  p_room_id        UUID,
  p_check_in       DATE,
  p_check_out      DATE,
  p_exclude_booking UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  -- Validate date range
  IF p_check_in >= p_check_out THEN
    RAISE EXCEPTION 'Check-in date must be before check-out date';
  END IF;

  -- Count conflicting bookings
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM bookings b
  WHERE b.room_id     = p_room_id
    AND b.status      NOT IN ('CANCELLED')
    AND b.check_in    < p_check_out      -- existing starts before new ends
    AND b.check_out   > p_check_in       -- existing ends after new starts
    AND (p_exclude_booking IS NULL OR b.id != p_exclude_booking);

  RETURN v_conflict_count = 0;
END;
$$;

COMMENT ON FUNCTION function_Check_Room_Availability IS
  'Returns TRUE if the room has no conflicting bookings in the given date range.';
