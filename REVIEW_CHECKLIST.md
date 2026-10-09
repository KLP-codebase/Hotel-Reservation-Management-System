# Sky Nest — Code Review Checklist

Review of branch `Ashinthya` on 2026-10-09. Both projects type-check cleanly and ESLint reports no
errors (206 warnings). Findings come from reading the code plus read-only schema queries against the
live Railway database. The app was not run, so tick an item only after checking it in the running app.

Items are ordered by priority. Line numbers are as of commit `163c5a6` and may drift.

---

## P0 — Security

- [x] **Require login on the booking and guest APIs.** These routers had no `authenticate`, so anyone
  could list every booking, change any booking's status (check in, cancel) and look up guests by email.
  - Files: [bookings.routes.ts](backend/src/routes/bookings.routes.ts),
    [guests.routes.ts](backend/src/routes/guests.routes.ts),
    [booking-rooms.routes.ts](backend/src/routes/booking-rooms.routes.ts)
  - Done: only `POST /guests` and `POST /bookings` are public. Everything else requires a
    RECEPTIONIST, MANAGER, ADMINISTRATOR or DBA token (401 without a token, 403 for other roles).
  - `POST /guests` now finds a returning guest by email (case-insensitive) and returns only their ids,
    so the booking page no longer needs the staff-only `GET /guests?search=`. Email is now required,
    matching the `NOT NULL` column.
  - Follow-up: `POST /bookings` still accepts any `booked_by_guest_id`, so someone who knows a guest's
    id can book in their name.

