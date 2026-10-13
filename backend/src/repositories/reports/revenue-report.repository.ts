import { DbAdapter } from '../../config/db';

// ── Person 1: Financial & Revenue Specialist ─────────────────────────────────
// Report 4: Monthly Revenue per Branch (Room Charges vs Service Revenue)
// Report 2: Guest Billing Summary & Unpaid Balances (Debtor Aging)

// ── Report 4 Types ────────────────────────────────────────────────────────────

/**
 * MonthlyRevenueRow
 * 
 * Represents an aggregated financial summary for a single hotel branch over a
 * specific calendar month, distinguishing room accommodation tariff revenue
 * from ancillary guest service charges, alongside statutory taxes.
 */
export interface MonthlyRevenueRow {
  /** YYYY-MM key used for indexing and chronological ordering (e.g. "2026-03") */
  month_key: string;
  /** Human-readable month label for display and reporting (e.g. "Mar 2026") */
  month_label: string;
  /** Unique UUID identifier of the hotel branch */
  branch_id: string;
  /** Name of the hotel branch (e.g. "Sky Nest Kandy") */
  branch_name: string;
  /** Base accommodation revenue derived from room tariffs and meal plans (in LKR) */
  total_room_revenue: string;
  /** Ancillary service consumption revenue (dining, spa, laundry, transport in LKR) */
  total_service_revenue: string;
  /** Total base turnover before taxes (room + service revenue in LKR) */
  subtotal_base_revenue: string;
  /** Combined statutory taxes collected (SC + TDL + SSCL + VAT in LKR) */
  total_taxes_collected: string;
  /** Final gross invoiced total including all statutory taxes (in LKR) */
  gross_revenue: string;
}

// ── Report 2 Types ────────────────────────────────────────────────────────────

/**
 * BillingSummaryRow
 * 
 * Represents an individual invoice entry for accounts receivable reporting,
 * including guest information, room numbers, tax details, payments received,
 * outstanding balance, and debtor aging.
 */
export interface BillingSummaryRow {
  /** UUID primary key of the invoice */
  invoice_id: string;
  /** Human-readable alphanumeric booking code or UUID reference */
  booking_reference: string;
  /** Concatenated first and last name of the registered guest */
  guest_name: string;
  /** Contact email address of the guest, if registered */
  guest_email: string | null;
  /** Contact telephone number of the guest, if registered */
  guest_phone: string | null;
  /** Branch name where the reservation occurred */
  branch_name: string;
  /** Comma-separated list of room numbers assigned to this booking */
  room_numbers: string | null;
  /** Subtotal charge before taxes (in LKR) */
  base_amount: string;
  /** Service charge tax component (10% in LKR) */
  service_charge_tax: string;
  /** Tourism Development Levy component (1% in LKR) */
  tdl_amount: string;
  /** Social Security Contribution Levy component (2.5% on 85% base in LKR) */
  sscl_amount: string;
  /** Value Added Tax component (18% in LKR) */
  vat_amount: string;
  /** Grand total invoiced including all statutory taxes (in LKR) */
  total_amount: string;
  /** Aggregate of all verified customer payments recorded against this invoice (in LKR) */
  total_paid: string;
  /** Remaining unsettled arrears balance due (total_amount - total_paid in LKR) */
  balance_due: string;
  /** Date and time when the invoice was officially generated or issued */
  invoice_date: string;
  /** Elapsed days between the invoice creation date and current server date */
  aging_days: number;
  /** Computed settlement status based on balance due: 'SETTLED' | 'PARTIALLY_PAID' | 'UNPAID' */
  computed_status: 'SETTLED' | 'PARTIALLY_PAID' | 'UNPAID';
}

// ── Repository ────────────────────────────────────────────────────────────────

