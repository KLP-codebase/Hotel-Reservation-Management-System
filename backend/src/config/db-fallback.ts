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


export interface MenuItem {
  id:          string;
  name:        string;
  category:    'Dining';
  meal_time:   'BREAKFAST' | 'LUNCH' | 'DINNER';
  price:       number;
  description: string;
  prep_time:   string;
  popular?:    boolean;
}

export interface SpaTreatment {
  id:              string;
  name:            string;
  category:        'Wellness';
  duration_mins:   number;
  price:           number;
  description:     string;
  therapist_types: string[];
}

export interface SpaAppointment {
  appointment_id: string;
  branch_id:      string;
  booking_id:     string;
  room_number:    string;
  guest_name:     string;
  treatment_name: string;
  date:           string;
  time:           string;
  status:         'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface FolioServiceItem {
  usage_id:         string;
  booking_id:       string;
  booking_room_id:  string;
  service_id:       number | string;
  service_name:     string;
  category:         string;
  meal_time?:       string | null;
  quantity:         number;
  price_at_usage:   number;
  total_price:      number;
  used_at:          string;
  notes?:           string | null;
  appointment_time?: string | null;
  is_active:        boolean;
}

export interface PaymentItem {
  payment_id:       string;
  booking_id:       string;
  booking_room_id:  string;
  invoice_id?:      string;
  amount:           number;
  payment_date:     string;
  payment_method:   string;
  reference_number?: string | null;
  notes?:           string | null;
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

