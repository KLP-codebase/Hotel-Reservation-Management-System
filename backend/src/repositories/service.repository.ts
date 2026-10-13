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

export interface CatalogueServiceRecord {
  service_id:   number;
  branch_id:    number;
  branch_name?: string;
  service_name: string;
  category:     string;
  base_price:   number;
  is_active:    boolean;
}

export interface CreateCatalogueServiceDto {
  branch_id:    number;
  service_name: string;
  category:     string;
  base_price:   number;
  is_active?:   boolean;
}

export interface UpdateCatalogueServiceDto {
  branch_id?:    number;
  service_name?: string;
  category?:     string;
  base_price?:   number;
  is_active?:    boolean;
}

export class ServiceRepository {
  constructor(private db: DbAdapter) {}

  /**
   * Get all services available for a branch (legacy/simple).
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
   * Find all catalogue services with branch join and filtering.
   */
  async findAllCatalogue(filters?: {
    branch_id?: number | string;
    category?: string;
    is_active?: boolean;
  }): Promise<CatalogueServiceRecord[]> {
    try {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      if (filters?.branch_id !== undefined && String(filters.branch_id) !== 'ALL' && String(filters.branch_id).trim() !== '') {
        conditions.push(`sc.branch_id::text = ${i++}::text`);
        values.push(String(filters.branch_id));
      }
      if (filters?.category !== undefined && filters.category !== 'ALL' && filters.category.trim() !== '') {
        conditions.push(`sc.category = ${i++}`);
        values.push(filters.category);
      }
      if (filters?.is_active !== undefined) {
        conditions.push(`sc.is_active = ${i++}`);
        values.push(filters.is_active);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          sc.service_id,
          sc.branch_id,
          COALESCE(b.branch_name, 'All Branches') AS branch_name,
          sc.service_name,
          sc.category,
          sc.base_price::float AS base_price,
          sc.is_active
        FROM service_catalogue sc
        LEFT JOIN branches b ON b.branch_id::text = sc.branch_id::text
        ${whereClause}
        ORDER BY b.branch_name ASC NULLS LAST, sc.category ASC, sc.service_name ASC
      `;

      const { rows } = await this.db.query<CatalogueServiceRecord>(sql, values);
      return rows;
    } catch (err: unknown) {
      console.warn('[ServiceRepository] findAllCatalogue query error:', (err as Error)?.message);
      return [];
    }
  }

  /**
   * Find a single catalogue service by its ID.
   */
  async findCatalogueById(serviceId: number): Promise<CatalogueServiceRecord | null> {
    const sql = `
      SELECT
        sc.service_id,
        sc.branch_id,
        b.branch_name,
        sc.service_name,
        sc.category,
        sc.base_price::float AS base_price,
        sc.is_active
      FROM service_catalogue sc
      LEFT JOIN branches b ON b.branch_id = sc.branch_id
      WHERE sc.service_id = $1
    `;
    const { rows } = await this.db.query<CatalogueServiceRecord>(sql, [serviceId]);
    return rows[0] ?? null;
  }

  /**
   * Create a new service in the catalogue.
   */
  async createCatalogue(dto: CreateCatalogueServiceDto): Promise<CatalogueServiceRecord> {
    const sql = `
      INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING service_id, branch_id, service_name, category, base_price::float AS base_price, is_active
    `;
    const { rows } = await this.db.query<CatalogueServiceRecord>(sql, [
      dto.branch_id,
      dto.service_name,
      dto.category,
      dto.base_price,
      dto.is_active ?? true,
    ]);
    return rows[0];
  }

  /**
   * Update an existing service in the catalogue.
   */
  async updateCatalogue(
    serviceId: number,
    dto: UpdateCatalogueServiceDto,
  ): Promise<CatalogueServiceRecord | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.branch_id !== undefined) {
      fields.push(`branch_id = $${i++}`);
      values.push(dto.branch_id);
    }
    if (dto.service_name !== undefined) {
      fields.push(`service_name = $${i++}`);
      values.push(dto.service_name);
    }
    if (dto.category !== undefined) {
      fields.push(`category = $${i++}`);
      values.push(dto.category);
    }
    if (dto.base_price !== undefined) {
      fields.push(`base_price = $${i++}`);
      values.push(dto.base_price);
    }
    if (dto.is_active !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(dto.is_active);
    }

    if (fields.length === 0) {
      return this.findCatalogueById(serviceId);
    }

    values.push(serviceId);
    const sql = `
      UPDATE service_catalogue
      SET ${fields.join(', ')}
      WHERE service_id = $${i}
      RETURNING service_id, branch_id, service_name, category, base_price::float AS base_price, is_active
    `;

    const { rows } = await this.db.query<CatalogueServiceRecord>(sql, values);
    return rows[0] ?? null;
  }

  /**
   * Soft-delete / deactivate a service in the catalogue.
   */
  async deleteCatalogue(serviceId: number): Promise<boolean> {
    const sql = `UPDATE service_catalogue SET is_active = false WHERE service_id = $1`;
    const res = await this.db.query(sql, [serviceId]);
    return (res.rowCount ?? 0) > 0;
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
