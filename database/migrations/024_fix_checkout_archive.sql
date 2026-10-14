-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 024: Check-out archive fix
-- ══════════════════════════════════════════════════════════════════════════════
-- Checking a guest out fires trg_archive_booking_on_checkout, and the 017 version
-- of fn_archive_completed_booking failed inside that transaction, so every
-- check-out returned 500:
--
--   * nights: EXTRACT(DAY FROM b.check_out - b.check_in). On Azure those columns
--     are DATE, the difference is an integer, and EXTRACT(DAY FROM integer) does
--     not exist.
--   * dates: read from the legacy bookings.check_in / check_out, which bookings
--     made through the current flow leave NULL; guest_activity_archive requires
--     both. The stay dates live on booking_rooms.
--   * services: service_catalogue.service_id (int on Neon, uuid on Azure) was
--     compared with service_usage.service_id (varchar) without a cast.
--
-- The archive is a convenience ledger for the guest portal, so a failure in it now
-- raises a WARNING instead of aborting the check-out (same approach as the
-- change_log trigger in 022). Idempotent: CREATE OR REPLACE only.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION fn_archive_completed_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_booking     RECORD;
  v_services    JSONB;
  v_total_paid  NUMERIC(12, 2);
BEGIN
  -- Stay dates come from the room line; the legacy booking columns are only a
  -- fallback. Casting to DATE makes the subtraction an integer on every schema.
  SELECT
    b.booking_id,
    COALESCE(to_jsonb(b)->>'booking_ref', to_jsonb(b)->>'id', SUBSTRING(b.booking_id::text FROM 1 FOR 8)) AS booking_ref,
    COALESCE(b.booked_by_guest_id::text, b.guest_id::text)                 AS guest_id,
    COALESCE(br.check_in_date,  (to_jsonb(b)->>'check_in')::date)          AS check_in,
    COALESCE(br.check_out_date, (to_jsonb(b)->>'check_out')::date)         AS check_out,
    COALESCE(brh.branch_name, 'Sky Nest')                                  AS branch_name,
    COALESCE(rt.type_name, to_jsonb(r)->>'type', 'Room')                   AS room_type_name,
    COALESCE(to_jsonb(r)->>'room_number', to_jsonb(r)->>'number')          AS room_number,
    br.booking_room_id,
    br.rate_at_booking,
    COALESCE(inv.total_amount, 0.00)                                       AS invoice_total
  INTO v_booking
  FROM bookings b
  LEFT JOIN branches brh     ON brh.branch_id = b.branch_id
  LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id AND br.status <> 'CANCELLED'
  LEFT JOIN rooms r          ON r.id::text = br.room_id::text
  LEFT JOIN room_types rt    ON rt.room_type_id = COALESCE(br.room_type_id, NULLIF(to_jsonb(r)->>'room_type_id', '')::int)
  LEFT JOIN invoices inv     ON inv.booking_room_id::text = br.booking_room_id::text
  WHERE b.booking_id = p_booking_id
  ORDER BY br.created_at, br.booking_room_id
  LIMIT 1;

  IF NOT FOUND OR v_booking.guest_id IS NULL
     OR v_booking.check_in IS NULL OR v_booking.check_out IS NULL THEN
    RETURN;
  END IF;

  v_total_paid := CASE
    WHEN v_booking.invoice_total > 0 THEN v_booking.invoice_total
    ELSE GREATEST(1, v_booking.check_out - v_booking.check_in) * COALESCE(v_booking.rate_at_booking, 0)
  END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'service_name', COALESCE(sc.service_name, su.notes, 'Hotel service'),
           'category',     sc.category,
           'quantity',     su.quantity,
           'unit_price',   su.price_at_usage,
           'total_price',  su.quantity * su.price_at_usage,
           'used_at',      su.used_at
         )), '[]'::jsonb)
    INTO v_services
    FROM service_usage su
    LEFT JOIN service_catalogue sc ON sc.service_id::text = su.service_id::text
   WHERE su.booking_room_id::text = v_booking.booking_room_id::text;

  INSERT INTO guest_activity_archive (
    guest_id, booking_id, booking_ref, branch_name, room_type_name, room_number,
    check_in, check_out, nights, total_paid, loyalty_points, status, compressed_details
  ) VALUES (
    v_booking.guest_id,
    v_booking.booking_id,
    v_booking.booking_ref,
    v_booking.branch_name,
    v_booking.room_type_name,
    v_booking.room_number,
    v_booking.check_in,
    v_booking.check_out,
    GREATEST(1, v_booking.check_out - v_booking.check_in),
    v_total_paid,
    FLOOR(v_total_paid / 10),
    'CHECKED_OUT',
    jsonb_build_object(
      'services',       v_services,
      'rate_per_night', v_booking.rate_at_booking,
      'archived_at',    CURRENT_TIMESTAMP
    )
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_paid         = EXCLUDED.total_paid,
    loyalty_points     = EXCLUDED.loyalty_points,
    compressed_details = EXCLUDED.compressed_details,
    archived_at        = CURRENT_TIMESTAMP;
END;
$$;

-- The archive must never block a check-out.
CREATE OR REPLACE FUNCTION trg_fn_archive_on_checkout()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status::text = 'CHECKED_OUT' AND OLD.status::text IS DISTINCT FROM 'CHECKED_OUT' THEN
    BEGIN
      PERFORM fn_archive_completed_booking(NEW.booking_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'guest activity archive failed for booking %: %', NEW.booking_id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