  // ── Receptionist & Operational State ──────────────────────────────────────────
  public menus: { breakfast: MenuItem[]; lunch: MenuItem[]; dinner: MenuItem[] } = {
    breakfast: [
      { id: 'm-bf-1', name: 'Sri Lankan Hopper Fiesta', category: 'Dining', meal_time: 'BREAKFAST', price: 18.00, description: 'Golden egg hoppers, plain hoppers, seeni sambol, lunu miris & fish ambul thiyal', prep_time: '20 min', popular: true },
      { id: 'm-bf-2', name: 'Ceylon Continental Sunrise', category: 'Dining', meal_time: 'BREAKFAST', price: 22.00, description: 'Artisan brioche, flaky croissants, homemade passion fruit jam & butter', prep_time: '15 min' },
      { id: 'm-bf-3', name: 'Avocado & Smoked Salmon Tartine', category: 'Dining', meal_time: 'BREAKFAST', price: 26.00, description: 'Poached eggs, Tasmanian cold-smoked salmon, toasted sourdough & hollandaise', prep_time: '20 min', popular: true },
      { id: 'm-bf-4', name: 'Buffalo Curd & Wild Kithul Treacle', category: 'Dining', meal_time: 'BREAKFAST', price: 14.00, description: 'Artisanal Ruhuna buffalo curd, pure wild kithul treacle & roasted cashews', prep_time: '10 min' },
      { id: 'm-bf-5', name: 'Ceylon Spiced French Toast', category: 'Dining', meal_time: 'BREAKFAST', price: 20.00, description: 'Thick brioche infused with Ceylon cinnamon custard & vanilla mascarpone', prep_time: '20 min' },
      { id: 'm-bf-6', name: 'Fresh King Coconut & Cold Pressed Juice', category: 'Dining', meal_time: 'BREAKFAST', price: 8.00, description: 'Natural Thambili king coconut water served chilled with lime & mint', prep_time: '5 min' },
    ],
    lunch: [
      { id: 'm-lu-1', name: 'Negombo Lagoon Crab Curry Feast', category: 'Dining', meal_time: 'LUNCH', price: 42.00, description: 'Fresh wild-caught lagoon crab in roasted dark curry, roast paan & pol sambol', prep_time: '35 min', popular: true },
      { id: 'm-lu-2', name: 'Mirissa Yellowfin Tuna Poke Bowl', category: 'Dining', meal_time: 'LUNCH', price: 28.00, description: 'Sashimi-grade tuna, edamame, avocado, sushi rice & sesame tamari glaze', prep_time: '20 min' },
      { id: 'm-lu-3', name: 'Sky Nest Wagyu Beef Burger', category: 'Dining', meal_time: 'LUNCH', price: 34.00, description: '200g Australian Wagyu, aged cheddar, truffle aioli & triple cooked chips', prep_time: '25 min', popular: true },
      { id: 'm-lu-4', name: 'Galle Fort Heritage Rice & 5 Curries', category: 'Dining', meal_time: 'LUNCH', price: 26.00, description: 'Steamed heirloom red rice, 5 organic seasonal curries, papadum & chutney', prep_time: '20 min' },
      { id: 'm-lu-5', name: 'Wood-Fired Black Truffle Margherita', category: 'Dining', meal_time: 'LUNCH', price: 24.00, description: 'San Marzano tomatoes, buffalo mozzarella, fresh basil & white truffle drizzle', prep_time: '20 min' },
      { id: 'm-lu-6', name: 'Grilled Jumbo Tiger Prawns', category: 'Dining', meal_time: 'LUNCH', price: 38.00, description: 'Garlic-herb infused butter, organic microgreens & lemongrass jasmine rice', prep_time: '25 min' },
    ],
    dinner: [
      { id: 'm-di-1', name: 'Ceylon Rock Lobster Thermidor', category: 'Dining', meal_time: 'DINNER', price: 65.00, description: 'Whole grilled Mirissa rock lobster, cognac cream reduction & Gruyère crust', prep_time: '35 min', popular: true },
      { id: 'm-di-2', name: 'Australian Black Angus Tenderloin (250g)', category: 'Dining', meal_time: 'DINNER', price: 52.00, description: 'Prime tenderloin steak, green peppercorn jus & truffle potato mousseline', prep_time: '30 min', popular: true },
      { id: 'm-di-3', name: 'Southern Sri Lankan Slow-Braised Pork', category: 'Dining', meal_time: 'DINNER', price: 34.00, description: 'Black spiced tender pork belly, pol roti, lunumiris & tempered dhal', prep_time: '25 min' },
      { id: 'm-di-4', name: 'Pan-Seared Lagoon Barramundi', category: 'Dining', meal_time: 'DINNER', price: 38.00, description: 'Crisp skin barramundi, coconut-lime lemongrass velouté & sautéed bok choy', prep_time: '25 min' },
      { id: 'm-di-5', name: 'Royal Vegetable Biryani in Clay Pot', category: 'Dining', meal_time: 'DINNER', price: 26.00, description: 'Aged basmati cooked on dum, saffron, mint raita & roasted cashew nuts', prep_time: '30 min' },
      { id: 'm-di-6', name: 'Valrhona Dark Chocolate Lava Cake', category: 'Dining', meal_time: 'DINNER', price: 18.00, description: 'Warm molten 70% chocolate center, Madagascar vanilla bean gelato', prep_time: '20 min', popular: true },
    ],
  };

  public spaCatalogue: SpaTreatment[] = [
    { id: 'spa-tr-1', name: 'Ayurvedic Abhyanga Full Body Massage', category: 'Wellness', duration_mins: 60, price: 75.00, description: 'Warm herbal medicated oils to relieve fatigue, enhance circulation and tone muscles', therapist_types: ['Ayurvedic Practitioner', 'Senior Therapist'] },
    { id: 'spa-tr-2', name: 'Shirodhara Third-Eye Therapy', category: 'Wellness', duration_mins: 45, price: 85.00, description: 'Continuous gentle rhythmic stream of warm herbal oil over the forehead for deep serenity', therapist_types: ['Ayurvedic Specialist'] },
    { id: 'spa-tr-3', name: 'Royal Ceylon Herbal Body Scrub & Steam', category: 'Wellness', duration_mins: 75, price: 95.00, description: 'Sandalwood, turmeric & wild rice exfoliation followed by an aromatic steam bath', therapist_types: ['Holistic Therapist'] },
    { id: 'spa-tr-4', name: 'Deep Tissue Ocean Mineral Therapy', category: 'Wellness', duration_mins: 90, price: 110.00, description: 'Intense muscle release using heated volcanic stones and ocean mineral extracts', therapist_types: ['Sports Therapist', 'Senior Therapist'] },
    { id: 'spa-tr-5', name: 'Sunset Couples Retreat & Private Jacuzzi', category: 'Wellness', duration_mins: 120, price: 180.00, description: 'Dual full body massage, private herbal floral jacuzzi, champagne & fresh strawberries', therapist_types: ['Master Therapists (Pair)'] },
    { id: 'spa-tr-6', name: 'Aromatherapy Stress Relief Ritual', category: 'Wellness', duration_mins: 60, price: 70.00, description: 'Custom blend of pure Ceylon lemongrass, French lavender & ylang-ylang essential oils', therapist_types: ['Aromatherapist'] },
  ];

