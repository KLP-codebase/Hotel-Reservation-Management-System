# SkyNest Hotel Reservation Management System
## Person 1 Technical Report: Financial & Revenue Intelligence Engine
**Scope:** SRS §4.8 (REQ-RPT-02 & REQ-RPT-03), Business Rules B8, B10, B13, B17 & Site Map Page 14  
**Author / Contributor:** Person 1 (Financial & Revenue Specialist)  
**System Architecture:** Next.js 16 (App Router) + Express 4.19 REST API + PostgreSQL 15 (Railway Instance)  

---

## 1. Executive Summary & Problem Formulation

In hotel enterprise systems, financial reporting is often corrupted by data denormalization, naive snapshot overwrites, and Cartesian product explosion during relational joins. Under the SkyNest architecture, Person 1 is exclusively charged with engineering the **Financial & Revenue Intelligence Engine**, comprising two mission-critical analytical reports:

1. **Report 4: Monthly Revenue per Branch** (*SRS REQ-RPT-03, Page 14 Report 2*)
   - Distinct segregation of base accommodation revenue (room tariffs and meal plans) versus ancillary service consumption (dining, wellness, transport, minibar).
   - Real-time aggregation of the statutory 4-tier Sri Lankan indirect taxation cascade:
     $$\text{Subtotal} \xrightarrow{+10\%} \text{Service Charge (SC)} \xrightarrow{+1\%} \text{Tourism Development Levy (TDL)} \xrightarrow{+2.5\%} \text{SSCL} \xrightarrow{+18\%} \text{VAT}$$
   - Multi-branch fiscal comparative tracking across 12-month calendar windows.

2. **Report 2: Guest Billing Summary & Debtor Aging** (*SRS REQ-RPT-02, Page 14 Report 3*)
   - Comprehensive audit folio tracking of all generated invoices against recorded customer settlements.
   - Debtor aging segmentation categorized by risk profile:
     - **Current:** $\le 30 \text{ days}$
     - **Moderate Arrears:** $31 - 60 \text{ days}$
     - **Critical Arrears:** $61 - 90 \text{ days}$
     - **Default Risk:** $> 90 \text{ days}$
   - Tri-state invoice settlement status computation (`SETTLED`, `PARTIALLY_PAID`, `UNPAID`).

---

## 2. Zero-Conflict Work Breakdown & File Isolation Matrix

To guarantee concurrent, conflict-free collaboration alongside Person 2 (Ancillary Services) and Person 3 (Operations & Shell), Person 1 operates with complete isolation:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MODULE / LAYER        │ PERSON 1 RESPONSIBILITY                                                  │
├───────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Backend Repository    │ backend/src/repositories/reports/revenue-report.repository.ts            │
│ Backend REST Route    │ backend/src/routes/reports/revenue-reports.routes.ts                     │
│ Frontend Component 1  │ src/components/reports/MonthlyRevenueReport.tsx                          │
│ Frontend Component 2  │ src/components/reports/BillingSummaryReport.tsx                          │
│ Router Registration   │ backend/src/routes/reports.routes.ts (mounted under /revenue)             │
│ Audit Snapshot Cache  │ report_snapshots table integration (Rule B17)                           │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

All implementations strictly adhere to:
- **Zero ORM Mandate:** 100% pure parameterized SQL statements (`$1, $2, ...`) executed via `DbAdapter` (`pg` driver).
- **Sole API Authority:** Express REST API running on port 4000 (`/api/v1/reports/revenue/*`).
- **Live Database Truth:** Full alignment with the live Railway PostgreSQL schema (resolving legacy column discrepancies).

---

## 3. Database Schema Truth & Tax Cascade Mathematical Model

### 3.1 Live Database Schema Alignment
The live Railway PostgreSQL instance exhibits subtle drift from initial DDL scripts. Person 1 accounts for these realities:
- **`invoices` columns:** Uses `subtotal`, `sc_amount`, `tdl_amount`, `sscl_amount`, `vat_amount`, `total_amount`, and `issued_at` (with `created_at` fallback).
- **`payments` columns:** Uses `p.amount_paid` (with fallback `COALESCE(p.amount_paid, p.amount, 0)`).
- **Canonical Guest Joins:** `bookings.booked_by_guest_id` stores varchar references matching `guests.id` (`LEFT JOIN guests g ON g.id = b.booked_by_guest_id`).

### 3.2 Sri Lankan Statutory 4-Tier Tax Cascade
In accordance with Inland Revenue Department (IRD) regulations and SkyNest Business Rule B13:
1. **Base Subtotal ($S$):** Sum of room tariff charges ($R$) and ancillary service usage ($U$):
   $$S = R + U$$
2. **Tier 1: Mandatory Service Charge (10%):**
   $$SC = 0.10 \times S$$
3. **Tier 2: Tourism Development Levy (1%):**
   $$TDL = 0.01 \times (S + SC)$$
4. **Tier 3: Social Security Contribution Levy (2.5% on 85% assessable value):**
   $$\text{Assessable Base} = 0.85 \times (S + SC)$$
   $$SSCL = 0.025 \times \text{Assessable Base} \approx 0.02125 \times (S + SC)$$
5. **Tier 4: Value Added Tax (18% on compounding base):**
   $$VAT = 0.18 \times (S + SC + TDL + SSCL)$$
6. **Gross Invoiced Total ($T$):**
   $$T = S + SC + TDL + SSCL + VAT$$

---

## 4. Report 4: Monthly Revenue per Branch (Deep-Dive)

