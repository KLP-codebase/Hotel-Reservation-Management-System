import { PoolClient } from 'pg';
import { DbAdapter } from '../config/db';
import { AppError, Errors } from '../lib/errors';

export interface PaymentRecord {
  payment_id:       string;
  invoice_id:       string;
  amount:           number;
  payment_date:     string;
  payment_method:   string;
  reference_number?: string | null;
  notes?:           string | null;
}

export interface TaxCascadeBreakdown {
  room_charges:        number;
  service_charges:     number;
  base_amount:         number;
  service_charge_tax:  number; // 10%
  tdl_amount:          number; // 1%
  ssc_amount:          number; // 2.5%
  vat_amount:          number; // 18%
  total_amount:        number;
  total_paid:          number;
  balance_due:         number;
  status:              'OPEN' | 'PARTIALLY_PAID' | 'SETTLED';
}

export interface InvoiceDetail {
  invoice_id?:         string;
  booking_room_id:     string;
  booking_id:          string;
  guest_name:          string;
  room_number:         string;
  nights:              number;
  rate_at_booking:     number;
  breakdown:           TaxCascadeBreakdown;
  services:            Array<{
    usage_id:       string;
    service_name:   string;
    category:       string;
    quantity:       number;
    price_at_usage: number;
    total_price:    number;
    used_at:        string;
    notes?:         string | null;
  }>;
  payments:            PaymentRecord[];
}

export class InvoiceRepository {
  constructor(private db: DbAdapter) {}

  /**
   * Invoke statutory sp_generate_final_bill stored procedure.
   */
  async generateFinalBill(bookingRoomId: string): Promise<{ invoice_id: string }> {
    const res = await this.db.query<{ invoice_id: string | null }>(
      `SELECT sp_generate_final_bill($1) AS invoice_id`,
      [bookingRoomId]
    );
    const invoiceId = res.rows[0]?.invoice_id;
    if (!invoiceId) throw Errors.notFound('Booking room');
    return { invoice_id: invoiceId };
  }

  /**
   * Record payment tranche (Rule B12).
   */
  async addPayment(input: {
    invoice_id:       string;
    amount:           number;
    payment_method:   string;
    reference_number?: string;
  }): Promise<PaymentRecord> {
    const res = await this.db.query<PaymentRecord>(
      `INSERT INTO payments (invoice_id, amount, payment_date, payment_method, reference_number)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
       RETURNING payment_id, invoice_id, amount, payment_date, payment_method, reference_number`,
      [input.invoice_id, input.amount, input.payment_method, input.reference_number ?? null]
    );

    // Update invoice status if balance is cleared
    const checkRes = await this.db.query<{ total_amount: string; total_paid: string }>(
      `SELECT i.total_amount, COALESCE(SUM(p.amount), 0) AS total_paid
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.invoice_id
       WHERE i.invoice_id = $1
       GROUP BY i.invoice_id, i.total_amount`,
      [input.invoice_id]
    );

    if (checkRes.rows[0]) {
      const totalAmount = parseFloat(checkRes.rows[0].total_amount);
      const totalPaid   = parseFloat(checkRes.rows[0].total_paid);
      const newStatus   = totalPaid >= totalAmount ? 'SETTLED' : (totalPaid > 0 ? 'PARTIALLY_PAID' : 'OPEN');

      await this.db.query(
        `UPDATE invoices SET status = $1 WHERE invoice_id = $2`,
        [newStatus, input.invoice_id]
      );
    }

    return res.rows[0];
  }

  /**
   * Check-out settlement. Must run inside the check-out transaction, AFTER the
   * booking's room lines moved to CHECKED_OUT (that fires sp_generate_final_bill,
   * so every room line has a fresh invoice).
   *
   * The balance is taken across the whole booking: earlier payments may sit on
   * any of its invoices. With `settle` the remainder is paid off (split over the
   * invoices that still owe, oldest room first) and every invoice is marked
   * SETTLED. Without it, an outstanding balance aborts the check-out.
   */
  async settleBookingAtCheckout(
    client: PoolClient,
    bookingId: string,
    opts: { settle: boolean; paymentMethod: string },
  ): Promise<{ total: number; previouslyPaid: number; settledNow: number }> {
    const { rows } = await client.query<{ invoice_id: string; total_amount: string; paid: string }>(
      `SELECT i.invoice_id, i.total_amount, COALESCE(p.paid, 0) AS paid
       FROM booking_rooms br
       JOIN invoices i ON i.booking_room_id = br.booking_room_id
       LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p
              ON p.invoice_id = i.invoice_id
       WHERE br.booking_id = $1 AND br.status = 'CHECKED_OUT'
       ORDER BY br.created_at, br.booking_room_id
       FOR UPDATE OF i`,
      [bookingId]
    );

    const cents = (n: number) => Math.round(n * 100);
    const total = rows.reduce((sum, r) => sum + cents(Number(r.total_amount)), 0);
    const paid  = rows.reduce((sum, r) => sum + cents(Number(r.paid)), 0);
    let remaining = total - paid;

    if (remaining > 0 && !opts.settle) {
      throw new AppError(409, 'OUTSTANDING_BALANCE',
        `This stay has an outstanding balance of ${(remaining / 100).toFixed(2)}. Settle it before checking out.`);
    }

    let settledNow = 0;
    for (const r of rows) {
      if (remaining <= 0) break;
      const owed = cents(Number(r.total_amount)) - cents(Number(r.paid));
      if (owed <= 0) continue;
      const amount = Math.min(owed, remaining);
      await client.query(
        `INSERT INTO payments (invoice_id, amount, payment_date, payment_method, reference_number)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)`,
        [r.invoice_id, (amount / 100).toFixed(2), opts.paymentMethod, `CHECKOUT-${bookingId.slice(0, 8).toUpperCase()}`]
      );
      remaining -= amount;
      settledNow += amount;
    }

    if (rows.length > 0) {
      await client.query(
        `UPDATE invoices SET status = 'SETTLED' WHERE invoice_id = ANY($1::uuid[])`,
        [rows.map(r => r.invoice_id)]
      );
    }

    return { total: total / 100, previouslyPaid: paid / 100, settledNow: settledNow / 100 };
  }

  /**
   * Get payments for an invoice.
   */
  async getPayments(invoiceId: string): Promise<PaymentRecord[]> {
    const res = await this.db.query<PaymentRecord>(
      `SELECT payment_id, invoice_id, amount, payment_date, payment_method, reference_number
       FROM payments
       WHERE invoice_id = $1
       ORDER BY payment_date ASC`,
      [invoiceId]
    );
    return res.rows;
  }
}
