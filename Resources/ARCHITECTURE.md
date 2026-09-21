# Sky Nest Hotel Reservation & Guest Services Management System (HRGSMS)
## System Architecture & Technical Design Specification

> **Document Type:** Production System Architecture & Engineering Specification  
> **Academic Standard:** IEEE Std 830-1998 (SRS) & 3NF/BCNF Relational Database Architecture  
> **Client Organization:** SkyNest Hotels (Pvt) Ltd (Colombo, Kandy, Galle Branches)  
> **Project Context:** University 3rd Semester Database Systems Project — Group 40  
> **Target Environment:** Local Docker Compose / Railway Cloud Production  
> **Version:** 1.0 (Production Release)  

---

## 1. Executive Summary & Architectural Tenets

The **Sky Nest Hotel Reservation and Guest Services Management System (HRGSMS)** is an enterprise-grade multi-branch hotel management platform engineered for SkyNest Hotels (Pvt) Ltd. The system unifies guest reservations, front-desk operations, room inventory management, ancillary guest service billing, and executive analytics across three luxury hotel properties in Sri Lanka:
1. **Colombo Sky Tower** (Flagship urban luxury high-rise)
2. **Kandy Misty Peak** (Hill-country wellness retreat)
3. **Galle Coastal Villa** (Colonial seaside heritage resort)

