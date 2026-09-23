# SkyNest HRGSMS — Architecture Review & Consolidated Plan
**Reviewer:** Claude · **Scope:** Peer review of the two source docs + answers to the four focal questions in §8 of the Roadmap Review, plus a corrected, actionable architecture plan for Member 3.

---

## 1. Overall Assessment

The design is solid for a 3rd-semester project and genuinely close to production-grade in places (exclusion constraints, frozen-rate snapshots, versioned tax config). The two documents mostly agree with each other. Three things need fixing before Member 3's roadmap can proceed safely:

> **Status update (2026-09-17):** two of the three issues below are now resolved. Verified against
> the live Railway database and current `main`.

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | `invoices` table is missing a **TDL (Tourism Development Levy)** column, but the tax cascade in §7.2 requires 4 taxes, not 3 | Blocker for Member 4 | ✅ **Resolved** — live `invoices` has `sc_amount, tdl_amount, sscl_amount, vat_amount` |
| 2 | No room-type-level concurrency control exists yet — only the **physical-room** exclusion constraint. Two guests can each be told "yes, available" for the last Deluxe room and both get a `booking_rooms` row with `room_id = NULL`, because the exclusion constraint only fires once `room_id` is non-null | Blocker for Task 3 in the roadmap | ❌ **Still open** — no `pg_advisory_lock` / `FOR UPDATE` / explicit transaction exists anywhere in `backend/src/`. The physical-room `EXCLUDE` constraint is the only guard. |
| 3 | Dual API surface (Next.js route handlers + Express backend) — undecided, wastes grading clarity and dev time | Should be resolved before more routes are built | ✅ **Resolved** — Express is the sole API surface (SI-01, see `AGENTS.md`) |

Everything below is organized as direct answers to your four §8 questions, followed by the corrected architecture plan.

---

## 2. Answers to the Four Focal Questions

### 2.1 Concurrency & Race Condition Strategy (Room-Type Level)

**Don't add an inventory counter table.** A separate `available_count` column is redundant state that can drift from the true count derivable from `rooms` + `booking_rooms`, and every insert/cancel/check-in would need to keep it in sync — that's a second source of truth fighting the "database is source of truth" mandate you already committed to.

**Don't use full `SERIALIZABLE` isolation for every booking request either.** It works, but it causes serialization failures under load that you'd have to retry-loop, and it's heavier than needed for what's really a narrow hot spot (one branch + one room type + overlapping dates).

**Recommended pattern: advisory lock + live overlap count, inside one transaction.**

```sql
BEGIN;

-- Serialize only concurrent attempts on the same (branch, room_type) — cheap, narrow lock
SELECT pg_advisory_xact_lock(hashtext(p_branch_id::text || ':' || p_room_type_id::text));

-- Count physical rooms of this type at this branch
-- minus rooms already reserved (any non-cancelled booking_room) for an overlapping range
WITH capacity AS (
  SELECT count(*) AS total_rooms
  FROM rooms
  WHERE branch_id = p_branch_id AND room_type_id = p_room_type_id AND status <> 'MAINTENANCE'
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

-- application checks: total_rooms - taken >= rooms_requested
-- if true: INSERT INTO booking_rooms (..., room_id = NULL, rate_at_booking = <current base_daily_rate>, ...)

COMMIT; -- advisory lock auto-releases here
```

Why this is the right layer for the right rule:
- **Booking stage (room-type level):** advisory lock + overlap count, as above — cheap, correct, no new tables.
- **Check-in stage (physical room level):** your existing `EXCLUDE USING gist` constraint is exactly right and needs no change — it's the final backstop the moment `room_id` becomes non-null.

One more detail worth fixing: right now the exclusion constraint's `WHERE (status <> 'CANCELLED')` clause only protects rows where `room_id` is already set. Add a second, lighter constraint (or a `CHECK` + trigger) that rejects two `booking_rooms` rows sharing the same `room_id` and overlapping dates *even if inserted out of order* — the current constraint already does this correctly for non-null `room_id`, so this is really just confirming it stays enforced once check-in assigns the room; no code needed there, just a test case for it in Task 3.

### 2.2 Dual Architecture & API Route Consolidation

**Deprecate the Next.js API route handlers. Call Express directly from the frontend via `NEXT_PUBLIC_API_URL`.**

