-- ═══════════════════════════════════════════════════════════════════════════════
-- trigger_Auto_Update_Loyalty_Tier
-- ═══════════════════════════════════════════════════════════════════════════════
-- Fires AFTER UPDATE on the guests table when loyalty_points changes.
-- Automatically upgrades or downgrades the loyalty tier based on thresholds:
--
--   BRONZE    < 1,000 points
--   SILVER   >= 1,000 points
--   GOLD     >= 5,000 points
--   PLATINUM >= 15,000 points
--
-- Also updates total_stays counter whenever a booking status transitions to
-- CHECKED_OUT via an AFTER UPDATE trigger on the bookings table.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Tier recalculation trigger function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_update_loyalty_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_tier TEXT;
BEGIN
  -- Determine new tier from points
  v_new_tier := CASE
    WHEN NEW.loyalty_points >= 15000 THEN 'PLATINUM'
    WHEN NEW.loyalty_points >= 5000  THEN 'GOLD'
    WHEN NEW.loyalty_points >= 1000  THEN 'SILVER'
    ELSE 'BRONZE'
  END;

  -- Only update if tier changed (avoid infinite trigger loop)
  IF NEW.loyalty_tier::TEXT != v_new_tier THEN
    NEW.loyalty_tier := v_new_tier::LoyaltyTier;

    -- Log tier change for audit
    RAISE NOTICE 'Guest % tier changed: % → %', NEW.id, OLD.loyalty_tier, v_new_tier;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Bind tier trigger ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_Auto_Update_Loyalty_Tier ON guests;

CREATE TRIGGER trigger_Auto_Update_Loyalty_Tier
  BEFORE UPDATE OF loyalty_points ON guests
  FOR EACH ROW
  WHEN (OLD.loyalty_points IS DISTINCT FROM NEW.loyalty_points)
  EXECUTE FUNCTION fn_auto_update_loyalty_tier();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Companion: increment total_stays on checkout
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_increment_guest_stays_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire when status transitions to CHECKED_OUT
  IF OLD.status != 'CHECKED_OUT' AND NEW.status = 'CHECKED_OUT' THEN
    UPDATE guests
    SET total_stays = total_stays + 1,
        updated_at  = NOW()
    WHERE id = NEW.guest_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_Increment_Guest_Stays ON bookings;

CREATE TRIGGER trigger_Increment_Guest_Stays
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_increment_guest_stays_on_checkout();

COMMENT ON TRIGGER trigger_Auto_Update_Loyalty_Tier ON guests IS
  'Automatically recalculates and updates loyalty tier when points change.';

COMMENT ON TRIGGER trigger_Increment_Guest_Stays ON bookings IS
  'Increments total_stays on guest profile when a booking is checked out.';