The system replaces legacy fragmented software and manual ledgers, resolving historic challenges in overbooking, race conditions during high-demand booking windows, inaccurate multi-tier statutory tax computations, and billing delays at check-out.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                FIVE ARCHITECTURAL TENETS                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. DATABASE-FIRST INTEGRITY (ZERO ORM)                                                 │
│    PostgreSQL 15 is the single authoritative source of truth. Integrity rules, date   │
│    exclusion constraints, immutable pricing snapshots, and tax calculation cascades   │
│    are enforced natively in SQL. Node.js interacts via raw SQL using the pg driver.     │
│                                                                                        │
│ 2. STRICT 3NF / BCNF NORMALIZATION WITH HISTORICAL SNAPSHOTS                           │
│    All 17 relations satisfy Boyce-Codd Normal Form. Historical financial integrity is  │
│    preserved by freezing rates at transaction time (rate_at_booking, price_at_usage,   │
│    and frozen invoice line items) to withstand future tariff/tax adjustments.          │
│                                                                                        │
│ 3. CLEAN DECOUPLED N-TIER ARCHITECTURE                                                 │
│    Clean separation between Presentation (Next.js 16), Application/Domain (Express 4   │
│    REST API), and Persistence (PostgreSQL 15).                                         │
│                                                                                        │
│ 4. SINGLE AUTHORITATIVE REST BACKEND                                                   │
│    The Express backend on port 4000 serves as the exclusive API surface (SI-01). The   │
│    Next.js frontend connects directly via NEXT_PUBLIC_API_URL, eliminating redundant   │
│    Next.js route handlers.                                                             │
│                                                                                        │
│ 5. EDITORIAL LUXURY DESIGN SYSTEM                                                      │
│    A bespoke design language combining Cinzel display serif typography, Plus Jakarta   │
│    Sans UI typography, a burnt orange accent (#D9722C), and GSAP ScrollTrigger motion  │
│    orchestration, matching high-end international hospitality standards.               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. High-Level System Architecture & Network Topology

The system implements a classic **N-Tier Architecture** distributed across decoupled processes and containers:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT / CONSUMER TIER                                     │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌────────────────────────┐  │
│  │     Unregistered Guest      │ │   Registered Guest (Portal) │ │ Front Desk Receptionist│  │
│  │ (Search, Real-Time Booking) │ │ (Profile, Stay History, PDF)│ │(Check-in/out, Payments)│  │
│  └──────────────┬──────────────┘ └──────────────┬──────────────┘ └───────────┬────────────┘  │
└─────────────────┼───────────────────────────────┼────────────────────────────┼───────────────┘
                  │                               │                            │
                  ▼                               ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION TIER (Next.js 16 / React 19)                         │
│                                Port 3000 · Railway / Local Host                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ App Router: (auth), /dashboard/(management), /book, /book/confirm                      │  │
│  │ Design System: Tailwind CSS v4, Cinzel Serif Display, Plus Jakarta Sans Body           │  │
│  │ Motion Engine: GSAP 3.12 + ScrollTrigger, Lenis Smooth Scroll                           │  │
│  │ API Client: Direct fetch to Express REST API via NEXT_PUBLIC_API_URL                   │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼────────────────────────────────────────────┘
                                                  │ HTTPS / JSON (REST API Contract v1)
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                             APPLICATION TIER (Node.js 20 / Express 4)                        │
│                                Port 4000 · Railway / Local Host                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Chain of Responsibility Middleware Pipeline:                                           │  │
│  │ CORS (3000) ──> express.json() ──> JWT Auth Guard ──> RBAC Gate ──> Zod Validator     │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Domain Route Controllers:                                                              │  │
│  │ /auth, /staff, /branches, /rooms, /guests, /availability, /bookings, /billing, /reports│  │
│  ├────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Repository Layer (Clean Architecture & Data Decoupling):                               │  │
│  │ BaseRepository<T>, GuestRepository, AvailabilityRepository, BookingRepository, etc.    │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Database Client Adapter (Singleton Pattern):                                           │  │
│  │ ResilientPgAdapter wrapping pg.Pool with auto-failover and transaction manager         │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼────────────────────────────────────────────┘
                                                  │ PostgreSQL Wire Protocol (Port 5432, Raw SQL)
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                               PERSISTENCE TIER (PostgreSQL 15)                               │
│                         Port 5432 · Railway Managed DB / Docker Alpine                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 17 Relational Tables (Strict 3NF / BCNF Normalization)                                 │  │
│  │ Concurrency Engine: pg_advisory_xact_lock (Room-Type) + GiST EXCLUDE (Physical Room)   │  │
│  │ Stored Functions: fn_check_room_availability(p_room_id, check_in, check_out)           │  │
│  │ Stored Procedures: sp_generate_final_bill (4-Tier Sri Lankan Statutory Tax Cascade)    │  │
│  │ Relational Views: v_booking_details (6-Table Denormalized Projector)                   │  │
│  │ Audit Engine: Mutation Triggers on bookings/invoices feeding change_log (JSONB)        │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Relational Database Architecture (PostgreSQL 15)

The database schema consists of **17 normalized relations** engineered to enforce referential integrity, historical price invariance, and conflict prevention at the database level.

### 3.1 Entity-Relationship Topology

```
branches (branch_id [PK], branch_name, city, address, phone, email, is_active)
  │
  ├──< rooms (room_id [PK], branch_id [FK], room_type_id [FK], room_number, floor, status)
  │      ▲
  │      │ (Physical room assigned at Check-In)
  ├──< staff (staff_id [PK], branch_id [FK], first_name, last_name, email, phone, role)
  │      ▲
  │      │ (1:1 Link)
  │    user_accounts (account_id [PK], username, password_hash, account_type, staff_id [FK], guest_id [FK])
  │      │
  │      ▼ (1:1 Link)
  └──< guests (guest_id [PK], id [legacy varchar], first_name, last_name, email, phone, created_at)
         ▲
         │ (Booker / Primary Guest — see drift warning below)
         ├──< bookings (booking_id [PK], branch_id [FK], booked_by_guest_id [FK], booked_by_staff_id [FK], status, notes)
         │      │
         │      └──< booking_rooms (booking_room_id [PK], booking_id [FK], primary_guest_id [FK], room_type_id [FK],
         │             │            room_id [FK, NULLABLE], plan_id [FK], check_in_date, check_out_date,
         │             │            rate_at_booking [FROZEN], status)
         │             │
         │             ├──< accompanying_guests (verification_id [PK], booking_room_id [FK], first_name, last_name, id_passport_no, is_verified)
         │             ├──< service_usage (usage_id [PK], booking_room_id [FK], service_id [FK], quantity, price_at_usage [FROZEN])
         │             └──── invoices (invoice_id [PK], booking_room_id [FK, UNIQUE], room_charges, service_charges,
         │                     │        service_charge_tax, tdl_amount, ssc_amount, vat_amount, total_amount, status)
         │                     │
         │                     └──< payments (payment_id [PK], invoice_id [FK], amount, payment_date, payment_method, reference_number)
         │
room_types (room_type_id [PK], type_name, base_daily_rate, capacity, description)
meal_plans (plan_id [PK], plan_name, description, price_per_night)
service_catalogue (service_id [PK], branch_id [FK], service_name, category, base_price)
tax_configurations (tax_id [PK], tax_name, tax_percentage, is_active, effective_from, effective_to)
report_snapshots (snapshot_id [PK], report_type, report_period_start, report_period_end, branch_id [FK], report_data [JSONB])
change_log (log_id [PK], table_name, record_id, action, old_data [JSONB], new_data [JSONB], changed_at)
```

> ### ⚠️ Live Schema Drift (verified against Railway, 2026-09-17)
>
> The diagram above is the **designed** model. The live database differs in ways that will break
> queries written from the diagram alone. **Trust the live database.**
>
> 1. **`guests` has two identity columns.** `guest_id` (`uuid`, the real PK) and `id`
>    (`varchar`, legacy but still populated).
> 2. **`bookings.booked_by_guest_id` is `varchar` and references `guests.id`** — *not*
>    `guests.guest_id`, despite the `REFERENCES guests(guest_id)` declaration in `init.sql`.
>    - Correct: `LEFT JOIN guests g ON g.id = b.booked_by_guest_id`
>    - Fails with `operator does not exist: uuid = character varying`:
>      `... ON g.guest_id = b.booked_by_guest_id`
>    - Casting also fails — seed rows hold values like `'GST-COL-001'`, so `::uuid` raises
>      `invalid input syntax for type uuid`. One bad value fails the entire query.
> 3. **`booking_rooms.primary_guest_id` and `booking_rooms.room_id` are `varchar`**, not `uuid`/`int`.
> 4. **18 tables exist live**, not 17 — including legacy duplicates `users`/`user_accounts` and
>    `bills`/`invoices`. Confirm which one holds data before joining.
> 5. **Live views:** `v_booking_details`, `v_active_accounts`, `v_staff_details`,
>    `v_admin_audit_activity`. `v_booking_details` uses an **INNER JOIN**, so a booking with zero
>    rooms returns `null` — fall back to the `bookings` table to tell "no rooms yet" apart from
>    "does not exist".

---

### 3.2 The 17 Fundamental Business Rules (B1 to B17)

Every architectural decision and schema constraint directly implements one of the 17 business rules:

| Rule Code | Formal Business Rule | Database Enforcement Mechanism |
|---|---|---|
| **B1** | Multi-branch scoping across Colombo, Kandy, and Galle | `rooms.branch_id` and `service_catalogue.branch_id` Foreign Keys with `ON DELETE RESTRICT` |
| **B2** | Tariff rate is defined on the Room Type, not on individual physical rooms | `room_types.base_daily_rate NUMERIC(10,2)` acts as the master tariff catalogue |
| **B3** | Physical room assignment occurs at check-in, not booking time | `booking_rooms.room_id` is defined as `NULLABLE`; physical key assignment happens at front desk |
| **B4** | One master booking can encapsulate multiple room stays | `bookings` (1) has a 1-to-many relationship with `booking_rooms` (N) |
| **B5** | Each room reservation requires a designated primary guest | `booking_rooms.primary_guest_id` FK referencing `guests(guest_id)` |
| **B6** | Accompanying guests must be registered and verified with ID/Passport | `accompanying_guests` table with `id_passport_no` and `is_verified BOOLEAN` |
| **B7** | Meal plan choice is selected independently per room stay | `booking_rooms.plan_id` FK referencing `meal_plans(plan_id)` |
| **B8** | Room tariff is permanently frozen at the moment of reservation | `booking_rooms.rate_at_booking NUMERIC(10,2)` immutable column copied from `room_types` |
| **B9** | Chargeable guest services are tracked against specific room stays | `service_usage.booking_room_id` FK referencing `booking_rooms` |
| **B10** | Service unit price is permanently frozen at the moment of consumption | `service_usage.price_at_usage NUMERIC(10,2)` immutable column copied from `service_catalogue` |
| **B11** | One consolidated invoice is generated per room stay | `invoices.booking_room_id` with a `UNIQUE` constraint enforcing a strict 1:1 relationship |
| **B12** | Partial and multi-tranche payments are permitted against invoices | `payments` table referencing `invoices(invoice_id)` via a 1:N relationship |
| **B13** | Statutory tax rates are versioned with effective date intervals | `tax_configurations` with `effective_from` and `effective_to` columns |
| **B14** | Role-Based Access Control governs staff permissions | `staff.role` `CHECK (role IN ('RECEPTIONIST', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'))` |
| **B15** | Bookings can be initiated by guests (online) or staff (walk-in) | `bookings` contains both `booked_by_guest_id` and `booked_by_staff_id` (at least one must be non-null) |
| **B16** | All state mutations must maintain an immutable audit trail | `change_log` table populated via PostgreSQL triggers storing old/new states as `JSONB` |
| **B17** | Executive management reports must be cached as immutable snapshots | `report_snapshots` storing pre-computed analytical results in `report_data JSONB` |

---

### 3.3 Database Constraints & Integrity Safeguards

1. **Physical Room Double-Booking Guard (`btree_gist`):**
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;

   ALTER TABLE booking_rooms
       ADD CONSTRAINT no_double_booking
       EXCLUDE USING gist (
           room_id WITH =,
           daterange(check_in_date, check_out_date, '[)') WITH &&
       )
       WHERE (status <> 'CANCELLED');
   ```
   *Behavior:* Any concurrent or out-of-order transaction attempting to assign an already-occupied physical room to an overlapping date range will be rejected immediately by PostgreSQL with error code `23P01 (exclusion_violation)`.

2. **Date Order Validation:**
   ```sql
   ALTER TABLE booking_rooms
       ADD CONSTRAINT chk_stay_dates CHECK (check_out_date > check_in_date);
   ```

3. **Performance Indexes:**
   ```sql
   CREATE INDEX idx_bookings_branch    ON bookings(branch_id);
   CREATE INDEX idx_bookings_guest     ON bookings(booked_by_guest_id);
   CREATE INDEX idx_bookings_status    ON bookings(status);
   CREATE INDEX idx_brooms_booking     ON booking_rooms(booking_id);
   CREATE INDEX idx_brooms_room        ON booking_rooms(room_id);
   CREATE INDEX idx_brooms_dates       ON booking_rooms(check_in_date, check_out_date);
   CREATE INDEX idx_brooms_status      ON booking_rooms(status);
   CREATE INDEX idx_guests_email       ON guests(email);
   CREATE INDEX idx_service_usage_room ON service_usage(booking_room_id);
   CREATE INDEX idx_invoices_status    ON invoices(status);
   ```

---

## 4. Concurrency & Race Condition Architecture

Hotel reservation platforms encounter race conditions primarily at two distinct phases of the booking lifecycle:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TWO-TIER CONCURRENCY CONTROL ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: ROOM-TYPE CAPACITY BOOKING (Guest Online / Walk-In Placement)                 │
│ • State: Physical room is NOT yet assigned (room_id = NULL per Rule B3).               │
│ • Threat: Two concurrent guests booking the last available Deluxe room simultaneously. │
│ • Solution: PostgreSQL Transaction Advisory Lock + Live Overlap Capacity Query.        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: PHYSICAL ROOM ASSIGNMENT (Front Desk Check-In)                                │
│ • State: Front desk receptionist assigns a specific room number (e.g. Room 304).       │
│ • Threat: Two receptionists simultaneously allocating Room 304 to different guests.    │
│ • Solution: PostgreSQL GiST Exclusion Constraint (no_double_booking).                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Why Alternative Concurrency Strategies Were Rejected
- **Inventory Counter Table (`available_rooms_count` column):** Rejected. Introducing an inventory counter creates duplicate mutable state that easily drifts from the true room count derivable from `rooms` and `booking_rooms`.
- **Global `SERIALIZABLE` Isolation:** Rejected. Executing every public booking under `SERIALIZABLE` introduces heavy CPU overhead, write amplification, and serialization failure retry loops (`40001`) under high concurrent traffic.

### 4.2 Phase 1: Room-Type Capacity Concurrency (Advisory Lock Pattern)
When placing a booking, the backend serializes only requests targeting the same branch and room type using a transaction-scoped advisory lock:

```sql
BEGIN;

-- 1. Serialize concurrent attempts for this specific branch and room type
SELECT pg_advisory_xact_lock(hashtext(p_branch_id::text || ':' || p_room_type_id::text));

-- 2. Calculate true instantaneous capacity vs active overlapping reservations
WITH capacity AS (
  SELECT count(*) AS total_rooms
  FROM rooms
  WHERE branch_id = p_branch_id
    AND room_type_id = p_room_type_id
    AND status <> 'MAINTENANCE'
),
reserved AS (
  SELECT count(*) AS taken
  FROM booking_rooms
  WHERE room_type_id = p_room_type_id
    AND status <> 'CANCELLED'
    AND check_in_date < p_check_out
    AND check_out_date > p_check_in
)
SELECT total_rooms, taken FROM capacity, reserved;

-- 3. Application logic checks: (total_rooms - taken) >= requested_rooms
-- If TRUE:
--   INSERT INTO booking_rooms (..., room_id = NULL, rate_at_booking = base_daily_rate, status = 'CONFIRMED');
-- If FALSE:
--   ROLLBACK and return HTTP 409 Conflict ("Room type fully committed for selected dates").

COMMIT; -- Advisory lock automatically releases at transaction end
```

---

## 5. Billing, Taxation & Financial Settlement Engine

SkyNest Hotels operates under Sri Lankan tourism and fiscal legislation, requiring a strictly ordered 4-tier statutory tax cascade.

### 5.1 The 4-Tier Sri Lankan Tax Cascade Formula

$$\text{Base Billable} = (\text{Rate at Booking} \times \text{Nights}) + \sum (\text{Quantity} \times \text{Price at Usage})$$

$$\text{Service Charge (SC)} = \text{Base Billable} \times 10.00\%$$

$$\text{Tourism Development Levy (TDL)} = \text{Base Billable} \times 1.00\%$$

$$\text{Social Security Contribution Levy (SSCL)} = \text{Base Billable} \times 2.50\%$$

$$\text{Value Added Tax (VAT)} = (\text{Base Billable} + \text{TDL} + \text{SSCL}) \times 18.00\%$$

$$\mathbf{\text{Grand Total}} = \text{Base Billable} + \text{SC} + \text{TDL} + \text{SSCL} + \text{VAT}$$

> **Important Fiscal Note:** Under Inland Revenue Department (IRD) Sri Lanka regulations:
> - Service Charge (10%) is distributed to hotel staff and is **exempt from VAT**.
> - VAT (18%) is levied on the **Base Billable + TDL + SSCL** compound base.

---

### 5.2 Stored Procedure: `sp_generate_final_bill`

Implemented in [`database/procedures/sp_Generate_Final_Bill.sql`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/database/procedures/sp_Generate_Final_Bill.sql):

```sql
CREATE OR REPLACE FUNCTION sp_generate_final_bill(p_booking_room_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_nights           INT;
  v_rate             NUMERIC(10,2);
  v_room_charges     NUMERIC(12,2);
  v_service_charges  NUMERIC(12,2);
  v_base             NUMERIC(12,2);
  v_sc_pct           NUMERIC(5,2);
  v_tdl_pct          NUMERIC(5,2);
  v_sscl_pct         NUMERIC(5,2);
  v_vat_pct          NUMERIC(5,2);
  v_sc_amt           NUMERIC(12,2);
  v_tdl_amt          NUMERIC(12,2);
  v_sscl_amt         NUMERIC(12,2);
  v_vat_amt          NUMERIC(12,2);
  v_total            NUMERIC(12,2);
  v_invoice_id       UUID;
BEGIN
  -- 1. Compute room charges from frozen booking snapshot (Rule B8)
  SELECT (check_out_date - check_in_date), rate_at_booking
    INTO v_nights, v_rate
  FROM booking_rooms
  WHERE booking_room_id = p_booking_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking room stay % not found', p_booking_room_id;
  END IF;

  v_room_charges := GREATEST(v_nights, 1) * v_rate;

  -- 2. Compute billable services from frozen consumption prices (Rule B10)
  SELECT COALESCE(SUM(quantity * price_at_usage), 0)
    INTO v_service_charges
  FROM service_usage
  WHERE booking_room_id = p_booking_room_id;

  v_base := v_room_charges + v_service_charges;

  -- 3. Retrieve currently active tax percentages (Rule B13)
  SELECT tax_percentage INTO v_sc_pct FROM tax_configurations
   WHERE tax_name = 'SERVICE_CHARGE' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  SELECT tax_percentage INTO v_tdl_pct FROM tax_configurations
   WHERE tax_name = 'TDL' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  SELECT tax_percentage INTO v_sscl_pct FROM tax_configurations
   WHERE tax_name = 'SSCL' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  SELECT tax_percentage INTO v_vat_pct FROM tax_configurations
   WHERE tax_name = 'VAT' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  IF v_sc_pct IS NULL OR v_tdl_pct IS NULL OR v_sscl_pct IS NULL OR v_vat_pct IS NULL THEN
    RAISE EXCEPTION 'Active tax configuration rows missing for invoice calculation';
  END IF;

  -- 4. Calculate cascading taxes
  v_sc_amt   := ROUND(v_base * v_sc_pct / 100, 2);
  v_tdl_amt  := ROUND(v_base * v_tdl_pct / 100, 2);
  v_sscl_amt := ROUND(v_base * v_sscl_pct / 100, 2);
  v_vat_amt  := ROUND((v_base + v_tdl_amt + v_sscl_amt) * v_vat_pct / 100, 2);
  v_total    := v_base + v_sc_amt + v_tdl_amt + v_sscl_amt + v_vat_amt;

  -- 5. Idempotent upsert into invoices (Rule B11)
  INSERT INTO invoices (
    booking_room_id, room_charges, service_charges,
    service_charge_tax, tdl_amount, ssc_amount, vat_amount,
    total_amount, status, generated_at
  ) VALUES (
    p_booking_room_id, v_room_charges, v_service_charges,
    v_sc_amt, v_tdl_amt, v_sscl_amt, v_vat_amt,
    v_total, 'UNPAID', now()
  )
  ON CONFLICT (booking_room_id) DO UPDATE SET
    room_charges       = EXCLUDED.room_charges,
    service_charges    = EXCLUDED.service_charges,
    service_charge_tax = EXCLUDED.service_charge_tax,
    tdl_amount         = EXCLUDED.tdl_amount,
    ssc_amount         = EXCLUDED.ssc_amount,
    vat_amount         = EXCLUDED.vat_amount,
    total_amount       = EXCLUDED.total_amount,
    generated_at       = now()
  RETURNING invoice_id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;
```

---

## 6. Software Architecture & Gang of Four (GoF) Design Patterns

The codebase is built on formal software engineering patterns to guarantee maintainability and grading rigor:

| Pattern | Architectural Layer | Implementation Details |
|---|---|---|
| **Adapter Pattern** | Database Connection Layer | `DbAdapter` interface (`backend/src/config/db.ts`) implemented by `ResilientPgAdapter` wrapping the PostgreSQL connection pool. |
| **Singleton Pattern** | Database Client Lifecycle | `DatabasePool.getInstance()` ensures a single connection pool manages concurrency across the application. |
| **Chain of Responsibility** | Express Middleware Pipeline | Sequential HTTP request filters: CORS $\rightarrow$ Body Parser $\rightarrow$ JWT Token Guard $\rightarrow$ RBAC Authorizer $\rightarrow$ Zod Schema Validator $\rightarrow$ Controller $\rightarrow$ Centralized Error Handler. |
| **Repository Pattern** | Data Access Layer | Domain entities (`GuestRepository`, `AvailabilityRepository`, `BookingRepository`) encapsulate all SQL queries, decoupling business logic from HTTP routing. |
| **Facade Pattern** | Database View Projection | Relational view `v_booking_details` encapsulates a 6-table JOIN query behind a clean relational projection. |
| **Observer Pattern** | Audit Logging Engine | PostgreSQL database triggers monitor mutations on `bookings`, `booking_rooms`, and `invoices`, publishing audit snapshots into `change_log`. |
| **Template Method** | Financial Engine | Stored procedure `sp_generate_final_bill` executes an immutable step-by-step calculation algorithm. |

---

## 7. RESTful API Specification (Express Port 4000)

All endpoints reside under the base path `/api/v1` and communicate via JSON:

### 7.1 Availability Endpoint
* **`GET /api/v1/availability`**
  * **Query Parameters:** `branch_id` (int), `room_type_id` (int, optional), `check_in` (date YYYY-MM-DD), `check_out` (date YYYY-MM-DD)
  * **Response:**
    ```json
    {
      "success": true,
      "data": [
        {
          "room_type_id": 2,
          "type_name": "Executive Cloud Suite",
          "base_daily_rate": "38500.00",
          "capacity": 3,
          "available_count": 4
        }
      ]
    }
    ```

### 7.2 Atomic Multi-Room Booking Creation
* **`POST /api/v1/bookings`**
  * **Description:** Executes an atomic multi-room reservation within a single database transaction using advisory locks.
  * **Request Payload:**
    ```json
    {
      "branch_id": 1,
      "booked_by_guest_id": "8f3b2e71-4a29-4d6b-9c7a-123456789abc",
      "notes": "Late arrival, ocean-view suite preference",
      "rooms": [
        {
          "room_type_id": 2,
          "plan_id": 2,
          "primary_guest_id": "8f3b2e71-4a29-4d6b-9c7a-123456789abc",
          "check_in_date": "2026-10-01",
          "check_out_date": "2026-10-05"
        },
        {
          "room_type_id": 1,
          "plan_id": 1,
          "primary_guest_id": "3e2a1b90-1c2d-4e5f-a6b7-987654321def",
          "check_in_date": "2026-10-01",
          "check_out_date": "2026-10-05"
        }
      ]
    }
    ```
  * **Success Response (HTTP 201):** Returns the created master `booking_id` and nested `booking_rooms` array.
  * **Conflict Response (HTTP 409):** Triggered when capacity is insufficient.

### 7.3 Stay Lifecycle & Check-In / Check-Out
* **`GET /api/v1/bookings`** — Query bookings by branch, guest, or stay status.
* **`GET /api/v1/bookings/:id`** — Returns denormalized booking summary via `v_booking_details`.
* **`POST /api/v1/bookings/:id/rooms`** — Additive single-room reservation for receptionists.
* **`PATCH /api/v1/bookings/:id/status`** — State transitions: `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `CHECKED_OUT` or `CANCELLED`.
* ~~**`POST /api/v1/bookings/rooms/:id/assign-room`**~~ — *Not built.* Front-desk room assignment is handled by **`POST /api/v1/dashboard/check-in`**.
* ~~**`POST /api/v1/bookings/rooms/:id/check-out`**~~ — *Not built.* Checkout is handled by **`POST /api/v1/dashboard/check-out`**.
* **`POST /api/v1/booking-rooms/:id/accompanying-guests`** — *(as built)* Adds an accompanying guest to a room line.

> **As-built note (2026-09-17):** `GET /api/v1/bookings` exists but has **no frontend consumer** —
> the receptionist ledger reads `GET /api/v1/dashboard/bookings` instead. These endpoints were
> specified but never implemented: `PATCH /api/v1/booking-rooms/:id`,
> `DELETE /api/v1/booking-rooms/:id`, `PATCH /api/v1/accompanying-guests/:id/verify`.

### 7.4 Billing & Payments
* **`POST /api/v1/services/usage`** — Record billable service consumption (spa, mini-bar, transport).
* **`POST /api/v1/invoices/:bookingRoomId/generate`** — Calls `sp_generate_final_bill`.
* **`POST /api/v1/invoices/:bookingId/payments`** — *(as built)* Posts a payment against an invoice. There is no top-level `/api/v1/payments` route.

---

## 8. Frontend Architecture & Screen Inventory

The presentation tier is built using **Next.js 16 (App Router) + React 19**, styled using **Tailwind CSS v4**, and animated with **GSAP 3.12 + ScrollTrigger**.

### 8.1 Design System Tokens & Brand Standards

In compliance with [`.gemini/skills/sky-nest-design.md`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/.gemini/skills/sky-nest-design.md):
- **Typography:**
  - `font-cinzel`: Editorial headlines, titles, and wordmarks (Cinzel serif, Google Fonts).
  - `font-jakarta`: UI elements, form inputs, body copy, and metadata (Plus Jakarta Sans).
- **Color Tokens:**
  - `bg-paper` (`#FDFCFA`): Page surface background.
  - `bg-ink` / `text-ink` (`#0B2540`): Primary headings and deep navy fills.
  - `text-ink-faded` (`#B7C2CC`): Subheadings and caption text.
  - `bg-skynest-accent` / `text-skynest-accent` (`#D9722C`): Interactive CTAs, active states, and highlights.
  - `border-skynest-hairline` (`#E4E1DA`): Subtle structural borders.
- **Layout Grid:** Strict 4px base scale (`p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`, `gap-8`).

---

### 8.2 The 17 Application Screens Inventory

Detailed specifications and word-for-word editorial copy reside in [`Resources/SkyNest_Site_Map_and_Content_Copy.md`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/Resources/SkyNest_Site_Map_and_Content_Copy.md):

> **Implementation note (2026-09-17):** the table below is the original screen *specification*.
> Several routes were implemented under different paths. The **As Built** column is authoritative
> for anyone writing code.

| # | Specified Route | Screen Name | Assigned Member | As Built |
|---|---|---|---|---|
| **0** | `/` | Luxury Marketing Landing Page | Member 3 | ✅ `/` |
| **1** | `/book` | Room Search & Live Availability | **Member 3** | ✅ `/book` |
| **2** | `/book/[roomTypeId]` | Multi-Step Room Detail & Booking Flow | **Member 3** | ✅ built as **`/book/confirm`** (query-param driven) |
| **3** | `/book/confirmation/[bookingId]` | Stay Voucher & Confirmation | **Member 3** | ✅ folded into `/book/confirm` |
| **4** | `/register` | Guest Profile Registration | Member 1 | ✅ `/register` |
| **5** | `/account` | Guest Stay History & Preferences | **Member 3** | ❌ not built |
| **6** | `/login` | Staff Authentication Portal | Member 1 | ✅ `/login` (auth layout rebuilt by Member 3, 2026-09-17) |
| **7** | `/dashboard` | Operations Hub & Daily KPIs | Shared / Front Desk | ✅ `/dashboard` + `/dashboard/(management)/*` |
| **7a** | — | Receptionist Booking Ledger | — | ✅ `/dashboard/bookings` |
| **7b** | — | Booking Detail & Stay Lifecycle | — | ❌ `/dashboard/bookings/[id]` not built |
| **8** | `/dashboard/bookings` | Bookings Master Management Grid | Receptionist, Manager | **Member 3** |
| **9** | `/dashboard/bookings/new` | Front Desk Walk-in Booking Engine | Receptionist | **Member 3** |
| **10** | `/dashboard/bookings/[id]` | Stay Lifecycle, Check-in/out & Room Assign | Receptionist | **Member 3** |
| **11** | `/dashboard/branches` | Branch Property Configuration | Administrator | Member 2 |
| **12** | `/dashboard/staff` | Staff Directory & RBAC Security | Administrator | Member 1 |
| **13** | `/dashboard/rooms` | Physical Rooms & Room Categories | Hotel Manager | Member 2 |
| **14** | `/dashboard/catalogue` | Service Catalogue & Tax Configurations | Hotel Manager, Accountant | Member 2 & 4 |
| **15** | `/dashboard/reports` | Executive Management Reports | Hotel Manager, Accountant | Member 5 |
| **16** | `/dashboard/billing` | Invoicing, Tax Breakdown & Settlements | Accountant, Receptionist | Member 4 |

---

## 9. Security, Authentication & Data Integrity Architecture

1. **Stateless Authentication:** JSON Web Tokens (JWT) signed with `HS256`, carrying `staff_id`, `role`, and `branch_id` in claims.
2. **Password Security:** Salted hashes generated via `bcrypt` with work factor $\ge 12$.
3. **Role-Based Access Control (RBAC):** Express middleware gates routes based on hierarchical permissions:
   - `RECEPTIONIST`: Bookings, check-in, check-out, room assignment, service logging, payment recording.
   - `MANAGER`: Room tariff adjustments, catalogue management, operational reporting.
   - `ACCOUNTANT`: Invoice generation, payment reconciliation, financial reports.
   - `ADMINISTRATOR`: User accounts, branch properties, tax configuration, database audit logs.
4. **SQL Injection Defense:** 100% of database queries execute as parameterized statements (`$1, $2, ...`) via the `pg` driver. Raw SQL string concatenation is strictly prohibited.
5. **Auditing (`change_log`):** Triggers capture mutations on transactional tables, serializing old and new row states into `JSONB` alongside timestamps and acting user identifiers.

---

## 10. DevOps, Environment & Deployment Strategy

The application is architected for dual-target deployment without code modification:

```
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│     LOCAL DEVELOPMENT ENVIRONMENT     │   │      RAILWAY CLOUD PRODUCTION         │
├───────────────────────────────────────┤   ├───────────────────────────────────────┤
│ • PostgreSQL 15: Docker Alpine        │   │ • PostgreSQL 15: Railway Managed DB   │
│   PORT: 5432                          │   │ • Node.js Backend: Containerized API   │
│ • Express REST API: Local Node.js     │   │   PORT: 4000 (Private Network)        │
│   PORT: 4000                          │   │ • Next.js Frontend: Containerized Web │
│ • Next.js 16: Local Node.js           │   │   PORT: 3000 (Public Edge Domain)     │
│   PORT: 3000                          │   │ • Environment Config: Railway Secrets │
└───────────────────────────────────────┘   └───────────────────────────────────────┘
```

### Essential Environment Configuration (`.env`)

> **Note:** the backend reads `backend/.env`, not the root `.env`. The **active** connection is the
> shared Railway instance (`hayabusa.proxy.rlwy.net:16058`); the local Docker URL below is the
> commented-out fallback. See `Resources/RAILWAY_SETUP_GUIDE.md`.

```ini
# Database Connection — ACTIVE is Railway; local Docker retained as fallback
DATABASE_URL=postgresql://postgres:<password>@hayabusa.proxy.rlwy.net:16058/railway
# DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest

# Express Backend REST API
PORT=4000
NODE_ENV=development
JWT_SECRET=skynest_super_secret_jwt_key_3rd_sem_2026
JWT_EXPIRES_IN=8h

# Next.js Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 11. Group 40 Module Ownership Matrix

| Member | Primary Focus Area | Key Deliverables |
|---|---|---|
| **Member 1** | Identity, Auth & Staff Management | JWT auth middleware, bcrypt security, `/api/v1/auth`, staff CRUD, RBAC gate, `/register` |
| **Member 2** | Properties, Rooms & Services | `/dashboard/branches`, `/dashboard/rooms`, physical room states, `/dashboard/catalogue` |
| **Member 3** *(Lead)* | Reservations, Booking Engine & Frontend | Public `/book` flow, multi-step booking engine, `/dashboard/bookings` suite, concurrency control |
| **Member 4** | Invoicing, Taxes & Payments | `sp_generate_final_bill`, 4-tier Sri Lankan tax cascade, `/dashboard/billing`, PayHere sandbox |
| **Member 5** | Analytics, Snapshots & Audit Trail | 5 parameterized management reports (`/dashboard/reports`), PostgreSQL audit triggers, `change_log` |

---

*Document Author: Group 40 Engineering Lead · SkyNest Hotels (Pvt) Ltd HRGSMS System Architecture*
