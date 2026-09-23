<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Sky Nest — Project Agent Rules

This is the **Sky Nest Hotel Reservation Management System** — a Next.js 16 + React 19 + Tailwind CSS v4 application.

## Design System

**Always read `.gemini/skills/sky-nest-design.md` before writing any UI code.**

The design system is premium and cinematic. It uses:

- **Fonts:** `font-cinzel` (Cinzel — Google Fonts, serif display) and `font-jakarta` (Plus Jakarta Sans, body/UI). Do NOT use "Inter Tight", "Cardinal Classic Long", or any other font.
- **Color tokens (Tailwind classes):** `bg-paper`, `bg-ink`, `text-ink`, `text-ink-faded`, `bg-skynest-accent`, `text-skynest-accent`, `border-skynest-hairline`. Do NOT use raw hex values in JSX.
- **Accent color:** `#D9722C` (`skynest-accent`). NOT `#ff7e15`.
- **Motion:** GSAP + ScrollTrigger for all scroll-driven effects. CSS transitions only for micro-interactions (hover, focus).
- **`@keyframes` belong in `src/styles/globals.css`.** Do NOT define them in a `<style jsx global>` block inside a Client Component — styled-jsx in the App Router requires a `StyleRegistry` (`useServerInsertedHTML`) that this project does not have, so the rules silently never reach the page and the animation just doesn't run.
- **Hero:** Globally pinned (`sticky top-0 z-0`). Cloud section scrolls over it.
- **Nav:** Inline `lerp()` interpolation — NOT `.is-scrolled` CSS class toggle.

### Quick violation checklist

Before submitting any UI change, verify:
- [ ] No raw hex values in JSX
- [ ] No `font-cardinal` or `font-inter-tight` classes
- [ ] No `#ff7e15` or `--sn-accent` references
- [ ] Accent (`skynest-accent`) is not used as a large fill or background
- [ ] GSAP animations use `gsap.context()` with `ctx.revert()` cleanup
- [ ] `usePrefersReducedMotion()` gates all GSAP effects
- [ ] Z-index values are only from the scale: `0, 1, 2, 10, 40, 50, 100, 9999`
- [ ] Spacing is a multiple of 4px

## Tech Stack

- **Frontend:** Next.js 16.3.3 (App Router) + React 19.2.8 (Port 3000)
- **Backend API:** Node.js 20 + Express 4.19 REST API (Port 4000, `backend/`)
- **CSS & Design:** Tailwind CSS v4.3.3 (`@import "tailwindcss"` + `@theme` in `globals.css`)
- **Animation:** GSAP 3.12 + ScrollTrigger, Lenis smooth scrolling
- **Database:** PostgreSQL 15 via raw SQL (`pg` driver, Zero ORM)
- **Auth:** Stateless JWT (`jsonwebtoken`, `bcryptjs`) with Express RBAC middleware
- **Cloud Hosting:** Railway (Managed PostgreSQL + Express API + Next.js frontend)

## Architectural Mandates & Authoritative References

Always read and conform to the project specifications in `Resources/`:
- **System Architecture:** [`Resources/ARCHITECTURE.md`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/Resources/ARCHITECTURE.md) — the designed relational model (17 relations as specified; **18 tables exist live**, including legacy duplicates), two-tier concurrency control, 4-tier Sri Lankan tax cascade ($SC \rightarrow TDL \rightarrow SSCL \rightarrow VAT$), GoF patterns, and REST endpoints.
- **UI Screen Inventory & Content Copy:** [`Resources/SkyNest_Site_Map_and_Content_Copy.md`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/Resources/SkyNest_Site_Map_and_Content_Copy.md) — Exact editorial copy, form labels, empty states, and validation warnings for all 15 screens.
- **Design System Specification:** [`.gemini/skills/sky-nest-design.md`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/.gemini/skills/sky-nest-design.md) — Typography (`font-cinzel`, `font-jakarta`), color tokens (`#D9722C` `skynest-accent`, `#0B2540` `text-ink`, `#FDFCFA` `bg-paper`), and motion guidelines.

