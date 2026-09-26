require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Test the exact rooms query from our new findById
const sql = `
    SELECT
        br.booking_room_id,
        r.room_number,
        rt.type_name AS room_type_name,
        mp.plan_name AS meal_plan_name,
        br.check_in_date::text AS check_in_date,
        br.check_out_date::text AS check_out_date,
        br.rate_at_booking,
        COALESCE(
            json_agg(
                json_build_object(
                    'verification_id', ag.verification_id,
                    'first_name', ag.first_name,
                    'last_name', ag.last_name,
                    'id_passport_no', ag.id_passport_no,
                    'is_verified', ag.is_verified
                )
            ) FILTER (WHERE ag.verification_id IS NOT NULL),
            '[]'
        ) AS accompanying_guests
    FROM booking_rooms br
    LEFT JOIN rooms r ON r.room_id = br.room_id::uuid
    LEFT JOIN room_types rt ON rt.room_type_id = br.room_type_id
    LEFT JOIN meal_plans mp ON mp.plan_id = br.plan_id
    LEFT JOIN accompanying_guests ag ON ag.booking_room_id = br.booking_room_id
    WHERE br.booking_id = $1
    GROUP BY br.booking_room_id, r.room_number, rt.type_name, mp.plan_name,
             br.check_in_date, br.check_out_date, br.rate_at_booking
`;

pool.query(sql, ['88888888-8888-8888-8888-888888888803'])
  .then(r => { console.table(r.rows); pool.end(); })
  .catch(e => { console.error('SQL ERROR:', e.message); pool.end(); });
