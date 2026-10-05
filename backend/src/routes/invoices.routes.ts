import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";
import { inMemoryStore } from "../config/db-fallback";
import { db } from "../config/db";

const router = Router();

// RBAC: Operations and management staff
router.use(authenticate);
router.use(authorize("RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"));

const RecordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than zero'),
  payment_method: z.enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'ONLINE']),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  booking_room_id: z.string().optional(),
});

interface RoomSummaryItem {
  booking_room_id:      string;
  room_id:              string;
  room_number:          string;
  room_type_name:       string;
  meal_plan:            string;
  meal_price_per_night: number;
  nights:               number;
  rate_at_booking:      number;
  room_tariff:          number;
  meal_charges:         number;
  room_charges:         number;
  service_charges:      number;
  base_amount:          number;
  sc_tax:               number;
  tdl_tax:              number;
  ssc_tax:              number;
  vat_tax:              number;
  total_amount:         number;
}

/**
 * Calculates 4-tier Sri Lankan statutory tax cascade:
 * SC (10%) -> TDL (1% on Base + SC) -> SSCL (2.5% on Base + SC + TDL) -> VAT (18% on Base + SC + TDL + SSCL)
 */
function computeTaxCascade(baseAmount: number) {
  const roundedBase = Math.round(baseAmount * 100) / 100;
  const scTax       = Math.round(roundedBase * 0.10 * 100) / 100;
  const tdlTax      = Math.round((roundedBase + scTax) * 0.01 * 100) / 100;
  const sscTax      = Math.round((roundedBase + scTax + tdlTax) * 0.025 * 100) / 100;
  const vatTax      = Math.round((roundedBase + scTax + tdlTax + sscTax) * 0.18 * 100) / 100;
  const grandTotal  = Math.round((roundedBase + scTax + tdlTax + sscTax + vatTax) * 100) / 100;

  return { baseAmount: roundedBase, scTax, tdlTax, sscTax, vatTax, grandTotal };
}

/**
 * Helper to build an invoice payload from PostgreSQL DB records.
 * Supports:
 * 1. Single Booking-wise consolidated bill (aggregating all rooms, services, and taxes)
 * 2. Single Room-wise bill (when specificBookingRoomId is provided, or queried by booking_room_id)
 */
