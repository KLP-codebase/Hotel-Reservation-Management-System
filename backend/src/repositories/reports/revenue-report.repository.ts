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

export interface BillingSummaryRow {
  invoice_id: string;
  booking_reference: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  branch_name: string;
  room_numbers: string | null;
  base_amount: string;
  service_charge_tax: string;
  tdl_amount: string;
  sscl_amount: string;
  vat_amount: string;
  total_amount: string;
  total_paid: string;
  balance_due: string;
  invoice_date: string;
  aging_days: number;
  computed_status: 'SETTLED' | 'PARTIALLY_PAID' | 'UNPAID';
}

// ── Repository ────────────────────────────────────────────────────────────────

export class RevenueReportRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * Report 4: Monthly Revenue per Branch
   * Dynamically segregates room tariff vs service revenue. Since live `invoices`
   * stores a combined `subtotal`, service revenue is summed from `service_usage`
   * and the remainder is attributed to room charges. The 4-tier Sri Lankan tax
   * cascade (SC → TDL → SSCL → VAT) is extracted directly from `invoices`.
   *
   * @param branchId - Optional UUID to filter a single branch (null = all branches)
   * @param year     - 4-digit fiscal year (e.g. 2026)
   */
  async getMonthlyRevenue(
    branchId: string | null,
    year: number,
  ): Promise<MonthlyRevenueRow[]> {
    const sql = `
      WITH monthly_invoices AS (
        SELECT
          i.invoice_id,
          i.booking_room_id,
          b.branch_id,
          br.branch_name,
          TO_CHAR(COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP), 'YYYY-MM') AS month_key,
          TO_CHAR(COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP), 'Mon YYYY') AS month_label,
          EXTRACT(MONTH FROM COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP)) AS month_num,
          COALESCE(i.subtotal, 0)       AS subtotal,
          COALESCE(i.sc_amount, 0)      AS sc_amount,
          COALESCE(i.tdl_amount, 0)     AS tdl_amount,
          COALESCE(i.sscl_amount, 0)    AS sscl_amount,
          COALESCE(i.vat_amount, 0)     AS vat_amount,
          COALESCE(i.total_amount, 0)   AS total_amount
        FROM invoices i
        JOIN booking_rooms bkr
          ON (bkr.booking_room_id = i.booking_room_id
              OR bkr.booking_id::text = i.booking_room_id::text)
        JOIN bookings b
          ON (b.booking_id = bkr.booking_id
              OR b.id = bkr.booking_id::text)
        JOIN branches br ON br.branch_id = b.branch_id
        WHERE ($1::uuid IS NULL OR br.branch_id = $1::uuid)
          AND EXTRACT(YEAR FROM COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP)) = $2::int
      ),
      service_totals_per_invoice AS (
        SELECT
          mi.invoice_id,
          COALESCE(SUM(su.quantity * su.price_at_usage), 0) AS service_revenue
        FROM monthly_invoices mi
        LEFT JOIN service_usage su ON su.booking_room_id = mi.booking_room_id
        GROUP BY mi.invoice_id
      )
      SELECT
        mi.month_key,
        mi.month_label,
        mi.branch_id::text                                                             AS branch_id,
        mi.branch_name,
        ROUND(SUM(GREATEST(0, mi.subtotal - st.service_revenue)), 2)::text            AS total_room_revenue,
        ROUND(SUM(st.service_revenue), 2)::text                                       AS total_service_revenue,
        ROUND(SUM(mi.subtotal), 2)::text                                              AS subtotal_base_revenue,
        ROUND(SUM(mi.sc_amount + mi.tdl_amount + mi.sscl_amount + mi.vat_amount), 2)::text
                                                                                       AS total_taxes_collected,
        ROUND(SUM(mi.total_amount), 2)::text                                          AS gross_revenue
      FROM monthly_invoices mi
      JOIN service_totals_per_invoice st ON st.invoice_id = mi.invoice_id
      GROUP BY mi.month_key, mi.month_label, mi.month_num, mi.branch_id, mi.branch_name
      ORDER BY mi.month_key ASC, mi.branch_name ASC;
    `;

    const { rows } = await this.db.query<MonthlyRevenueRow>(sql, [
      branchId ?? null,
      year,
    ]);

    return rows;
  }

  /**
   * Report 2: Guest Billing Summary & Unpaid Balances
   * Highlights outstanding balances, debtor aging (>30d, >60d, >90d), and
   * partially paid folios using the canonical `guests.id` join and
   * live `invoices` column names (subtotal, sc_amount, amount_paid).
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
        COALESCE(b.id, b.booking_id::text)                                             AS booking_reference,
        CONCAT(COALESCE(g.first_name, ''), ' ', COALESCE(g.last_name, ''))            AS guest_name,
        g.email                                                                        AS guest_email,
        g.phone                                                                        AS guest_phone,
        br.branch_name,
        STRING_AGG(DISTINCT rm.number, ', ')                                           AS room_numbers,
        COALESCE(i.subtotal, 0)::text                                                  AS base_amount,
        COALESCE(i.sc_amount, 0)::text                                                 AS service_charge_tax,
        COALESCE(i.tdl_amount, 0)::text                                                AS tdl_amount,
        COALESCE(i.sscl_amount, 0)::text                                               AS sscl_amount,
        COALESCE(i.vat_amount, 0)::text                                                AS vat_amount,
        COALESCE(i.total_amount, 0)::text                                              AS total_amount,
        COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0)::text                  AS total_paid,
        ROUND(
          COALESCE(i.total_amount, 0)
          - COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0),
          2
        )::text                                                                        AS balance_due,
        COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP)::text                  AS invoice_date,
        (CURRENT_DATE - COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP)::date) AS aging_days,
        CASE
          WHEN (COALESCE(i.total_amount, 0)
                - COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0)) <= 0.01
               THEN 'SETTLED'
          WHEN COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0) > 0
               THEN 'PARTIALLY_PAID'
          ELSE 'UNPAID'
        END                                                                            AS computed_status
      FROM invoices i
      JOIN booking_rooms bkr
        ON (bkr.booking_room_id = i.booking_room_id
            OR bkr.booking_id::text = i.booking_room_id::text)
      JOIN bookings b
        ON (b.booking_id = bkr.booking_id
            OR b.id = bkr.booking_id::text)
      JOIN branches br ON br.branch_id = b.branch_id
      LEFT JOIN rooms rm ON rm.id = bkr.room_id
      LEFT JOIN guests g ON g.id = b.booked_by_guest_id
      LEFT JOIN payments p ON p.invoice_id = i.invoice_id
      WHERE ($1::uuid IS NULL OR b.branch_id = $1::uuid)
        AND ($4::text IS NULL OR (
          g.first_name ILIKE '%' || $4 || '%' OR
          g.last_name  ILIKE '%' || $4 || '%' OR
          b.id         ILIKE '%' || $4 || '%' OR
          b.booking_id::text ILIKE '%' || $4 || '%' OR
          rm.number    ILIKE '%' || $4 || '%'
        ))
      GROUP BY
        i.invoice_id, b.id, b.booking_id, g.first_name, g.last_name, g.email, g.phone,
        br.branch_name, i.subtotal, i.sc_amount, i.tdl_amount, i.sscl_amount, i.vat_amount,
        i.total_amount, i.issued_at, i.created_at
      HAVING ($2::text IS NULL OR $2 = 'ALL' OR
        ($2 = 'UNPAID'
          AND ROUND(COALESCE(i.total_amount, 0)
                    - COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0), 2) > 0.01
          AND COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0) = 0)
        OR ($2 = 'PARTIALLY_PAID'
          AND COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0) > 0
          AND ROUND(COALESCE(i.total_amount, 0)
                    - COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0), 2) > 0.01)
        OR ($2 = 'SETTLED'
          AND ROUND(COALESCE(i.total_amount, 0)
                    - COALESCE(SUM(COALESCE(p.amount_paid, p.amount, 0)), 0), 2) <= 0.01)
      )
      AND ($3::int IS NULL OR
           (CURRENT_DATE - COALESCE(i.issued_at, i.created_at, CURRENT_TIMESTAMP)::date) >= $3::int)
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
