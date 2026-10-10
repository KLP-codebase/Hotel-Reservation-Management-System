
-- Migration 017: Guest Activity Archive, Compact Historical Ledger & Loyalty Points
ALTER TABLE user_accounts
ADD COLUMN IF NOT EXISTS guest_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_user_accounts_guest_id
ON user_accounts(guest_id) WHERE guest_id IS NOT NULL;

UPDATE user_accounts ua
SET guest_id = g.id
FROM staff s
JOIN guests g ON LOWER(g.email) = LOWER(s.email)
WHERE ua.staff_id = s.staff_id 
  AND ua.guest_id IS NULL;

CREATE TABLE IF NOT EXISTS guest_activity_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id VARCHAR(100) NOT NULL,
  booking_id UUID NOT NULL UNIQUE,
  booking_ref VARCHAR(50) NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  room_type_name VARCHAR(100) NOT NULL,
  room_number VARCHAR(20),
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  nights INT NOT NULL,
  total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  loyalty_points INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'CHECKED_OUT',
  compressed_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_archive_guest_date
ON guest_activity_archive(guest_id, check_in DESC);

CREATE OR REPLACE FUNCTION fn_archive_completed_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_booking RECORD;
  v_services JSONB;
  v_details JSONB;
  v_total_paid NUMERIC(12, 2);
  v_loyalty_pts INT;
BEGIN
  SELECT 
    b.booking_id,
    COALESCE(b.id, SUBSTRING(b.booking_id::text FROM 1 FOR 8)) AS booking_ref,
    COALESCE(b.booked_by_guest_id, b.guest_id) AS guest_id,
    b.check_in,
    b.check_out,
    GREATEST(1, COALESCE(EXTRACT(DAY FROM (b.check_out - b.check_in))::int, 1)) AS nights,
    COALESCE(brh.branch_name, 'Sky Nest Sanctuary') AS branch_name,
    COALESCE(rt.type_name, r.type::text, 'Luxury Suite') AS room_type_name,
    COALESCE(r.room_number, r.number, 'Suite') AS room_number,
    br.booking_room_id,
    br.rate_at_booking,
    COALESCE(inv.total_amount, 0.00) AS invoice_total
  INTO v_booking
  FROM bookings b
  LEFT JOIN branches brh ON brh.branch_id = b.branch_id
  LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id
  LEFT JOIN rooms r ON r.id::text = br.room_id::text
  LEFT JOIN room_types rt ON rt.room_type_id = COALESCE(br.room_type_id, r.room_type_id)
  LEFT JOIN invoices inv ON inv.booking_room_id = br.booking_room_id
  WHERE b.booking_id = p_booking_id
  LIMIT 1;

  IF NOT FOUND OR v_booking.guest_id IS NULL THEN
    RETURN;
  END IF;

  IF v_booking.invoice_total > 0 THEN
    v_total_paid := v_booking.invoice_total;
  ELSE
    v_total_paid := v_booking.nights * COALESCE(v_booking.rate_at_booking, 150.00);
  END IF;

  v_loyalty_pts := FLOOR(v_total_paid / 10);

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'service_name', sc.service_name,
      'category', sc.category,
      'quantity', su.quantity,
      'unit_price', su.price_at_usage,
      'total_price', (su.quantity * su.price_at_usage),
      'used_at', su.used_at
    )),
    '[]'::jsonb
  ) INTO v_services
  FROM service_usage su
  JOIN service_catalogue sc ON sc.service_id = su.service_id
  WHERE su.booking_room_id = v_booking.booking_room_id;

  v_details := jsonb_build_object(
    'services', v_services,
    'rate_per_night', COALESCE(v_booking.rate_at_booking, 150.00),
    'archived_at', CURRENT_TIMESTAMP
  );

  INSERT INTO guest_activity_archive (
    guest_id,
    booking_id,
    booking_ref,
    branch_name,
    room_type_name,
    room_number,
    check_in,
    check_out,
    nights,
    total_paid,
    loyalty_points,
    status,
    compressed_details
  ) VALUES (
    v_booking.guest_id,
    v_booking.booking_id,
    v_booking.booking_ref,
    v_booking.branch_name,
    v_booking.room_type_name,
    v_booking.room_number,
    v_booking.check_in,
    v_booking.check_out,
    v_booking.nights,
    v_total_paid,
    v_loyalty_pts,
    'CHECKED_OUT',
    v_details
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_paid = EXCLUDED.total_paid,
    loyalty_points = EXCLUDED.loyalty_points,
    compressed_details = EXCLUDED.compressed_details,
    archived_at = CURRENT_TIMESTAMP;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_archive_on_checkout()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'CHECKED_OUT' AND (OLD.status IS DISTINCT FROM 'CHECKED_OUT') THEN
    PERFORM fn_archive_completed_booking(NEW.booking_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_booking_on_checkout ON bookings;
CREATE TRIGGER trg_archive_booking_on_checkout
AFTER UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_fn_archive_on_checkout();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT booking_id FROM bookings WHERE status = 'CHECKED_OUT' LOOP
    PERFORM fn_archive_completed_booking(r.booking_id);
  END LOOP;
END;
$$;
