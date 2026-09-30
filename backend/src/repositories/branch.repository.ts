import { DbAdapter } from '../config/db';
import { AccountType } from '../lib/jwt-payload.builder';
import { BaseRepository } from './base.repository';

export interface Branch {
  branch_id:   string;
  branch_name: string;
  city:        string;
  address:     string | null;
  phone:       string | null;
  email:       string | null;
  is_active:   boolean;
  created_at:  Date;
  updated_at:  Date;
}

export interface CreateBranchDto {
  branch_name: string;
  city:        string;
  address?:    string;
  phone?:      string;
  email?:      string;
}

export interface UpdateBranchDto {
  branch_name?: string;
  city?:        string;
  address?:     string;
  phone?:       string;
  email?:       string;
  is_active?:   boolean;
}

export class BranchRepository extends BaseRepository<Branch, CreateBranchDto, UpdateBranchDto> {
  constructor(db: DbAdapter) { super(db); }

  // ── Template Method hooks ────────────────────────────────────────────────────

  protected getFindAllSql(): string {
    return `SELECT * FROM branches WHERE is_active = true ORDER BY branch_name ASC`;
  }

  protected getFindByIdSql(): string {
    return `SELECT * FROM branches WHERE branch_id = $1`;
  }

  protected getSoftDeleteSql(): string {
    return `UPDATE branches SET is_active = false WHERE branch_id = $1`;
  }

  protected buildInsertParams(dto: CreateBranchDto): { values: unknown[]; sql: string } {
    return {
      values: [dto.branch_name, dto.city, dto.address ?? null, dto.phone ?? null, dto.email ?? null],
      sql: `INSERT INTO branches (branch_name, city, address, phone, email)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
    };
  }

  protected buildUpdateParams(id: string, dto: UpdateBranchDto): { values: unknown[]; sql: string } {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.branch_name !== undefined) { fields.push(`branch_name = $${i++}`); values.push(dto.branch_name); }
    if (dto.city        !== undefined) { fields.push(`city = $${i++}`);        values.push(dto.city); }
    if (dto.address     !== undefined) { fields.push(`address = $${i++}`);     values.push(dto.address); }
    if (dto.phone       !== undefined) { fields.push(`phone = $${i++}`);       values.push(dto.phone); }
    if (dto.email       !== undefined) { fields.push(`email = $${i++}`);       values.push(dto.email); }
    if (dto.is_active   !== undefined) { fields.push(`is_active = $${i++}`);   values.push(dto.is_active); }

    values.push(id);
    return {
      values,
      sql: `UPDATE branches SET ${fields.join(', ')} WHERE branch_id = $${i} RETURNING *`,
    };
  }

  // ── Extra query ───────────────────────────────────────────────────────────────
  async findAllIncludingInactive(): Promise<Branch[]> {
    const { rows } = await this.db.query<Branch>(`SELECT * FROM branches ORDER BY branch_name`);
    return rows;
  }
}
