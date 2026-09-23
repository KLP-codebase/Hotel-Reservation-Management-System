// Database access / Communicate with the database

import { DbAdapter } from '../config/db';

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface TaxConfiguration {
  tax_id: number;
  tax_name: string;
  tax_percentage: number;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  external_api_reference?: string | null;
  last_synced_at?: string | null;
}

export interface CreateTaxDto {
  tax_name: string;
  tax_percentage: number;
  is_active?: boolean;
  effective_from: string;
  effective_to?: string | null;
}

export interface UpdateTaxDto {
  tax_percentage?: number;
  is_active?: boolean;
  effective_to?: string | null;
}

// ── Repository Class (Raw SQL Data Access) ────────────────────────────────────
export class TaxRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * 1. Get all taxes (both active and inactive)
   */
  async findAll(): Promise<TaxConfiguration[]> {
    const { rows } = await this.db.query<TaxConfiguration>(
      `SELECT tax_id, tax_name, tax_percentage::float AS tax_percentage, is_active,
              effective_from::text, effective_to::text, external_api_reference, last_synced_at
       FROM tax_configurations
       ORDER BY tax_id ASC`
    );
    return rows;
  }

  /**
   * 2. Get only currently-active statutory taxes (Rule B13)
   * Matches taxes where is_active is true and today's date falls within effective dates.
   */
  async findActive(): Promise<TaxConfiguration[]> {
    const { rows } = await this.db.query<TaxConfiguration>(
      `SELECT tax_id, tax_name, tax_percentage::float AS tax_percentage, is_active,
              effective_from::text, effective_to::text
       FROM tax_configurations
       WHERE is_active = true
         AND CURRENT_DATE >= effective_from
         AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
       ORDER BY tax_id ASC`
    );
    return rows;
  }

  /**
   * 3. Find a single tax by its tax_id
   */
  async findById(taxId: number): Promise<TaxConfiguration | null> {
    const { rows } = await this.db.query<TaxConfiguration>(
      `SELECT tax_id, tax_name, tax_percentage::float AS tax_percentage, is_active,
              effective_from::text, effective_to::text
       FROM tax_configurations
       WHERE tax_id = $1`,
      [taxId]
    );
    return rows[0] ?? null;
  }

  /**
   * 4. Update a tax rate or status (Parameterised SQL for security)
   */
  async update(taxId: number, dto: UpdateTaxDto): Promise<TaxConfiguration | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.tax_percentage !== undefined) {
      fields.push(`tax_percentage = $${i++}`);
      values.push(dto.tax_percentage);
    }
    if (dto.is_active !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(dto.is_active);
    }
    if (dto.effective_to !== undefined) {
      fields.push(`effective_to = $${i++}`);
      values.push(dto.effective_to);
    }

    if (fields.length === 0) {
      return this.findById(taxId);
    }

    values.push(taxId);
    const sql = `
      UPDATE tax_configurations
      SET ${fields.join(', ')}
      WHERE tax_id = $${i}
      RETURNING tax_id, tax_name, tax_percentage::float AS tax_percentage, is_active,
                effective_from::text, effective_to::text
    `;

    const { rows } = await this.db.query<TaxConfiguration>(sql, values);
    return rows[0] ?? null;
  }

  /**
   * 5. Create a new tax rate row (Versioned configuration)
   */
  async create(dto: CreateTaxDto): Promise<TaxConfiguration> {
    const { rows } = await this.db.query<TaxConfiguration>(
      `INSERT INTO tax_configurations (tax_name, tax_percentage, is_active, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING tax_id, tax_name, tax_percentage::float AS tax_percentage, is_active,
                 effective_from::text, effective_to::text`,
      [
        dto.tax_name,
        dto.tax_percentage,
        dto.is_active ?? true,
        dto.effective_from,
        dto.effective_to ?? null,
      ]
    );
    return rows[0];
  }
}
