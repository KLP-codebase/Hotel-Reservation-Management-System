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
    // Colombo Branch (b1111111-...)
    { staff_id: 's1111111-1111-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Kavindi',   last_name: 'Jayawardena', email: 'admin@skynest.lk',        phone: '+94 77 100 0004', role: 'ADMINISTRATOR', is_active: true },
    { staff_id: 's1111111-2222-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Sanath',    last_name: 'Wickrama',    email: 'sanath.w@skynest.lk',     phone: '+94 77 220 1001', role: 'MANAGER',       is_active: true },
    { staff_id: 's3333333-3333-3333-3333-333333333333', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Amara',     last_name: 'Perera',      email: 'receptionist@skynest.lk', phone: '+94 77 100 0001', role: 'RECEPTIONIST',  is_active: true },
    { staff_id: 's1111111-3333-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Chamari',   last_name: 'Alwis',       email: 'chamari.a@skynest.lk',    phone: '+94 77 330 1002', role: 'SERVICE_STAFF', is_active: true },
    { staff_id: 's1111111-4444-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Dinesh',    last_name: 'Bandara',     email: 'dinesh.b@skynest.lk',     phone: '+94 77 440 1003', role: 'SERVICE_STAFF', is_active: true },

    // Galle Branch (b2222222-...) — Dilshan Fernando's Hotel
    { staff_id: 's2222222-2222-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Dilshan',   last_name: 'Fernando',    email: 'manager@skynest.lk',      phone: '+94 77 100 0003', role: 'MANAGER',       is_active: true },
    { staff_id: 's2222222-3333-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Tharushi',  last_name: 'Jayasuriya',  email: 'tharushi.j@skynest.lk',   phone: '+94 77 550 2001', role: 'RECEPTIONIST',  is_active: true },
    { staff_id: 's2222222-4444-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Kasun',     last_name: 'Mendis',      email: 'kasun.m@skynest.lk',      phone: '+94 77 660 2002', role: 'SERVICE_STAFF', is_active: true },
    { staff_id: 's2222222-5555-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Nilmini',   last_name: 'Priyadarshani',email: 'nilmini.p@skynest.lk',  phone: '+94 77 770 2003', role: 'SERVICE_STAFF', is_active: true },
    { staff_id: 's2222222-6666-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Mahesh',    last_name: 'Gunaratne',   email: 'mahesh.g@skynest.lk',     phone: '+94 77 880 2004', role: 'SERVICE_STAFF', is_active: true },

    // Kandy Branch (b3333333-...)
    { staff_id: 's3333333-2222-3333-3333-333333333333', branch_id: 'b3333333-3333-3333-3333-333333333333', first_name: 'Anoja',     last_name: 'Rathnayake',  email: 'anoja.r@skynest.lk',      phone: '+94 81 220 3001', role: 'MANAGER',       is_active: true },
    { staff_id: 's3333333-4444-3333-3333-333333333333', branch_id: 'b3333333-3333-3333-3333-333333333333', first_name: 'Malith',    last_name: 'Senanayake',  email: 'malith.s@skynest.lk',     phone: '+94 81 330 3002', role: 'RECEPTIONIST',  is_active: true },
    { staff_id: 's4444444-5555-4444-4444-444444444444', branch_id: 'b3333333-3333-3333-3333-333333333333', first_name: 'Nuwan',     last_name: 'Silva',       email: 'service@skynest.lk',      phone: '+94 77 100 0002', role: 'SERVICE_STAFF', is_active: true },
    { staff_id: 's3333333-5555-3333-3333-333333333333', branch_id: 'b3333333-3333-3333-3333-333333333333', first_name: 'Sandun',    last_name: 'Kulatunga',   email: 'sandun.k@skynest.lk',     phone: '+94 81 440 3003', role: 'SERVICE_STAFF', is_active: true },

    // Guest User
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

  private formatStaff(s: SeedStaff) {
    const branch = this.branches.find(b => b.branch_id === s.branch_id);
    return {
      ...s,
      branch_name: branch?.branch_name ?? null,
      branch_city: branch?.city ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

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
    if (normalizedSql.includes('FROM branches') && (normalizedSql.includes('branch_id = $1') || normalizedSql.includes('branch_id = $2'))) {
      const id = params[0] as string;
      const b = this.branches.find(br => br.branch_id === id);
      return { rows: (b ? [b] : []) as unknown as T[], command: 'SELECT', rowCount: b ? 1 : 0, oid: 0, fields: [] };
    }

    if (normalizedSql.startsWith('UPDATE branches SET')) {
      const branchId = params[params.length - 1] as string;
      const branch = this.branches.find(b => b.branch_id === branchId);
      if (branch) {
        if (normalizedSql.includes('is_active = false')) {
          branch.is_active = false;
        } else {
          const fieldMatches = [...normalizedSql.matchAll(/(\w+)\s*=\s*\$(\d+)/g)];
          for (const match of fieldMatches) {
            const fieldName = match[1];
            const paramIdx = parseInt(match[2], 10) - 1;
            const val = params[paramIdx];
            if (fieldName === 'branch_name' && val !== undefined) branch.branch_name = val as string;
            else if (fieldName === 'city' && val !== undefined) branch.city = val as string;
            else if (fieldName === 'address' && val !== undefined) branch.address = val as string;
            else if (fieldName === 'phone' && val !== undefined) branch.phone = val as string;
            else if (fieldName === 'email' && val !== undefined) branch.email = val as string;
            else if (fieldName === 'is_active' && val !== undefined) branch.is_active = Boolean(val);
          }
        }
        return { rows: [branch] as unknown as T[], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] };
      }
      return { rows: [] as unknown as T[], command: 'UPDATE', rowCount: 0, oid: 0, fields: [] };
    }

    if (normalizedSql.startsWith('INSERT INTO branches')) {
      const [branch_name, city, address, phone, email] = params as [string, string, string | null, string | null, string | null];
      const newBranch: SeedBranch = {
        branch_id: `b_${Date.now()}`,
        branch_name,
        city,
        address: address || '',
        phone: phone || '',
        email: email || '',
        is_active: true,
      };
      this.branches.push(newBranch);
      return { rows: [newBranch] as unknown as T[], command: 'INSERT', rowCount: 1, oid: 0, fields: [] };
    }

    if (normalizedSql.includes('FROM branches')) {
      const activeOnly = normalizedSql.includes('is_active = true');
      const list = activeOnly ? this.branches.filter(b => b.is_active) : this.branches;
      return { rows: list as unknown as T[], command: 'SELECT', rowCount: list.length, oid: 0, fields: [] };
    }

    // 7. Staff Management & Queries
    if (normalizedSql.includes('FROM v_staff_details') && normalizedSql.includes('email = $1')) {
      const email = (params[0] as string || '').trim().toLowerCase();
      const s = this.staff.find(m => m.email.trim().toLowerCase() === email && m.is_active);
      return { rows: (s ? [this.formatStaff(s)] : []) as unknown as T[], command: 'SELECT', rowCount: s ? 1 : 0, oid: 0, fields: [] };
    }

    if (normalizedSql.includes('FROM v_staff_details') && normalizedSql.includes('staff_id = $1')) {
      const id = params[0] as string;
      const s = this.staff.find(m => m.staff_id === id);
      return { rows: (s ? [this.formatStaff(s)] : []) as unknown as T[], command: 'SELECT', rowCount: s ? 1 : 0, oid: 0, fields: [] };
    }

    if (normalizedSql.includes('FROM v_staff_details') && normalizedSql.includes('branch_id = $1')) {
      const branchId = params[0] as string;
      const list = this.staff.filter(m => m.branch_id === branchId && m.is_active);
      return { rows: list.map(s => this.formatStaff(s)) as unknown as T[], command: 'SELECT', rowCount: list.length, oid: 0, fields: [] };
    }

    if (normalizedSql.startsWith('INSERT INTO staff')) {
      const [branch_id, first_name, last_name, email, phone, role] = params as [string | null, string, string, string, string | null, string];
      const newStaff: SeedStaff = {
        staff_id: `s_${Date.now()}`,
        branch_id: branch_id || null,
        first_name,
        last_name,
        email,
        phone: phone || null,
        role,
        is_active: true,
      };
      this.staff.push(newStaff);
      return { rows: [this.formatStaff(newStaff)] as unknown as T[], command: 'INSERT', rowCount: 1, oid: 0, fields: [] };
    }

    if (normalizedSql.includes('fn_update_staff')) {
      const [id, first_name, last_name, phone, role, branch_id] = params as [string, string | null, string | null, string | null, string | null, string | null];
      const s = this.staff.find(m => m.staff_id === id);
      if (s) {
        if (first_name != null) s.first_name = first_name;
        if (last_name != null) s.last_name = last_name;
        if (phone != null) s.phone = phone;
        if (role != null) s.role = role;
        if (branch_id !== undefined) s.branch_id = branch_id;
        return { rows: [this.formatStaff(s)] as unknown as T[], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
      }
      return { rows: [] as unknown as T[], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
    }

    if (normalizedSql.includes('fn_deactivate_staff')) {
      const id = params[0] as string;
      const s = this.staff.find(m => m.staff_id === id);
      if (s) s.is_active = false;
      return { rows: [{ fn_deactivate_staff: true }] as unknown as T[], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
    }

    if (normalizedSql.includes('FROM staff') || normalizedSql.includes('FROM v_staff_details')) {
      let list = this.staff.filter(s => s.is_active);
      if (normalizedSql.includes('branch_id = $1') && params.length > 0 && typeof params[0] === 'string') {
        list = list.filter(s => s.branch_id === params[0]);
      }
      return { rows: list.map(s => this.formatStaff(s)) as unknown as T[], command: 'SELECT', rowCount: list.length, oid: 0, fields: [] };
    }

    // Room Types
    if (normalizedSql.includes('FROM room_types') || normalizedSql.includes('FROM v_room_types')) {
      const mockTypes = [
        { room_type_id: 'rt-1', type_name: 'Deluxe Ocean Suite', base_daily_rate: 180, capacity: 2, description: 'Panoramic sea views, king-sized bed, private balcony and soaking tub.' },
        { room_type_id: 'rt-2', type_name: 'Heritage Villa Room', base_daily_rate: 220, capacity: 3, description: 'Colonial timber aesthetic with private courtyard garden.' },
        { room_type_id: 'rt-3', type_name: 'Hilltop Mountain Pavilion', base_daily_rate: 260, capacity: 4, description: 'Mist-shrouded mountain vistas, plunge pool, and bespoke fireplace.' },
        { room_type_id: 'rt-4', type_name: 'Presidential Sky Suite', base_daily_rate: 450, capacity: 4, description: 'Dual-level luxury penthouse with private infinity edge spa.' },
      ];
      return { rows: mockTypes as unknown as T[], command: 'SELECT', rowCount: mockTypes.length, oid: 0, fields: [] };
    }

        // 8a. Dashboard: Physical Rooms Status Explorer
    if (normalizedSql.includes("FROM rooms r") && normalizedSql.includes("JOIN branches b")) {
      const isScoped = params.length > 0 && typeof params[0] === 'string' && params[0].length > 5;
      const targetBranchId = isScoped ? (params[0] as string) : 'b2222222-2222-2222-2222-222222222222';
      const bObj = this.branches.find(b => b.branch_id === targetBranchId) || this.branches[1];

      const rooms = [
        // Floor 1 (Standard)
        { room_id: 'rm-101', room_number: '101', floor: 1, type: 'STANDARD', status: 'AVAILABLE',   price_per_night: 120, max_guests: 2, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-102', room_number: '102', floor: 1, type: 'STANDARD', status: 'AVAILABLE',   price_per_night: 120, max_guests: 2, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-103', room_number: '103', floor: 1, type: 'STANDARD', status: 'OCCUPIED',    price_per_night: 120, max_guests: 2, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: 'Marcus Thorne', guest_email: 'marcus.t@example.com', check_in_date: new Date().toISOString().split('T')[0], check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], booking_id: 'bk-galle-1' },
        { room_id: 'rm-104', room_number: '104', floor: 1, type: 'STANDARD', status: 'AVAILABLE',   price_per_night: 120, max_guests: 2, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-105', room_number: '105', floor: 1, type: 'STANDARD', status: 'MAINTENANCE', price_per_night: 120, max_guests: 2, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-106', room_number: '106', floor: 1, type: 'STANDARD', status: 'AVAILABLE',   price_per_night: 120, max_guests: 2, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },

        // Floor 2 (Deluxe)
        { room_id: 'rm-201', room_number: '201', floor: 2, type: 'DELUXE',   status: 'OCCUPIED',    price_per_night: 180, max_guests: 3, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: 'Sarah Jenkins', guest_email: 'sarah.j@example.com', check_in_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], booking_id: 'bk-galle-2' },
        { room_id: 'rm-202', room_number: '202', floor: 2, type: 'DELUXE',   status: 'AVAILABLE',   price_per_night: 180, max_guests: 3, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-203', room_number: '203', floor: 2, type: 'DELUXE',   status: 'OCCUPIED',    price_per_night: 180, max_guests: 3, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: 'James Wilson', guest_email: 'james.w@example.com', check_in_date: new Date().toISOString().split('T')[0], check_out_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0], booking_id: 'bk-galle-3' },
        { room_id: 'rm-204', room_number: '204', floor: 2, type: 'DELUXE',   status: 'AVAILABLE',   price_per_night: 180, max_guests: 3, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-205', room_number: '205', floor: 2, type: 'DELUXE',   status: 'AVAILABLE',   price_per_night: 180, max_guests: 3, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },

        // Floor 3 (Suite)
        { room_id: 'rm-301', room_number: '301', floor: 3, type: 'SUITE',    status: 'OCCUPIED',    price_per_night: 280, max_guests: 4, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: 'David Miller', guest_email: 'david.m@example.com', check_in_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], booking_id: 'bk-galle-4' },
        { room_id: 'rm-302', room_number: '302', floor: 3, type: 'SUITE',    status: 'AVAILABLE',   price_per_night: 280, max_guests: 4, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
        { room_id: 'rm-303', room_number: '303', floor: 3, type: 'SUITE',    status: 'OCCUPIED',    price_per_night: 280, max_guests: 4, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: 'Elena Rostova', guest_email: 'elena.r@example.com', check_in_date: new Date().toISOString().split('T')[0], check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], booking_id: 'bk-galle-5' },

        // Floor 4 (Presidential)
        { room_id: 'rm-401', room_number: '401', floor: 4, type: 'PRESIDENTIAL', status: 'OCCUPIED', price_per_night: 500, max_guests: 6, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: 'Sir Arthur Wellesley', guest_email: 'arthur.w@example.com', check_in_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], check_out_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], booking_id: 'bk-galle-6' },
        { room_id: 'rm-402', room_number: '402', floor: 4, type: 'PRESIDENTIAL', status: 'AVAILABLE',price_per_night: 500, max_guests: 6, branch_id: bObj.branch_id, branch_name: bObj.branch_name, guest_name: null, guest_email: null, check_in_date: null, check_out_date: null, booking_id: null },
      ];

      return { rows: rooms as unknown as T[], command: 'SELECT', rowCount: rooms.length, oid: 0, fields: [] };
    }

    // 8b. Dashboard stats: rooms count & occupancy
    if (normalizedSql.includes("FROM rooms")) {
      const isScoped = params.length > 0 && typeof params[0] === 'string' && params[0].length > 5;
      if (isScoped) {
        return {
          rows: [{ total_rooms: "16", occupied_rooms: "6", available_rooms: "9", maintenance_rooms: "1" }] as unknown as T[],
          command: "SELECT",
          rowCount: 1,
          oid: 0,
          fields: [],
        };
      }
      return {
        rows: [{ total_rooms: "48", occupied_rooms: "18", available_rooms: "27", maintenance_rooms: "3" }] as unknown as T[],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }

    // 9. Dashboard stats: bookings & movements
    if (normalizedSql.includes("FROM bookings b") || normalizedSql.includes("FROM bookings")) {
      const isScoped = params.length > 0 && typeof params[0] === 'string' && params[0].length > 5;
      if (isScoped) {
        return {
          rows: [{
            active_bookings: "6",
            checkins_today: "3",
            checkouts_today: "1",
            total_guests: "9",
          }] as unknown as T[],
          command: "SELECT",
          rowCount: 1,
          oid: 0,
          fields: [],
        };
      }
      return {
        rows: [{
          active_bookings: "18",
          checkins_today: "8",
          checkouts_today: "5",
          total_guests: "26",
        }] as unknown as T[],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }

    // 10. Dashboard stats: revenue today
    if (normalizedSql.includes("FROM invoices")) {
      const isScoped = params.length > 0 && typeof params[0] === 'string' && params[0].length > 5;
      return {
        rows: [{ revenue_today: isScoped ? "2480.00" : "7440.00" }] as unknown as T[],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }

    // 11. Recent bookings facade view
    if (normalizedSql.includes("FROM v_booking_details")) {
      const allBookings = [
        // Galle Branch Bookings (b2222222-...)
        {
          booking_id: "bk-galle-1",
          branch_id: "b2222222-2222-2222-2222-222222222222",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date(Date.now() - 86400000).toISOString(),
          branch_name: "Sky Nest Galle",
          guest_first_name: "Sarah",
          guest_last_name: "Jenkins",
          guest_email: "sarah.j@example.com",
          guest_phone: "+44 7911 123456",
          room_number: "201",
          room_type_name: "Heritage Deluxe Room",
          check_in_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          total_amount: 720.00,
          invoice_status: "OPEN",
          nights: 4,
        },
        {
          booking_id: "bk-galle-2",
          branch_id: "b2222222-2222-2222-2222-222222222222",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          branch_name: "Sky Nest Galle",
          guest_first_name: "David",
          guest_last_name: "Miller",
          guest_email: "david.m@example.com",
          guest_phone: "+61 412 345 678",
          room_number: "301",
          room_type_name: "Lighthouse View Suite",
          check_in_date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          total_amount: 1120.00,
          invoice_status: "OPEN",
          nights: 4,
        },
        {
          booking_id: "bk-galle-3",
          branch_id: "b2222222-2222-2222-2222-222222222222",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date().toISOString(),
          branch_name: "Sky Nest Galle",
          guest_first_name: "Elena",
          guest_last_name: "Rostova",
          guest_email: "elena.r@example.com",
          guest_phone: "+49 170 1234567",
          room_number: "303",
          room_type_name: "Rampart Suite",
          check_in_date: new Date().toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          total_amount: 840.00,
          invoice_status: "OPEN",
          nights: 3,
        },
        {
          booking_id: "bk-galle-4",
          branch_id: "b2222222-2222-2222-2222-222222222222",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date(Date.now() - 86400000).toISOString(),
          branch_name: "Sky Nest Galle",
          guest_first_name: "Arthur",
          guest_last_name: "Wellesley",
          guest_email: "arthur.w@example.com",
          guest_phone: "+44 20 7946 0912",
          room_number: "401",
          room_type_name: "Presidential Ocean Pavilion",
          check_in_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          total_amount: 3000.00,
          invoice_status: "OPEN",
          nights: 6,
        },
        {
          booking_id: "bk-galle-5",
          branch_id: "b2222222-2222-2222-2222-222222222222",
          booking_status: "CONFIRMED",
          booking_created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          branch_name: "Sky Nest Galle",
          guest_first_name: "Marcus",
          guest_last_name: "Thorne",
          guest_email: "marcus.t@example.com",
          guest_phone: "+1 415 555 2671",
          room_number: "102",
          room_type_name: "Colonial Courtyard Standard",
          check_in_date: new Date().toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          total_amount: 240.00,
          invoice_status: "CONFIRMED",
          nights: 2,
        },

        // Colombo Branch Bookings (b1111111-...)
        {
          booking_id: "bk-col-1",
          branch_id: "b1111111-1111-1111-1111-111111111111",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date().toISOString(),
          branch_name: "Sky Nest Colombo",
          guest_first_name: "Nimal",
          guest_last_name: "Siripala",
          guest_email: "nimal@example.com",
          guest_phone: "+94 71 234 5678",
          room_number: "302",
          room_type_name: "Executive Ocean Suite",
          check_in_date: new Date().toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          total_amount: 840.00,
          invoice_status: "OPEN",
          nights: 3,
        },
        {
          booking_id: "bk-col-2",
          branch_id: "b1111111-1111-1111-1111-111111111111",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date(Date.now() - 86400000).toISOString(),
          branch_name: "Sky Nest Colombo",
          guest_first_name: "Liam",
          guest_last_name: "O'Connor",
          guest_email: "liam.oc@example.com",
          guest_phone: "+353 87 123 4567",
          room_number: "202",
          room_type_name: "Deluxe Ocean Balcony",
          check_in_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          total_amount: 540.00,
          invoice_status: "OPEN",
          nights: 3,
        },

        // Kandy Branch Bookings (b3333333-...)
        {
          booking_id: "bk-kan-1",
          branch_id: "b3333333-3333-3333-3333-333333333333",
          booking_status: "CHECKED_IN",
          booking_created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          branch_name: "Sky Nest Kandy",
          guest_first_name: "Rohan",
          guest_last_name: "De Silva",
          guest_email: "rohan.d@example.com",
          guest_phone: "+94 77 987 6543",
          room_number: "204",
          room_type_name: "Mist Valley Suite",
          check_in_date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          check_out_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          total_amount: 840.00,
          invoice_status: "OPEN",
          nights: 3,
        },
      ];

      // Branch & status filter logic
      let filtered = allBookings;
      for (const param of params) {
        if (typeof param === 'string') {
          if (param.startsWith('b1111') || param.startsWith('b2222') || param.startsWith('b3333')) {
            filtered = filtered.filter(b => b.branch_id === param);
          } else if (['CHECKED_IN', 'CONFIRMED', 'CHECKED_OUT', 'CANCELLED'].includes(param)) {
            filtered = filtered.filter(b => b.booking_status === param);
          }
        }
      }

      return { rows: filtered as unknown as T[], command: "SELECT", rowCount: filtered.length, oid: 0, fields: [] };
    }

    // 12. Audit activity
    if (normalizedSql.includes("FROM v_admin_audit_activity") || normalizedSql.includes("FROM audit_logs")) {
      const mockAudit = [
        {
          audit_id: "aud-1",
          entity_type: "AUTH",
          action: "LOGIN_SUCCESS",
          created_at: new Date().toISOString(),
          ip_address: "127.0.0.1",
          actor_username: "admin",
          actor_first_name: "Kavindi",
          actor_last_name: "Jayawardena",
          actor_role: "ADMINISTRATOR",
          new_value: { method: "PASSWORD" },
          old_value: null,
        },
        {
          audit_id: "aud-2",
          entity_type: "BOOKING",
          action: "STATUS_CHECKED_IN",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          ip_address: "127.0.0.1",
          actor_username: "receptionist",
          actor_first_name: "Amara",
          actor_last_name: "Perera",
          actor_role: "RECEPTIONIST",
          new_value: { booking_id: "bk-101", room: "302" },
          old_value: { status: "CONFIRMED" },
        },
      ];
      return { rows: mockAudit as unknown as T[], command: "SELECT", rowCount: mockAudit.length, oid: 0, fields: [] };
    }

    // 13. DB Change ledger
    if (normalizedSql.includes("FROM change_log")) {
      const mockChanges = [
        {
          change_id: "chg-1",
          table_name: "booking_rooms",
          record_id: "br-302",
          operation: "UPDATE",
          db_user: "skynest_app",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          old_data: { status: "CONFIRMED" },
          new_data: { status: "CHECKED_IN" },
        },
      ];
      return { rows: mockChanges as unknown as T[], command: "SELECT", rowCount: mockChanges.length, oid: 0, fields: [] };
    }

    // Generic fallback
    return { rows: [] as unknown as T[], command: "SELECT", rowCount: 0, oid: 0, fields: [] };
  }
}

export const inMemoryStore = new InMemoryStore();
