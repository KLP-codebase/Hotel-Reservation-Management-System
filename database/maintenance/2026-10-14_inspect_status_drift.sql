-- Lists booking/room status drift (read-only). Pair: 2026-10-14_fix_status_drift.sql
-- R1: checked in before the stay's arrival day
SELECT 'R1 early check-in' AS rule, b.booking_id::text, b.status AS booking_status, br.status AS line_status,
       br.check_in_date::text AS ci, br.check_out_date::text AS co, r.number AS room
FROM booking_rooms br JOIN bookings b ON b.booking_id = br.booking_id LEFT JOIN rooms r ON r.id::text = br.room_id::text
WHERE br.status = 'CHECKED_IN' AND br.check_in_date > (now() AT TIME ZONE 'Asia/Colombo')::date
UNION ALL
-- R2: booking marked CHECKED_OUT although none of its live room lines has started
SELECT 'R2 checked out before arrival', b.booking_id::text, b.status, br.status, br.check_in_date::text, br.check_out_date::text, r.number
FROM bookings b JOIN booking_rooms br ON br.booking_id = b.booking_id LEFT JOIN rooms r ON r.id::text = br.room_id::text
WHERE b.status = 'CHECKED_OUT' AND br.status NOT IN ('CHECKED_OUT', 'CANCELLED')
UNION ALL
-- R3: room marked OCCUPIED with nobody checked in to it
SELECT 'R3 occupied, nobody checked in', NULL, NULL, r.status::text, NULL, NULL, r.number || ' (' || bh.branch_name || ')'
FROM rooms r JOIN branches bh ON bh.branch_id = r.branch_id
WHERE r.status = 'OCCUPIED'
  AND NOT EXISTS (SELECT 1 FROM booking_rooms br WHERE br.room_id::text = r.id::text AND br.status = 'CHECKED_IN')
ORDER BY 1, 7;
