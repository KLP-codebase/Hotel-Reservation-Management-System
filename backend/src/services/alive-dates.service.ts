import { DbAdapter } from '../config/db';

let lastSyncDate: string | null = null;

/**
 * Keeps test reservations, bookings, and guest service events dynamically alive
 * with dates moving forward relative to current date (CURRENT_DATE).
 * This preserves standard test personas across calendar days without collisions or expiration.
 */
export async function syncAliveBookingDates(db: DbAdapter, force = false): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  if (!force && lastSyncDate === todayStr) {
    return;
  }

  try {
    await db.query(`
      -- Colombo Stays
      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '1 day',
          check_out_date = CURRENT_DATE + INTERVAL '3 days'
      WHERE booking_id = '88888888-8888-8888-8888-888888888801';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '1 day',
          check_out_date = CURRENT_DATE + INTERVAL '2 days'
      WHERE booking_id = '88888888-8888-8888-8888-888888888802';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '2 days',
          check_out_date = CURRENT_DATE
      WHERE booking_id = '88888888-8888-8888-8888-888888888803';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE,
          check_out_date = CURRENT_DATE + INTERVAL '2 days'
      WHERE booking_id = '797f97aa-109d-483f-b049-b3b7d3e367fa';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE + INTERVAL '2 days',
          check_out_date = CURRENT_DATE + INTERVAL '5 days'
      WHERE booking_id = '32d5a06a-4d6a-4653-a477-0c886b0215e5';

      -- Galle Stays
      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '1 day',
          check_out_date = CURRENT_DATE + INTERVAL '4 days'
      WHERE booking_id = '55555555-5555-5555-5555-555555555501';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '2 days',
          check_out_date = CURRENT_DATE + INTERVAL '2 days'
      WHERE booking_id = '55555555-5555-5555-5555-555555555502';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '1 day',
          check_out_date = CURRENT_DATE + INTERVAL '2 days'
      WHERE booking_id = '55555555-5555-5555-5555-555555555503';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE,
          check_out_date = CURRENT_DATE + INTERVAL '3 days'
      WHERE booking_id = '55555555-5555-5555-5555-555555555504';

      UPDATE booking_rooms
      SET check_in_date = CURRENT_DATE - INTERVAL '4 days',
          check_out_date = CURRENT_DATE - INTERVAL '1 day'
      WHERE booking_id = '55555555-5555-5555-5555-555555555505';

      -- Sync main bookings table check-in / check-out dates
      UPDATE bookings b
      SET check_in = br.check_in_date::timestamp, check_out = br.check_out_date::timestamp
      FROM booking_rooms br
      WHERE b.booking_id = br.booking_id;

      -- Sync alive test spa appointments (Oliver at 09:00, Elena at 14:00, Tharindu tomorrow at 10:30)
      UPDATE service_usage
      SET used_at = CURRENT_DATE + TIME '09:00:00', appointment_time = '09:00'
      WHERE booking_room_id = '55555555-5555-5555-5555-555555555501' AND service_id = '11111111-1111-1111-1111-111111111101';

      UPDATE service_usage
      SET used_at = CURRENT_DATE + TIME '14:00:00', appointment_time = '14:00'
      WHERE booking_room_id = '55555555-5555-5555-5555-555555555502' AND service_id = '11111111-1111-1111-1111-111111111102';

      UPDATE service_usage
      SET used_at = CURRENT_DATE + INTERVAL '1 day' + TIME '10:30:00', appointment_time = '10:30'
      WHERE booking_room_id = '55555555-5555-5555-5555-555555555503' AND service_id = '11111111-1111-1111-1111-111111111103';

      -- Sync alive test room dining breakfast
      UPDATE service_usage
      SET used_at = CURRENT_DATE + TIME '08:00:00', meal_time = 'BREAKFAST'
      WHERE booking_room_id = '55555555-5555-5555-5555-555555555501' AND service_id = '22222222-2222-2222-2222-222222222201';
    `);

    lastSyncDate = todayStr;
    console.log(`[AliveDates] Test bookings and events synchronized relative to ${todayStr}`);
  } catch (err) {
    console.warn('[AliveDates] Database synchronization note:', err);
  }
}
