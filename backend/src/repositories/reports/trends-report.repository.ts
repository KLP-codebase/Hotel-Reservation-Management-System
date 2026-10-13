import { DbAdapter } from '../../config/db';

export interface TopServiceItem {
  service_id: string;
  service_name: string;
  category: string;
  total_orders: number;
  units_consumed: number;
  total_revenue: number;
}

export interface MealPlanPreferenceItem {
  plan_name: string;
  bookings_count: number;
  percentage: number;
}

export interface RoomTypePreferenceItem {
  room_type_name: string;
  bookings_count: number;
  avg_nights: number;
  total_tariff_revenue: number;
}

export interface CustomerTrendsReportResult {
  period_start: string | null;
  period_end: string | null;
  top_services: TopServiceItem[];
  meal_plan_preferences: MealPlanPreferenceItem[];
  room_type_preferences: RoomTypePreferenceItem[];
}

export class TrendsReportRepository {
  constructor(private readonly db: DbAdapter) {}

  async getCustomerTrendsReport(params: {
    branchId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    limit?: number;
  }): Promise<CustomerTrendsReportResult> {
    const { branchId, startDate, endDate, limit = 10 } = params;

    // 1. Top Services Ranking
    const topServicesSql = `
      SELECT
        sc.service_id,
        sc.service_name,
        sc.category,
        COUNT(su.usage_id)::int AS total_orders,
        SUM(su.quantity)::int AS units_consumed,
        ROUND(SUM(su.quantity * su.price_at_usage), 2)::float AS total_revenue
      FROM service_usage su
      JOIN service_catalogue sc ON sc.service_id::text = su.service_id::text
      LEFT JOIN booking_rooms bkr ON (bkr.booking_room_id = su.booking_room_id OR bkr.booking_room_id::text = su.booking_room_id::text)
      LEFT JOIN rooms rm ON (rm.id::text = bkr.room_id::text OR rm.room_id::text = bkr.room_id::text)
      WHERE ($1::text IS NULL OR $1 = '' OR rm.branch_id::text = $1::text)
        AND ($2::date IS NULL OR su.used_at::date >= $2::date)
        AND ($3::date IS NULL OR su.used_at::date <= $3::date)
      GROUP BY sc.service_id, sc.service_name, sc.category
      ORDER BY total_orders DESC, total_revenue DESC
      LIMIT $4::int;
    `;

    // 2. Meal Plan Customer Preferences
    const mealPlansSql = `
      SELECT
        COALESCE(mp.plan_name, 'Room Only') AS plan_name,
        COUNT(*)::int AS bookings_count,
        ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0)) * 100, 1)::float AS percentage
      FROM booking_rooms bkr
      LEFT JOIN meal_plans mp ON mp.plan_id = bkr.plan_id
      JOIN rooms rm ON (rm.id::text = bkr.room_id::text OR rm.room_id::text = bkr.room_id::text)
      WHERE ($1::text IS NULL OR $1 = '' OR rm.branch_id::text = $1::text)
        AND ($2::date IS NULL OR bkr.created_at::date >= $2::date)
        AND ($3::date IS NULL OR bkr.created_at::date <= $3::date)
      GROUP BY mp.plan_name
      ORDER BY bookings_count DESC;
    `;

    // 3. Room Category Preferences & Stay Length
    const roomPrefsSql = `
      SELECT
        COALESCE(rt.type_name, rm.type::text, 'Standard Room') AS room_type_name,
        COUNT(*)::int AS bookings_count,
        ROUND(AVG(GREATEST(1, bkr.check_out_date - bkr.check_in_date)), 1)::float AS avg_nights,
        ROUND(SUM(bkr.rate_at_booking * GREATEST(1, bkr.check_out_date - bkr.check_in_date)), 2)::float AS total_tariff_revenue
      FROM booking_rooms bkr
      JOIN rooms rm ON (rm.id::text = bkr.room_id::text OR rm.room_id::text = bkr.room_id::text)
      LEFT JOIN room_types rt ON (rt.type_name = rm.type::text OR rt.room_type_id::text = to_jsonb(bkr)->>'room_type_id')
      WHERE ($1::text IS NULL OR $1 = '' OR rm.branch_id::text = $1::text)
        AND ($2::date IS NULL OR bkr.created_at::date >= $2::date)
        AND ($3::date IS NULL OR bkr.created_at::date <= $3::date)
      GROUP BY COALESCE(rt.type_name, rm.type::text, 'Standard Room')
      ORDER BY bookings_count DESC;
    `;

    const [topServicesRes, mealPlansRes, roomPrefsRes] = await Promise.all([
      this.db.query<TopServiceItem>(topServicesSql, [branchId ?? null, startDate ?? null, endDate ?? null, limit]),
      this.db.query<MealPlanPreferenceItem>(mealPlansSql, [branchId ?? null, startDate ?? null, endDate ?? null]),
      this.db.query<RoomTypePreferenceItem>(roomPrefsSql, [branchId ?? null, startDate ?? null, endDate ?? null]),
    ]);

    return {
      period_start: startDate ?? null,
      period_end: endDate ?? null,
      top_services: topServicesRes.rows.map(r => ({
        ...r,
        total_orders: Number(r.total_orders),
        units_consumed: Number(r.units_consumed),
        total_revenue: Number(r.total_revenue),
      })),
      meal_plan_preferences: mealPlansRes.rows.map(r => ({
        ...r,
        bookings_count: Number(r.bookings_count),
        percentage: Number(r.percentage),
      })),
      room_type_preferences: roomPrefsRes.rows.map(r => ({
        ...r,
        bookings_count: Number(r.bookings_count),
        avg_nights: Number(r.avg_nights),
        total_tariff_revenue: Number(r.total_tariff_revenue),
      })),
    };
  }
}
