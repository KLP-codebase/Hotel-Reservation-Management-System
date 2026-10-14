import { emailService } from '../services/email.service';
import { Router, Request, Response } from 'express';
import { PoolClient } from 'pg';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { managerBranch, assertManagerOwns } from '../lib/branch-scope';
import { syncAliveBookingDates } from '../services/alive-dates.service';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError, Errors } from '../lib/errors';
import { isUuid } from '../lib/uuid';

const router = Router();
const serviceRepo = new ServiceRepository(db);

/**
 * GET /api/v1/services/catalogue
 * Returns all catalogue services with branch join and optional filtering.
 * Public; a signed-in manager sees only their branch plus chain-wide services.
 */
router.get('/catalogue', optionalAuthenticate, async (req: Request, res: Response) => {
  const own = managerBranch(req);
  const branchId = own ?? (typeof req.query.branch_id === 'string' && req.query.branch_id !== 'ALL' && req.query.branch_id.trim() !== ''
    ? req.query.branch_id
    : undefined);
  const category = typeof req.query.category === 'string' && req.query.category !== 'ALL' && req.query.category.trim() !== ''
    ? req.query.category
    : undefined;
  const isActive = typeof req.query.is_active === 'string'
    ? req.query.is_active === 'true'
    : undefined;

  const services = await serviceRepo.findAllCatalogue({ branch_id: branchId, include_shared: !!own, category, is_active: isActive });
  res.json({ success: true, data: services });
});

/**
 * GET /api/v1/services/menus
 * Returns categorized in-room dining menus: Breakfast, Lunch, and Dinner.
 */
router.get('/menus', async (_req: Request, res: Response) => {
  const structuredMenus = {
    breakfast: [
      {
        id:          'm-bf-1',
        name:        'Sri Lankan Traditional Hopper Fiesta',
        category:    'Dining' as const,
        meal_time:   'BREAKFAST' as const,
        price:       18.00,
        description: 'Crispy egg & plain hoppers with seeni sambal, lunu miris and warm coconut milk gravy',
        prep_time:   '20 mins',
        popular:     true,
      },
      {
        id:          'm-bf-2',
        name:        'Luxury Ceylon Champagne Breakfast',
        category:    'Dining' as const,
        meal_time:   'BREAKFAST' as const,
        price:       30.00,
        description: 'Poached eggs on toasted brioche with smoked salmon, fresh tropical fruit platter and glass of champagne',
        prep_time:   '25 mins',
        popular:     true,
      },
      {
        id:          'm-bf-3',
        name:        'Artisan Baker’s Morning Basket',
        category:    'Dining' as const,
        meal_time:   'BREAKFAST' as const,
        price:       14.00,
        description: 'Freshly baked croissants, kithul treacle danishes, and crusty sourdough with highland butter',
        prep_time:   '15 mins',
      },
    ],
    lunch: [
      {
        id:          'm-lu-1',
        name:        'Ceylon Royal Black Pork Curry with Fragrant Samba Rice',
        category:    'Dining' as const,
        meal_time:   'LUNCH' as const,
        price:       24.00,
        description: 'Tender slow-simmered pork in roasted black spices, dhal curry, gotu kola sambol and papadums',
        prep_time:   '35 mins',
        popular:     true,
      },
      {
        id:          'm-lu-2',
        name:        'Grilled Yellowfin Tuna Steak',
        category:    'Dining' as const,
        meal_time:   'LUNCH' as const,
        price:       28.00,
        description: 'Local ocean tuna seared with lemon herb crust, roasted sweet potato wedges and avocado salsa',
        prep_time:   '30 mins',
      },
      {
        id:          'm-lu-3',
        name:        'Coconut Cashew Nut & Vegetable Biryani',
        category:    'Dining' as const,
        meal_time:   'LUNCH' as const,
        price:       20.00,
        description: 'Fragrant basmati rice infused with whole cardamom, toasted cashews and mint raita',
        prep_time:   '25 mins',
      },
    ],
    dinner: [
      {
        id:          'm-di-1',
        name:        'Jumbo Negombo Lagoon Prawn Thermidor',
        category:    'Dining' as const,
        meal_time:   'DINNER' as const,
        price:       36.00,
        description: 'Butter-poached lagoon king prawns gratinated with dijon cream, gruyère and fragrant pilaf',
        prep_time:   '30 mins',
        popular:     true,
      },
      {
        id:          'm-di-2',
        name:        'Highland Spiced Lamb Rack',
        category:    'Dining' as const,
        meal_time:   'DINNER' as const,
        price:       38.00,
        description: 'Herb-crusted tender lamb cutlets with roasted root vegetables and rosemary port reduction',
        prep_time:   '40 mins',
        popular:     true,
      },
      {
        id:          'm-di-3',
        name:        'Premium Suite Minibar Gourmet Platter',
        category:    'Dining' as const,
        meal_time:   'DINNER' as const,
        price:       50.00,
        description: 'Selection of artisanal cheeses, cured meats, nuts, dried figs, and imported chocolates',
        prep_time:   '15 mins',
      },
    ],
  };

  res.json({
    success: true,
    data: structuredMenus,
    service_hours: {
      breakfast: '06:30 – 11:00',
      lunch:     '12:00 – 16:30',
      dinner:    '18:30 – 23:00',
    },
  });
});

