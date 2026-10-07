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