  public spaAppointments: SpaAppointment[] = [
    {
      appointment_id: 'spa-init-1',
      branch_id:      'b1111111-1111-1111-1111-111111111111',
      booking_id:     'bk-col-4',
      room_number:    '301',
      guest_name:     'Dr. Samantha Silva',
      treatment_name: 'Deep Tissue Ocean Mineral Therapy',
      date:           new Date().toISOString().split('T')[0],
      time:           '10:30',
      status:         'SCHEDULED',
    },
    {
      appointment_id: 'spa-init-2',
      branch_id:      'b1111111-1111-1111-1111-111111111111',
      booking_id:     'bk-col-1',
      room_number:    '302',
      guest_name:     'Nimal Siripala',
      treatment_name: 'Ayurvedic Abhyanga Full Body Massage',
      date:           new Date().toISOString().split('T')[0],
      time:           '14:00',
      status:         'SCHEDULED',
    },
  ];

  public bookings: any[] = [
    // Colombo Branch Bookings (b1111111-...)
    {
      booking_id:         "bk-col-1",
      booking_room_id:    "br-col-1",
      branch_id:          "b1111111-1111-1111-1111-111111111111",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000).toISOString(),
      branch_name:        "Sky Nest Colombo",
      guest_first_name:   "Nimal",
      guest_last_name:    "Siripala",
      guest_email:        "nimal@example.com",
      guest_phone:        "+94 71 234 5678",
      room_number:        "302",
      room_type_name:     "Executive Ocean Suite",
      check_in_date:      new Date(Date.now() - 86400000).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      rate_at_booking:    280.00,
      nights:             3,
      total_amount:       1120.00,
      invoice_status:     "PARTIALLY_PAID",
    },
    {
      booking_id:         "bk-col-2",
      booking_room_id:    "br-col-2",
      branch_id:          "b1111111-1111-1111-1111-111111111111",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      branch_name:        "Sky Nest Colombo",
      guest_first_name:   "Liam",
      guest_last_name:    "O'Connor",
      guest_email:        "liam.oc@example.com",
      guest_phone:        "+353 87 123 4567",
      room_number:        "202",
      room_type_name:     "Deluxe Ocean Balcony",
      check_in_date:      new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000).toISOString().split("T")[0],
      rate_at_booking:    180.00,
      nights:             3,
      total_amount:       540.00,
      invoice_status:     "PARTIALLY_PAID",
    },
    {
      booking_id:         "bk-col-3",
      booking_room_id:    "br-col-3",
      branch_id:          "b1111111-1111-1111-1111-111111111111",
      booking_status:     "CONFIRMED",
      booking_created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      branch_name:        "Sky Nest Colombo",
      guest_first_name:   "Alexander",
      guest_last_name:    "Wright",
      guest_email:        "alex.wright@example.com",
      guest_phone:        "+44 7700 900123",
      room_number:        "101",
      room_type_name:     "City View Deluxe",
      check_in_date:      new Date().toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      rate_at_booking:    140.00,
      nights:             2,
      total_amount:       280.00,
      invoice_status:     "PARTIALLY_PAID",
    },
    {
      booking_id:         "bk-col-4",
      booking_room_id:    "br-col-4",
      branch_id:          "b1111111-1111-1111-1111-111111111111",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      branch_name:        "Sky Nest Colombo",
      guest_first_name:   "Dr. Samantha",
      guest_last_name:    "Silva",
      guest_email:        "samantha.silva@example.com",
      guest_phone:        "+94 77 345 6789",
      room_number:        "301",
      room_type_name:     "Penthouse Ocean Suite",
      check_in_date:      new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
      check_out_date:     new Date().toISOString().split("T")[0],
      rate_at_booking:    350.00,
      nights:             3,
      total_amount:       1420.00,
      invoice_status:     "PARTIALLY_PAID",
    },
    {
      booking_id:         "bk-col-5",
      booking_room_id:    "br-col-5",
      branch_id:          "b1111111-1111-1111-1111-111111111111",
      booking_status:     "CONFIRMED",
      booking_created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      branch_name:        "Sky Nest Colombo",
      guest_first_name:   "Chloe",
      guest_last_name:    "Dupont",
      guest_email:        "chloe.d@example.fr",
      guest_phone:        "+33 6 12 34 56 78",
      room_number:        "201",
      room_type_name:     "Superior Ocean Balcony",
      check_in_date:      new Date(Date.now() + 86400000).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0],
      rate_at_booking:    160.00,
      nights:             3,
      total_amount:       480.00,
      invoice_status:     "CONFIRMED",
    },

    // Galle Branch Bookings (b2222222-...)
    {
      booking_id:         "bk-galle-1",
      booking_room_id:    "br-galle-1",
      branch_id:          "b2222222-2222-2222-2222-222222222222",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000).toISOString(),
      branch_name:        "Sky Nest Galle",
      guest_first_name:   "Sarah",
      guest_last_name:    "Jenkins",
      guest_email:        "sarah.j@example.com",
      guest_phone:        "+44 7911 123456",
      room_number:        "201",
      room_type_name:     "Heritage Deluxe Room",
      check_in_date:      new Date(Date.now() - 86400000).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      rate_at_booking:    180.00,
      nights:             4,
      total_amount:       720.00,
      invoice_status:     "OPEN",
    },
    {
      booking_id:         "bk-galle-2",
      booking_room_id:    "br-galle-2",
      branch_id:          "b2222222-2222-2222-2222-222222222222",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      branch_name:        "Sky Nest Galle",
      guest_first_name:   "David",
      guest_last_name:    "Miller",
      guest_email:        "david.m@example.com",
      guest_phone:        "+61 412 345 678",
      room_number:        "301",
      room_type_name:     "Lighthouse View Suite",
      check_in_date:      new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      rate_at_booking:    280.00,
      nights:             4,
      total_amount:       1120.00,
      invoice_status:     "OPEN",
    },
    {
      booking_id:         "bk-galle-3",
      booking_room_id:    "br-galle-3",
      branch_id:          "b2222222-2222-2222-2222-222222222222",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date().toISOString(),
      branch_name:        "Sky Nest Galle",
      guest_first_name:   "Elena",
      guest_last_name:    "Rostova",
      guest_email:        "elena.r@example.com",
      guest_phone:        "+49 170 1234567",
      room_number:        "303",
      room_type_name:     "Rampart Suite",
      check_in_date:      new Date().toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      rate_at_booking:    280.00,
      nights:             3,
      total_amount:       840.00,
      invoice_status:     "OPEN",
    },
    {
      booking_id:         "bk-galle-4",
      booking_room_id:    "br-galle-4",
      branch_id:          "b2222222-2222-2222-2222-222222222222",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000).toISOString(),
      branch_name:        "Sky Nest Galle",
      guest_first_name:   "Arthur",
      guest_last_name:    "Wellesley",
      guest_email:        "arthur.w@example.com",
      guest_phone:        "+44 20 7946 0912",
      room_number:        "401",
      room_type_name:     "Presidential Ocean Pavilion",
      check_in_date:      new Date(Date.now() - 86400000).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
      rate_at_booking:    500.00,
      nights:             6,
      total_amount:       3000.00,
      invoice_status:     "OPEN",
    },
    {
      booking_id:         "bk-galle-5",
      booking_room_id:    "br-galle-5",
      branch_id:          "b2222222-2222-2222-2222-222222222222",
      booking_status:     "CONFIRMED",
      booking_created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      branch_name:        "Sky Nest Galle",
      guest_first_name:   "Marcus",
      guest_last_name:    "Thorne",
      guest_email:        "marcus.t@example.com",
      guest_phone:        "+1 415 555 2671",
      room_number:        "102",
      room_type_name:     "Colonial Courtyard Standard",
      check_in_date:      new Date().toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      rate_at_booking:    120.00,
      nights:             2,
      total_amount:       240.00,
      invoice_status:     "CONFIRMED",
    },

    // Kandy Branch Bookings (b3333333-...)
    {
      booking_id:         "bk-kan-1",
      booking_room_id:    "br-kan-1",
      branch_id:          "b3333333-3333-3333-3333-333333333333",
      booking_status:     "CHECKED_IN",
      booking_created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      branch_name:        "Sky Nest Kandy",
      guest_first_name:   "Rohan",
      guest_last_name:    "De Silva",
      guest_email:        "rohan.d@example.com",
      guest_phone:        "+94 77 987 6543",
      room_number:        "204",
      room_type_name:     "Mist Valley Suite",
      check_in_date:      new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
      check_out_date:     new Date(Date.now() + 86400000).toISOString().split("T")[0],
      rate_at_booking:    280.00,
      nights:             3,
      total_amount:       840.00,
      invoice_status:     "OPEN",
    },
  ];

  public folioServices: FolioServiceItem[] = [
    {
      usage_id:        'su-col-1',
      booking_id:      'bk-col-1',
      booking_room_id: 'br-col-1',
      service_id:      101,
      service_name:    'Sri Lankan Hopper Fiesta',
      category:        'Dining',
      meal_time:       'BREAKFAST',
      quantity:        2,
      price_at_usage:  18.00,
      total_price:     36.00,
      used_at:         new Date(Date.now() - 3600000 * 5).toISOString(),
      notes:           'Deliver to Suite 302 at 07:30 AM, extra spicy lunu miris',
      is_active:       true,
    },
    {
      usage_id:         'su-col-2',
      booking_id:       'bk-col-1',
      booking_room_id:  'br-col-1',
      service_id:       201,
      service_name:     'Ayurvedic Abhyanga Full Body Massage',
      category:         'Wellness',
      quantity:         1,
      price_at_usage:   75.00,
      total_price:      75.00,
      used_at:          new Date().toISOString(),
      appointment_time: '14:00',
      notes:            'Prefers herbal lavender medicated oil for muscle relaxation',
      is_active:        true,
    },
    {
      usage_id:        'su-col-3',
      booking_id:      'bk-col-2',
      booking_room_id: 'br-col-2',
      service_id:      102,
      service_name:    'Negombo Lagoon Crab Curry Feast',
      category:        'Dining',
      meal_time:       'LUNCH',
      quantity:        1,
      price_at_usage:  42.00,
      total_price:     42.00,
      used_at:         new Date(Date.now() - 3600000 * 3).toISOString(),
      notes:           'Medium spice, deliver warm with roast paan',
      is_active:       true,
    },
    {
      usage_id:        'su-col-4',
      booking_id:      'bk-col-4',
      booking_room_id: 'br-col-4',
      service_id:      103,
      service_name:    'Ceylon Rock Lobster Thermidor',
      category:        'Dining',
      meal_time:       'DINNER',
      quantity:        2,
      price_at_usage:  65.00,
      total_price:     130.00,
      used_at:         new Date(Date.now() - 86400000).toISOString(),
      notes:           'Celebration dinner in penthouse suite',
      is_active:       true,
    },
    {
      usage_id:         'su-col-5',
      booking_id:       'bk-col-4',
      booking_room_id:  'br-col-4',
      service_id:       204,
      service_name:     'Deep Tissue Ocean Mineral Therapy',
      category:         'Wellness',
      quantity:         1,
      price_at_usage:   110.00,
      total_price:      110.00,
      used_at:          new Date().toISOString(),
      appointment_time: '10:30',
      notes:            'Senior therapist requested. Focus on lower back tension.',
      is_active:        true,
    },
  ];

  public payments: PaymentItem[] = [
    {
      payment_id:       'pay-col-1',
      booking_id:       'bk-col-1',
      booking_room_id:  'br-col-1',
      invoice_id:       'inv-bk-col-1',
      amount:           400.00,
      payment_date:     new Date(Date.now() - 86400000).toISOString(),
      payment_method:   'CREDIT_CARD',
      reference_number: 'TXN-CC-88219',
      notes:            'Initial 50% reservation deposit charged to Visa ...4402',
    },
    {
      payment_id:       'pay-col-2',
      booking_id:       'bk-col-2',
      booking_room_id:  'br-col-2',
      invoice_id:       'inv-bk-col-2',
      amount:           200.00,
      payment_date:     new Date(Date.now() - 86400000 * 2).toISOString(),
      payment_method:   'BANK_TRANSFER',
      reference_number: 'SL-BOC-44102',
      notes:            'Advance payment received via Bank of Ceylon wire transfer',
    },
    {
      payment_id:       'pay-col-3',
      booking_id:       'bk-col-3',
      booking_room_id:  'br-col-3',
      invoice_id:       'inv-bk-col-3',
      amount:           140.00,
      payment_date:     new Date(Date.now() - 3600000 * 8).toISOString(),
      payment_method:   'CREDIT_CARD',
      reference_number: 'ONLINE-RES-771',
      notes:            'First night advance payment processed via payment gateway',
    },
    {
      payment_id:       'pay-col-4',
      booking_id:       'bk-col-4',
      booking_room_id:  'br-col-4',
      invoice_id:       'inv-bk-col-4',
      amount:           800.00,
      payment_date:     new Date(Date.now() - 86400000 * 3).toISOString(),
      payment_method:   'CREDIT_CARD',
      reference_number: 'VISA-GOLD-1102',
      notes:            'Pre-authorization charge at check-in',
    },
  ];

  // ── Operations Hub Helper Methods ───────────────────────────────────────────

  public getSpaSlots(branchId?: string, dateStr?: string) {
    const defaultTimes = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00'];
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    return defaultTimes.map(time => {
      const appt = this.spaAppointments.find(
        a => (!branchId || a.branch_id === branchId) &&
             a.date === targetDate &&
             a.time === time &&
             a.status === 'SCHEDULED'
      );
      return {
        time,
        is_available: !appt,
        booked_by: appt ? {
          booking_id:     appt.booking_id,
          guest_name:     appt.guest_name,
          room_number:    appt.room_number,
          treatment_name: appt.treatment_name,
        } : undefined,
      };
    });
  }

  public getFolio(bookingId: string) {
    return this.folioServices.filter(
      s => (s.booking_id === bookingId || s.booking_room_id === bookingId) && s.is_active
    );
  }

  public addFolioService(bookingId: string, item: {
    service_name:     string;
    category:         string;
    meal_time?:       string;
    quantity:         number;
    price_at_usage:   number;
    notes?:           string;
    appointment_time?: string;
    date?:            string;
  }) {
    const booking = this.bookings.find(b => b.booking_id === bookingId || b.booking_room_id === bookingId);
    if (!booking) throw new Error("Reservation not found for booking ID: " + bookingId);

    // Collision detection for spa appointments
    if (item.category === 'Wellness' && item.appointment_time) {
      const apptDate = item.date || new Date().toISOString().split('T')[0];
      const conflict = this.spaAppointments.find(
        a => a.branch_id === booking.branch_id &&
             a.date === apptDate &&
             a.time === item.appointment_time &&
             a.status === 'SCHEDULED'
      );
      if (conflict) {
        throw new Error(`Spa Suite already booked at ${item.appointment_time} by Room ${conflict.room_number} (${conflict.guest_name})`);
      }

      this.spaAppointments.push({
        appointment_id: `spa-${Date.now()}`,
        branch_id:      booking.branch_id,
        booking_id:     booking.booking_id,
        room_number:    booking.room_number,
        guest_name:     `${booking.guest_first_name} ${booking.guest_last_name}`,
        treatment_name: item.service_name,
        date:           apptDate,
        time:           item.appointment_time,
        status:         'SCHEDULED',
      });
    }

    const usageId = `su-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord: FolioServiceItem = {
      usage_id:         usageId,
      booking_id:       booking.booking_id,
      booking_room_id:  booking.booking_room_id || booking.booking_id,
      service_id:       Date.now(),
      service_name:     item.service_name,
      category:         item.category,
      meal_time:        item.meal_time ?? null,
      quantity:         item.quantity || 1,
      price_at_usage:   item.price_at_usage,
      total_price:      Math.round((item.quantity || 1) * item.price_at_usage * 100) / 100,
      used_at:          new Date().toISOString(),
      notes:            item.notes ?? null,
      appointment_time: item.appointment_time ?? null,
      is_active:        true,
    };

    this.folioServices.push(newRecord);
    this.getInvoice(booking.booking_id);
    return newRecord;
  }

  public removeFolioService(usageId: string, reason?: string) {
    const item = this.folioServices.find(s => s.usage_id === usageId);
    if (!item) return false;

    item.is_active = false;
    item.notes = (item.notes ? item.notes + ' | ' : '') + `[CANCELLED/VOIDED: ${reason || 'Customer request'}]`;

    // Free scheduled spa slot
    if (item.category === 'Wellness' && item.appointment_time) {
      const appt = this.spaAppointments.find(
        a => a.booking_id === item.booking_id && a.time === item.appointment_time && a.status === 'SCHEDULED'
      );
      if (appt) {
        appt.status = 'CANCELLED';
      }
    }

    this.getInvoice(item.booking_id);
    return true;
  }

  public getInvoice(bookingId: string) {
    const booking = this.bookings.find(b => b.booking_id === bookingId || b.booking_room_id === bookingId);
    if (!booking) return null;

    const nights = booking.nights || 1;
    const rateAtBooking = booking.rate_at_booking || (booking.total_amount ? booking.total_amount / nights : 200);
    const roomCharges = Math.round(nights * rateAtBooking * 100) / 100;

    const activeServices = this.folioServices.filter(
      s => (s.booking_id === booking.booking_id || s.booking_room_id === booking.booking_room_id) && s.is_active
    );
    const serviceCharges = Math.round(activeServices.reduce((sum, s) => sum + s.total_price, 0) * 100) / 100;
    const baseAmount = Math.round((roomCharges + serviceCharges) * 100) / 100;

    // Sri Lankan 4-Tier Statutory Tax Cascade (sp_generate_final_bill)
    // SC: 10%
    const scTax = Math.round(baseAmount * 0.10 * 100) / 100;
    // TDL: 1% on (Base + SC)
    const tdlTax = Math.round((baseAmount + scTax) * 0.01 * 100) / 100;
    // SSCL: 2.5% on (Base + SC + TDL)
    const sscTax = Math.round((baseAmount + scTax + tdlTax) * 0.025 * 100) / 100;
    // VAT: 18% on (Base + SC + TDL + SSCL)
    const vatTax = Math.round((baseAmount + scTax + tdlTax + sscTax) * 0.18 * 100) / 100;

    const grandTotal = Math.round((baseAmount + scTax + tdlTax + sscTax + vatTax) * 100) / 100;

    const payments = this.payments.filter(
      p => p.booking_id === booking.booking_id || p.booking_room_id === booking.booking_room_id
    );
    const totalPaid = Math.round(payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

    const todayStr = new Date().toISOString().split('T')[0];
    const isDepartingToday = 
      booking.booking_status === 'CHECKED_OUT' || 
      booking.check_out_date <= todayStr;

    // Rule: Paid in Full / Settled applies ONLY to guests departing today or checked out
    let invoiceStatus: 'OPEN' | 'PARTIALLY_PAID' | 'SETTLED' = 'OPEN';
    if (totalPaid >= grandTotal && grandTotal > 0 && isDepartingToday) {
      invoiceStatus = 'SETTLED';
    } else if (totalPaid > 0) {
      invoiceStatus = 'PARTIALLY_PAID';
    } else {
      invoiceStatus = 'OPEN';
    }

    booking.total_amount = grandTotal;
    booking.invoice_status = invoiceStatus;

    return {
      invoice_id:      `inv-${booking.booking_id}`,
      booking_id:      booking.booking_id,
      booking_room_id: booking.booking_room_id || booking.booking_id,
      guest_name:      `${booking.guest_first_name} ${booking.guest_last_name}`,
      guest_email:     booking.guest_email,
      guest_phone:     booking.guest_phone,
      room_number:     booking.room_number,
      room_type_name:  booking.room_type_name,
      check_in_date:   booking.check_in_date,
      check_out_date:  booking.check_out_date,
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
        status:             invoiceStatus,
      },
      services: activeServices,
      payments,
    };
  }

  public addPayment(bookingId: string, payment: {
    amount:            number;
    payment_method:    string;
    reference_number?: string;
    notes?:            string;
  }) {
    const booking = this.bookings.find(b => b.booking_id === bookingId || b.booking_room_id === bookingId);
    if (!booking) throw new Error("Reservation not found for booking ID: " + bookingId);

    const paymentRecord: PaymentItem = {
      payment_id:       `pay-${Date.now()}`,
      booking_id:       booking.booking_id,
      booking_room_id:  booking.booking_room_id || booking.booking_id,
      invoice_id:       `inv-${booking.booking_id}`,
      amount:           Math.round(payment.amount * 100) / 100,
      payment_date:     new Date().toISOString(),
      payment_method:   payment.payment_method,
      reference_number: payment.reference_number || `REC-${Date.now().toString().slice(-6)}`,
      notes:            payment.notes ?? null,
    };

    this.payments.push(paymentRecord);
    const updatedInvoice = this.getInvoice(booking.booking_id);
    return { payment: paymentRecord, invoice: updatedInvoice };
  }

  public checkIn(bookingId: string, data?: { roomNumber?: string; keycardNumber?: string; accompanyingGuests?: any[] }) {
    const booking = this.bookings.find(b => b.booking_id === bookingId);
    if (!booking) throw new Error("Reservation not found: " + bookingId);
    booking.booking_status = 'CHECKED_IN';
    if (data?.roomNumber) booking.room_number = data.roomNumber;
    return booking;
  }

  public checkOut(bookingId: string, data?: { paymentMethod?: string; settleBalance?: boolean }) {
    const booking = this.bookings.find(b => b.booking_id === bookingId);
    if (!booking) throw new Error("Reservation not found: " + bookingId);

    const inv = this.getInvoice(bookingId);
    if (data?.settleBalance && inv && inv.breakdown.balance_due > 0) {
      this.addPayment(bookingId, {
        amount:           inv.breakdown.balance_due,
        payment_method:   data.paymentMethod || 'CREDIT_CARD',
        reference_number: `SETTLE-CHKOUT-${Date.now().toString().slice(-4)}`,
        notes:            'Full bill settlement at checkout desk',
      });
    }

    booking.booking_status = 'CHECKED_OUT';
    return booking;
  }



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

        // 11. Recent bookings facade view (backed by live inMemoryStore.bookings)
    if (normalizedSql.includes("FROM v_booking_details")) {
      let filtered = [...this.bookings];
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

    // 11b. Update booking status
    if (normalizedSql.includes("UPDATE bookings SET") || normalizedSql.includes("UPDATE booking_rooms SET")) {
      const statusParam = params.find(p => typeof p === 'string' && ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(p)) as string | undefined;
      const idParam = params.find(p => typeof p === 'string' && (p.startsWith('bk-') || p.startsWith('br-'))) as string | undefined;
      if (statusParam && idParam) {
        const b = this.bookings.find(item => item.booking_id === idParam || item.booking_room_id === idParam);
        if (b) b.booking_status = statusParam;
        return { rows: (b ? [b] : []) as unknown as T[], command: "UPDATE", rowCount: b ? 1 : 0, oid: 0, fields: [] };
      }
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
