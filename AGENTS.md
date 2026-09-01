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

- **Framework:** Next.js 16.3.3 (App Router)
- **React:** 19.2.8
- **CSS:** Tailwind CSS v4.3.3 (`@import "tailwindcss"` + `@theme` in globals.css)
- **Animation:** GSAP + ScrollTrigger (already installed)
- **Database:** PostgreSQL via Prisma
- **Auth:** NextAuth.js

## Environment

Uses `.env` (not `.env.example`) for local development.

Database URL varies by context:
- **Local dev (outside Docker):** `DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest`
- **Docker Compose:** `DATABASE_URL=postgresql://postgres:skynest_dev@postgres:5432/skynest`

## File Structure

```
src/
  app/                  Next.js App Router pages + API routes
  components/
    marketing/          Landing page components (SkyNestHomePage.tsx, SkyNestFooter.tsx)
    layout/             Shell components (Providers.tsx, etc.)
    ui/                 Shared UI components
  design-system/
    references/         COMPONENTS.md, ANIMATIONS.md, LAYOUT.md, INTERACTIONS.md, DESIGN.md
    tokens/             colors.json, typography.json, motion.json, spacing.json
    assets/             fonts.css
  styles/
    globals.css         Tailwind v4 + design tokens
```

## Route Handler Pattern (Next.js 16)

Route params must be awaited:

```tsx
// CORRECT — Next.js 16
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

## Prisma Client

Always import from `@/lib/prisma`, not `@prisma/client` directly.
