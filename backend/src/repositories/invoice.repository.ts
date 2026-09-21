import { DbAdapter } from '../config/db';

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
    const res = await this.db.query<{ sp_generate_final_bill: string }>(
      `SELECT sp_generate_final_bill($1) AS invoice_id`,
      [bookingRoomId]
    );
    const invoiceId = res.rows[0]?.sp_generate_final_bill || bookingRoomId;
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
