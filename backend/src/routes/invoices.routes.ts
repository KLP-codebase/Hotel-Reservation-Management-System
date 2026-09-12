import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { inMemoryStore } from '../config/db-fallback';
import { db } from '../config/db';

const router = Router();

// RBAC: Operations and management staff
router.use(authenticate);
router.use(authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'));

const RecordPaymentSchema = z.object({
  amount:           z.number().positive('Payment amount must be greater than zero'),
  payment_method:   z.enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'ONLINE']),
  reference_number: z.string().optional(),
  notes:            z.string().optional(),
});

/**
 * Helper to build an invoice payload from PostgreSQL DB records.
 */
async function buildDbInvoice(bookingId: string) {
  // 1. Fetch booking details from view
  const bRes = await db.query(
    `SELECT * FROM v_booking_details WHERE booking_id::text = $1 OR booking_room_id::text = $1 LIMIT 1`,
    [bookingId]
  );
  if (bRes.rows.length === 0) return null;
  const b = bRes.rows[0];

  // 2. Fetch active service usage
  const servicesRes = await db.query(
    `SELECT su.usage_id, sc.service_name, sc.category, su.quantity, su.price_at_usage,
            (su.quantity * su.price_at_usage) AS total_price, su.used_at
     FROM service_usage su
     LEFT JOIN service_catalogue sc ON su.service_id = sc.service_id
     WHERE su.booking_room_id::text = $1 OR su.booking_room_id::text = $2
     ORDER BY su.used_at ASC`,
    [b.booking_id, b.booking_room_id]
  );

  const services = servicesRes.rows.map((s: any) => ({
    usage_id:         s.usage_id,
    service_name:     s.service_name || 'Additional Hotel Service',
    category:         s.category || 'General',
    quantity:         Number(s.quantity) || 1,
    price_at_usage:   Number(s.price_at_usage) || 0,
    total_price:      Number(s.total_price) || 0,
    used_at:          s.used_at ? new Date(s.used_at).toISOString() : new Date().toISOString(),
  }));

  // 3. Compute 4-tier Sri Lankan tax cascade
  const nights = Math.max(1, Number(b.nights) || 1);
  const rateAtBooking = Number(b.rate_at_booking) || (Number(b.total_amount) / nights) || 150;
  const roomCharges = Math.round(nights * rateAtBooking * 100) / 100;
  const serviceCharges = Math.round(services.reduce((acc, s) => acc + s.total_price, 0) * 100) / 100;
  const baseAmount = Math.round((roomCharges + serviceCharges) * 100) / 100;

  // SC: 10%
  const scTax = Math.round(baseAmount * 0.10 * 100) / 100;
  // TDL: 1% on (Base + SC)
  const tdlTax = Math.round((baseAmount + scTax) * 0.01 * 100) / 100;
  // SSCL: 2.5% on (Base + SC + TDL)
  const sscTax = Math.round((baseAmount + scTax + tdlTax) * 0.025 * 100) / 100;
  // VAT: 18% on (Base + SC + TDL + SSCL)
  const vatTax = Math.round((baseAmount + scTax + tdlTax + sscTax) * 0.18 * 100) / 100;
  const grandTotal = Math.round((baseAmount + scTax + tdlTax + sscTax + vatTax) * 100) / 100;

  // 4. Look up or auto-generate invoice in `invoices` table
  // Find bookings.id primary key for foreign key constraint
  const bkRes = await db.query(
    `SELECT id, booking_id FROM bookings WHERE booking_id::text = $1 OR id = $1 LIMIT 1`,
    [b.booking_id]
  );
  const bookingFkId = bkRes.rows[0]?.id || b.booking_id;

  let invRes = await db.query(
    `SELECT * FROM invoices WHERE booking_room_id::text = $1 OR booking_room_id::text = $2 ORDER BY issued_at DESC LIMIT 1`,
    [b.booking_id, bookingFkId]
  );

  let invoiceId = invRes.rows[0]?.invoice_id;

  if (!invoiceId) {
    // Generate new invoice
    const newInv = await db.query(
      `INSERT INTO invoices (booking_room_id, subtotal, sc_amount, tdl_amount, sscl_amount, vat_amount, total_amount, issued_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING invoice_id`,
      [bookingFkId, baseAmount, scTax, tdlTax, sscTax, vatTax, grandTotal]
    );
    invoiceId = newInv.rows[0]?.invoice_id;
  }

  // 5. Fetch payments
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
    payment_method: p.payment_method || 'CREDIT_CARD',
  }));

  const totalPaid = Math.round(payments.reduce((acc, p) => acc + p.amount, 0) * 100) / 100;
  const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);
  const status: "OPEN" | "PARTIALLY_PAID" | "SETTLED" = 
    balanceDue <= 0 && totalPaid > 0 ? "SETTLED" : (totalPaid > 0 ? "PARTIALLY_PAID" : "OPEN");

  // Return full invoice structure
  return {
    invoice_id:      invoiceId,
    booking_id:      b.booking_id,
    booking_room_id: b.booking_room_id,
    guest_name:      `${b.guest_first_name || b.booker_first_name || 'Guest'} ${b.guest_last_name || b.booker_last_name || ''}`.trim(),
    guest_email:     b.guest_email || b.booker_email || 'guest@skynest.lk',
    guest_phone:     b.guest_phone || b.booker_phone || null,
    room_number:     b.room_number || '101',
    room_type_name:  b.room_type_name || b.room_type || 'Deluxe Suite',
    check_in_date:   b.check_in_date ? new Date(b.check_in_date).toISOString().split('T')[0] : '2026-09-10',
    check_out_date:  b.check_out_date ? new Date(b.check_out_date).toISOString().split('T')[0] : '2026-09-14',
    nights:          nights,
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
      status:             status,
    },
    services: services,
    payments: payments,
  };
}

