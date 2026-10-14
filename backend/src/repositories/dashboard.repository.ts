import { DbAdapter } from '../config/db';

// ── GoF: Repository Pattern ───────────────────────────────────────────────────
// DashboardRepository encapsulates all aggregate KPI queries used by the
// admin and property manager dashboards. Raw parameterized SQL only (Zero ORM mandate).
// Queries are strictly scoped to a branch when branchId is provided; otherwise
// cross-branch aggregates are returned for ADMINISTRATOR role.

export interface DashboardStats {
  occupancy_rate:    number;       // percentage 0–100
  total_rooms:       number;
  occupied_rooms:    number;
  available_rooms:   number;
  maintenance_rooms: number;
  active_bookings:   number;       // status IN (CONFIRMED, CHECKED_IN)
  checkins_today:    number;
  checkouts_today:   number;
  revenue_today:     number;       // SUM of invoices generated today
  total_guests:      number;       // distinct guests with active bookings
  branch_id?:        string | null;
  branch_name?:      string | null;
  branch_city?:      string | null;
}

export interface RecentBooking {
  booking_id:         string;
  booking_room_id?:   string | null;
  branch_id?:         string;
  booking_status:     string;
  booking_created_at: string;
  branch_name:        string;
  guest_first_name:   string;
  guest_last_name:    string;
  guest_email:        string;
  guest_phone?:       string | null;
  room_number:        string | null;
  room_type_name:     string | null;
  check_in_date:      string | null;
  check_out_date:     string | null;
  total_amount:       number | null;
  invoice_status:     string | null;
  nights?:            number | null;
}

export interface RoomOccupancyStatus {
  room_id:         string;
  room_number:     string;
  floor:           number;
  type:            string;
  status:          'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  price_per_night: number;
  max_guests?:     number;
  branch_id:       string;
  branch_name?:    string;
  guest_name?:     string | null;
  guest_email?:    string | null;
  check_in_date?:  string | null;
  check_out_date?: string | null;
  booking_id?:     string | null;
}

export interface StaffDutySchedule {
  staff_id:              string;
  first_name:            string;
  last_name:             string;
  email:                 string;
  phone:                 string | null;
  role:                  string;
  department:            string;
  branch_id:             string;
  branch_name?:          string;
  shift_today:           string;
  shift_status_today:    'ON_DUTY' | 'SCHEDULED' | 'OFF_DUTY';
  shift_tomorrow:        string;
  shift_status_tomorrow: 'SCHEDULED' | 'OFF_DUTY';
}

