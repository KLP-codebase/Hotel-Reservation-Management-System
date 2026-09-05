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
- **System Architecture:** [`Resources/ARCHITECTURE.md`](file:///f:/Third%20Sem/DB/Project/Github%20Repo/Hotel-Reservation-Management-System/Resources/ARCHITECTURE.md) — 17 normalized relations, two-tier concurrency control, 4-tier Sri Lankan tax cascade ($SC \rightarrow TDL \rightarrow SSCL \rightarrow VAT$), GoF patterns, and REST endpoints.
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

Uses `.env` (not `.env.example`) for local development.

Database URL varies by context:
- **Local dev (outside Docker):** `DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest`
- **Docker Compose:** `DATABASE_URL=postgresql://postgres:skynest_dev@postgres:5432/skynest`

## Repository Structure

```
src/                    Next.js 16 App Router frontend (Port 3000)
  app/                  Pages: (auth), (dashboard), /book, /account
  components/           Marketing (SkyNestHomePage), layout, shared UI
  design-system/        Tokens, fonts, and references
  styles/               Tailwind v4 tokens in globals.css
backend/                Node.js 20 / Express 4 REST API (Port 4000)
  src/
    config/             Database connection adapter (ResilientPgAdapter)
    repositories/       Raw SQL data access layer (Repository Pattern)
    routes/             Express REST route controllers (/api/v1/*)
    middleware/         Auth (JWT), RBAC, Zod validation, error handling
database/               PostgreSQL schema, stored procedures, functions
infrastructure/         Docker Compose (PostgreSQL 15)
Resources/              Architecture, IEEE SRS, DB Design, Site Map & Content Copy
```

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