async function buildDbInvoice(bookingIdOrRoomId: string, specificBookingRoomId?: string) {
  // 1. Fetch room details from view (or fallback to bookings + booking_rooms)
  let bRes = await db.query(
    `SELECT * FROM v_booking_details
     WHERE booking_id::text = $1 OR booking_room_id::text = $1
     ORDER BY room_number ASC`,
    [bookingIdOrRoomId]
  );

  if (bRes.rows.length === 0) {
    bRes = await db.query(
      `SELECT b.booking_id, b.status AS booking_status, b.notes,
              b.created_at AS booked_at, b.created_at AS booking_created_at,
              b.branch_id, br.branch_name, br.city AS branch_city,
              g_booker.id AS booker_guest_id, g_booker.first_name AS booker_first_name,
              g_booker.last_name AS booker_last_name, g_booker.email AS booker_email,
              g_booker.phone AS booker_phone,
              g_booker.first_name AS guest_first_name, g_booker.last_name AS guest_last_name,
              g_booker.email AS guest_email, g_booker.phone AS guest_phone,
              br_room.booking_room_id, br_room.check_in_date, br_room.check_out_date,
              (br_room.check_out_date - br_room.check_in_date) AS nights,
              br_room.rate_at_booking,
              ((br_room.check_out_date - br_room.check_in_date)::numeric * br_room.rate_at_booking) AS room_total,
              ((br_room.check_out_date - br_room.check_in_date)::numeric * br_room.rate_at_booking) AS total_amount,
              br_room.status AS room_status,
              r.id AS room_id, r.number AS room_number, r.floor,
              COALESCE(rt.type_name, r.type::text) AS room_type_name,
              COALESCE(mp.plan_name, 'Room Only') AS meal_plan,
              COALESCE(mp.price_per_night, 0.00) AS meal_price_per_night
       FROM bookings b
       JOIN branches br ON b.branch_id = br.branch_id
       LEFT JOIN guests g_booker ON b.booked_by_guest_id::text = g_booker.id::text OR b.guest_id::text = g_booker.id::text
       LEFT JOIN booking_rooms br_room ON b.booking_id = br_room.booking_id
       LEFT JOIN rooms r ON br_room.room_id::text = r.id::text
       LEFT JOIN room_types rt ON br_room.room_type_id = rt.room_type_id
       LEFT JOIN meal_plans mp ON br_room.plan_id = mp.plan_id
       WHERE b.booking_id::text = $1 OR b.id::text = $1 OR br_room.booking_room_id::text = $1
       ORDER BY r.number ASC`,
      [bookingIdOrRoomId]
    );
  }

  if (bRes.rows.length === 0) return null;

  const rows = bRes.rows;
  const primaryRow = rows[0];
  const actualBookingId = primaryRow.booking_id;

  // Resolve bookings.id for foreign key compatibility
  const bkRes = await db.query(
    `SELECT id, booking_id FROM bookings WHERE booking_id::text = $1 OR id = $1 LIMIT 1`,
    [actualBookingId]
  );
  const bookingFkId = bkRes.rows[0]?.id || actualBookingId;

  // Collect all booking_room_ids in this booking
  const allBookingRoomIds = rows.map((r: any) => r.booking_room_id).filter(Boolean);

  // 2. Fetch active services for all rooms in this booking
  const servicesRes = await db.query(
    `SELECT su.usage_id, su.booking_room_id, sc.service_name, sc.category, su.quantity, su.price_at_usage,
            (su.quantity * su.price_at_usage) AS total_price, su.used_at,
            su.notes, su.appointment_time, su.meal_time
     FROM service_usage su
     LEFT JOIN service_catalogue sc ON su.service_id = sc.service_id
     WHERE su.booking_room_id::text IN (
       SELECT unnest($1::text[])
       UNION SELECT $2::text
       UNION SELECT $3::text
     )
     ORDER BY su.used_at ASC`,
    [allBookingRoomIds.length > 0 ? allBookingRoomIds : [primaryRow.booking_room_id || actualBookingId], actualBookingId, bookingFkId]
  );

  const allServices = servicesRes.rows.map((s: any) => {
    const roomMatch = rows.find((r: any) => r.booking_room_id === s.booking_room_id);
    return {
      usage_id: s.usage_id,
      booking_room_id: s.booking_room_id,
      room_number: roomMatch?.room_number || null,
      service_name: s.service_name || 'Additional Hotel Service',
      category: s.category || 'General',
      quantity: Number(s.quantity) || 1,
      price_at_usage: Number(s.price_at_usage) || 0,
      total_price: Number(s.total_price) || 0,
      used_at: s.used_at ? new Date(s.used_at).toISOString() : new Date().toISOString(),
      notes: s.notes || null,
      appointment_time: s.appointment_time || null,
      meal_time: s.meal_time || null,
    };
  });

  // Calculate per-room statistics
  const roomSummaries: RoomSummaryItem[] = rows.map((r: any) => {
    const nights    = Math.max(1, Number(r.nights) || 1);
    const baseRate  = Number(r.rate_at_booking) || 150;
    const mealRate  = Number(r.meal_price_per_night) || 0;
    const roomTariff = Math.round(nights * baseRate * 100) / 100;
    const mealCharges = Math.round(nights * mealRate * 100) / 100;
    const roomCharges = Math.round((roomTariff + mealCharges) * 100) / 100;

    const roomServices = allServices.filter(s => s.booking_room_id === r.booking_room_id);
    const serviceCharges = Math.round(roomServices.reduce((acc, s) => acc + s.total_price, 0) * 100) / 100;

    const baseAmount = roomCharges + serviceCharges;
    const taxes = computeTaxCascade(baseAmount);

    return {
      booking_room_id:      r.booking_room_id,
      room_id:              r.room_id || "",
      room_number:          r.room_number || "101",
      room_type_name:       r.room_type_name || r.room_type || "Deluxe Suite",
      meal_plan:            r.meal_plan || "Room Only",
      meal_price_per_night: mealRate,
      nights,
      rate_at_booking:      baseRate,
      room_tariff:          roomTariff,
      meal_charges:         mealCharges,
      room_charges:         roomCharges,
      service_charges:      serviceCharges,
      base_amount:          baseAmount,
      sc_tax:               taxes.scTax,
      tdl_tax:              taxes.tdlTax,
      ssc_tax:              taxes.sscTax,
      vat_tax:              taxes.vatTax,
      total_amount:         taxes.grandTotal,
    };
  });

  // Check if caller explicitly requested a single room
  // (either via specificBookingRoomId param, or if the identifier matches a single room)
  const isExplicitRoomRequest = Boolean(
    specificBookingRoomId || (bookingIdOrRoomId !== actualBookingId && rows.some((r: any) => r.booking_room_id === bookingIdOrRoomId))
  );

  const targetRoomId = specificBookingRoomId || (isExplicitRoomRequest ? bookingIdOrRoomId : undefined);
  const selectedRoom = targetRoomId ? rows.find((r: any) => r.booking_room_id === targetRoomId) : null;

  // ── BRANCH A: Single Room-Wise Invoice ──────────────────────────────────────
  if (selectedRoom) {
    const rSummary = roomSummaries.find(rs => rs.booking_room_id === selectedRoom.booking_room_id) || roomSummaries[0];
    const roomServices = allServices.filter(s => s.booking_room_id === selectedRoom.booking_room_id);

    // Look up or generate room invoice in `invoices` table
    let invRes = await db.query(
      `SELECT * FROM invoices WHERE booking_room_id::text = $1 OR booking_room_id::text = $2 ORDER BY issued_at DESC LIMIT 1`,
      [selectedRoom.booking_room_id, bookingFkId]
    );

    let invoiceId = invRes.rows[0]?.invoice_id;
    if (!invoiceId) {
      const newInv = await db.query(
        `INSERT INTO invoices (booking_room_id, subtotal, sc_amount, tdl_amount, sscl_amount, vat_amount, total_amount, issued_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING invoice_id`,
        [bookingFkId, rSummary.base_amount, rSummary.sc_tax, rSummary.tdl_tax, rSummary.ssc_tax, rSummary.vat_tax, rSummary.total_amount]
      );
      invoiceId = newInv.rows[0]?.invoice_id;
    } else {
      // Update with current totals
      await db.query(
        `UPDATE invoices SET subtotal = $1, sc_amount = $2, tdl_amount = $3, sscl_amount = $4, vat_amount = $5, total_amount = $6, updated_at = NOW()
         WHERE invoice_id = $7`,
        [rSummary.base_amount, rSummary.sc_tax, rSummary.tdl_tax, rSummary.ssc_tax, rSummary.vat_tax, rSummary.total_amount, invoiceId]
      );
    }

    // Fetch payments for this invoice
    const payRes = await db.query(
      `SELECT payment_id, invoice_id, amount_paid AS amount, paid_at AS payment_date, method AS payment_method
       FROM payments
       WHERE invoice_id = $1
       ORDER BY paid_at ASC`,
      [invoiceId]
    );

    const payments = payRes.rows.map((p: any) => ({
      payment_id:     p.payment_id,
      amount:         Number(p.amount) || 0,
      payment_date:   p.payment_date ? new Date(p.payment_date).toISOString() : new Date().toISOString(),
      payment_method: p.payment_method || "CREDIT_CARD",
    }));

    const totalPaid = Math.round(payments.reduce((acc, p) => acc + p.amount, 0) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((rSummary.total_amount - totalPaid) * 100) / 100);
    const status: "OPEN" | "PARTIALLY_PAID" | "SETTLED" =
      balanceDue <= 0 && totalPaid > 0 ? "SETTLED" : (totalPaid > 0 ? "PARTIALLY_PAID" : "OPEN");

    return {
      invoice_id:      invoiceId,
      booking_id:      actualBookingId,
      booking_room_id: selectedRoom.booking_room_id,
      is_consolidated: false,
      view_mode:       "single_room" as const,
      guest_name:      `${selectedRoom.guest_first_name || selectedRoom.booker_first_name || "Guest"} ${selectedRoom.guest_last_name || selectedRoom.booker_last_name || ""}`.trim(),
      guest_email:     selectedRoom.guest_email || selectedRoom.booker_email || "guest@skynest.lk",
      guest_phone:     selectedRoom.guest_phone || selectedRoom.booker_phone || null,
      room_number:     selectedRoom.room_number || "101",
      room_type_name:  selectedRoom.room_type_name || selectedRoom.room_type || "Deluxe Suite",
      meal_plan:       selectedRoom.meal_plan || "Room Only",
      check_in_date:   selectedRoom.check_in_date,
      check_out_date:  selectedRoom.check_out_date,
      nights:          rSummary.nights,
      rate_at_booking: rSummary.rate_at_booking,
      meal_price_per_night: rSummary.meal_price_per_night,
      breakdown: {
        room_charges:       rSummary.room_charges,
        service_charges:    rSummary.service_charges,
        base_amount:        rSummary.base_amount,
        service_charge_tax: rSummary.sc_tax,
        tdl_amount:         rSummary.tdl_tax,
        ssc_amount:         rSummary.ssc_tax,
        vat_amount:         rSummary.vat_tax,
        total_amount:       rSummary.total_amount,
        total_paid:         totalPaid,
        balance_due:        balanceDue,
        status:             status,
      },
      services: roomServices,
      payments: payments,
      all_rooms: roomSummaries.map(r => ({
        booking_room_id: r.booking_room_id,
        room_number:     r.room_number,
        room_type_name:  r.room_type_name,
        meal_plan:       r.meal_plan,
        total_amount:    r.total_amount,
      })),
    };
  }

  // ── BRANCH B: Single Booking-Wise Consolidated Invoice ─────────────────────
  const consolidatedRoomCharges = Math.round(roomSummaries.reduce((sum, r) => sum + r.room_charges, 0) * 100) / 100;
  const consolidatedServiceCharges = Math.round(allServices.reduce((sum, s) => sum + s.total_price, 0) * 100) / 100;
  const consolidatedBase = Math.round((consolidatedRoomCharges + consolidatedServiceCharges) * 100) / 100;
  const consolidatedTaxes = computeTaxCascade(consolidatedBase);

  // Look up or auto-generate booking-level invoice
  let invRes = await db.query(
    `SELECT * FROM invoices WHERE booking_room_id::text = $1 OR booking_room_id::text = $2 ORDER BY issued_at DESC LIMIT 1`,
    [actualBookingId, bookingFkId]
  );

  let invoiceId = invRes.rows[0]?.invoice_id;

  if (!invoiceId) {
    const newInv = await db.query(
      `INSERT INTO invoices (booking_room_id, subtotal, sc_amount, tdl_amount, sscl_amount, vat_amount, total_amount, issued_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING invoice_id`,
      [bookingFkId, consolidatedBase, consolidatedTaxes.scTax, consolidatedTaxes.tdlTax, consolidatedTaxes.sscTax, consolidatedTaxes.vatTax, consolidatedTaxes.grandTotal]
    );
    invoiceId = newInv.rows[0]?.invoice_id;
  } else {
    // Update invoice with latest consolidated calculation
    await db.query(
      `UPDATE invoices SET subtotal = $1, sc_amount = $2, tdl_amount = $3, sscl_amount = $4, vat_amount = $5, total_amount = $6, updated_at = NOW()
       WHERE invoice_id = $7`,
      [consolidatedBase, consolidatedTaxes.scTax, consolidatedTaxes.tdlTax, consolidatedTaxes.sscTax, consolidatedTaxes.vatTax, consolidatedTaxes.grandTotal, invoiceId]
    );
  }

  // Fetch all payments for this booking
  const payRes = await db.query(
    `SELECT payment_id, invoice_id, amount_paid AS amount, paid_at AS payment_date, method AS payment_method
     FROM payments
     WHERE invoice_id IN (
       SELECT invoice_id FROM invoices WHERE booking_room_id::text = $1 OR booking_room_id::text = $2 OR invoice_id = $3
     )
     ORDER BY paid_at ASC`,
    [actualBookingId, bookingFkId, invoiceId]
  );

  const payments = payRes.rows.map((p: any) => ({
  const totalPaid = Math.round(payments.reduce((acc, p) => acc + p.amount, 0) * 100) / 100;
  const balanceDue = Math.max(0, Math.round((consolidatedTaxes.grandTotal - totalPaid) * 100) / 100);
  const status: "OPEN" | "PARTIALLY_PAID" | "SETTLED" =
    balanceDue <= 0 && totalPaid > 0 ? "SETTLED" : (totalPaid > 0 ? "PARTIALLY_PAID" : "OPEN");

  const nights = Math.max(1, Number(primaryRow.nights) || 1);

  return {
    invoice_id: invoiceId,
    booking_id: actualBookingId,
    booking_room_id: primaryRow.booking_room_id || actualBookingId,
    is_consolidated: true,
    view_mode: 'consolidated' as const,
    rooms_count: rows.length,
    guest_name: `${primaryRow.guest_first_name || primaryRow.booker_first_name || 'Guest'} ${primaryRow.guest_last_name || primaryRow.booker_last_name || ''}`.trim(),
    guest_email: primaryRow.guest_email || primaryRow.booker_email || 'guest@skynest.lk',
    guest_phone: primaryRow.guest_phone || primaryRow.booker_phone || null,
    room_number: rows.map((r: any) => r.room_number).filter(Boolean).join(', '),
    room_type_name: rows.map((r: any) => r.room_type_name || r.room_type).filter(Boolean).join(' & '),
    check_in_date: primaryRow.check_in_date,
    check_out_date: primaryRow.check_out_date,
    nights: nights,
    rate_at_booking: Math.round((consolidatedRoomCharges / nights) * 100) / 100,
    breakdown: {
      room_charges: consolidatedRoomCharges,
      service_charges: consolidatedServiceCharges,
      base_amount: consolidatedBase,
      service_charge_tax: consolidatedTaxes.scTax,
      tdl_amount: consolidatedTaxes.tdlTax,
      ssc_amount: consolidatedTaxes.sscTax,
      vat_amount: consolidatedTaxes.vatTax,
      total_amount: consolidatedTaxes.grandTotal,
      total_paid: totalPaid,
      balance_due: balanceDue,
      status: status,
    },
    rooms: roomSummaries,
    services: allServices,
    },
    rooms:    roomSummaries,
    services: allServices,
    payments: payments,
    all_rooms: roomSummaries.map(r => ({
      booking_room_id: r.booking_room_id,
      room_number:     r.room_number,
      room_type_name:  r.room_type_name,
      meal_plan:       r.meal_plan,
      total_amount:    r.total_amount,
    })),
  };
}
/**---Nimeth---**/
/**
 * GET /api/v1/invoices
 * Returns all invoices and bookings with 4-tier statutory tax cascade and payment ledger status.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { branchId, status, search } = req.query;
    let query = `
      SELECT 
        b.booking_id,
        b.booking_room_id,
        b.booking_status,
        b.nights,
        b.rate_at_booking,
        b.total_amount AS booking_total,
        b.branch_name,
        b.branch_id,
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.room_number,
        b.room_type_name,
        b.check_in_date,
        b.check_out_date,
        inv.invoice_id,
        inv.subtotal,
        inv.sc_amount,
        inv.tdl_amount,
        inv.sscl_amount,
        inv.vat_amount,
        inv.total_amount AS invoice_total,
        inv.issued_at,
        COALESCE(pay.total_paid, 0) AS total_paid
      FROM v_booking_details b
      LEFT JOIN invoices inv ON (inv.booking_room_id = b.booking_id::text OR inv.booking_room_id = b.booking_room_id::text)
      LEFT JOIN (
        SELECT invoice_id, SUM(amount_paid) AS total_paid
        FROM payments
        GROUP BY invoice_id
      ) pay ON pay.invoice_id = inv.invoice_id
      WHERE 1=1
    `;
  } catch (error) {

  }
})
/**
 * GET /api/v1/invoices/:bookingId
 * Returns complete tax cascade invoice breakdown, service items, and payments ledger.
 * Query param: ?booking_room_id=... (returns single room bill when specified, or booking consolidated bill)
 */
router.get("/:bookingId", async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const specificRoomId = typeof req.query.booking_room_id === "string" ? req.query.booking_room_id.trim() : undefined;

  try {
    const dbInvoice = await buildDbInvoice(bookingId, specificRoomId);
    if (dbInvoice) {
      res.json({ success: true, data: dbInvoice });
      return;
    }
  } catch (err) {
    console.error("Error fetching DB invoice, falling back to memory store:", err);
  }

  // Fallback to inMemoryStore
  const invoice = inMemoryStore.getInvoice(bookingId);
  if (!invoice) {
    res.status(404).json({
      success: false,
      message: "Invoice not found for booking: " + bookingId,
      code: "NOT_FOUND",
    });
    return;
  }

  res.json({
    success: true,
    data: invoice,
  });
});

/**
 * POST /api/v1/invoices/:bookingId/generate
 * Recalculates and formalizes final bill enforcing 4-tier statutory tax cascade.
 * Query param: ?booking_room_id=... (generates single room bill or booking-wide consolidated bill)
 */
router.post("/:bookingId/generate", async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const specificRoomId = typeof req.query.booking_room_id === "string" ? req.query.booking_room_id.trim() : undefined;

  try {
    const dbInvoice = await buildDbInvoice(bookingId, specificRoomId);
    if (dbInvoice) {
      res.json({
        success: true,
        message: specificRoomId
          ? "Single room tax bill formalized successfully"
          : "Consolidated booking tax bill formalized successfully",
        data: dbInvoice,
      });
      return;
    }
  } catch (err) {
    console.error("Error generating DB invoice, falling back to memory store:", err);
  }

  const invoice = inMemoryStore.getInvoice(bookingId);
  if (!invoice) {
    res.status(404).json({
      success: false,
      message: "Cannot generate bill: booking not found",
      code: "NOT_FOUND",
    });
    return;
  }

  res.json({
    success: true,
    message: "Final bill generated successfully with statutory tax cascade",
    data: invoice,
  });
});