/**
 * GET /api/v1/invoices/:bookingId
 * Returns complete tax cascade invoice breakdown, service items, and payments ledger.
 */
router.get('/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  try {
    const dbInvoice = await buildDbInvoice(bookingId);
    if (dbInvoice) {
      res.json({ success: true, data: dbInvoice });
      return;
    }
  } catch (err) {
    console.error('Error fetching DB invoice, falling back to memory store:', err);
  }

  // Fallback to inMemoryStore
  const invoice = inMemoryStore.getInvoice(bookingId);
  if (!invoice) {
    res.status(404).json({
      success: false,
      message: 'Invoice not found for booking: ' + bookingId,
      code: 'NOT_FOUND',
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
 */
router.post('/:bookingId/generate', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  try {
    const dbInvoice = await buildDbInvoice(bookingId);
    if (dbInvoice) {
      res.json({
        success: true,
        message: 'Final bill generated successfully with statutory tax cascade',
        data: dbInvoice,
      });
      return;
    }
  } catch (err) {
    console.error('Error generating DB invoice, falling back to memory store:', err);
  }

  const invoice = inMemoryStore.getInvoice(bookingId);
  if (!invoice) {
    res.status(404).json({
      success: false,
      message: 'Cannot generate bill: booking not found',
      code: 'NOT_FOUND',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Final bill generated successfully with statutory tax cascade',
    data: invoice,
  });
});

/**
 * POST /api/v1/invoices/:bookingId/payments
 * Records a partial deposit or final settlement payment (Rule B12).
 */
router.post('/:bookingId/payments', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const parsed = RecordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    // 1. Ensure DB invoice exists
    const dbInvoice = await buildDbInvoice(bookingId);
    if (dbInvoice && dbInvoice.invoice_id) {
      const payRes = await db.query(
        `INSERT INTO payments (invoice_id, amount_paid, method, paid_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING payment_id, invoice_id, amount_paid, method, paid_at`,
        [dbInvoice.invoice_id, parsed.data.amount, parsed.data.payment_method]
      );

      const updatedInvoice = await buildDbInvoice(bookingId);

      // If fully paid or settling, update booking payment status
      if (updatedInvoice && updatedInvoice.breakdown.balance_due <= 0) {
        await db.query(
          `UPDATE bookings SET payment_status = 'PAID' WHERE booking_id::text = $1 OR id = $1`,
          [bookingId]
        );
      }

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully in database',
        data: {
          payment: payRes.rows[0],
          invoice: updatedInvoice,
        },
      });
      return;
    }
  } catch (err) {
    console.error('Error recording DB payment, falling back to memory store:', err);
  }

  try {
    const result = inMemoryStore.addPayment(bookingId, parsed.data);
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to record payment',
      code: 'PAYMENT_FAILED',
    });
  }
});

export default router;