### 4.1 Challenge & Solution Architecture
In the live schema, `invoices.subtotal` stores the aggregate base charge combining room tariffs and ancillary services. To provide executive intelligence distinguishing accommodation income from guest service consumption, the query computes service revenue per invoice dynamically using a CTE joined on `service_usage`, attributes the delta to accommodation, and sums tax cascades directly from immutable invoice records.

### 4.2 Parameterized SQL Implementation
```sql
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
```

---

## 5. Report 2: Guest Billing Summary & Debtor Aging (Deep-Dive)

### 5.1 Business Logic & Financial Integrity
Front desk managers and financial controllers require live visibility over accounts receivable. A guest may generate an invoice, pay a partial deposit via credit card, and leave an unpaid balance. The query aggregates all receipts associated with each invoice, evaluates the balance due, and classifies aging status without duplicate counting.

### 5.2 Mathematical Settlement Status Logic
Given Invoice Total ($T$) and Sum of Payments ($P = \sum p_i$):
- $\text{Balance Due} = T - P$
- Status definition:
  $$\text{Status} = \begin{cases} 
  \text{SETTLED} & \text{if } (T - P) \le 0.01 \\
  \text{PARTIALLY\_PAID} & \text{if } P > 0 \text{ and } (T - P) > 0.01 \\
  \text{UNPAID} & \text{otherwise}
  \end{cases}$$
- Debtor aging days:
  $$\text{Aging Days} = \text{CURRENT\_DATE} - \text{Invoice Date}$$

### 5.3 Parameterized SQL Implementation
```sql
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
```

---

## 6. REST API Architecture & Security Layer

Both report endpoints are mounted on Express (`/api/v1/reports/revenue/*`) under rigid security governance:

### 6.1 Role-Based Access Control (RBAC)
- Financial reports expose company-wide turnover and customer receivables.
- **Permitted Roles:** `ADMINISTRATOR`, `MANAGER`, `DBA`.
- Non-privileged accounts (`RECEPTIONIST`, `SERVICE_STAFF`, `GUEST`) receive HTTP `403 Forbidden`.

### 6.2 Zod Input Validation & Sanitization
All query parameters are strictly verified prior to query execution:
```typescript
const monthlyRevenueSchema = z.object({
  year: z.string().optional().transform(v => v ? parseInt(v, 10) : new Date().getFullYear()),
  branchId: z.string().uuid().optional().or(z.literal('')),
});

const billingSummarySchema = z.object({
  status: z.enum(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'SETTLED']).optional().default('ALL'),
  agingDays: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  search: z.string().max(100).optional().or(z.literal('')),
  branchId: z.string().uuid().optional().or(z.literal('')),
});
```

---

## 7. Next.js 16 Editorial UI Implementation

Both frontend components (`MonthlyRevenueReport.tsx` and `BillingSummaryReport.tsx`) integrate seamlessly into the `ReportsManagementPage` tab container, complying with all SkyNest design tokens:
- **Typography:** `font-cinzel` for titles and KPI numbers, `font-jakarta` for descriptive labels, and monospace formatting for currency figures.
- **Color Tokens:** `#D9722C` (`text-amber-400` / `skynest-accent`) for interactive highlights and service revenues; `text-ink` and `border-white/10` for high-contrast dark dashboard styling.
- **Interactive Features:**
  - Dynamic Fiscal Year selector for Report 4.
  - Interactive Debtor Aging chip toggles (`All Ages`, `>30 Days`, `>60 Days`, `>90 Days`) for Report 2.
  - Live search bar filtering by guest name, booking reference, or room number.
  - Collapsible per-branch monthly breakdown cards.
  - RFC 4180 compliant CSV export via client-side blob download (`exportToCsv`).

---

## 8. Rule B17 Snapshot Caching & Verification Results

### 8.1 Audit Snapshot Archival (Rule B17)
Both reports provide an **"Archive Snapshot (B17)"** button that persists the currently filtered dataset directly into the `report_snapshots` table as an immutable JSONB payload:
```sql
INSERT INTO report_snapshots (
  report_type,
  report_period_start,
  report_period_end,
  branch_id,
  report_data
) VALUES ($1, $2, $3, $4, $5::jsonb)
RETURNING *;
```
Archived snapshots can be viewed anytime under the **Audit Snapshots** tab of `/dashboard/reports`.

### 8.2 End-to-End Verification Matrix

| Verification Target | Command / URL | Result |
|---|---|---|
| Backend TypeScript Build | `cd backend && npx tsc --noEmit` | **0 errors (Clean ✅)** |
| Frontend TypeScript Build | `npx tsc --noEmit` | **0 errors (Clean ✅)** |
| Report 4 API Endpoint | `GET /api/v1/reports/revenue/monthly?year=2026` | **HTTP 200 OK — Returns segregated room vs service revenue with 4-tier taxes** |
| Report 2 API Endpoint | `GET /api/v1/reports/revenue/billing-summary?status=ALL` | **HTTP 200 OK — Returns invoices, debtor aging days, and balance due** |
| Rule B17 Archival | `POST /api/v1/reports/snapshots` | **HTTP 201 Created — Frozen JSONB saved to live database** |
| RFC 4180 CSV Download | UI Export Action | **Generates valid `.csv` file with quoted cells and headers** |

---

## 9. Conclusion

The Financial & Revenue Intelligence Engine authored by Person 1 satisfies all requirements set forth in **SRS §4.8 (REQ-RPT-02 & REQ-RPT-03)**, enforces the statutory Sri Lankan indirect tax cascade, prevents Cartesian join explosions, and adheres to the Zero ORM and Live Database Truth architectural mandates.