/**
 * GET /api/v1/services/spa-catalogue
 * Returns list of available spa and wellness treatments.
 */
router.get('/spa-catalogue', async (_req: Request, res: Response) => {
  const spaRes = await db.query(
    `SELECT service_id, service_name, base_price FROM service_catalogue WHERE category = 'Wellness' AND is_active = true ORDER BY base_price ASC`
  );
  const treatments = spaRes.rows.map((r: any) => ({
    id:              r.service_id,
    name:            r.service_name,
    category:        'Wellness' as const,
    price:           Number(r.base_price),
    duration:        '45–75 Minutes',
    description:     'Authentic Ayurvedic herbal therapy by certified wellness practitioners',
    collision_aware: true,
  }));
  res.json({ success: true, data: treatments });
});

/**
 * GET /api/v1/services/spa-slots
 * Real-time collision detection for spa appointments.
 * Query params: ?branchId=...&date=YYYY-MM-DD
 */
router.get('/spa-slots', async (req: Request, res: Response) => {
  const rawDate   = typeof req.query.date === 'string' ? req.query.date.trim() : '';
  const dateStr   = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().split('T')[0];
  const rawBranch = typeof req.query.branchId === 'string' ? req.query.branchId : req.user?.branchId;
  const branchId  = rawBranch && isUuid(rawBranch) ? rawBranch : null;
  const standardTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  // Ensure test dataset dates are alive today
  await syncAliveBookingDates(db).catch(() => {});

  // Query booked quantity per hour slot (Capacity: 20 bookings per hour slot)
  const bookedRes = await db.query(
    `SELECT su.appointment_time,
            COALESCE(SUM(su.quantity), 0)::int AS booked_count
     FROM service_usage su
     JOIN service_catalogue sc ON sc.service_id::text = su.service_id::text
     JOIN booking_rooms br     ON br.booking_room_id = su.booking_room_id
     JOIN bookings b           ON b.booking_id = br.booking_id
     WHERE (sc.category = 'Wellness' OR sc.service_name ILIKE '%spa%')
       AND su.appointment_time IS NOT NULL
       AND su.used_at::date = $1::date
       AND ($2::uuid IS NULL OR b.branch_id = $2::uuid)
     GROUP BY su.appointment_time`,
    [dateStr, branchId]
  );

  const countMap = new Map<string, number>();
  for (const row of bookedRes.rows) {
    countMap.set(row.appointment_time, Number(row.booked_count || 0));
  }

  const capacity = 20;
  const slots = standardTimes.map(time => {
    const bookedCount = countMap.get(time) || 0;
    const isAvailable = bookedCount < capacity;
    return {
      time,
      is_available: isAvailable,
      booked_count: bookedCount,
      capacity,
      available_count: Math.max(0, capacity - bookedCount),
    };
  });

  res.json({
    success: true,
    data: slots,
    count: slots.length,
    date: dateStr,
  });
});


