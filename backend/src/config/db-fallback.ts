import { QueryResult, QueryResultRow } from 'pg';

// Pre-generated bcrypt hash for 'SkyNest2025!' and seed accounts
const DEFAULT_HASH = '$2a$10$wS25mUj1z0wX/bT9F0eUleC1.wQ7s4J3R6v5.2mG8h1K3l0p9q4re';

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

export interface MenuItem {
  id:          string;
  name:        string;
  category:    'Dining';
  meal_time:   'BREAKFAST' | 'LUNCH' | 'DINNER' | 'ALL_DAY';
  price:       number;
  description: string;
  prep_time:   string;
  popular?:    boolean;
}

export interface SpaTreatment {
  id:              string;
  name:            string;
  category:        'Wellness';
  price:           number;
  duration:        string;
  description:     string;
  collision_aware: boolean;
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

export interface FolioServiceItem {
  usage_id:          string;
  booking_id:        string;
  booking_room_id:   string;
  service_id:        string | number;
  service_name:      string;
  category:          string;
  meal_time?:        string | null;
  quantity:          number;
  price_at_usage:    number;
  total_price:       number;
  used_at:           string;
  notes?:            string | null;
  appointment_time?: string | null;
  is_active:         boolean;
}

export interface PaymentItem {
  payment_id:       string;
  booking_id:       string;
  booking_room_id:  string;
  invoice_id:       string;
  amount:           number;
  payment_date:     string;
  payment_method:   string;
  reference_number?: string | null;
  notes?:           string | null;
}

/** Helper to procedurally generate 16 rooms per branch */
function generateBranchRooms(branchId: string, prefix: string) {
  const types = [
    { floor: 1, type: 'Standard Room', price: 120, count: 4, start: 101 },
    { floor: 2, type: 'Deluxe Room',   price: 180, count: 4, start: 201 },
    { floor: 3, type: 'Suite',         price: 280, count: 4, start: 301 },
    { floor: 4, type: 'Presidential Suite', price: 500, count: 4, start: 401 },
  ];
  const rooms: any[] = [];
  types.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      const num = t.start + i;
      rooms.push({
        room_id:         `${prefix}-${num}`,
        branch_id:       branchId,
        room_number:     String(num),
        type:            t.type,
        floor:           t.floor,
        status:          i === 0 ? 'OCCUPIED' : (i === 1 ? 'RESERVED' : 'AVAILABLE'),
        price_per_night: t.price,
      });
    }
  });
  return rooms;
}

class InMemoryStore {
  public branches: SeedBranch[] = [
    { branch_id: 'b1111111-1111-1111-1111-111111111111', branch_name: 'Sky Nest Colombo', city: 'Colombo', address: '100 Galle Road', phone: '+94 11 200 0000', email: 'colombo@skynest.lk', is_active: true },
    { branch_id: 'b2222222-2222-2222-2222-222222222222', branch_name: 'Sky Nest Galle',   city: 'Galle',   address: '12 Fort Road',  phone: '+94 91 200 0000', email: 'galle@skynest.lk',   is_active: true },
    { branch_id: 'b3333333-3333-3333-3333-333333333333', branch_name: 'Sky Nest Kandy',   city: 'Kandy',   address: '45 Lake Road',  phone: '+94 81 200 0000', email: 'kandy@skynest.lk',   is_active: true },
  ];