Reasoning:
- Your own Mandate #1 says the database is the source of truth and business rules live in Express/repositories/SQL. A parallel Next.js API layer either duplicates that logic (drift risk, exactly the kind of thing you're already fixing between `schema.sql` and `init.sql`) or becomes a thin proxy that adds latency and a second thing to maintain for no benefit.
- For grading, a single clearly-owned backend (SI-01 in your SRS) is easier to demonstrate and matches the SRS interface list exactly — one Express service, one Postgres instance, one frontend consuming a documented REST contract.
- The one legitimate reason to keep *any* server-side code in Next.js is if you need httpOnly cookie handling for auth that a pure client fetch can't do. If that's a requirement, keep it to a **single** `route.ts` (e.g. `/api/auth/session`) that proxies just the auth handshake to Express — not a parallel API surface.

Action: set `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (and the Railway URL in prod), delete the other `src/app/api/**` handlers, and have every dashboard/booking page call Express directly with `fetch`.

### 2.3 Stored Procedure & Schema Drift — Corrected `sp_generate_final_bill`

First, a schema fix is required: **add a `tdl_amount NUMERIC(10,2)` column to `invoices`** — the cascade defined in §7.2 has four taxes (SC, TDL, SSCL, VAT) but the table as documented only has three tax columns. Flag this to Member 4 immediately; it's a one-line `ALTER TABLE`.

```sql
-- Migration: add missing TDL column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tdl_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
```

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
  -- 1. Room charges (frozen rate x nights)
  SELECT (check_out_date - check_in_date), rate_at_booking
    INTO v_nights, v_rate
  FROM booking_rooms
  WHERE booking_room_id = p_booking_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_room % not found', p_booking_room_id;
  END IF;

  v_room_charges := v_nights * v_rate;

  -- 2. Service charges (frozen price_at_usage, already snapshotted per B10)
  SELECT COALESCE(SUM(quantity * price_at_usage), 0)
    INTO v_service_charges
  FROM service_usage
  WHERE booking_room_id = p_booking_room_id;

  v_base := v_room_charges + v_service_charges;

  -- 3. Pull currently-effective tax rates (B13: versioned config)
  SELECT tax_percentage INTO v_sc_pct   FROM tax_configurations
   WHERE tax_name = 'SERVICE_CHARGE' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  SELECT tax_percentage INTO v_tdl_pct  FROM tax_configurations
   WHERE tax_name = 'TDL' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  SELECT tax_percentage INTO v_sscl_pct FROM tax_configurations
   WHERE tax_name = 'SSCL' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  SELECT tax_percentage INTO v_vat_pct  FROM tax_configurations
   WHERE tax_name = 'VAT' AND is_active
     AND CURRENT_DATE >= effective_from AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
   ORDER BY effective_from DESC LIMIT 1;

  IF v_sc_pct IS NULL OR v_tdl_pct IS NULL OR v_sscl_pct IS NULL OR v_vat_pct IS NULL THEN
    RAISE EXCEPTION 'One or more active tax_configurations rows missing for %', p_booking_room_id;
  END IF;

  -- 4. Template-method cascade, per the fixed sequence in §3
  v_sc_amt   := ROUND(v_base * v_sc_pct / 100, 2);
  v_tdl_amt  := ROUND(v_base * v_tdl_pct / 100, 2);
  v_sscl_amt := ROUND(v_base * v_sscl_pct / 100, 2);
  v_vat_amt  := ROUND((v_base + v_tdl_amt + v_sscl_amt) * v_vat_pct / 100, 2);
  v_total    := v_base + v_sc_amt + v_tdl_amt + v_sscl_amt + v_vat_amt;

  -- 5. Upsert the 1:1 invoice (B11)
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
    room_charges = EXCLUDED.room_charges,
    service_charges = EXCLUDED.service_charges,
    service_charge_tax = EXCLUDED.service_charge_tax,
    tdl_amount = EXCLUDED.tdl_amount,
    ssc_amount = EXCLUDED.ssc_amount,
    vat_amount = EXCLUDED.vat_amount,
    total_amount = EXCLUDED.total_amount,
    generated_at = now()
  RETURNING invoice_id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;
```

Hand this whole section to Member 4 along with the `ALTER TABLE` — it replaces the legacy `bills`-table version entirely and matches `invoices`, `booking_rooms`, `service_usage`, `tax_configurations` exactly.

### 2.4 REST Endpoint Design for Composite Bookings

**Single atomic nested payload**, not a two-step flow, for the primary creation path:

```
POST /api/v1/bookings
{
  "branch_id": 1,
  "booked_by_guest_id": "b7e1...",   // OR booked_by_staff_id, per B15
  "notes": "Family booking, connecting rooms requested",
  "rooms": [
    { "room_type_id": 2, "plan_id": 1, "primary_guest_id": "g1...", "check_in_date": "2026-10-01", "check_out_date": "2026-10-05" },
    { "room_type_id": 2, "plan_id": 1, "primary_guest_id": "g2...", "check_in_date": "2026-10-01", "check_out_date": "2026-10-05" },
    { "room_type_id": 3, "plan_id": 2, "primary_guest_id": "g1...", "check_in_date": "2026-10-01", "check_out_date": "2026-10-05" }
  ]
}
```

Why nested-atomic over two-step:
- A family booking with 2 Deluxe + 1 Suite is one commercial transaction — either all three rooms hold, or the guest sees a clean 409 and re-picks, rather than ending up with a partially-successful booking (2 of 3 rooms) that support staff then has to manually fix.
- It maps directly onto the transaction you already designed in Task 3: one `BEGIN`, N availability checks (using the advisory-lock pattern in §2.1 above, once per distinct `room_type_id` in the payload to avoid redundant locking), N inserts, one `COMMIT`. A two-step flow would force you to either replicate that transaction logic across two endpoints or leave the header committed with no rooms yet — an invalid intermediate state your `bookings.status = 'PENDING'` doesn't cleanly represent.
- Keep `POST /bookings/:id/rooms` as a **secondary, additive** endpoint — for a receptionist adding a room to an already-confirmed booking after the fact. That's a genuinely different use case (single-room, mutate-existing) and deserves its own smaller transaction, not the same code path as creation.

Response should return the full composite object (via `v_booking_details`) so the frontend doesn't need a second `GET` to render the confirmation screen.

---

## 3. Corrected Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION — Next.js 16 (Port 3000)                          │
│  Talks to Express ONLY via NEXT_PUBLIC_API_URL. No app/api/**   │
│  route handlers except (optional) a single auth-cookie proxy.   │
└───────────────────────────────┬─────────────────────────────────┘
                                 │ REST/JSON
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  APPLICATION — Express 4 (Port 4000)                             │
│  Middleware chain → Route Controllers → Repositories             │
│  Booking creation: advisory-lock + overlap-count txn (§2.1)      │
└───────────────────────────────┬─────────────────────────────────┘
                                 │ pg wire protocol
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATA — PostgreSQL 15                                            │
│  17 tables + tdl_amount column added to invoices                 │
│  no_double_booking exclusion (physical room) — unchanged         │
│  sp_generate_final_bill — corrected, 4-tax cascade (§2.3)        │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Prioritized Roadmap for Member 3 (Corrected Order)

> ⚠️ **This roadmap is complete except where noted (status added 2026-09-17).**
> Do not use it to plan new work — see `MY_MODULE.md` for what's actually left.

1. ~~Raise the `tdl_amount` schema gap with Member 4~~ — ✅ done, column exists.
2. ~~Implement `GET /api/v1/availability`~~ — ✅ done.
3. ~~Implement `POST /api/v1/bookings` as the **atomic nested-rooms** endpoint~~ — ⚠️ **partially done.** The endpoint exists, but it creates only the booking header; rooms are added separately via `POST /:id/rooms`. **The advisory-lock pattern from §2.1 was never implemented** (see issue 2 in §1).
4. ~~Implement `GET /api/v1/bookings`, `GET /api/v1/bookings/:id`~~ — ✅ done. Note `GET /api/v1/bookings` has **no frontend consumer**; the receptionist ledger uses `GET /api/v1/dashboard/bookings`.
5. ~~Implement `POST /api/v1/bookings/:id/rooms`~~ — ✅ done, returns `409` on double-book.
6. ~~Implement status transitions~~ — ✅ done, state machine enforced.
7. ~~Implement accompanying-guest verification~~ — ⚠️ **partial.** `POST /api/v1/booking-rooms/:id/accompanying-guests` exists; `PATCH /api/v1/accompanying-guests/:id/verify` was never built.
8. Frontend flows — ✅ `/book` and `/book/confirm` done. `/dashboard/bookings` was built by KLP. **`/dashboard/bookings/[id]` remains the one open item.**
9. ~~Settle the `NEXT_PUBLIC_API_URL` decision~~ — ✅ resolved; Express is the sole API surface.

### Genuinely still open

- **Room-type-level concurrency** (advisory locks) — §2.1, issue 2 in §1.
- **`/dashboard/bookings/[id]`** — booking detail & stay lifecycle page.
- Never-built endpoints: `PATCH /booking-rooms/:id`, `DELETE /booking-rooms/:id`, `PATCH /accompanying-guests/:id/verify` — build only if the detail page needs them.

## 5. One Documentation Note

~~The uploaded `SkyNest_HRGSMS_Database_Design.md` has visible text-corruption in several table/column names (e.g. `ranches`, `ooking_rooms`, `	ax_configurations`).~~

✅ **Resolved (verified 2026-09-17)** — all 22 occurrences of `booking_rooms` and 13 of `branches` in that file are now spelled correctly. The document no longer needs re-exporting.
