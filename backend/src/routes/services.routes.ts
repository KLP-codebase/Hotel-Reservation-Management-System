import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { inMemoryStore } from '../config/db-fallback';
import { db } from '../config/db';
import { syncAliveBookingDates } from '../services/alive-dates.service';

const router = Router();

// RBAC: Operations staff can manage guest services
router.use(authenticate);
router.use(authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'));

const AddFolioServiceSchema = z.object({
  service_name:     z.string().min(1, 'Service name is required'),
  category:         z.string().min(1, 'Category is required'),
  meal_time:        z.string().optional(),
  quantity:         z.number().int().positive().default(1),
  price_at_usage:   z.number().nonnegative('Price must be non-negative'),
  notes:            z.string().optional(),
  appointment_time: z.string().optional(),
  date:             z.string().optional(),
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
  try {
    const spaRes = await db.query(
      `SELECT service_id, service_name, base_price FROM service_catalogue WHERE category = 'Wellness' AND is_active = true ORDER BY base_price ASC`
    );
    if (spaRes.rows.length > 0) {
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
      return;
    }
  } catch (err) {
    console.warn('DB spa catalogue fetch failed, using fallback:', err);
  }

  res.json({
    success: true,
    data: inMemoryStore.spaCatalogue,
  });
});

/**
 * GET /api/v1/services/spa-slots
 * Real-time collision detection for spa appointments.
 * Query params: ?branchId=...&date=YYYY-MM-DD
 */
router.get('/spa-slots', async (req: Request, res: Response) => {
  const dateStr  = typeof req.query.date === 'string' && req.query.date.trim() ? req.query.date.trim() : new Date().toISOString().split('T')[0];
  const standardTimes = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00'];

  // Ensure test dataset dates are alive today
  await syncAliveBookingDates(db).catch(() => {});

  try {
    // Check booked slots from DB service_usage
    const bookedRes = await db.query(
      `SELECT su.usage_id, su.appointment_time, su.used_at, sc.service_name,
              COALESCE(v.booking_id::text, su.booking_room_id::text) AS booking_id,
              COALESCE(v.guest_first_name, 'Resident') AS first_name,
              COALESCE(v.guest_last_name, 'Guest') AS last_name,
              COALESCE(v.room_number, '101') AS room_number
       FROM service_usage su
       JOIN service_catalogue sc ON su.service_id = sc.service_id
       LEFT JOIN v_booking_details v ON (su.booking_room_id::text = v.booking_id::text OR su.booking_room_id::text = v.booking_room_id::text)
       WHERE sc.category = 'Wellness'
         AND (
           su.used_at::date = $1::date
           OR (su.appointment_time IS NOT NULL AND su.used_at::date = $1::date)
         )`,
      [dateStr]
    );

    const bookedMap = new Map<string, any>();
    for (const row of bookedRes.rows) {
      let timeKey = row.appointment_time;
      if (!timeKey && row.used_at) {
        timeKey = new Date(row.used_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      if (timeKey) {
        bookedMap.set(timeKey, {
          booking_id:     row.booking_id,
          guest_name:     `${row.first_name} ${row.last_name}`.trim(),
          room_number:    row.room_number,
          treatment_name: row.service_name,
        });
      }
    }

    const slots = standardTimes.map(time => {
      const booked = bookedMap.get(time);
      return {
        time,
        is_available: !booked,
        booked_by: booked || undefined,
      };
    });

    res.json({
      success: true,
      data: slots,
      count: slots.length,
      date: dateStr,
    });
    return;
  } catch (err) {
    console.warn('DB spa slots check failed, using fallback:', err);
  }

  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : (req.user?.branchId ?? undefined);
  const slots = inMemoryStore.getSpaSlots(branchId, dateStr);
  res.json({
    success: true,
    data: slots,
    count: slots.length,
    date: dateStr,
  });
});

/**
 * GET /api/v1/services/folio/:bookingId
 * Returns active itemized folio service charges for a guest stay from PostgreSQL.
 */
router.get('/folio/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  try {
    const bRes = await db.query(
      `SELECT id, booking_id FROM bookings WHERE booking_id::text = $1 OR id = $1 LIMIT 1`,
      [bookingId]
    );

    if (bRes.rows.length > 0) {
      const b = bRes.rows[0];
      const servicesRes = await db.query(
        `SELECT su.usage_id, su.booking_room_id, sc.service_name, sc.category, su.quantity, su.price_at_usage,
                (su.quantity * su.price_at_usage) AS total_price, su.used_at, su.notes, su.appointment_time, su.meal_time
         FROM service_usage su
         LEFT JOIN service_catalogue sc ON su.service_id = sc.service_id
         WHERE su.booking_room_id::text = $1 OR su.booking_room_id::text = $2
         ORDER BY su.used_at DESC`,
        [b.id, b.booking_id]
      );

      const services = servicesRes.rows.map((s: any) => ({
        usage_id:         s.usage_id,
        booking_id:       b.booking_id,
        booking_room_id:  s.booking_room_id,
        service_name:     s.service_name || 'Hotel Service',
        category:         s.category || 'General',
        quantity:         Number(s.quantity) || 1,
        price_at_usage:   Number(s.price_at_usage) || 0,
        total_price:      Number(s.total_price) || 0,
        used_at:          s.used_at ? new Date(s.used_at).toISOString() : new Date().toISOString(),
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
      return;
    }
  } catch (err) {
    console.warn('DB getFolio failed, falling back to memory store:', err);
  }

  const services = inMemoryStore.getFolio(bookingId);
  res.json({
    success: true,
    data: services,
    count: services.length,
  });
});

/**
 * POST /api/v1/services/folio/:bookingId
 * Adds in-room dining or wellness treatment to the room folio with frozen rate (Rule B10) in PostgreSQL.
 */
router.post('/folio/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const parsed = AddFolioServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    // 1. Find the booking in PostgreSQL
    const bRes = await db.query(
      `SELECT b.id, b.booking_id, b.branch_id
       FROM bookings b
       WHERE b.booking_id::text = $1 OR b.id = $1
       LIMIT 1`,
      [bookingId]
    );

    if (bRes.rows.length > 0) {
      const b = bRes.rows[0];

      // 2. Resolve service from service_catalogue
      let svcRes = await db.query(
        `SELECT service_id, base_price, category
         FROM service_catalogue
         WHERE service_name ILIKE $1 OR (category = $2 AND base_price = $3)
         LIMIT 1`,
        [parsed.data.service_name, parsed.data.category, parsed.data.price_at_usage]
      );

      let serviceId = svcRes.rows[0]?.service_id;

      if (!serviceId) {
        // Fallback: pick by category or create dynamic service item
        const catRes = await db.query(
          `SELECT service_id, base_price FROM service_catalogue WHERE category = $1 LIMIT 1`,
          [parsed.data.category]
        );
        if (catRes.rows.length > 0) {
          serviceId = catRes.rows[0].service_id;
        } else {
          const newSvc = await db.query(
            `INSERT INTO service_catalogue (service_name, category, base_price, is_active)
             VALUES ($1, $2, $3, true)
             RETURNING service_id`,
            [parsed.data.service_name, parsed.data.category, parsed.data.price_at_usage]
          );
          serviceId = newSvc.rows[0]?.service_id;
        }
      }

      // Compute used_at timestamp (respecting appointment date & time if provided)
      let usedAtStr = 'NOW()';
      const queryParams: any[] = [
        b.id,
        serviceId,
        parsed.data.quantity,
        parsed.data.price_at_usage,
        parsed.data.notes || null,
        parsed.data.appointment_time || null,
        parsed.data.meal_time || null,
      ];

      if (parsed.data.date && parsed.data.appointment_time) {
        queryParams.push(`${parsed.data.date} ${parsed.data.appointment_time}:00`);
        usedAtStr = `$${queryParams.length}::timestamp`;
      }

      // 3. Insert into service_usage
      const usageRes = await db.query(
        `INSERT INTO service_usage (
           booking_room_id, service_id, quantity, price_at_usage, notes, appointment_time, meal_time, used_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, ${usedAtStr})
         RETURNING usage_id, booking_room_id, service_id, quantity, price_at_usage, used_at, notes, appointment_time, meal_time`,
        queryParams
      );

      const u = usageRes.rows[0];

      // 4. Update invoice total in PostgreSQL
      try {
        const invRes = await db.query(
          `SELECT invoice_id, subtotal FROM invoices WHERE booking_room_id::text = $1 OR booking_room_id::text = $2`,
          [b.id, b.booking_id]
        );
        if (invRes.rows.length > 0) {
          const addAmount = Math.round(parsed.data.quantity * parsed.data.price_at_usage * 100) / 100;
          const oldSub = Number(invRes.rows[0].subtotal) || 0;
          const newBase = Math.round((oldSub + addAmount) * 100) / 100;
          const sc = Math.round(newBase * 0.10 * 100) / 100;
          const tdl = Math.round((newBase + sc) * 0.01 * 100) / 100;
          const sscl = Math.round((newBase + sc + tdl) * 0.025 * 100) / 100;
          const vat = Math.round((newBase + sc + tdl + sscl) * 0.18 * 100) / 100;
          const tot = Math.round((newBase + sc + tdl + sscl + vat) * 100) / 100;

          await db.query(
            `UPDATE invoices
             SET subtotal = $1, sc_amount = $2, tdl_amount = $3, sscl_amount = $4, vat_amount = $5, total_amount = $6, updated_at = NOW()
             WHERE invoice_id = $7`,
            [newBase, sc, tdl, sscl, vat, tot, invRes.rows[0].invoice_id]
          );
        }
      } catch (invErr) {
        console.warn('Could not auto-update invoice folio total:', invErr);
      }

      res.status(201).json({
        success: true,
        message: 'Service added to folio successfully in database',
        data: {
          usage_id:         u.usage_id,
          booking_id:       b.booking_id,
          booking_room_id:  b.id,
          service_name:     parsed.data.service_name,
          category:         parsed.data.category,
          quantity:         parsed.data.quantity,
          price_at_usage:   parsed.data.price_at_usage,
          total_price:      parsed.data.quantity * parsed.data.price_at_usage,
          used_at:          u.used_at,
          notes:            parsed.data.notes || null,
          meal_time:        parsed.data.meal_time || null,
          appointment_time: parsed.data.appointment_time || null,
        },
      });
      return;
    }
  } catch (err) {
    console.error('Database service usage insert failed, trying inMemoryStore:', err);
  }

  // Fallback to inMemoryStore
  try {
    const record = inMemoryStore.addFolioService(bookingId, parsed.data);
    res.status(201).json({
      success: true,
      message: 'Service added to folio successfully',
      data: record,
    });
  } catch (err: any) {
    res.status(409).json({
      success: false,
      message: err.message || 'Unable to add service to folio',
      code: 'SERVICE_CONFLICT',
    });
  }
});

/**
 * DELETE /api/v1/services/folio/:usageId
 * Voids/removes a service charge from the room folio (e.g. guest cancelled or no-show).
 */
router.delete('/folio/:usageId', async (req: Request, res: Response) => {
  const { usageId } = req.params;
  const reason = (req.body?.reason || req.query.reason || 'Guest cancellation') as string;

  try {
    const delRes = await db.query(
      `DELETE FROM service_usage WHERE usage_id::text = $1 RETURNING usage_id, booking_room_id, price_at_usage, quantity`,
      [usageId]
    );

    if ((delRes.rowCount ?? 0) > 0) {
      const row = delRes.rows[0];
      // Recalculate invoice
      try {
        const invRes = await db.query(
          `SELECT invoice_id, subtotal FROM invoices WHERE booking_room_id::text = $1`,
          [row.booking_room_id]
        );
        if (invRes.rows.length > 0) {
          const minusAmount = Math.round(Number(row.quantity) * Number(row.price_at_usage) * 100) / 100;
          const oldSub = Number(invRes.rows[0].subtotal) || 0;
          const newBase = Math.max(0, Math.round((oldSub - minusAmount) * 100) / 100);
          const sc = Math.round(newBase * 0.10 * 100) / 100;
          const tdl = Math.round((newBase + sc) * 0.01 * 100) / 100;
          const sscl = Math.round((newBase + sc + tdl) * 0.025 * 100) / 100;
          const vat = Math.round((newBase + sc + tdl + sscl) * 0.18 * 100) / 100;
          const tot = Math.round((newBase + sc + tdl + sscl + vat) * 100) / 100;

          await db.query(
            `UPDATE invoices
             SET subtotal = $1, sc_amount = $2, tdl_amount = $3, sscl_amount = $4, vat_amount = $5, total_amount = $6, updated_at = NOW()
             WHERE invoice_id = $7`,
            [newBase, sc, tdl, sscl, vat, tot, invRes.rows[0].invoice_id]
          );
        }
      } catch (e) {
        console.warn('Could not auto-update invoice folio on service deletion:', e);
      }

      res.json({
        success: true,
        message: 'Service charge voided and removed from room folio',
        data: { usageId, reason },
      });
      return;
    }
  } catch (err) {
    console.warn('DB delete service_usage failed, trying fallback:', err);
  }

  const success = inMemoryStore.removeFolioService(usageId, reason);
  if (!success) {
    res.status(404).json({
      success: false,
      message: 'Service usage record not found on folio',
      code: 'NOT_FOUND',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Service charge voided and removed from room folio',
    data: { usageId, reason },
  });
});

export default router;