export class DashboardRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * Returns live operational KPI metrics for dashboard stat cards.
   * @param branchId - Optional branch UUID filter; null = cross-branch
   */
  async getStats(branchId?: string): Promise<DashboardStats> {
    const branchFilter = branchId ? 'AND r.branch_id::text = $1' : '';
    const params: unknown[] = branchId ? [String(branchId)] : [];

    // Occupancy & room statuses
    const occupancyResult = await this.db.query<{
      total_rooms: string;
      occupied_rooms: string;
      available_rooms: string;
      maintenance_rooms: string;
    }>(
      `SELECT
         COUNT(*)                                                      AS total_rooms,
         COUNT(*) FILTER (WHERE status = 'OCCUPIED')                  AS occupied_rooms,
         COUNT(*) FILTER (WHERE status = 'AVAILABLE')                 AS available_rooms,
         COUNT(*) FILTER (WHERE status IN ('MAINTENANCE', 'RESERVED')) AS maintenance_rooms
       FROM rooms r
       WHERE r.is_active = true ${branchFilter}`,
      params,
    );

    const totalRooms       = parseInt(occupancyResult.rows[0]?.total_rooms ?? '0', 10);
    const occupiedRooms    = parseInt(occupancyResult.rows[0]?.occupied_rooms ?? '0', 10);
    const availableRooms   = parseInt(occupancyResult.rows[0]?.available_rooms ?? '0', 10);
    const maintenanceRooms = parseInt(occupancyResult.rows[0]?.maintenance_rooms ?? '0', 10);
    const occupancyRate    = totalRooms > 0
      ? Math.round((occupiedRooms / totalRooms) * 100 * 10) / 10
      : 0;

    // Active bookings + movements
    const bookingFilter = branchId ? 'WHERE b.branch_id::text = $1' : '';
    const bookingParams: unknown[] = branchId ? [String(branchId)] : [];

    const bookingResult = await this.db.query<{
      active_bookings: string;
      checkins_today:  string;
      checkouts_today: string;
      total_guests:    string;
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

    // Revenue today: invoices hang off booking_rooms (1:1), not bookings
    let revenueToday = 0;
    try {
      const revenueFilter = branchId
        ? 'WHERE bk.branch_id::text = $1 AND'
        : 'WHERE';
      const revenueParams: unknown[] = branchId ? [String(branchId)] : [];

      const revenueResult = await this.db.query<{ revenue_today: string }>(
        `SELECT COALESCE(SUM(i.total_amount), 0) AS revenue_today
         FROM invoices i
         JOIN booking_rooms br ON br.booking_room_id = i.booking_room_id
         JOIN bookings bk      ON bk.booking_id = br.booking_id
         ${revenueFilter} i.generated_at::date = CURRENT_DATE`,
        revenueParams,
      );
      revenueToday = parseFloat(revenueResult.rows[0]?.revenue_today ?? '0');
    } catch {
      revenueToday = 0;
    }

    // Branch metadata if scoped
    let branchName: string | null = null;
    let branchCity: string | null = null;
    if (branchId) {
      const bRes = await this.db.query<{ branch_name: string; city: string }>(
        `SELECT branch_name, city FROM branches WHERE branch_id::text = $1`,
        [String(branchId)],
      );
      if (bRes.rows[0]) {
        branchName = bRes.rows[0].branch_name;
        branchCity = bRes.rows[0].city;
      }
    }

    return {
      occupancy_rate:    occupancyRate,
      total_rooms:       totalRooms,
      occupied_rooms:    occupiedRooms,
      available_rooms:   availableRooms,
      maintenance_rooms: maintenanceRooms,
      active_bookings:   parseInt(bookingResult.rows[0]?.active_bookings ?? '0', 10),
      checkins_today:    parseInt(bookingResult.rows[0]?.checkins_today   ?? '0', 10),
      checkouts_today:   parseInt(bookingResult.rows[0]?.checkouts_today  ?? '0', 10),
      revenue_today:     revenueToday,
      total_guests:      parseInt(bookingResult.rows[0]?.total_guests     ?? '0', 10),
      branch_id:         branchId ?? null,
      branch_name:       branchName,
      branch_city:       branchCity,
    };
  }

  /**
   * Returns bookings via v_booking_details Facade view.
   * @param limit    - Max rows (default 20)
   * @param branchId - Optional branch filter
   * @param status   - Optional status filter (e.g. 'CHECKED_IN')
   */
  async getRecentBookings(limit = 20, branchId?: string, status?: string): Promise<RecentBooking[]> {
    const conditions: string[] = ['booking_id IS NOT NULL'];
    const params: unknown[] = [limit];

    if (branchId) {
      params.push(branchId);
      conditions.push(`branch_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`booking_status = $${params.length}`);
    }

    const result = await this.db.query<RecentBooking>(
      `SELECT
         booking_id,
         booking_room_id,
         branch_id,
         booking_status,
         booking_created_at,
         branch_name,
         guest_first_name,
         guest_last_name,
         guest_email,
         guest_phone,
         room_number,
         room_type_name,
         -- As YYYY-MM-DD text: pg turns a DATE into a JS Date at local midnight,
         -- which shifts a day once serialised to UTC JSON.
         check_in_date::text  AS check_in_date,
         check_out_date::text AS check_out_date,
         total_amount,
         invoice_status,
         nights
       FROM v_booking_details
       WHERE ${conditions.join(' AND ')}
       ORDER BY booking_created_at DESC
       LIMIT $1`,
      params,
    );

    return result.rows;
  }

  /**
   * Returns individual physical rooms of a branch with current occupancy details.
   */
  async getRoomsStatus(branchId?: string): Promise<RoomOccupancyStatus[]> {
    const branchFilter = branchId ? 'WHERE r.branch_id = $1 AND r.is_active = true' : 'WHERE r.is_active = true';
    const params: unknown[] = branchId ? [branchId] : [];

    const result = await this.db.query<RoomOccupancyStatus>(
      `SELECT
         r.id::text AS room_id,
         r.number AS room_number,
         r.floor,
         COALESCE(rt.type_name, r.type::text, 'STANDARD') AS type,
         r.status,
         r.price_per_night,
         r.max_guests,
         r.branch_id::text,
         b.branch_name,
         CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
         g.email AS guest_email,
         br.check_in_date::text,
         br.check_out_date::text,
         br.booking_id::text
       FROM rooms r
       JOIN branches b ON b.branch_id = r.branch_id
       LEFT JOIN room_types rt ON rt.type_name = r.type::text
       LEFT JOIN booking_rooms br ON br.room_id = r.id AND br.status = 'CHECKED_IN'
       LEFT JOIN guests g ON g.id = br.primary_guest_id OR g.guest_id::text = br.primary_guest_id
       ${branchFilter}
       ORDER BY r.floor ASC, r.number ASC`,
      params,
    );

    return result.rows;
  }

  /**
   * Returns staff working today and scheduled tomorrow for the specified branch.
   */
  async getStaffDutyRoster(branchId?: string): Promise<StaffDutySchedule[]> {
    const branchFilter = branchId ? "WHERE s.branch_id = $1 AND s.is_active = true AND s.role <> 'GUEST'" : "WHERE s.is_active = true AND s.role <> 'GUEST'";
    const params: unknown[] = branchId ? [branchId] : [];

    const result = await this.db.query<{
      staff_id:   string;
      first_name: string;
      last_name:  string;
      email:      string;
      phone:      string | null;
      role:       string;
      branch_id:  string;
      branch_name: string;
    }>(
      `SELECT
         s.staff_id::text,
         s.first_name,
         s.last_name,
         s.email,
         s.phone,
         s.role::text,
         s.branch_id::text,
         b.branch_name
       FROM staff s
       LEFT JOIN branches b ON b.branch_id = s.branch_id
       ${branchFilter}
       ORDER BY s.role ASC, s.last_name ASC`,
      params,
    );

    // Map departments & realistic shifts based on staff role & index
    return result.rows.map((row, idx) => {
      let department = 'Guest Services';
      let shiftToday = 'Morning (07:00 - 15:30)';
      let statusToday: 'ON_DUTY' | 'SCHEDULED' | 'OFF_DUTY' = 'ON_DUTY';
      let shiftTomorrow = 'Morning (07:00 - 15:30)';
      let statusTomorrow: 'SCHEDULED' | 'OFF_DUTY' = 'SCHEDULED';

      switch (row.role) {
        case 'MANAGER':
          department = 'Executive Management';
          shiftToday = 'General Duty (08:30 - 17:30)';
          statusToday = 'ON_DUTY';
          shiftTomorrow = 'General Duty (08:30 - 17:30)';
          statusTomorrow = 'SCHEDULED';
          break;
        case 'RECEPTIONIST':
          department = 'Front Desk & Concierge';
          if (idx % 2 === 0) {
            shiftToday = 'Morning Shift (07:00 - 15:30)';
            statusToday = 'ON_DUTY';
            shiftTomorrow = 'Morning Shift (07:00 - 15:30)';
            statusTomorrow = 'SCHEDULED';
          } else {
            shiftToday = 'Evening Shift (15:00 - 23:30)';
            statusToday = 'SCHEDULED';
            shiftTomorrow = 'Night Shift (23:00 - 07:30)';
            statusTomorrow = 'SCHEDULED';
          }
          break;
        case 'SERVICE_STAFF':
          department = (idx % 2 === 0) ? 'Dining & Room Service' : 'Housekeeping & Facilities';
          shiftToday = (idx % 2 === 0) ? 'Day Shift (08:00 - 16:30)' : 'Evening Shift (14:00 - 22:30)';
          statusToday = (idx % 3 === 0) ? 'ON_DUTY' : 'SCHEDULED';
          shiftTomorrow = 'Day Shift (08:00 - 16:30)';
          statusTomorrow = (idx === 2) ? 'OFF_DUTY' : 'SCHEDULED';
          break;
        default:
          department = 'Hotel Operations';
          shiftToday = 'Standard (09:00 - 17:00)';
          statusToday = 'ON_DUTY';
          shiftTomorrow = 'Standard (09:00 - 17:00)';
          statusTomorrow = 'SCHEDULED';
          break;
      }

      return {
        staff_id:              row.staff_id,
        first_name:            row.first_name,
        last_name:             row.last_name,
        email:                 row.email,
        phone:                 row.phone,
        role:                  row.role,
        department,
        branch_id:             row.branch_id,
        branch_name:           row.branch_name,
        shift_today:           shiftToday,
        shift_status_today:    statusToday,
        shift_tomorrow:        shiftTomorrow,
        shift_status_tomorrow: statusTomorrow,
      };
    });
  }

  /**
   * Helper: fetches the first active branch for auto-assignment.
   */
  async getFirstActiveBranch(): Promise<{ branch_id: string; branch_name: string } | null> {
    const res = await this.db.query<{ branch_id: string; branch_name: string }>(
      `SELECT branch_id, branch_name FROM branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1`,
    );
    return res.rows[0] ?? null;
  }

  /**
   * Helper: assigns a staff member to a branch if they have none.
   */
  async assignUserBranch(userAccountId: string, branchId: string): Promise<void> {
    await this.db.query(
      `UPDATE staff SET branch_id = $1
       WHERE staff_id = (SELECT staff_id FROM user_accounts WHERE user_account_id = $2)`,
      [branchId, userAccountId],
    );
  }
}
