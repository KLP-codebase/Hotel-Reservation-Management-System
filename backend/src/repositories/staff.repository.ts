import { DbAdapter } from '../config/db';
import { AccountType } from '../lib/jwt-payload.builder';
import { BaseRepository } from './base.repository';

export interface Staff {
  staff_id:    string;
  branch_id:   string | null;
  first_name:  string;
  last_name:   string;
  email:       string;
  phone:       string | null;
  role:        AccountType;
  is_active:   boolean;
  created_at:  Date;
  updated_at:  Date;
  // from v_staff_details view
  branch_name?: string;
  branch_city?: string;
  invite_token?:            string | null;
  invite_token_expires_at?: Date | null;
  user_account_id?:         string | null;
  username?:                string | null;
}

export interface CreateStaffDto {
  branch_id?:  string;
  first_name:  string;
  last_name:   string;
  email:       string;
  phone?:      string;
  role:        AccountType;
}

export interface UpdateStaffDto {
  branch_id?:  string;
  first_name?: string;
  last_name?:  string;
  phone?:      string;
  role?:       AccountType;
}

export class StaffRepository extends BaseRepository<Staff, CreateStaffDto, UpdateStaffDto> {
  constructor(db: DbAdapter) { super(db); }

  // ── Template Method hooks ────────────────────────────────────────────────────
  // Queries use v_staff_details (Facade view) — no JOIN needed in TypeScript.

  protected getFindAllSql(): string {
    return `SELECT s.*, st.invite_token, st.invite_token_expires_at, ua.user_account_id, ua.username
            FROM v_staff_details s
            JOIN staff st ON s.staff_id = st.staff_id
            LEFT JOIN user_accounts ua ON ua.staff_id = s.staff_id
            WHERE s.is_active = true
            ORDER BY s.last_name, s.first_name`;
  }

  protected getFindByIdSql(): string {
    return `SELECT * FROM v_staff_details WHERE staff_id = $1`;
  }

  protected getSoftDeleteSql(): string {
    // Uses stored function (Template Method at DB level) — deactivates staff + account atomically
    return `SELECT fn_deactivate_staff($1)`;
  }

  protected buildInsertParams(dto: CreateStaffDto): { values: unknown[]; sql: string } {
    return {
      values: [
        dto.branch_id ?? null,
        dto.first_name,
        dto.last_name,
        dto.email,
        dto.phone ?? null,
        dto.role,
      ],
      sql: `INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
    };
  }

  protected buildUpdateParams(id: string, dto: UpdateStaffDto): { values: unknown[]; sql: string } {
    // Uses stored function fn_update_staff (Template Method at DB level)
    return {
      values: [id, dto.first_name ?? null, dto.last_name ?? null, dto.phone ?? null, dto.role ?? null, dto.branch_id ?? null],
      sql: `SELECT * FROM fn_update_staff($1, $2, $3, $4, $5::account_type, $6)`,
    };
  }

  // ── Extra queries ─────────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<Staff | null> {
    const { rows } = await this.db.query<Staff>(
      `SELECT * FROM v_staff_details WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findByBranch(branchId: string): Promise<Staff[]> {
    const { rows } = await this.db.query<Staff>(
      `SELECT * FROM v_staff_details WHERE branch_id = $1 AND is_active = true ORDER BY last_name`,
      [branchId],
    );
    return rows;
  }

  async setInviteToken(staffId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db.query(
      `UPDATE staff SET invite_token = $1, invite_token_expires_at = $2 WHERE staff_id = $3`,
      [token, expiresAt, staffId],
    );
  }

  async findByInviteToken(token: string): Promise<(Staff & { branch_name?: string }) | null> {
    const { rows } = await this.db.query<Staff & { branch_name?: string }>(
      `SELECT s.*, st.invite_token, st.invite_token_expires_at, ua.user_account_id
       FROM v_staff_details s
       JOIN staff st ON s.staff_id = st.staff_id
       LEFT JOIN user_accounts ua ON ua.staff_id = s.staff_id
       WHERE st.invite_token = $1 AND s.is_active = true`,
      [token],
    );
    return rows[0] ?? null;
  }

  async clearInviteToken(staffId: string): Promise<void> {
    await this.db.query(
      `UPDATE staff SET invite_token = NULL, invite_token_expires_at = NULL WHERE staff_id = $1`,
      [staffId],
    );
  }
}