// RBAC: Authenticated users (staff and guests) can access services
router.use(authenticate);
router.use(authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA', 'GUEST'));

const CreateCatalogueSchema = z.object({
  branchId:     z.string().uuid().optional(),
  branch_id:    z.string().uuid().optional(),
  serviceName:  z.string().min(1).max(100).optional(),
  service_name: z.string().min(1).max(100).optional(),
  category:     z.string().min(1).max(50),
  basePrice:    z.coerce.number().nonnegative().optional(),
  base_price:   z.coerce.number().nonnegative().optional(),
  isActive:     z.boolean().optional(),
  is_active:    z.boolean().optional(),
}).refine(d => (d.branchId ?? d.branch_id) !== undefined, {
  message: 'Branch is required',
  path: ['branchId'],
}).refine(d => (d.serviceName ?? d.service_name) !== undefined, {
  message: 'Service name is required',
  path: ['serviceName'],
}).refine(d => (d.basePrice ?? d.base_price) !== undefined, {
  message: 'Base price is required',
  path: ['basePrice'],
});

const UpdateCatalogueSchema = z.object({
  branchId:     z.string().uuid().optional(),
  branch_id:    z.string().uuid().optional(),
  serviceName:  z.string().min(1).max(100).optional(),
  service_name: z.string().min(1).max(100).optional(),
  category:     z.string().min(1).max(50).optional(),
  basePrice:    z.coerce.number().nonnegative().optional(),
  base_price:   z.coerce.number().nonnegative().optional(),
  isActive:     z.boolean().optional(),
  is_active:    z.boolean().optional(),
});



// A manager may only change services of their own branch (404 when it does not exist).
async function assertManagerOwnsService(req: Request, serviceId: number): Promise<void> {
  if (!managerBranch(req)) return;
  const existing = await serviceRepo.findCatalogueById(serviceId);
  if (!existing) throw Errors.notFound('Service');
  assertManagerOwns(req, existing.branch_id);
}

/**
 * POST /api/v1/services/catalogue
 * Registers a new service in the catalogue.
 */
router.post('/catalogue', authorize('MANAGER', 'ADMINISTRATOR', 'DBA'), async (req: Request, res: Response) => {
  const parsed = CreateCatalogueSchema.parse(req.body);
  const branchId = (parsed.branchId ?? parsed.branch_id)!;
  const serviceName = (parsed.serviceName ?? parsed.service_name)!;
  const basePrice = (parsed.basePrice ?? parsed.base_price)!;
  const isActive = parsed.isActive ?? parsed.is_active ?? true;
  assertManagerOwns(req, branchId);

  const service = await serviceRepo.createCatalogue({
    branch_id: branchId,
    service_name: serviceName,
    category: parsed.category,
    base_price: basePrice,
    is_active: isActive,
  });
  res.status(201).json({ success: true, message: 'Service registered successfully', data: service });
});

/**
 * PATCH /api/v1/services/catalogue/:id
 * Updates an existing service in the catalogue.
 */
router.patch('/catalogue/:id', authorize('MANAGER', 'ADMINISTRATOR', 'DBA'), async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.id, 10);
  if (isNaN(serviceId)) {
    return res.status(400).json({ success: false, message: 'Invalid service ID' });
  }
  const parsed = UpdateCatalogueSchema.parse(req.body);
  const branchId = parsed.branchId ?? parsed.branch_id;
  await assertManagerOwnsService(req, serviceId);
  if (branchId !== undefined) assertManagerOwns(req, branchId);
  const serviceName = parsed.serviceName ?? parsed.service_name;
  const basePrice = parsed.basePrice ?? parsed.base_price;
  const isActive = parsed.isActive ?? parsed.is_active;

  const updated = await serviceRepo.updateCatalogue(serviceId, {
    branch_id: branchId,
    service_name: serviceName,
    category: parsed.category,
    base_price: basePrice,
    is_active: isActive,
  });

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Service not found' });
  }
  res.json({ success: true, message: 'Service updated successfully', data: updated });
});

