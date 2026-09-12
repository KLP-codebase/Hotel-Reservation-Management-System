import { DbAdapter } from '../config/db';
import { AccountType } from '../lib/jwt-payload.builder';
import { BaseRepository } from './base.repository';

export interface UserAccount {
  user_account_id: string;
  staff_id:        string;
  username:        string;
  password_hash:   string;
  account_type:    AccountType;
  is_active:       boolean;
  last_login_at:   Date | null;
  created_at:      Date;
  updated_at:      Date;
  // from v_active_accounts view
  first_name?:     string;
  last_name?:      string;
  email?:          string;
  branch_id?:      string | null;
  branch_name?:    string | null;
}

export interface CreateUserAccountDto {
  staff_id:       string;
  username:       string;
  password_hash:  string;
  account_type:   AccountType;
}

export interface UpdateUserAccountDto {
  username?:      string;
  password_hash?: string;
  is_active?:     boolean;
}

export class UserAccountRepository extends BaseRepository<
  UserAccount,
  CreateUserAccountDto,
  UpdateUserAccountDto
> {
  constructor(db: DbAdapter) { super(db); }

  // ── Template Method hooks ─────────────────────────────────────────────────────

  protected getFindAllSql(): string {
    return `SELECT * FROM v_active_accounts ORDER BY last_name, first_name`;
  }

  protected getFindByIdSql(): string {
    return `SELECT * FROM v_active_accounts WHERE user_account_id = $1`;
  }

  protected getSoftDeleteSql(): string {
    return `UPDATE user_accounts SET is_active = false WHERE user_account_id = $1`;
  }

  protected buildInsertParams(dto: CreateUserAccountDto): { values: unknown[]; sql: string } {
    return {
      values: [dto.staff_id, dto.username, dto.password_hash, dto.account_type],
      sql: `INSERT INTO user_accounts (staff_id, username, password_hash, account_type)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
    };
  }

  protected buildUpdateParams(id: string, dto: UpdateUserAccountDto): { values: unknown[]; sql: string } {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.username      !== undefined) { fields.push(`username = $${i++}`);      values.push(dto.username); }
    if (dto.password_hash !== undefined) { fields.push(`password_hash = $${i++}`); values.push(dto.password_hash); }
    if (dto.is_active     !== undefined) { fields.push(`is_active = $${i++}`);     values.push(dto.is_active); }

    values.push(id);
    return {
      values,
      sql: `UPDATE user_accounts SET ${fields.join(', ')} WHERE user_account_id = $${i} RETURNING *`,
    };
  }

  // ── Auth-specific queries ─────────────────────────────────────────────────────

  async findByUsername(username: string): Promise<UserAccount | null> {
    const { rows } = await this.db.query<UserAccount>(
      `SELECT ua.*, s.first_name, s.last_name, s.email, s.branch_id, b.branch_name
       FROM user_accounts ua
       JOIN staff s ON ua.staff_id = s.staff_id
       LEFT JOIN branches b ON s.branch_id = b.branch_id
       WHERE ua.username = $1 AND ua.is_active = true`,
      [username],
    );
    return rows[0] ?? null;
  }

  /** GoF Singleton: Find the single Administrator account instance */
  async findAdminAccount(): Promise<UserAccount | null> {
    const { rows } = await this.db.query<UserAccount>(
      `SELECT ua.*, s.first_name, s.last_name, s.email, s.branch_id, b.branch_name
       FROM user_accounts ua
       JOIN staff s ON ua.staff_id = s.staff_id
       LEFT JOIN branches b ON s.branch_id = b.branch_id
       WHERE ua.account_type = 'ADMINISTRATOR' AND ua.is_active = true
       LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  async updateLastLogin(userAccountId: string): Promise<void> {

    await this.db.query(
      `UPDATE user_accounts SET last_login_at = NOW() WHERE user_account_id = $1`,
      [userAccountId],
    );
  }

  async createWithStaff(
    branchId: string | null,
    firstName: string,
    lastName: string,
    email: string,
    phone: string | null,
    role: AccountType,
    username: string,
    passwordHash: string,
  ): Promise<{ staffId: string; userAccountId: string }> {
    // Delegates to fn_create_staff_account (DB Template Method) — atomic, validated
    const { rows } = await this.db.query<{ out_staff_id: string; out_user_account_id: string }>(
      `SELECT * FROM fn_create_staff_account($1,$2,$3,$4,$5,$6::account_type,$7,$8)`,
      [branchId, firstName, lastName, email, phone, role, username, passwordHash],
    );
    return { staffId: rows[0].out_staff_id, userAccountId: rows[0].out_user_account_id };
  }
  async assignBranchToStaff(staffId: string, branchId: string): Promise<void> {
    await this.db.query(
      `UPDATE staff SET branch_id = $1 WHERE staff_id = $2`,
      [branchId, staffId],
    );
  }

}
