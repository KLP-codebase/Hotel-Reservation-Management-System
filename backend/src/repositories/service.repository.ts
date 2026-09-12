import { DbAdapter } from '../config/db';

export interface ServiceItem {
  service_id?:   number | string;
  service_name: string;
  category:     string;
  base_price:   number;
  meal_time?:   'BREAKFAST' | 'LUNCH' | 'DINNER';
  description?: string;
  prep_time?:   string;
  duration?:    string;
  is_active?:   boolean;
}

export interface ServiceUsageRecord {
  usage_id:         string;
  booking_room_id:  string;
  booking_id?:      string;
  service_id:       number | string;
  service_name:     string;
  category:         string;
  quantity:         number;
  price_at_usage:   number;
  total_price:      number;
  used_at:          string;
  notes?:           string | null;
  meal_time?:       string | null;
  appointment_time?: string | null;
}

export interface SpaSlot {
  time:         string;
  is_available: boolean;
  booked_by?: {
    booking_id:     string;
    guest_name:     string;
    room_number:    string;
    treatment_name: string;
  };
}

export class ServiceRepository {
  constructor(private db: DbAdapter) {}

  /**
   * Get all services available for a branch.
   */
  async getCatalogue(branchId?: string): Promise<ServiceItem[]> {
    const params: unknown[] = [];
    let sql = `SELECT service_id, branch_id, service_name, category, base_price, is_active FROM service_catalogue WHERE is_active = true`;
    if (branchId) {
      params.push(branchId);
      sql += ` AND (branch_id = $1 OR branch_id IS NULL)`;
    }
    sql += ` ORDER BY category, service_name`;
    const res = await this.db.query<ServiceItem>(sql, params);
    return res.rows;
  }

  /**
   * Get itemized folio services for a booking or booking_room.
   */
  async getFolioServices(bookingId: string): Promise<ServiceUsageRecord[]> {
    const sql = `
      SELECT
        su.usage_id,
        su.booking_room_id,
        br.booking_id,
        su.service_id,
        sc.service_name,
        sc.category,
        su.quantity,
        su.price_at_usage,
        (su.quantity * su.price_at_usage) AS total_price,
        su.used_at
      FROM service_usage su
      JOIN booking_rooms br ON br.booking_room_id = su.booking_room_id
      JOIN service_catalogue sc ON sc.service_id = su.service_id
      WHERE br.booking_id = $1 OR su.booking_room_id = $1
      ORDER BY su.used_at DESC
    `;
    const res = await this.db.query<ServiceUsageRecord>(sql, [bookingId]);
    return res.rows;
  }

  /**
   * Add service usage record with frozen price_at_usage (Rule B10).
   */
  async addServiceUsage(input: {
    booking_room_id: string;
    service_id:      number;
    quantity:        number;
    price_at_usage:  number;
    notes?:          string;
  }): Promise<{ usage_id: string }> {
    const sql = `
      INSERT INTO service_usage (booking_room_id, service_id, quantity, price_at_usage, used_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING usage_id
    `;
    const res = await this.db.query<{ usage_id: string }>(sql, [
      input.booking_room_id,
      input.service_id,
      input.quantity,
      input.price_at_usage,
    ]);
    return res.rows[0];
  }

  /**
   * Remove / void a service charge from folio.
   */
  async removeServiceUsage(usageId: string): Promise<boolean> {
    const sql = `DELETE FROM service_usage WHERE usage_id = $1`;
    const res = await this.db.query(sql, [usageId]);
    return (res.rowCount ?? 0) > 0;
  }
}