/**
 * DELETE /api/v1/services/catalogue/:id
 * Soft deletes / deactivates a service in the catalogue.
 */
router.delete('/catalogue/:id', authorize('MANAGER', 'ADMINISTRATOR', 'DBA'), async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.id, 10);
  if (isNaN(serviceId)) {
    return res.status(400).json({ success: false, message: 'Invalid service ID' });
  }
  await assertManagerOwnsService(req, serviceId);
  const ok = await serviceRepo.deleteCatalogue(serviceId);
  if (!ok) {
    return res.status(404).json({ success: false, message: 'Service not found' });
  }
  res.json({ success: true, message: 'Service deactivated successfully' });
});

const AddFolioServiceSchema = z.object({
  // Room line to charge; defaults to the booking's first room line.
  booking_room_id:  z.string().uuid().optional(),
  service_name:     z.string().min(1, 'Service name is required'),
  category:         z.string().min(1, 'Category is required'),
  meal_time:        z.string().max(20).optional(),
  quantity:         z.number().int().positive().default(1),
  price_at_usage:   z.number().nonnegative('Price must be non-negative'),
  notes:            z.string().optional(),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM').optional(),
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});

/**
 * GET /api/v1/services/folio/:bookingId
 * Returns the itemized service charges for a stay. Accepts a booking_id
 * (all its rooms) or a booking_room_id (that room only).
 */
router.get('/folio/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  if (!isUuid(bookingId)) throw Errors.notFound('Booking');

  const servicesRes = await db.query(
    `SELECT su.usage_id, su.booking_room_id, br.booking_id, sc.service_name, sc.category,
            su.quantity, su.price_at_usage, (su.quantity * su.price_at_usage) AS total_price,
            su.used_at, su.notes, su.appointment_time, su.meal_time
     FROM service_usage su
     JOIN booking_rooms br ON br.booking_room_id = su.booking_room_id
     LEFT JOIN service_catalogue sc ON su.service_id::text = sc.service_id::text
     WHERE br.booking_id = $1 OR br.booking_room_id = $1
     ORDER BY su.used_at DESC`,
    [bookingId]
  );

  const services = servicesRes.rows.map((s: any) => ({
    usage_id:         s.usage_id,
    booking_id:       s.booking_id,
    booking_room_id:  s.booking_room_id,
    service_name:     s.service_name || 'Hotel Service',
    category:         s.category || 'General',
    quantity:         Number(s.quantity) || 1,
    price_at_usage:   Number(s.price_at_usage) || 0,
    total_price:      Number(s.total_price) || 0,
    used_at:          new Date(s.used_at).toISOString(),
    notes:            s.notes || null,
    appointment_time: s.appointment_time || null,
    meal_time:        s.meal_time || null,
    is_active:        true,
  }));

  res.json({
    success: true,
    data: services,
    count: services.length,
  });
});

// Keeps a room's stored invoice in step with its folio. Only refreshes an invoice
// that already exists; sp_generate_final_bill creates one at check-out anyway.
async function refreshRoomInvoice(client: PoolClient, bookingRoomId: string): Promise<void> {
  await client.query(
    `SELECT sp_generate_final_bill($1::uuid)`,
    [bookingRoomId]
  );
}

/**
 * POST /api/v1/services/folio/:bookingId
 * Adds in-room dining or wellness treatment to the room folio with frozen rate (Rule B10) in PostgreSQL.
 * :bookingId may be a booking_id or a booking_room_id; body.booking_room_id picks the room explicitly.
 */
