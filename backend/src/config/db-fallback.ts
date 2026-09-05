import { QueryResult, QueryResultRow } from 'pg';
import bcrypt from 'bcryptjs';

// Pre-generated bcrypt hash for 'admin2025' and seed accounts
const DEFAULT_HASH = '$2a$10$xm85S0x8C/4XYA6KxrX3eeGZ3N1eifAuxcsKMZYAjMuKz5lidYt8K'; // admin2025

export interface SeedUserAccount {
  user_account_id: string;
  staff_id:        string;
  username:        string;
  password_hash:   string;
  account_type:    'GUEST' | 'RECEPTIONIST' | 'SERVICE_STAFF' | 'MANAGER' | 'ADMINISTRATOR' | 'DBA';
  is_active:       boolean;
  last_login_at:   Date | null;
  created_at:      Date;
  updated_at:      Date;
  first_name:      string;
  last_name:       string;
  email:           string;
  branch_id:       string | null;
  branch_name:     string | null;
}

export interface SeedBranch {
  branch_id:   string;
  branch_name: string;
  city:        string;
  address:     string;
  phone:       string;
  email:       string;
  is_active:   boolean;
}

export interface SeedStaff {
  staff_id:   string;
  branch_id:  string | null;
  first_name: string;
  last_name:  string;
  email:      string;
  phone:      string | null;
  role:       string;
  is_active:  boolean;
}

class InMemoryStore {
  public branches: SeedBranch[] = [
    { branch_id: 'b1111111-1111-1111-1111-111111111111', branch_name: 'Sky Nest Colombo', city: 'Colombo', address: '100 Galle Road', phone: '+94 11 200 0000', email: 'colombo@skynest.lk', is_active: true },
    { branch_id: 'b2222222-2222-2222-2222-222222222222', branch_name: 'Sky Nest Galle',   city: 'Galle',   address: '12 Fort Road',  phone: '+94 91 200 0000', email: 'galle@skynest.lk',   is_active: true },
    { branch_id: 'b3333333-3333-3333-3333-333333333333', branch_name: 'Sky Nest Kandy',   city: 'Kandy',   address: '45 Lake Road',  phone: '+94 81 200 0000', email: 'kandy@skynest.lk',   is_active: true },
  ];

