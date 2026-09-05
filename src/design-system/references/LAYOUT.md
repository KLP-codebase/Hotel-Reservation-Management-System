# Sky Nest — Layout Reference

> Page-level structure, grids, containers, and section patterns from `SkyNestHomePage.tsx`.
> **This file is secondary** — where it conflicts with `.gemini/skills/sky-nest-design.md`, follow that file.

---

## Container

```tsx
// Tailwind equivalent:
className="px-6 md:px-12 w-full max-w-[1440px] mx-auto"

// Or with calc (CSS):
.container {
  width: calc(100% - 120px);
  max-width: 1440px;
  margin-inline: auto;
}

@media (max-width: 991px) {
  .container { width: calc(100% - 64px); }
}

@media (max-width: 540px) {
  .container { width: calc(100% - 32px); }
}
```

---

## Breakpoints

Mobile-first. All media queries use `min-width`.

| Tailwind | Value | Use |
|---|---|---|
| `sm` | `640px` | Landscape phones |
| `md` | `768px` | Tablets, primary mobile breakpoint |
| `lg` | `1024px` | Standard desktop |
| `xl` | `1280px` | Wide desktop |
| `2xl` | `1536px` | Ultrawide |

Custom breakpoints used in the landing page: `540px`, `991px`, `1280px`, `1560px`.

---

## Page-Level Layer Stack

The landing page uses a **layered sticky/scroll** architecture:

```
z-[9999]  GlobalGridOverlay (pointer-events-none fixed SVG)
z-50      Navigation (fixed top)
z-40      Mobile menu overlay
z-10      CloudTransition section (scrolls OVER the hero)
z-0       Hero section (sticky top-0 — intentionally below cloud layer)
          All other sections (standard document flow, scroll over hero)
```

> The hero is `sticky top-0 z-0`. Cloud and subsequent sections are at `z-10+` so they visually cover the hero on scroll.

---

## Section Structure

### Light Section (paper background)

```tsx
<section className="relative bg-paper text-ink py-24 md:py-32 overflow-hidden">
  <div className="px-6 md:px-12 max-w-[1440px] mx-auto">
    {/* content */}
  </div>
</section>
```

### Dark / Inverted Section

```tsx
<section className="relative bg-ink text-white py-24 md:py-32 overflow-hidden">
  <div className="px-6 md:px-12 max-w-[1440px] mx-auto">
    {/* content */}
  </div>
</section>
```

> Swap the **entire** color set. Do not mix `text-ink` on `bg-ink` sections.

### Hero Section (pinned full-viewport)

```tsx
<section className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0">
  {/* Background image fills entire viewport */}
  {/* Content is positioned with flexbox (top row at top, wordmark at bottom) */}
</section>
```

---

## Section Spacing Reference

| Context | Tailwind | Value |
|---|---|---|
| Tight section padding | `py-12` | 48px |
| Standard section padding | `py-24 md:py-32` | 96px–128px |
| Heavy section padding | `py-32 md:py-40` | 128px–160px |
| Hero top content padding | `pt-24 md:pt-28` | 96px–112px (below fixed nav) |
| Group gap (large) | `gap-16` | 64px |
| Group gap (standard) | `gap-8 md:gap-12` | 32px–48px |
| Element gap | `gap-3 gap-4` | 12px–16px |
| Tight gap (icon-label) | `gap-1 gap-2` | 4px–8px |

---

## Grid

12-column grid. Tailwind-based — use `grid grid-cols-12 gap-6`.

```tsx
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-12">     {/* Full width */}
  <div className="col-span-6">      {/* Half width */}
  <div className="col-span-4 md:col-span-12"> {/* Third → full on mobile */}
</div>
```

Cards use a 3-column grid on desktop:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
```

---

## Footer

Dark section. Brand name in Cinzel italic. Link columns in Plus Jakarta.

```tsx
<footer className="bg-ink text-white py-24 border-t border-white/10">
  <div className="px-6 md:px-12 max-w-[1440px] mx-auto">
    {/* Top: brand left, link columns right */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
      <div>
        <span className="block font-cinzel italic text-2xl text-white mb-3">Sky Nest</span>
        <p className="font-jakarta text-base text-white/50">A place apart.</p>
      </div>
      {/* 3 link column navs */}
    </div>
    {/* Bottom: legal */}
    <div className="border-t border-white/10 pt-6">
      <p className="font-jakarta text-base text-white/40">© 2025 Sky Nest. All rights reserved.</p>
    </div>
  </div>
</footer>
```

Footer link style:
```tsx
className="font-jakarta text-base text-white/70 hover:text-white transition-colors duration-300"
```

Footer heading (column title):
```tsx
className="font-jakarta font-medium text-[14px] uppercase tracking-[0.08em] text-white/40 mb-4"
```

---

## HairlineGrid

Used inside individual sections for vertical column guides. NOT the same as GlobalGridOverlay (which is fixed across the entire page).

```tsx
function HairlineGrid({ count = 5, color = "border-white/[0.07]" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex" style={{ zIndex: 1 }}>
      {Array.from({ length: count + 1 }).map((_, i) => (
        <div key={i} className={`flex-1 border-l ${color} last:border-r`} />
      ))}
    </div>
  );
}
```

Color by section type:
- On dark sections / hero: `border-white/[0.07]`
- On light sections: `border-ink/[0.06]`

---

## Story Section Layout

Full-bleed text that takes up most of the viewport width. Lines are stacked vertically, aligned left or right alternately.

```tsx
<section className="relative bg-paper py-32 overflow-hidden">
  <HairlineGrid count={5} color="border-ink/[0.06]" />
  <div className="px-6 md:px-12 max-w-[1440px] mx-auto relative z-10">
    <div className="space-y-0">
      {STORY_LINES.map((line, i) => (
        <div key={i} className="overflow-hidden">
          <span
            className="block font-cinzel uppercase text-ink"
            style={{ fontSize: "clamp(3rem, 8vw, 8rem)", lineHeight: "0.9", letterSpacing: "0.02em" }}
          >
            {line}
          </span>
        </div>
      ))}
    </div>
  </div>
</section>
```
