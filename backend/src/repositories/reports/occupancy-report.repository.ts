import { DbAdapter } from '../../config/db';

export interface DailyOccupancyRow {
  day: string;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  occupancy_rate: number;
}

export interface OccupancyReportSummary {
  period_start: string;
  period_end: string;
  total_days: number;
  total_capacity_room_nights: number;
  total_occupied_room_nights: number;
  avg_occupancy_rate: number;
  peak_occupancy_day: string | null;
  peak_occupancy_rate: number;
}

export interface OccupancyReportResult {
  summary: OccupancyReportSummary;
  daily: DailyOccupancyRow[];
}

export class OccupancyReportRepository {
  constructor(private readonly db: DbAdapter) {}

  async getOccupancyReport(params: {
    branchId?: string | null;
    startDate: string;
    endDate: string;
  }): Promise<OccupancyReportResult> {
    const { branchId, startDate, endDate } = params;

    const sql = `
      WITH date_series AS (
        SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS day
      ),
      room_counts AS (
        SELECT COUNT(*)::int AS total_rooms
        FROM rooms r
        WHERE r.is_active = true
          AND ($1::uuid IS NULL OR r.branch_id = $1::uuid)
      ),
      daily_occupied AS (
        SELECT
          ds.day,
          COUNT(DISTINCT br.room_id)::int AS occupied_rooms
        FROM date_series ds
        LEFT JOIN booking_rooms br ON (
          br.status IN ('CONFIRMED', 'CHECKED_IN')
          AND ds.day >= br.check_in_date
          AND ds.day < br.check_out_date
        )
        LEFT JOIN rooms r ON r.id = br.room_id
        WHERE ($1::uuid IS NULL OR r.branch_id = $1::uuid)
        GROUP BY ds.day
      )
      SELECT
        docc.day::text AS day,
        rc.total_rooms,
        COALESCE(docc.occupied_rooms, 0)::int AS occupied_rooms,
        GREATEST(0, rc.total_rooms - COALESCE(docc.occupied_rooms, 0))::int AS vacant_rooms,
        CASE 
          WHEN rc.total_rooms > 0 
          THEN ROUND((COALESCE(docc.occupied_rooms, 0)::numeric / rc.total_rooms::numeric) * 100, 1)::float 
          ELSE 0 
        END AS occupancy_rate
      FROM daily_occupied docc
      CROSS JOIN room_counts rc
      ORDER BY docc.day ASC;
    `;

    const { rows } = await this.db.query<DailyOccupancyRow>(sql, [
      branchId ?? null,
      startDate,
      endDate,
    ]);

    const totalDays = rows.length;
    let totalOccupiedNights = 0;
    let totalCapacityNights = 0;
    let sumRate = 0;
    let peakDay: string | null = null;
    let peakRate = 0;

    for (const row of rows) {
      const rate = Number(row.occupancy_rate);
      totalOccupiedNights += Number(row.occupied_rooms);
      totalCapacityNights += Number(row.total_rooms);
      sumRate += rate;
      if (rate >= peakRate) {
        peakRate = rate;
        peakDay = row.day;
      }
    }

    const avgRate = totalCapacityNights > 0
      ? Math.round((totalOccupiedNights / totalCapacityNights) * 1000) / 10
      : (totalDays > 0 ? Math.round((sumRate / totalDays) * 10) / 10 : 0);

    return {
      summary: {
        period_start: startDate,
        period_end: endDate,
        total_days: totalDays,
        total_capacity_room_nights: totalCapacityNights,
        total_occupied_room_nights: totalOccupiedNights,
        avg_occupancy_rate: avgRate,
        peak_occupancy_day: peakDay,
        peak_occupancy_rate: peakRate,
      },
      daily: rows.map(r => ({
        ...r,
        total_rooms: Number(r.total_rooms),
        occupied_rooms: Number(r.occupied_rooms),
        vacant_rooms: Number(r.vacant_rooms),
        occupancy_rate: Number(r.occupancy_rate),
      })),
    };
  }
}
