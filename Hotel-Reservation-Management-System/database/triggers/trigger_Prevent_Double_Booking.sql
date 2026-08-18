-- ═══════════════════════════════════════════════════════════════════════════════
-- trigger_Prevent_Double_Booking
-- ═══════════════════════════════════════════════════════════════════════════════
-- Fires BEFORE INSERT OR UPDATE on the bookings table.
-- Calls function_Check_Room_Availability to enforce no-overlap at the DB level.
-- This is a hard database-level guard — sp_CreateBooking also checks, but
-- this trigger ensures integrity even from direct SQL or other clients.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Trigger function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_prevent_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only enforce for active bookings (not cancelled ones)
  IF NEW.status = 'CANCELLED' THEN
    RETURN NEW;
  END IF;

  -- Exclude the current row when checking updates
  IF NOT function_Check_Room_Availability(
    NEW.room_id,
    NEW.check_in,
    NEW.check_out,
    CASE TG_OP WHEN 'UPDATE' THEN OLD.id ELSE NULL END
  ) THEN
    RAISE EXCEPTION
      'Double booking prevented: Room % is already booked from % to %',
      NEW.room_id, NEW.check_in, NEW.check_out
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Bind trigger ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_Prevent_Double_Booking ON bookings;

CREATE TRIGGER trigger_Prevent_Double_Booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_double_booking();

COMMENT ON TRIGGER trigger_Prevent_Double_Booking ON bookings IS
  'Database-level guard against overlapping room bookings.';