  public staff: SeedStaff[] = [
    { staff_id: 's1111111-1111-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Kavindi',   last_name: 'Jayawardena', email: 'admin@skynest.lk',        phone: '+94 77 100 0004', role: 'ADMINISTRATOR', is_active: true },
    { staff_id: 's1111111-2222-1111-1111-111111111111', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Sanath',    last_name: 'Wickrama',    email: 'sanath.w@skynest.lk',     phone: '+94 77 220 1001', role: 'MANAGER',       is_active: true },
    { staff_id: 's3333333-3333-3333-3333-333333333333', branch_id: 'b1111111-1111-1111-1111-111111111111', first_name: 'Amara',     last_name: 'Perera',      email: 'receptionist@skynest.lk', phone: '+94 77 100 0001', role: 'RECEPTIONIST',  is_active: true },
    { staff_id: 's2222222-2222-2222-2222-222222222222', branch_id: 'b2222222-2222-2222-2222-222222222222', first_name: 'Dilshan',   last_name: 'Fernando',    email: 'manager@skynest.lk',      phone: '+94 77 100 0003', role: 'MANAGER',       is_active: true },
    { staff_id: 's4444444-5555-4444-4444-444444444444', branch_id: 'b3333333-3333-3333-3333-333333333333', first_name: 'Nuwan',     last_name: 'Silva',       email: 'service@skynest.lk',      phone: '+94 77 100 0002', role: 'SERVICE_STAFF', is_active: true },
  ];

  public userAccounts: SeedUserAccount[] = [
    { user_account_id: 'u1', staff_id: 's1111111-1111-1111-1111-111111111111', username: 'admin',        password_hash: DEFAULT_HASH, account_type: 'ADMINISTRATOR', is_active: true, last_login_at: null, created_at: new Date(), updated_at: new Date(), first_name: 'Kavindi', last_name: 'Jayawardena', email: 'admin@skynest.lk', branch_id: 'b1111111-1111-1111-1111-111111111111', branch_name: 'Sky Nest Colombo' },
    { user_account_id: 'u2', staff_id: 's2222222-2222-2222-2222-222222222222', username: 'manager',      password_hash: DEFAULT_HASH, account_type: 'MANAGER',       is_active: true, last_login_at: null, created_at: new Date(), updated_at: new Date(), first_name: 'Dilshan', last_name: 'Fernando',    email: 'manager@skynest.lk', branch_id: 'b2222222-2222-2222-2222-222222222222', branch_name: 'Sky Nest Galle' },
    { user_account_id: 'u3', staff_id: 's3333333-3333-3333-3333-333333333333', username: 'receptionist', password_hash: DEFAULT_HASH, account_type: 'RECEPTIONIST',  is_active: true, last_login_at: null, created_at: new Date(), updated_at: new Date(), first_name: 'Amara',   last_name: 'Perera',      email: 'receptionist@skynest.lk', branch_id: 'b1111111-1111-1111-1111-111111111111', branch_name: 'Sky Nest Colombo' },
  ];

  public menus: MenuItem[] = [
    { id: 'm1', name: 'Sri Lankan Hopper Fiesta',   category: 'Dining', meal_time: 'BREAKFAST', price: 18.00, description: 'Crispy egg and plain hoppers with seeni sambal and coconut milk gravy', prep_time: '20 mins', popular: true },
    { id: 'm2', name: 'Ceylon Royal Black Pork Curry', category: 'Dining', meal_time: 'LUNCH',     price: 24.00, description: 'Tender slow-simmered pork in roasted spices with fragrant basmati rice', prep_time: '35 mins', popular: true },
    { id: 'm3', name: 'Lagoon Prawn Thermidor',     category: 'Dining', meal_time: 'DINNER',    price: 36.00, description: 'Jumbo fresh Negombo prawns baked with cheese, mushroom and white wine', prep_time: '30 mins', popular: true },
  ];

  public spaCatalogue: SpaTreatment[] = [
    { id: 's1', name: 'Ayurvedic Abhyanga Full Body Massage', category: 'Wellness', price: 75.00, duration: '60 Minutes', description: 'Warm herbal medicated oils to relieve fatigue, enhance circulation and tone muscles', collision_aware: true },
    { id: 's2', name: 'Shirodhara Third-Eye Therapy',        category: 'Wellness', price: 85.00, duration: '45 Minutes', description: 'Continuous gentle rhythmic stream of warm herbal oil over the forehead for deep serenity', collision_aware: true },
    { id: 's3', name: 'Royal Ceylon Herbal Body Scrub & Steam',category: 'Wellness', price: 95.00, duration: '75 Minutes', description: 'Sandalwood, turmeric & wild rice exfoliation followed by an aromatic steam bath', collision_aware: true },
  ];

  public spaAppointments: Array<{
    id: string; branch_id?: string; booking_id: string; time: string; date: string; status: 'SCHEDULED' | 'CANCELLED';
  }> = [];

  public rooms = [
    ...generateBranchRooms('b1111111-1111-1111-1111-111111111111', 'COL'),
    ...generateBranchRooms('b2222222-2222-2222-2222-222222222222', 'GAL'),
    ...generateBranchRooms('b3333333-3333-3333-3333-333333333333', 'KAN'),
  ];

  public bookings: any[] = [
    {
      booking_id: "88888888-8888-8888-8888-888888888801",
      booking_room_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01",
      branch_id: "b1111111-1111-1111-1111-111111111111",
      booking_status: "CHECKED_IN",
      guest_first_name: "Alexander",
      guest_last_name: "Wright",
      guest_email: "alex.wright@global.com",
      room_number: "201",
      room_type_name: "Deluxe Room",
      check_in_date: "2026-09-10",
      check_out_date: "2026-09-14",
      rate_at_booking: 180,
      nights: 4,
      total_amount: 720,
    },
    {
      booking_id: "88888888-8888-8888-8888-888888888802",
      booking_room_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02",
      branch_id: "b1111111-1111-1111-1111-111111111111",
      booking_status: "CHECKED_IN",
      guest_first_name: "Priyanka",
      guest_last_name: "Deshmukh",
      guest_email: "priyanka.d@india.com",
      room_number: "302",
      room_type_name: "Suite",
      check_in_date: "2026-09-11",
      check_out_date: "2026-09-13",
      rate_at_booking: 280,
      nights: 2,
      total_amount: 560,
    },
    {
      booking_id: "88888888-8888-8888-8888-888888888803",
      booking_room_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03",
      branch_id: "b1111111-1111-1111-1111-111111111111",
      booking_status: "CHECKED_IN",
      guest_first_name: "Liam",
      guest_last_name: "O'Connor",
      guest_email: "liam.oc@dublin.ie",
      room_number: "102",
      room_type_name: "Standard Room",
      check_in_date: "2026-09-09",
      check_out_date: "2026-09-11",
      rate_at_booking: 120,
      nights: 2,
      total_amount: 240,
    },
    {
      booking_id: "797f97aa-109d-483f-b049-b3b7d3e367fa",
      booking_room_id: "6bfce150-5730-4e1a-861b-6809cd249424",
      branch_id: "b1111111-1111-1111-1111-111111111111",
      booking_status: "CONFIRMED",
      guest_first_name: "Janaka",
      guest_last_name: "Chathuranga",
      guest_email: "VC@gmail.com",
      room_number: "101",
      room_type_name: "Standard Room",
      check_in_date: "2026-09-11",
      check_out_date: "2026-09-13",
      rate_at_booking: 120,
      nights: 2,
      total_amount: 240,
    },
    {
      booking_id: "32d5a06a-4d6a-4653-a477-0c886b0215e5",
      booking_room_id: "a2cda125-978c-4297-937e-c78e15207ab5",
      branch_id: "b1111111-1111-1111-1111-111111111111",
      booking_status: "CONFIRMED",
      guest_first_name: "Janaka",
      guest_last_name: "Chathuranga",
      guest_email: "VC@gmail.com",
      room_number: "101",
      room_type_name: "Standard Room",
      check_in_date: "2026-09-13",
      check_out_date: "2026-09-16",
      rate_at_booking: 120,
      nights: 3,
      total_amount: 360,
    },
  ];

  public folioServices: FolioServiceItem[] = [];
  public payments: PaymentItem[] = [];

  public syncAliveDates() {
    const addD = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const b1 = this.bookings.find(b => b.booking_id === '88888888-8888-8888-8888-888888888801');
    if (b1) { b1.check_in_date = addD(-1); b1.check_out_date = addD(3); }

    const b2 = this.bookings.find(b => b.booking_id === '88888888-8888-8888-8888-888888888802');
    if (b2) { b2.check_in_date = addD(-1); b2.check_out_date = addD(2); }

    const b3 = this.bookings.find(b => b.booking_id === '88888888-8888-8888-8888-888888888803');
    if (b3) { b3.check_in_date = addD(-2); b3.check_out_date = addD(0); }

    this.spaAppointments = [
      { id: 'sa-1', branch_id: 'b2222222-2222-2222-2222-222222222222', booking_id: '55555555-5555-5555-5555-555555555501', time: '09:00', date: addD(0), status: 'SCHEDULED' },
      { id: 'sa-2', branch_id: 'b2222222-2222-2222-2222-222222222222', booking_id: '55555555-5555-5555-5555-555555555502', time: '14:00', date: addD(0), status: 'SCHEDULED' },
      { id: 'sa-3', branch_id: 'b2222222-2222-2222-2222-222222222222', booking_id: '55555555-5555-5555-5555-555555555503', time: '10:30', date: addD(1), status: 'SCHEDULED' },
    ];
  }

  public getSpaSlots(branchId?: string, dateStr?: string): SpaSlot[] {
    const defaultTimes = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00'];
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    return defaultTimes.map(time => {
      const activeAppt = this.spaAppointments.find(
        a => (!branchId || a.branch_id === branchId) && a.date === targetDate && a.time === time && a.status === 'SCHEDULED'
      );
      let bookedBy = undefined;
      if (activeAppt) {
        const b = this.bookings.find(bk => bk.booking_id === activeAppt.booking_id);
        bookedBy = {
          booking_id: activeAppt.booking_id,
          guest_name: b ? b.guest_first_name + ' ' + b.guest_last_name : 'Resident Guest',
          room_number: b ? b.room_number : '101',
          treatment_name: 'Ayurvedic Therapy',
        };
      }
      return {
        time,
        is_available: !activeAppt,
        booked_by: bookedBy,
      };
    });
  }

  public getFolio(bookingId: string) {
    return this.folioServices.filter(
      s => (s.booking_id === bookingId || s.booking_room_id === bookingId) && s.is_active
    );
  }

  public addFolioService(bookingId: string, item: any) {
    let booking = this.bookings.find(b => b.booking_id === bookingId || b.booking_room_id === bookingId);
    if (!booking) {
      booking = {
        booking_id: bookingId,
        booking_room_id: bookingId,
        branch_id: 'b1111111-1111-1111-1111-111111111111',
        guest_name: 'Resident Guest',
        room_number: '101',
      };
      this.bookings.push(booking);
    }

    const newRecord: FolioServiceItem = {
      usage_id:         `su-${Date.now()}`,
      booking_id:       booking.booking_id,
      booking_room_id:  booking.booking_room_id || booking.booking_id,
      service_id:       item.service_id || 1,
      service_name:     item.service_name,
      category:         item.category,
      meal_time:        item.meal_time ?? null,
      quantity:         item.quantity || 1,
      price_at_usage:   item.price_at_usage,
      total_price:      (item.quantity || 1) * item.price_at_usage,
      used_at:          new Date().toISOString(),
      notes:            item.notes ?? null,
      appointment_time: item.appointment_time ?? null,
      is_active:        true,
    };

    this.folioServices.push(newRecord);
    if (item.category === 'Wellness' && item.appointment_time) {
      this.spaAppointments.push({
        id: 'sa-' + Date.now(),
        branch_id: booking.branch_id,
        booking_id: booking.booking_id,
        time: item.appointment_time,
        date: item.date || new Date().toISOString().split('T')[0],
        status: 'SCHEDULED',
      });
    }
    return newRecord;
  }

  public removeFolioService(usageId: string, reason?: string) {
    const item = this.folioServices.find(s => s.usage_id === usageId);
    if (!item) return false;
    item.is_active = false;
    if (item.category === 'Wellness' && item.appointment_time) {
      const appt = this.spaAppointments.find(a => a.booking_id === item.booking_id && a.time === item.appointment_time);
      if (appt) appt.status = 'CANCELLED';
    }
    return true;
  }

  public getInvoice(bookingId: string) {
    const booking = this.bookings.find(b => b.booking_id === bookingId || b.booking_room_id === bookingId);
    if (!booking) return null;

    const nights = booking.nights || 1;
    const rateAtBooking = booking.rate_at_booking || 150;
    const roomCharges = Math.round(nights * rateAtBooking * 100) / 100;
    const activeServices = this.getFolio(booking.booking_id);
    const serviceCharges = Math.round(activeServices.reduce((sum, s) => sum + s.total_price, 0) * 100) / 100;
    const baseAmount = Math.round((roomCharges + serviceCharges) * 100) / 100;

    const scTax = Math.round(baseAmount * 0.10 * 100) / 100;
    const tdlTax = Math.round((baseAmount + scTax) * 0.01 * 100) / 100;
    const sscTax = Math.round((baseAmount + scTax + tdlTax) * 0.025 * 100) / 100;
    const vatTax = Math.round((baseAmount + scTax + tdlTax + sscTax) * 0.18 * 100) / 100;
    const grandTotal = Math.round((baseAmount + scTax + tdlTax + sscTax + vatTax) * 100) / 100;

    const payments = this.payments.filter(p => p.booking_id === booking.booking_id);
    const totalPaid = Math.round(payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

    return {
      invoice_id:      `inv-${booking.booking_id}`,
      booking_id:      booking.booking_id,
      booking_room_id: booking.booking_room_id || booking.booking_id,
      guest_name:      `${booking.guest_first_name || 'Guest'} ${booking.guest_last_name || ''}`.trim(),
      guest_email:     booking.guest_email || 'guest@skynest.lk',
      room_number:     booking.room_number || '101',
      room_type_name:  booking.room_type_name || 'Deluxe Room',
      check_in_date:   booking.check_in_date || '2026-09-10',
      check_out_date:  booking.check_out_date || '2026-09-14',
      nights,
      rate_at_booking: rateAtBooking,
      breakdown: {
        room_charges:       roomCharges,
        service_charges:    serviceCharges,
        base_amount:        baseAmount,
        service_charge_tax: scTax,
        tdl_amount:         tdlTax,
        ssc_amount:         sscTax,
        vat_amount:         vatTax,
        total_amount:       grandTotal,
        total_paid:         totalPaid,
        balance_due:        balanceDue,
        status:             balanceDue <= 0 ? 'SETTLED' : (totalPaid > 0 ? 'PARTIALLY_PAID' : 'OPEN'),
      },
      services: activeServices,
      payments,
    };
  }

  public addPayment(bookingId: string, payment: any) {
    const booking = this.bookings.find(b => b.booking_id === bookingId) || { booking_id: bookingId };
    const p: PaymentItem = {
      payment_id:       `pay-${Date.now()}`,
      booking_id:       bookingId,
      booking_room_id:  bookingId,
      invoice_id:       `inv-${bookingId}`,
      amount:           payment.amount,
      payment_date:     new Date().toISOString(),
      payment_method:   payment.payment_method,
      reference_number: payment.reference_number || `REC-${Date.now()}`,
      notes:            payment.notes || null,
    };
    this.payments.push(p);
    return { payment: p, invoice: this.getInvoice(bookingId) };
  }

  
  public checkIn(bookingId: string, data?: any) {
    let booking = this.bookings.find(b => b.booking_id === bookingId);
    if (!booking) {
      booking = { booking_id: bookingId, booking_status: "CHECKED_IN" };
      this.bookings.push(booking);
    }
    booking.booking_status = "CHECKED_IN";
    if (data?.roomNumber) booking.room_number = data.roomNumber;
    return booking;
  }

  public checkOut(bookingId: string, data?: any) {
    let booking = this.bookings.find(b => b.booking_id === bookingId);
    if (!booking) {
      booking = { booking_id: bookingId, booking_status: "CHECKED_OUT" };
      this.bookings.push(booking);
    }
    booking.booking_status = "CHECKED_OUT";
    return booking;
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const normalized = sql.trim().replace(/\s+/g, ' ');

    // User lookup
    if (normalized.includes('FROM user_accounts') && normalized.includes('ua.username = $1')) {
      const u = this.userAccounts.find(a => a.username.toLowerCase() === String(params[0]).toLowerCase());
      return { rows: (u ? [u] : []) as unknown as T[], command: 'SELECT', rowCount: u ? 1 : 0, oid: 0, fields: [] };
    }

    // Branches
    if (normalized.includes('FROM branches')) {
      return { rows: this.branches as unknown as T[], command: 'SELECT', rowCount: this.branches.length, oid: 0, fields: [] };
    }

    // Staff
    if (normalized.includes('FROM v_staff_details') || normalized.includes('FROM staff')) {
      return { rows: this.staff as unknown as T[], command: 'SELECT', rowCount: this.staff.length, oid: 0, fields: [] };
    }

    // Rooms
    if (normalized.includes('FROM rooms')) {
      return { rows: this.rooms as unknown as T[], command: 'SELECT', rowCount: this.rooms.length, oid: 0, fields: [] };
    }

    // Default fallback return
    return { rows: [] as unknown as T[], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
  }
}

export const inMemoryStore = new InMemoryStore();