/**
 * POST /api/v1/invoices/:bookingId/payments
 * Records a partial deposit or final settlement payment (Rule B12).
 */
router.post("/:bookingId/payments", async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const parsed = RecordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const specificRoomId = parsed.data.booking_room_id;
    const dbInvoice = await buildDbInvoice(bookingId, specificRoomId);
    if (dbInvoice && dbInvoice.invoice_id) {
      const payRes = await db.query(
        `INSERT INTO payments (invoice_id, amount_paid, method, paid_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING payment_id, invoice_id, amount_paid, method, paid_at`,
        [dbInvoice.invoice_id, parsed.data.amount, parsed.data.payment_method]
      );

      const updatedInvoice = await buildDbInvoice(bookingId, specificRoomId);

      // If fully paid or settling, update booking payment status
      if (updatedInvoice && updatedInvoice.breakdown.balance_due <= 0) {
        await db.query(
          `UPDATE bookings SET payment_status = 'PAID' WHERE booking_id::text = $1 OR id = $1`,
          [bookingId]
        );
      }

      res.status(201).json({
        success: true,
        message: "Payment recorded successfully in database",
        data: {
          payment: payRes.rows[0],
          invoice: updatedInvoice,
        },
      });
      return;
    }
  } catch (err) {
    console.error("Error recording DB payment, falling back to memory store:", err);
  }

  try {
    const result = inMemoryStore.addPayment(bookingId, parsed.data);
    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to record payment",
      code: "PAYMENT_FAILED",
    });
  }
});

export default router;
