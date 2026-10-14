-- Fixes booking/room status drift found on 2026-10-14. Safe to re-run: every
-- statement only touches rows that still match the problem.
-- Run 2026-10-14_inspect_status_drift.sql first to see what will change.

BEGIN;

-- R1: undo check-ins made before the arrival day (line and booking back to CONFIRMED)
WITH early AS (
  SELECT DISTINCT br.booking_id FROM booking_rooms br
  WHERE br.status = 'CHECKED_IN' AND br.check_in_date > (now() AT TIME ZONE 'Asia/Colombo')::date
)
UPDATE booking_rooms br SET status = 'CONFIRMED'
FROM early WHERE br.booking_id = early.booking_id AND br.status = 'CHECKED_IN'
RETURNING 'R1 line -> CONFIRMED' AS fix, br.booking_id::text;

UPDATE bookings b SET status = 'CONFIRMED', updated_at = now()
WHERE b.status = 'CHECKED_IN'
  AND NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_id = b.booking_id AND br.status = 'CHECKED_IN')
  AND EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_id = b.booking_id AND br.status = 'CONFIRMED')
RETURNING 'R1 booking -> CONFIRMED' AS fix, b.booking_id::text;

-- R2: a booking "checked out" before any of its stays began goes back to CONFIRMED
UPDATE bookings b SET status = 'CONFIRMED', updated_at = now()
WHERE b.status = 'CHECKED_OUT'
  AND EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_id = b.booking_id AND br.status = 'CONFIRMED')
  AND NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.booking_id = b.booking_id
                  AND br.status <> 'CANCELLED'
                  AND br.check_in_date <= (now() AT TIME ZONE 'Asia/Colombo')::date)
RETURNING 'R2 booking -> CONFIRMED' AS fix, b.booking_id::text;

-- R3: rooms marked OCCUPIED with nobody checked in become AVAILABLE
UPDATE rooms r SET status = 'AVAILABLE'
WHERE r.status = 'OCCUPIED'
  AND NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.room_id::text = r.id::text AND br.status = 'CHECKED_IN')
RETURNING 'R3 room -> AVAILABLE' AS fix, r.number;

COMMIT;
