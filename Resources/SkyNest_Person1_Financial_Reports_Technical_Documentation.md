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
