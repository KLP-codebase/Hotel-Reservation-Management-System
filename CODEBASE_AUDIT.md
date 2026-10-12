# Sky Nest — Codebase Audit

Date: 2026-10-11 · Branch: `Ashinthya`

**Scope:** backend routes, auth, middleware, and frontend API calls.

**Tooling results:**
- `tsc --noEmit` passes for both frontend and backend.
- ESLint reports 0 errors, 42 backend warnings and 182 frontend warnings.
- There are no test files in the repo.
- Nothing was run. These findings come from reading the code and are not runtime-verified.

---

## Critical (broken or insecure)

1. **Rooms and taxes APIs are never mounted.**
   - `backend/src/app.ts` mounts `tax.routes` (as `/tax-configurations`) but not `rooms.routes.ts` or `taxes.routes.ts`.
   - The dashboard calls `/api/v1/rooms`, `/api/v1/rooms/stats/counts-by-type` and `/api/v1/taxes`. These return 404.
   - Several calls use `.catch(() => ({ data: [] }))`, so the Rooms and Rates pages look empty instead of showing an error.
   - **Fix:** mount both routers. Delete one of `tax.routes.ts` / `taxes.routes.ts`, since they are duplicates and `taxes.routes.ts` has no `authorize`.

2. **Guests can read and write any booking's folio.**
   - `backend/src/routes/services.routes.ts:17` applies `authorize(..., 'GUEST')` to the whole router.
   - `GET /services/folio/:bookingId` (line 347) and `POST /services/folio/:bookingId` (line 400) therefore accept any logged-in guest, with no ownership check.
   - A guest can read other guests' billing and add charges to any booking.
   - **Fix:** make the folio routes staff-only, or check ownership.

3. **Public write endpoints have no abuse protection.**
   - `POST /guests`, `POST /bookings`, and `POST` / `DELETE /availability/hold-rooms` are public by design, for the booking flow.
   - There is no rate limit, CAPTCHA or ownership check.
   - Anyone can release another session's hold by sending its `session_id`.

4. **No brute-force protection.**
   - `helmet` and `express-rate-limit` are not installed.
   - `/auth/login`, the OTP verify/resend routes, `/register` and `/resend-verification` are unthrottled.
   - The 6-digit OTP uses `Math.random()` in `auth.service.ts`. Use `crypto.randomInt`.

5. **Staff logins skip the email challenge.**
   - Admin, manager and DBA logins are password-only.
   - `devOtp` is returned unless `NODE_ENV === 'production'`. Confirm it is set on Railway.

6. **Secrets and junk files are tracked in git.**
   - `skynest_backup.sql` and `backend/scratch-query.js` are tracked even though `.gitignore` lists them. `backend/scratch-baseline.js` is also present.
   - Git history contains the Railway host `hayabusa.proxy.rlwy.net`.
   - **Fix:** audit the backup and history for credentials or real data, remove the files from tracking, and rotate the DB password if needed.

---

## Bugs and inconsistencies

- **Cookie auth fallback never works.** `extractFromRequest` reads `req.cookies.sn_token`, but `cookie-parser` isn't installed. Only the Bearer header works.
- **Logout doesn't clear anything.** `res.clearCookie` on the server targets a cookie it never set.
  - The client sets `sn_token` itself in `document.cookie`, so it is not `httpOnly`.
  - The JWT is also stored in `localStorage`. Both are readable by XSS.
- **Next.js middleware trusts an unverified JWT.** `src/middleware.ts` base64-decodes the payload without checking the signature, so a forged cookie passes the page-level gate. The API still rejects it, but the page shell renders.
- **Holds aren't enforced at booking time.** `POST /bookings` deletes holds after creating the booking. It never verifies that the caller's `session_id` owns the hold.
- **Booking status changes have no side effects.** The transition only changes status. It doesn't update room status, create invoices or send emails.
- **Duplicate migration numbers.** There are two `008_*` files and two `013_*` files.
- **Schema drift.** `init.sql` and the live Railway database differ (varchar `booked_by_guest_id`, duplicate `users` / `user_accounts` and `bills` / `invoices`). Pick one of each pair and drop the other.
- **Duplicate report routes.** `service-report.routes.ts` and `service-reports.routes.ts` both exist, and only the plural one is mounted.
- **Stale `AGENTS.md` links.** They point to `F:\...\Github Repo\...` paths that don't exist here.
- **Fragile env loading.** `backend/src/config/env.ts` hard-wires `../../.env` with `override: true`, so a local file overrides real environment variables on Railway.
- **Frontend lint.** `react-hooks/set-state-in-effect` is flagged (e.g. `useServiceReport.ts`). The 182 warnings include many `any` types.

---

## Missing features

- **Tests.** `jest` is in the root `test` script, but no test or spec files exist. Needed:
  - the tax cascade (SC → TDL → SSCL → VAT)
  - double-booking prevention
  - booking state-machine transitions
  - RBAC
- **Guest-facing features.** Cancel or modify a booking, payment processing (only recording payments exists), booking reference lookup, and a forgot-password / reset flow (none found).
- **Staff and admin.** Staff deactivate and reset, and a guest-management dashboard page. The `/guests` API exists but has no page.
- **Audit and compliance.** An audit log UI beyond the dashboard summary, and data export or deletion tooling (a privacy page exists).
- **Ops.** No CI workflow, no `.env.example` (it is gitignored), and no Docker setup for the backend (compose runs Postgres only).
- **API polish.** No pagination on `GET /bookings` or `GET /guests`, and no OpenAPI docs.
- **Reports.** No PDF or Excel export. There is only `export-csv.ts`.
- **Accessibility.** The dashboards haven't been audited for keyboard use or screen readers.

---

## Suggested fix order

1. Mount rooms and taxes, and remove the duplicate tax router.
2. Lock down the folio routes.
3. Add rate limiting, `helmet`, and `crypto.randomInt` for the OTP.
4. Untrack the backup and scratch files, and rotate credentials.
5. Verify hold ownership on booking creation.
6. Add tests for billing and booking logic.