export class RevenueReportRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * Report 4: Monthly Revenue per Branch
   * Dynamically segregates room tariff vs service revenue using live `invoices`
   * columns: room_charges, service_charges, discount_amount, and 4-tier Sri Lankan
   * statutory taxes (service_charge_tax, tdl_amount, ssc_amount, vat_amount).
   *
   * @param branchId - Optional UUID to filter a single branch (null = all branches)
   * @param year     - 4-digit fiscal year (e.g. 2026)
   * @param month    - Optional month (1-12) to filter to a single month (null = full year)
   */
  async getMonthlyRevenue(
    branchId: string | null,
    year: number,
    month?: number | null,
  ): Promise<MonthlyRevenueRow[]> {
    const sql = `
      WITH monthly_invoices AS (
        SELECT
          i.invoice_id,
          i.booking_room_id,
          b.branch_id,
          br.branch_name,
          TO_CHAR(COALESCE(i.generated_at, CURRENT_TIMESTAMP), 'YYYY-MM') AS month_key,
          TO_CHAR(COALESCE(i.generated_at, CURRENT_TIMESTAMP), 'Mon YYYY') AS month_label,
          EXTRACT(MONTH FROM COALESCE(i.generated_at, CURRENT_TIMESTAMP)) AS month_num,
          (COALESCE(i.room_charges, 0) + COALESCE(i.service_charges, 0) - COALESCE(i.discount_amount, 0)) AS subtotal,
          COALESCE(i.room_charges, 0)       AS room_charges,
          COALESCE(i.service_charges, 0)    AS service_charges,
          COALESCE(i.service_charge_tax, 0) AS sc_amount,
          COALESCE(i.tdl_amount, 0)         AS tdl_amount,
          COALESCE(i.ssc_amount, 0)         AS sscl_amount,
          COALESCE(i.vat_amount, 0)         AS vat_amount,
          COALESCE(i.total_amount, 0)       AS total_amount
        FROM invoices i
        JOIN booking_rooms bkr
          ON (bkr.booking_room_id::text = i.booking_room_id::text
              OR bkr.booking_id::text = i.booking_room_id::text)
        JOIN bookings b
          ON (b.booking_id::text = bkr.booking_id::text
              OR to_jsonb(b)->>'id' = bkr.booking_id::text)
        JOIN branches br ON br.branch_id::text = b.branch_id::text
        WHERE ($1::text IS NULL OR $1 = '' OR br.branch_id::text = $1::text)
          AND EXTRACT(YEAR FROM COALESCE(i.generated_at, CURRENT_TIMESTAMP)) = $2::int
          AND ($3::int IS NULL OR EXTRACT(MONTH FROM COALESCE(i.generated_at, CURRENT_TIMESTAMP)) = $3::int)
      )
      SELECT
        mi.month_key,
        mi.month_label,
        mi.branch_id::text                                                             AS branch_id,
        mi.branch_name,
        ROUND(SUM(mi.room_charges), 2)::text                                          AS total_room_revenue,
        ROUND(SUM(mi.service_charges), 2)::text                                       AS total_service_revenue,
        ROUND(SUM(mi.subtotal), 2)::text                                              AS subtotal_base_revenue,
        ROUND(SUM(mi.sc_amount + mi.tdl_amount + mi.sscl_amount + mi.vat_amount), 2)::text
                                                                                       AS total_taxes_collected,
        ROUND(SUM(mi.total_amount), 2)::text                                          AS gross_revenue
      FROM monthly_invoices mi
      GROUP BY mi.month_key, mi.month_label, mi.month_num, mi.branch_id, mi.branch_name
      ORDER BY mi.month_key ASC, mi.branch_name ASC;
    `;

    const { rows } = await this.db.query<MonthlyRevenueRow>(sql, [
      branchId ?? null,
      year,
      month ?? null,
    ]);

    return rows;
  }

  /**
   * Report 2: Guest Billing Summary & Unpaid Balances
   * Highlights outstanding balances, debtor aging (>30d, >60d, >90d), and
   * partially paid folios using canonical live `invoices` schema columns.
   *
   * @param branchId  - Optional UUID to scope by branch
   * @param status    - 'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'SETTLED' | null
   * @param agingDays - Minimum aging threshold in days (0 = no filter)
   * @param search    - Free-text search on guest name, booking ref, room number
   */
  async getBillingSummary(
    branchId: string | null,
    status: string | null,
    agingDays: number | null,
    search: string | null,
  ): Promise<BillingSummaryRow[]> {
    const sql = `
      SELECT
        i.invoice_id::text,
        COALESCE(to_jsonb(b)->>'id', b.booking_id::text)                                             AS booking_reference,
        CONCAT(COALESCE(g.first_name, ''), ' ', COALESCE(g.last_name, ''))            AS guest_name,
        g.email                                                                        AS guest_email,
        g.phone                                                                        AS guest_phone,
        br.branch_name,
        STRING_AGG(DISTINCT COALESCE(to_jsonb(rm)->>'number', rm.room_number), ', ')                                           AS room_numbers,
        (COALESCE(i.room_charges, 0) + COALESCE(i.service_charges, 0) - COALESCE(i.discount_amount, 0))::text AS base_amount,
        COALESCE(i.service_charge_tax, 0)::text                                        AS service_charge_tax,
        COALESCE(i.tdl_amount, 0)::text                                                AS tdl_amount,
        COALESCE(i.ssc_amount, 0)::text                                                AS sscl_amount,
        COALESCE(i.vat_amount, 0)::text                                                AS vat_amount,
        COALESCE(i.total_amount, 0)::text                                              AS total_amount,
        COALESCE(SUM(p.amount), 0)::text                                               AS total_paid,
        ROUND(
          COALESCE(i.total_amount, 0)
          - COALESCE(SUM(p.amount), 0),
          2
        )::text                                                                        AS balance_due,
        COALESCE(i.generated_at, CURRENT_TIMESTAMP)::text                              AS invoice_date,
        (CURRENT_DATE - COALESCE(i.generated_at, CURRENT_TIMESTAMP)::date)            AS aging_days,
        CASE
          WHEN (COALESCE(i.total_amount, 0)
                - COALESCE(SUM(p.amount), 0)) <= 0.01
               THEN 'SETTLED'
          WHEN COALESCE(SUM(p.amount), 0) > 0
               THEN 'PARTIALLY_PAID'
          ELSE 'UNPAID'
        END                                                                            AS computed_status
      FROM invoices i
      JOIN booking_rooms bkr
        ON (bkr.booking_room_id::text = i.booking_room_id::text
            OR bkr.booking_id::text = i.booking_room_id::text)
      JOIN bookings b
        ON (b.booking_id::text = bkr.booking_id::text
            OR to_jsonb(b)->>'id' = bkr.booking_id::text)
      JOIN branches br ON br.branch_id::text = b.branch_id::text
      LEFT JOIN rooms rm ON (rm.id::text = bkr.room_id::text OR rm.room_id::text = bkr.room_id::text)
      LEFT JOIN guests g ON (to_jsonb(g)->>'id' = b.booked_by_guest_id::text OR g.guest_id::text = b.booked_by_guest_id::text)
      LEFT JOIN payments p ON p.invoice_id::text = i.invoice_id::text
      WHERE ($1::text IS NULL OR $1 = '' OR b.branch_id::text = $1::text)
        AND ($4::text IS NULL OR (
          g.first_name ILIKE '%' || $4 || '%' OR
          g.last_name  ILIKE '%' || $4 || '%' OR
          to_jsonb(b)->>'id' ILIKE '%' || $4 || '%' OR
          b.booking_id::text ILIKE '%' || $4 || '%' OR
          to_jsonb(rm)->>'number' ILIKE '%' || $4 || '%' OR
          rm.room_number ILIKE '%' || $4 || '%'
        ))
      GROUP BY
        i.invoice_id, to_jsonb(b)->>'id', b.booking_id, g.first_name, g.last_name, g.email, g.phone,
        br.branch_name, i.room_charges, i.service_charges, i.discount_amount, i.service_charge_tax,
        i.tdl_amount, i.ssc_amount, i.vat_amount, i.total_amount, i.generated_at
      HAVING ($2::text IS NULL OR $2 = 'ALL' OR
        ($2 = 'UNPAID'
          AND ROUND(COALESCE(i.total_amount, 0)
                    - COALESCE(SUM(p.amount), 0), 2) > 0.01
          AND COALESCE(SUM(p.amount), 0) = 0)
        OR ($2 = 'PARTIALLY_PAID'
          AND COALESCE(SUM(p.amount), 0) > 0
          AND ROUND(COALESCE(i.total_amount, 0)
                    - COALESCE(SUM(p.amount), 0), 2) > 0.01)
        OR ($2 = 'SETTLED'
          AND ROUND(COALESCE(i.total_amount, 0)
                    - COALESCE(SUM(p.amount), 0), 2) <= 0.01)
      )
      AND ($3::int IS NULL OR
           (CURRENT_DATE - COALESCE(i.generated_at, CURRENT_TIMESTAMP)::date) >= $3::int)
      ORDER BY balance_due DESC, invoice_date DESC;
    `;

    const { rows } = await this.db.query<BillingSummaryRow>(sql, [
      branchId ?? null,
      status && status !== 'ALL' ? status : null,
      agingDays ?? null,
      search ?? null,
    ]);

    return rows;
  }
}