### API Architecture Mandate
The Express backend (port 4000) is the **sole authoritative API surface** (SI-01). The Next.js frontend communicates directly via `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`. Do NOT create duplicate business logic in Next.js `src/app/api/**` route handlers.

### Zero ORM & Raw SQL Mandate
Prisma or any ORM is **strictly forbidden**. All database operations must:
- Use raw SQL executed through domain repositories (`backend/src/repositories/`).
- Access the database pool via `DbAdapter` in `backend/src/config/db.ts`.
- Use 100% parameterized queries (`$1, $2, ...`) for SQL injection defense.
- Respect frozen snapshots: `rate_at_booking` (Rule B8), `price_at_usage` (Rule B10), and versioned taxes (Rule B13).

## Environment

Uses `.env` (not `.env.example`). **The backend reads its own `backend/.env`, not the root `.env`.**

The **active** database is the shared Railway instance — not local Docker:

```env
# backend/.env — ACTIVE
DATABASE_URL=postgresql://postgres:<pw>@hayabusa.proxy.rlwy.net:16058/railway
# LOCAL fallback (commented out by default)
# DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest
```

`infrastructure/docker/init.sql` remains the team's **schema source of truth** (synced with
migrations 001–010), but the running database is Railway. Editing `init.sql` does **not** change
Railway — schema changes must be applied to both. See `Resources/RAILWAY_SETUP_GUIDE.md`.

### Live Schema Warnings (verified 2026-09-17)

The live Railway schema has drifted from `init.sql`. **Trust the live database when writing queries.**

- **`guests` has two identity columns:** `guest_id` (`uuid`, real PK) and `id` (`varchar`, legacy).
  `bookings.booked_by_guest_id` is a **`varchar` holding `guests.id` values** — despite `init.sql`
  declaring it `UUID REFERENCES guests(guest_id)`.
  Correct join: `LEFT JOIN guests g ON g.id = b.booked_by_guest_id`.
  Casting to `::uuid` fails — some rows hold non-UUID seed values like `'GST-COL-001'`.
- **18 tables live**, including legacy duplicates: `users` *and* `user_accounts`, `bills` *and*
  `invoices`. Confirm which holds data before joining.
- **`v_booking_details` uses INNER JOIN** — a booking with zero rooms returns `null`. Fall back to
  the `bookings` table to distinguish "no rooms yet" from "does not exist".

To query the live DB: `psql` is not installed locally — use a throwaway Node script in `backend/`
with `pg` + `dotenv`. Avoid `node -e "…backticks…"` in PowerShell (backtick is PowerShell's escape
character and will mangle JS template literals).

## Repository Structure

```
src/                    Next.js 16 App Router frontend (Port 3000)
  app/
    (auth)/             login, register
    (dashboard)/        LEGACY redirect stubs — not real pages
    dashboard/          dashboard hub + (management)/{bookings,branches,rooms,staff}
    book/               availability search + /book/confirm booking flow
  components/           Marketing (SkyNestHomePage), layout, shared UI
  design-system/        Tokens, fonts, and references
  lib/                  api-client.ts (apiFetch, toNum, ApiError), auth, utils
  styles/               Tailwind v4 tokens + keyframes in globals.css
backend/                Node.js 20 / Express 4 REST API (Port 4000)
  src/
    config/             Database connection adapter (ResilientPgAdapter)
    repositories/       Raw SQL data access layer (Repository Pattern)
    routes/             Express REST route controllers (/api/v1/*)
    middleware/         Auth (JWT), RBAC, Zod validation, error handling
database/               PostgreSQL schema, stored procedures, functions
infrastructure/         docker/init.sql — schema source of truth
Resources/              Architecture, IEEE SRS, DB Design, Site Map & Content Copy
```

> Dashboard pages live under `src/app/dashboard/(management)/`. The `src/app/(dashboard)/` route
> group contains only legacy redirect stubs — do not add pages there.

## Route Handler Pattern (Next.js 16)

When writing any Next.js 16 server route handlers, route params must be awaited:

```tsx
// CORRECT — Next.js 16
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```