  public staff: SeedStaff[] = [
    { staff_id: 's1111111-1111-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Kavindi',   last_name: 'Jayawardena', email: 'admin@skynest.lk',        phone: '+94 77 100 0004', role: 'ADMINISTRATOR', is_active: true },
    { staff_id: 's2222222-2222-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Dilshan',   last_name: 'Fernando',    email: 'manager@skynest.lk',      phone: '+94 77 100 0003', role: 'MANAGER',       is_active: true },
    { staff_id: 's3333333-3333-3333-3333-333333333333', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Amara',     last_name: 'Perera',      email: 'receptionist@skynest.lk', phone: '+94 77 100 0001', role: 'RECEPTIONIST',  is_active: true },
    { staff_id: 's4444444-4444-4444-4444-444444444444', branch_id: null,                                   first_name: 'Guest',     last_name: 'User',        email: 'guest@skynest.lk',        phone: null,              role: 'GUEST',         is_active: true },
  ];

  public userAccounts: SeedUserAccount[] = [
    {
      user_account_id: 'u1111111-1111-1111-1111-111111111111',
      staff_id:        's1111111-1111-1111-1111-111111111111',
      username:        'admin',
      password_hash:   DEFAULT_HASH,
      account_type:    'ADMINISTRATOR',
      is_active:       true,
      last_login_at:   null,
      created_at:      new Date(),
      updated_at:      new Date(),
      first_name:      'Kavindi',
      last_name:       'Jayawardena',
      email:           'admin@skynest.lk',
      branch_id:       'b1111111-1111-1111-1111-111111111111',
      branch_name:     'Sky Nest Colombo',
    },
    {
      user_account_id: 'u2222222-2222-2222-2222-222222222222',
      staff_id:        's2222222-2222-2222-2222-222222222222',
      username:        'manager',
      password_hash:   DEFAULT_HASH,
      account_type:    'MANAGER',
      is_active:       true,
      last_login_at:   null,
      created_at:      new Date(),
      updated_at:      new Date(),
      first_name:      'Dilshan',
      last_name:       'Fernando',
      email:           'manager@skynest.lk',
      branch_id:       'b2222222-2222-2222-2222-222222222222',
      branch_name:     'Sky Nest Galle',
    },
    {
      user_account_id: 'u3333333-3333-3333-3333-333333333333',
      staff_id:        's3333333-3333-3333-3333-333333333333',
      username:        'receptionist',
      password_hash:   DEFAULT_HASH,
      account_type:    'RECEPTIONIST',
      is_active:       true,
      last_login_at:   null,
      created_at:      new Date(),
      updated_at:      new Date(),
      first_name:      'Amara',
      last_name:       'Perera',
      email:           'receptionist@skynest.lk',
      branch_id:       'b1111111-1111-1111-1111-111111111111',
      branch_name:     'Sky Nest Colombo',
    },
    {
      user_account_id: 'u4444444-4444-4444-4444-444444444444',
      staff_id:        's4444444-4444-4444-4444-444444444444',
      username:        'guest',
      password_hash:   DEFAULT_HASH,
      account_type:    'GUEST',
      is_active:       true,
      last_login_at:   null,
      created_at:      new Date(),
      updated_at:      new Date(),
      first_name:      'Guest',
      last_name:       'User',
      email:           'guest@skynest.lk',
      branch_id:       null,
      branch_name:     null,
    },
  ];

  public async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');

    // 1. Find user by username
    if (normalizedSql.includes('FROM user_accounts') && normalizedSql.includes('ua.username = $1')) {
      const username = params[0] as string;
      const account = this.userAccounts.find(u => u.username === username && u.is_active);
      return { rows: (account ? [account] : []) as unknown as T[], command: 'SELECT', rowCount: account ? 1 : 0, oid: 0, fields: [] };
    }

    // 2. Find user by ID
    if (normalizedSql.includes('FROM v_active_accounts') && normalizedSql.includes('user_account_id = $1')) {
      const id = params[0] as string;
      const account = this.userAccounts.find(u => u.user_account_id === id && u.is_active);
      return { rows: (account ? [account] : []) as unknown as T[], command: 'SELECT', rowCount: account ? 1 : 0, oid: 0, fields: [] };
    }

    // 3. Find admin account
    if (normalizedSql.includes("account_type = 'ADMINISTRATOR'")) {
      const admin = this.userAccounts.find(u => u.account_type === 'ADMINISTRATOR' && u.is_active);
      return { rows: (admin ? [admin] : []) as unknown as T[], command: 'SELECT', rowCount: admin ? 1 : 0, oid: 0, fields: [] };
    }

    // 4. Update last login
    if (normalizedSql.includes('UPDATE user_accounts SET last_login_at = NOW()')) {
      const id = params[0] as string;
      const acc = this.userAccounts.find(u => u.user_account_id === id);
      if (acc) acc.last_login_at = new Date();
      return { rows: [], command: 'UPDATE', rowCount: acc ? 1 : 0, oid: 0, fields: [] };
    }

    // 5. fn_create_staff_account
    if (normalizedSql.includes('fn_create_staff_account')) {
      const [branchId, firstName, lastName, email, phone, role, username, passwordHash] = params as [string | null, string, string, string, string | null, any, string, string];
      const staffId = `s_${Date.now()}`;
      const userAccountId = `u_${Date.now()}`;
      const branchObj = this.branches.find(b => b.branch_id === branchId);

      const newAccount: SeedUserAccount = {
        user_account_id: userAccountId,
        staff_id: staffId,
        username,
        password_hash: passwordHash,
        account_type: role,
        is_active: true,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        first_name: firstName,
        last_name: lastName,
        email,
        branch_id: branchId,
        branch_name: branchObj?.branch_name ?? null,
      };

      this.userAccounts.push(newAccount);
      this.staff.push({ staff_id: staffId, branch_id: branchId, first_name: firstName, last_name: lastName, email, phone, role, is_active: true });

      return {
        rows: [{ out_staff_id: staffId, out_user_account_id: userAccountId }] as unknown as T[],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }

    // 6. Branches
    if (normalizedSql.includes('FROM branches')) {
      return { rows: this.branches as unknown as T[], command: 'SELECT', rowCount: this.branches.length, oid: 0, fields: [] };
    }

    // 7. Staff list
    if (normalizedSql.includes('FROM staff') || normalizedSql.includes('FROM v_staff_details')) {
      return { rows: this.staff as unknown as T[], command: 'SELECT', rowCount: this.staff.length, oid: 0, fields: [] };
    }

    // 8. Audit logs or generic fallback
    return { rows: [] as unknown as T[], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
  }
}

export const inMemoryStore = new InMemoryStore();
