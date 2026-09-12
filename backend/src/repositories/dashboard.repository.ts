import { DbAdapter } from '../config/db';

// ── GoF: Repository Pattern ───────────────────────────────────────────────────
// DashboardRepository encapsulates all aggregate KPI queries used by the
// admin dashboard. Raw parameterized SQL only (Zero ORM mandate).
// Queries are scoped to a branch when branchId is provided; otherwise
// cross-branch aggregates are returned for ADMINISTRATOR role.

export interface DashboardStats {
  occupancy_rate: number;          // percentage 0–100
  total_rooms: number;
  occupied_rooms: number;
  active_bookings: number;         // status IN (CONFIRMED, CHECKED_IN)
  checkins_today: number;
  checkouts_today: number;
  revenue_today: number;           // SUM of invoices generated today
  total_guests: number;            // distinct guests with active bookings
}

export interface RecentBooking {
  booking_id: string;
  booking_status: string;
  booking_created_at: string;
  branch_name: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  room_number: string | null;
  room_type_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  total_amount: number | null;
  invoice_status: string | null;
}

export class DashboardRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * Returns live operational KPI metrics for the dashboard stat cards.
   * @param branchId - Optional branch filter; null = cross-branch (admin only)
   */
  async getStats(branchId?: number): Promise<DashboardStats> {
    const branchFilter = branchId != null ? 'AND r.branch_id = $1' : '';
    const params: unknown[] = branchId != null ? [branchId] : [];

    // Occupancy rate
    const occupancyResult = await this.db.query<{
      total_rooms: string;
      occupied_rooms: string;
    }>(
      `SELECT
         COUNT(*)                                        AS total_rooms,
         COUNT(*) FILTER (WHERE status = 'OCCUPIED')    AS occupied_rooms
       FROM rooms r
       WHERE r.is_active = true ${branchFilter}`,
      params,
    );

    const totalRooms   = parseInt(occupancyResult.rows[0]?.total_rooms ?? '0', 10);
    const occupiedRooms = parseInt(occupancyResult.rows[0]?.occupied_rooms ?? '0', 10);
    const occupancyRate = totalRooms > 0
      ? Math.round((occupiedRooms / totalRooms) * 100 * 10) / 10
      : 0;

    // Active bookings + today's check-in/out movements
    const bookingFilter = branchId != null
      ? 'WHERE b.branch_id = $1'
      : '';
    const bookingParams: unknown[] = branchId != null ? [branchId] : [];

    const bookingResult = await this.db.query<{
      active_bookings: string;
      checkins_today: string;
      checkouts_today: string;
      total_guests: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE b.status IN ('CONFIRMED', 'CHECKED_IN'))  AS active_bookings,
         COUNT(*) FILTER (WHERE br.check_in_date  = CURRENT_DATE
                            AND b.status IN ('CONFIRMED', 'CHECKED_IN'))  AS checkins_today,
         COUNT(*) FILTER (WHERE br.check_out_date = CURRENT_DATE
                            AND b.status = 'CHECKED_IN')                  AS checkouts_today,
         COUNT(DISTINCT b.booked_by_guest_id)
             FILTER (WHERE b.status IN ('CONFIRMED', 'CHECKED_IN'))       AS total_guests
       FROM bookings b
       LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id
       ${bookingFilter}`,
      bookingParams,
    );

    // Revenue today
    const revenueFilter = branchId != null
      ? 'JOIN bookings bk ON bk.booking_id = br.booking_id WHERE bk.branch_id = $1 AND'
      : 'JOIN bookings bk ON bk.booking_id = br.booking_id WHERE';
    const revenueParams: unknown[] = branchId != null ? [branchId] : [];

    const revenueResult = await this.db.query<{ revenue_today: string }>(
      `SELECT COALESCE(SUM(i.total_amount), 0) AS revenue_today
       FROM invoices i
       JOIN booking_rooms br ON br.booking_room_id = i.booking_room_id
       ${revenueFilter} i.generated_at::date = CURRENT_DATE`,
      revenueParams,
    );

    return {
      occupancy_rate:   occupancyRate,
      total_rooms:      totalRooms,
      occupied_rooms:   occupiedRooms,
      active_bookings:  parseInt(bookingResult.rows[0]?.active_bookings ?? '0', 10),
      checkins_today:   parseInt(bookingResult.rows[0]?.checkins_today   ?? '0', 10),
      checkouts_today:  parseInt(bookingResult.rows[0]?.checkouts_today  ?? '0', 10),
      revenue_today:    parseFloat(revenueResult.rows[0]?.revenue_today  ?? '0'),
      total_guests:     parseInt(bookingResult.rows[0]?.total_guests     ?? '0', 10),
    };
  }

  /**
   * Returns recent bookings via the v_booking_details Facade view.
   * @param limit   - Max rows (default 20)
   * @param branchId - Optional branch filter
   */
  async getRecentBookings(limit = 20, branchId?: number): Promise<RecentBooking[]> {
    const branchFilter = branchId != null
      ? 'AND branch_id = $2'
      : '';
    const params: unknown[] = branchId != null
      ? [limit, branchId]
      : [limit];

    const result = await this.db.query<RecentBooking>(
      `SELECT
         booking_id,
         booking_status,
         booking_created_at,
         branch_name,
         guest_first_name,
         guest_last_name,
         guest_email,
         room_number,
         room_type_name,
         check_in_date,
         check_out_date,
         total_amount,
         invoice_status
       FROM v_booking_details
       WHERE booking_id IS NOT NULL ${branchFilter}
       ORDER BY booking_created_at DESC
       LIMIT $1`,
      params,
    );

    return result.rows;
  }
}
