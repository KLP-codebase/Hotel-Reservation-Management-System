require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
SELECT
  b.booking_id,
  b.status,
  b.created_at,
  br.branch_name,
  COALESCE(g.first_name || ' ' || g.last_name, s.first_name || ' ' || s.last_name) AS guest_name,
  agg.room_count,
  agg.earliest_check_in,
  agg.latest_check_out
FROM bookings b
LEFT JOIN branches br ON br.branch_id = b.branch_id
LEFT JOIN guests g ON g.id = b.booked_by_guest_id

LEFT JOIN staff s ON s.staff_id = b.booked_by_staff_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS room_count, MIN(check_in_date) AS earliest_check_in, MAX(check_out_date) AS latest_check_out
  FROM booking_rooms WHERE booking_rooms.booking_id = b.booking_id
) agg ON true
ORDER BY b.created_at DESC;
`;

pool.query(sql)
    .then(r => { console.table(r.rows); pool.end(); })
    .catch(e => { console.error(e.message); pool.end(); });