router.post('/folio/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const parsed = AddFolioServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }
  if (!isUuid(bookingId)) throw Errors.notFound('Booking');
  const input = parsed.data;

  const record = await db.transaction(async (client) => {
    // 1. Resolve the room line being charged
    const lineRes = await client.query<{ booking_room_id: string; booking_id: string; branch_id: string }>(
      `SELECT br.booking_room_id, br.booking_id, b.branch_id
       FROM booking_rooms br
       JOIN bookings b ON b.booking_id = br.booking_id
       WHERE (br.booking_id = $1 OR br.booking_room_id = $1)
         AND br.status <> 'CANCELLED'
         AND ($2::uuid IS NULL OR br.booking_room_id = $2::uuid)
       ORDER BY br.created_at, br.booking_room_id
       LIMIT 1`,
      [bookingId, input.booking_room_id ?? null]
    );
    const line = lineRes.rows[0];
    if (!line) throw Errors.notFound('Room on this booking');

    // 2. Resolve service from service_catalogue (the booking's own branch first)
    const svcRes = await client.query<{ service_id: number }>(
      `SELECT service_id
       FROM service_catalogue
       WHERE service_name ILIKE $1 OR (category = $2 AND base_price = $3)
       ORDER BY (branch_id = $4) DESC NULLS LAST
       LIMIT 1`,
      [input.service_name, input.category, input.price_at_usage, line.branch_id]
    );
    let serviceId = svcRes.rows[0]?.service_id;

    if (!serviceId) {
      // Fallback: pick by category or create dynamic service item
      const catRes = await client.query<{ service_id: number }>(
        `SELECT service_id FROM service_catalogue WHERE category = $1
         ORDER BY (branch_id = $2) DESC NULLS LAST LIMIT 1`,
        [input.category, line.branch_id]
      );
      serviceId = catRes.rows[0]?.service_id;
      if (!serviceId) {
        const newSvc = await client.query<{ service_id: number }>(
          `INSERT INTO service_catalogue (branch_id, service_name, category, base_price, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING service_id`,
          [line.branch_id, input.service_name, input.category, input.price_at_usage]
        );
        serviceId = newSvc.rows[0].service_id;
      }
    }

    // 3. Spa appointments: one guest per slot per branch. The advisory lock makes
    //    two receptionists booking the same slot queue up instead of both succeeding.
    const isAppointment = Boolean(input.appointment_time);
    const apptDate = input.date ?? new Date().toISOString().split('T')[0];
    if (isAppointment) {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,
        [`spa:${line.branch_id}:${apptDate}:${input.appointment_time}`]);
      const taken = await client.query(
        `SELECT COALESCE(SUM(su.quantity), 0)::int AS booked_count
         FROM service_usage su
         JOIN booking_rooms br ON br.booking_room_id = su.booking_room_id
         JOIN bookings b       ON b.booking_id = br.booking_id
         WHERE b.branch_id = $1 AND su.appointment_time = $2 AND su.used_at::date = $3::date`,
        [line.branch_id, input.appointment_time, apptDate]
      );
      const currentBooked = Number(taken.rows[0]?.booked_count || 0);
      if (currentBooked + (input.quantity || 1) > 20) {
        throw new AppError(409, 'SERVICE_CONFLICT', `The ${input.appointment_time} slot on ${apptDate} is at maximum capacity (20 guests max per hour slot). Currently booked: ${currentBooked}.`);
      }
    }

    // 4. Insert into service_usage. For an appointment, used_at is the slot's date and time.
    const usageRes = await client.query<{ usage_id: string; used_at: Date }>(
      `INSERT INTO service_usage (
         booking_room_id, service_id, quantity, price_at_usage, notes, appointment_time, meal_time, used_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamp, CURRENT_TIMESTAMP))
       RETURNING usage_id, used_at`,
      [
        line.booking_room_id,
        serviceId,
        input.quantity,
        input.price_at_usage,
        input.notes || null,
        input.appointment_time || null,
        input.meal_time || null,
        isAppointment ? `${apptDate} ${input.appointment_time}:00` : null,
      ]
    );

    // 5. Keep the room's invoice total in step (same transaction)
    await refreshRoomInvoice(client, line.booking_room_id);

    // Look up guest and invoice snapshot for email notification
    const guestInvoiceInfo = await client.query<{
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      branch_name: string;
      booking_id: string;
      room_charges: string;
      service_charges: string;
      service_charge_tax: string;
      tdl_amount: string;
      ssc_amount: string;
      vat_amount: string;
      total_amount: string;
    }>(
      `SELECT g.email, g.first_name, g.last_name, br.branch_name, b.booking_id,
              i.room_charges, i.service_charges, i.service_charge_tax,
              i.tdl_amount, i.ssc_amount, i.vat_amount, i.total_amount
       FROM booking_rooms bkr
       JOIN bookings b ON b.booking_id = bkr.booking_id
       JOIN branches br ON br.branch_id = b.branch_id
       LEFT JOIN guests g ON (g.id = b.booked_by_guest_id OR g.guest_id::text = b.booked_by_guest_id)
       LEFT JOIN invoices i ON i.booking_room_id = bkr.booking_room_id
       WHERE bkr.booking_room_id = $1`,
      [line.booking_room_id]
    );

    const info = guestInvoiceInfo.rows[0];
    if (info && info.email) {
      const taxSum = (
        Number(info.service_charge_tax || 0) +
        Number(info.tdl_amount || 0) +
        Number(info.ssc_amount || 0) +
        Number(info.vat_amount || 0)
      ).toFixed(2);

      emailService.sendInvoiceUpdateEmail({
        to: info.email,
        guestName: `${info.first_name || 'Valued'} ${info.last_name || 'Guest'}`.trim(),
        branchName: info.branch_name,
        bookingRef: info.booking_id,
        addedService: input.service_name,
        serviceCategory: input.category || 'Ancillary Service',
        serviceCost: `$${(Number(input.price_at_usage) * input.quantity).toFixed(2)}`,
        roomCharges: `$${Number(info.room_charges || 0).toFixed(2)}`,
        serviceCharges: `$${Number(info.service_charges || 0).toFixed(2)}`,
        taxTotal: `$${taxSum}`,
        grandTotal: `$${Number(info.total_amount || 0).toFixed(2)}`,
      }).catch(err => console.warn('[Services] Failed to dispatch invoice update email:', err.message));
    }

    return { usage: usageRes.rows[0], line };
  });

  res.status(201).json({
    success: true,
    message: 'Service added to folio successfully',
    data: {
      usage_id:         record.usage.usage_id,
      booking_id:       record.line.booking_id,
      booking_room_id:  record.line.booking_room_id,
      service_name:     input.service_name,
      category:         input.category,
      quantity:         input.quantity,
      price_at_usage:   input.price_at_usage,
      total_price:      input.quantity * input.price_at_usage,
      used_at:          record.usage.used_at,
      notes:            input.notes || null,
      meal_time:        input.meal_time || null,
      appointment_time: input.appointment_time || null,
    },
  });
});

/**
 * DELETE /api/v1/services/folio/:usageId
 * Voids/removes a service charge from the room folio (e.g. guest cancelled or no-show).
 */
router.delete('/folio/:usageId', authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'), async (req: Request, res: Response) => {
  const { usageId } = req.params;
  const reason = (req.body?.reason || req.query.reason || 'Guest cancellation') as string;
  if (!isUuid(usageId)) throw Errors.notFound('Service usage record');

  const removed = await db.transaction(async (client) => {
    const delRes = await client.query<{ booking_room_id: string }>(
      `DELETE FROM service_usage WHERE usage_id = $1 RETURNING booking_room_id`,
      [usageId]
    );
    const row = delRes.rows[0];
    if (!row) return false;

    await refreshRoomInvoice(client, row.booking_room_id);
    return true;
  });

  if (!removed) throw Errors.notFound('Service usage record');

  res.json({
    success: true,
    message: 'Service charge voided and removed from room folio',
    data: { usageId, reason },
  });
});

export default router;