- [x] **Delete the old Next.js API routes.** Everything in `src/app/api/` ran with no auth and wrote to
  the database directly, which AGENTS.md forbids.
  - Done: removed `src/app/api/**`, `src/lib/db.ts`, `src/lib/auth.ts` (NextAuth), the unused
    server actions in `src/actions/` (they also queried the database directly), and NextAuth's
    `SessionProvider` from [Providers.tsx](src/components/layout/Providers.tsx).
  - Done: `DATABASE_URL` is commented out in the root `.env` (each developer should do the same in
    their own copy, since `.env` isn't committed).
  - Follow-up: `next-auth`, `pg`, `bcryptjs` and `jsonwebtoken` are still in the root `package.json`
    but nothing in the frontend imports them any more; they can be uninstalled.

---

## P1 — Features that report success but save nothing

- [ ] **Make receptionist check-in / check-out write to PostgreSQL.**
  [dashboard.routes.ts:101-145](backend/src/routes/dashboard.routes.ts#L101-L145) only updates the
  in-memory seed store. The modal shows success, but the booking is still `CONFIRMED` after a reload.
  - Fix: reuse `BookingRepository.updateStatus()` (the same path as `PATCH /bookings/:id/status`) and
    update `booking_rooms.status` / `rooms.status` in the same transaction.

- [ ] **Fix dining and spa folio inserts.** The live `service_usage` table has no `notes`,
  `appointment_time` or `meal_time` columns, so the insert at
  [services.routes.ts:498](backend/src/routes/services.routes.ts#L498) always fails. It then falls
  back to memory and returns `201`. The live table has **0 rows**.
  - Fix: add the columns with a migration (apply to Railway and to `init.sql`), or drop them from the
    insert.
  - Also fix: the invoice update after the insert (and in `DELETE /folio/:usageId`) writes
    `subtotal`, `sc_amount`, `sscl_amount`, `updated_at`, which don't exist on `invoices`. The real
    columns are `service_charges`, `service_charge_tax`, `ssc_amount`.
  - Also fix: `booking_room_id` is set to `bookings.id`, not a real `booking_room_id`.

- [ ] **Stop faking successful payments.** If the database insert fails,
  [invoices.routes.ts:630](backend/src/routes/invoices.routes.ts#L630) records the payment in memory
  and still answers "Payment recorded successfully". Return the error instead.

- [ ] **Remove the in-memory fallback for writes.** [db.ts](backend/src/config/db.ts) switches to
  [db-fallback.ts](backend/src/config/db-fallback.ts) when PostgreSQL is unreachable. That store
  returns empty rows for every INSERT/UPDATE and re-runs failed transactions against memory, so writes
  look successful but are lost.
  - Fix: return 503 when the database is down. Also remove the direct `inMemoryStore` calls in
    `dashboard.routes.ts`, `invoices.routes.ts` and `services.routes.ts`.

---

## P1 — Pages that are broken

- [ ] **Rooms page: mount the rooms router.** [app.ts](backend/src/app.ts) never mounts
  `rooms.routes.ts`, so `/api/v1/rooms` returns 404.
  - Also fix: [rooms.routes.ts](backend/src/routes/rooms.routes.ts) validates `branchId` as a positive
    number, but `branches.branch_id` is a UUID. Use `z.string().uuid()`.

- [ ] **Catalogue page: fix the tax endpoint and the branch ID.**
  - The page calls `/api/v1/taxes`, which isn't mounted. Taxes are served at
    `/api/v1/tax-configurations`. Point the page there and delete the unused
    [taxes.routes.ts](backend/src/routes/taxes.routes.ts), or mount it; don't keep both.
  - [catalogue/page.tsx:170](src/app/dashboard/(management)/catalogue/page.tsx#L170) sends
    `branch_id: Number(uuid)` (which becomes `null`), and
    [services.routes.ts:20](backend/src/routes/services.routes.ts#L20) expects a number. Send the UUID
    string and validate it as `z.string().uuid()`.

- [ ] **Occupancy and Trends reports: fix the API paths.**
  [OccupancyReport.tsx](src/components/reports/OccupancyReport.tsx) and
  [ServiceTrendsReport.tsx](src/components/reports/ServiceTrendsReport.tsx) call `/reports/...`
  without `/api/v1`, so they get 404s. Use `/api/v1/reports/...` like the other components.

- [ ] **Use one value for `NEXT_PUBLIC_API_URL` everywhere.** The root `.env` doesn't set it,
  docker-compose sets `…/api/v1`, and CI sets it without `/api/v1`. The docker value breaks
  [book/page.tsx:406](src/app/book/page.tsx#L406), which calls raw `fetch` and adds `/api/v1` itself.
  - Fix: set it in the root `.env`, and switch the book page to `apiFetch('/api/v1/availability?…')`
    so every call goes through the same path handling.

- [ ] **Show website bookings to reception.** New bookings are created as `PENDING`, but the arrivals
  list in [ReceptionistHub.tsx:115](src/components/dashboard/receptionist/ReceptionistHub.tsx#L115)
  only shows `CONFIRMED`. Nothing confirms them automatically; two live bookings are stuck in
  `PENDING`.
  - Decide: auto-confirm on creation, or add a "pending confirmation" queue to the hub.

---

## P2 — Billing logic

- [ ] **Read tax rates from `tax_configurations`.** Rates (10% / 1% / 2.5% / 18%) are hardcoded in
  [invoices.routes.ts:46](backend/src/routes/invoices.routes.ts#L46),
  [services.routes.ts](backend/src/routes/services.routes.ts) and
  [book/confirm/page.tsx:75](src/app/book/confirm/page.tsx#L75). The table has 4 rows that are never
  read, which breaks rule B13 (versioned taxes). Compute the cascade once on the backend from the rates
  active on the invoice date; have the frontend display what the backend returns.

- [ ] **Stop the booking invoice and room invoice overwriting each other.** The whole-booking invoice
  is saved on the first room's `booking_room_id`, the same row as that room's own invoice
  ([invoices.routes.ts:300-320](backend/src/routes/invoices.routes.ts#L300-L320)). Note `invoices`
  has `UNIQUE (booking_room_id)`, so the booking-level invoice needs its own key (e.g. a
  `booking_id` column) or must be computed rather than stored.

- [ ] **Make `GET /invoices/:id` read-only.** It inserts or updates the invoice on every view, outside
  a transaction. Move writes to `POST /invoices/:id/generate` and wrap them in `db.transaction()`.

- [ ] **Block overpayments.** `POST /invoices/:id/payments` accepts any positive amount. Reject
  amounts above `balance_due`, inside the same transaction as the insert.

- [ ] **Take folio prices from the catalogue.** `price_at_usage` comes from the request body, and an
  unknown service name creates a new catalogue entry. Look up `service_catalogue.base_price` by
  `service_id` on the server (rule B10) and reject unknown services.

---

## P2 — Data and logic risks

- [ ] **Stop rewriting booking dates on the shared database.**
  [alive-dates.service.ts](backend/src/services/alive-dates.service.ts) runs on startup and on the
  first spa-slot lookup each day, rewriting `booking_rooms` dates for 14 hardcoded booking IDs. Two of
  them (`797f97aa-…`, `32d5a06a-…`) look like real bookings, not seed data. Changing dates also
  changes invoice totals. Remove it, or limit it to a local seed script.

- [ ] **Make branch assignment consistent.**
  - [auth.service.ts:65](backend/src/services/auth.service.ts#L65) and `me()` silently assign a
    manager with no branch to Galle (hardcoded UUID).
  - `resolveBranchScope()` in [dashboard.routes.ts](backend/src/routes/dashboard.routes.ts) assigns
    the first active branch instead, as a side effect of a GET.
  - A receptionist with no branch sees all branches.
  - Fix: refuse (403) a manager/receptionist with no branch and have an admin assign one.

- [ ] **Validate booking input.** Reject check-in dates in the past, and require at least one room in
  `POST /bookings` ([bookings.routes.ts](backend/src/routes/bookings.routes.ts)).

- [ ] **Guard `limit` / `offset` query params.** `?limit=abc` gives `NaN` and a 500 in
  `dashboard.routes.ts` and `audit.routes.ts`. Fall back to the default when parsing fails.

- [ ] **Rename `src/middleware.ts` to `src/proxy.ts`.** Next.js 16 renamed Middleware to Proxy (see
  `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).

---

## P2 — Auth hardening

- [ ] Stop storing the JWT in `localStorage` and in a JavaScript-readable cookie
  ([auth-client.ts](src/lib/auth-client.ts)); have the backend set an `httpOnly` cookie instead.
- [ ] Install `cookie-parser` in the backend, or remove the cookie fallback in
  [auth.strategy.ts](backend/src/lib/auth/auth.strategy.ts); today it never works.
- [ ] Reject tokens for deactivated users (currently valid for up to 8 hours after deactivation).
- [ ] Add rate limiting to `POST /auth/login` and `POST /auth/resend-verification`.

---

## P3 — Cleanup

- [ ] Delete dead files:
  - [ ] duplicate `components/ui/` folder at the repo root (copies of `src/components/ui/`)
  - [ ] [backend/src/routes/taxes.routes.ts](backend/src/routes/taxes.routes.ts) (if not mounted)
  - [ ] [backend/src/routes/reports/service-report.routes.ts](backend/src/routes/reports/service-report.routes.ts) (not mounted)
  - [ ] [backend/scratch-query.js](backend/scratch-query.js)
  - [ ] `skynest_backup.sql` — committed to git and contains password hashes; remove it and add to `.gitignore`
- [ ] Fix the `react-hooks/set-state-in-effect` lint warnings in the report components and
  `useServiceReport.ts`.
- [ ] Add tests. `npm test` runs `jest --passWithNoTests` with no tests. Start with booking overlap,
  status transitions and the tax cascade.

---

## Missing features (backlog)

- [ ] Forgot-password / reset-password flow
- [ ] Guest "My bookings" page with self-service cancellation
- [ ] Booking confirmation email to the guest
- [ ] Real payment gateway in the Express API (a PayHere webhook exists only in the old Next.js routes)
