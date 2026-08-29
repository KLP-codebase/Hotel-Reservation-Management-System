---
name: sky-nest-design
description: Sky Nest design system — cinematic editorial aesthetic with Cinzel serif display type, Plus Jakarta Sans body text, a 4px spacing grid, glass-surface components, GSAP ScrollTrigger parallax, and slow confident motion. Use this skill whenever building or restyling any UI for Sky Nest — components, pages, layouts, landing pages, prototypes, or mockups — and whenever writing CSS, Tailwind, styled-components, JSX, or inline styles for this project. Also use when reviewing UI code for design consistency, or when the user mentions Sky Nest styling, theming, brand, or "match the design".
---

# Sky Nest Design System

Cinematic editorial aesthetic: full-bleed imagery, Cinzel serif wordmarks over generous whitespace, restrained navy-and-burnt-orange palette, slow GSAP-driven scroll motion. Light-dominant with fully inverted dark sections. The hero is a globally pinned full-viewport section with cloud parallax rising over it on scroll.

## Read this first

Everything you need for standard component work is in this file. Load a reference file only when the task calls for it:

| File | Read it when |
|---|---|
| `src/design-system/references/COMPONENTS.md` | Rebuilding a specific extracted component (buttons, cards, nav) and you need its exact DOM structure and class names |
| `src/design-system/references/ANIMATIONS.md` | Implementing GSAP ScrollTrigger parallax, cloud transition, page transitions, or scroll reveals |
| `src/design-system/references/LAYOUT.md` | Building page-level structure, grids, or section padding |
| `src/design-system/references/INTERACTIONS.md` | Implementing hover states, nav interpolation, focus rings precisely |
| `src/design-system/references/DESIGN.md` | Full raw token extraction dump |
| `src/design-system/tokens/*.json` | Generating a theme file, Tailwind config, or token pipeline programmatically |

**This file is authoritative.** The reference files are supporting documentation — where they disagree with this file, follow this file.

## Tailwind Token Classes (how to actually write classes)

Sky Nest uses a custom Tailwind config. Always use these tokens — never raw hex values in JSX.

| Tailwind class | Value | Use |
|---|---|---|
| `bg-paper` | `#FDFCFA` | Default page background (light sections) |
| `bg-ink` or `text-ink` | `#0B2540` | Primary text / dark section backgrounds |
| `text-ink/[opacity]` | `#0B2540` + alpha | Muted / faded ink text |
| `text-ink-faded` | `#B7C2CC` | Captions, meta on light |
| `bg-skynest-accent` / `text-skynest-accent` | `#D9722C` | Interaction color — hover fills, active states, CTAs only |
| `border-skynest-hairline` | `#E4E1DA` | Dividers, separator lines on light |
| `font-cinzel` | Cinzel (Google Fonts) | Display headings, wordmark |
| `font-jakarta` | Plus Jakarta Sans | Body, UI labels, captions, nav |

> ⚠️ Do NOT use `font-cardinal`, `font-inter-tight`, `--sn-bg`, `--sn-accent (#ff7e15)`, or any other tokens from the old extraction. The live page uses the tokens above.

## Color

Navy-and-paper light mode. Ink is the text and dark section fill. Burnt orange (`#D9722C`) is the sole accent — interaction only.

| Role | Token | Tailwind class | Use |
|---|---|---|---|
| Page background | `#FDFCFA` | `bg-paper` | Light section background |
| Primary text / dark bg | `#0B2540` | `bg-ink` / `text-ink` | Headings, dark section fills |
| Muted text | `#B7C2CC` | `text-ink-faded` | Captions, meta, placeholders |
| Accent | `#D9722C` | `text-skynest-accent` / `bg-skynest-accent` | Hover, active, CTA fill only |
| Hairline divider | `#E4E1DA` | `border-skynest-hairline` | Borders, separator lines |
| White overlay (glass) | `rgba(255,255,255,0.18–0.2)` | `border-white/20` | Glass panels, nav border |
| Dark overlay | `rgba(11,37,64,0.35–0.85)` | `bg-ink/[0.35]` etc. | Hero overlay gradient |

Additional graded values used inline (cannot be Tailwind classes):
- Nav blur background: `rgba(253,252,250, 0–0.72)` interpolated with `navProgress` (0 at hero, 1 after)
- Hero overlay: `radial-gradient(ellipse 120% 70% at 50% 30%, rgba(11,37,64,0.35) 0%, rgba(7,28,48,0.6) 60%, rgba(11,37,64,0.85) 100%)`

Rules:
- Never introduce a hex value outside this table. Use Tailwind tokens.
- Burnt orange is an interaction color. Never use it for large fills, backgrounds, or body text.
- Dark sections swap the entire color set — do not mix `text-ink` on `bg-ink` backgrounds.
- Use `text-white/[opacity]` for text on the hero image, not `text-ink`.

## Typography

Two families. Cinzel is the serif display used for the wordmark and editorial headings. Plus Jakarta Sans is the sans for everything else.

| Role | Tailwind class | Size | Weight | Line height |
|---|---|---|---|---|
| Giant wordmark (hero) | `font-cinzel` | `clamp(100px, 21vw, 260px)` | 400 | 0.85 |
| Display / H1 | `font-cinzel italic` | `clamp(2.5rem, 6vw, 5rem)` | 400–500 | 1.05 |
| H2 | `font-cinzel italic` | `clamp(2rem, 4vw, 3.5rem)` | 400–500 | 1.1 |
| H3 / card title | `font-cinzel italic` | `clamp(1.5rem, 2.5vw, 2rem)` | 500 | 1.2 |
| Body | `font-jakarta` | `1.0625rem` (17px) | 400 | 1.5 |
| Caption / meta | `font-jakarta` | `1rem` (16px) | 400 | 1.4 |
| Button / nav label | `font-jakarta font-medium` | `0.6875rem–0.75rem` (11–12px) | 500 | 1 |
| Eyebrow / badge | `font-cinzel italic` | `13–15px` | 400 | relaxed |
| Story lines (animated) | `font-cinzel` uppercase | `clamp(3rem, 8vw, 8rem)` | 400–500 | 0.9 |

Rules:
- Cinzel for headings, wordmarks, pull quotes, and editorial story text. Jakarta for body, UI, labels, meta.
- Italic is the editorial signature — use for section titles, eyebrows, card titles.
- Nav labels use `tracking-[0.12em] uppercase` — very spaced small caps.
- Story section lines use `tracking-[0.03em]` with `leading-[0.9]` for impact.
- Never add a third font family.

## Spacing & Layout

Base grid **4px**. Every margin, padding, gap, width, and height is a multiple of 4.

| Range | Use |
|---|---|
| 4–8px (`gap-1`, `gap-2`) | Tight — icon to label, meta items |
| 12–16px (`gap-3`, `gap-4`) | Medium — between elements in a group |
| 24–32px (`gap-6`, `gap-8`) | Wide — between groups |
| 48–96px | Section padding |
| 96–160px | Major section padding |
| 320px hero wordmark top padding | Full-viewport hero |

- **Container:** `width: calc(100% - 120px); max-width: 1440px; margin-inline: auto`
- **Tailwind container:** `px-6 md:px-12` on section content
- **Radius:** `4px` default. Nothing larger except `rounded-full` for pills.

Breakpoints: `540px` · `768px` (`md`) · `991px` · `1280px` (`lg`) · `1560px`. Mobile-first.

## Components

### Navigation

The nav is a fixed-top bar that interpolates from fully transparent (over hero image) to frosted glass (on scroll). All values are calculated with `navProgress` (a 0→1 scroll ratio), NOT CSS classes.

```tsx
// navProgress: 0 at hero top, 1 after 80px scroll
const bgAlpha = lerp(0, 0.72, navProgress);
const blurAmt = lerp(0, 12, navProgress);

// Applied as inline style:
background: `rgba(253,252,250,${bgAlpha})`;
backdropFilter: `blur(${blurAmt}px)`;
borderBottom: `1px solid rgba(11,37,64,${lerp(0, 0.07, navProgress)})`;
```

Nav link buttons (White Desert style — bordered rectangles):
```tsx
className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
style={{ color: textColor, borderColor: borderColor, background: fillColor }}
```

Sign In / Dashboard links use amber tint: `text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20`

### Hero Section

The hero is **globally pinned** (`sticky top-0 h-[100dvh]`). Subsequent sections scroll over it. A cloud image (`/07_Clouds.png`, `/Clouds 3.png`) rises over it via GSAP ScrollTrigger scrub.

```tsx
<section className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0">
  {/* Full-bleed background image with radial navy overlay */}
  {/* HairlineGrid overlay (6 vertical hairlines, global SVG) */}
  {/* Top row: eyebrow left + Explore Branches CTA right */}
  {/* Giant SKYNEST wordmark bottom-aligned */}
</section>
```

Giant wordmark style:
```tsx
<span className="font-cinzel font-normal leading-[0.85] text-white text-center whitespace-nowrap block w-full uppercase"
  style={{ fontSize: "clamp(100px, 21vw, 260px)", letterSpacing: "0.03em" }}>
  SKYNEST
</span>
```

### GlobalGridOverlay

One fixed full-page SVG with 6 vertical hairlines using a linearGradient that transitions from white (on dark sections) to navy-tint (on light sections). Always `z-[9999]`, `pointer-events-none`.

### HairlineGrid

Used within individual sections. N+1 dividers forming N columns. Uses `border-white/[0.07]` on dark, `border-ink/[0.06]` on light.

### Button (White Desert style)

```tsx
// Standard bordered nav/hero button
className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
// Hover: border-color and bg shift to accent
```

Explore / CTA button with chevron:
```tsx
className="flex items-center gap-2 font-jakarta text-[11px] md:text-[12px] font-medium tracking-[0.15em] uppercase text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2.5 transition-all duration-300"
```

### Card

Image-led. Cinzel italic card title. Dark gradient overlay revealed on hover.

```tsx
<div className="relative overflow-hidden rounded-[4px]">
  <img className="w-full h-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.03]" />
  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
  <div className="absolute inset-x-0 bottom-0 p-6">
    <h3 className="font-cinzel italic text-white text-clamp-h3 mb-2">Suite Name</h3>
    <div className="flex gap-3 font-jakarta text-white/60 text-sm">...</div>
  </div>
</div>
```

### Glass Surface

```css
.glass {
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    inset 0.35px 0.35px 0 rgba(255,255,255,0.2),
    inset 0 0 1.75px rgba(255,255,255,0.2);
}
```

In Tailwind: `backdrop-blur-[12px] border border-white/20 rounded-[4px]` + `shadow-[inset_0.35px_0.35px_0_rgba(255,255,255,0.2)]`

### Input (underline-only)

```tsx
className="w-full px-4 py-3 bg-transparent border-0 border-b border-skynest-hairline font-jakarta text-[17px] text-ink placeholder-ink-faded focus:border-skynest-accent focus:outline-none transition-colors duration-300"
```

Label: `font-jakarta font-medium text-[14px] uppercase tracking-[0.08em] text-ink-faded`

### Story Section (animated text lines)

Full-width editorial story blocks. Text lines animate line-by-line with GSAP from `y: 60, opacity: 0` to `y: 0, opacity: 1` with 120ms stagger. The section alternates between white background and dark background.

## Motion

All motion runs through GSAP. Do NOT use CSS `animation` or `transition` for scroll-driven effects.

```js
// Easing tokens
ease: "power1.out"      // General scrub motions
ease: "power2.out"      // Label/label reveals  
ease: "expo.out"        // Page-level transitions
ease: "none"            // ScrollTrigger scrub (linear scrub is correct here)
```

Durations for GSAP tweens:
- Micro-interactions: `0.3s` (CSS transitions OK here)
- Scroll reveal / stagger: `0.7–1.2s`
- Hero parallax: scrub with `scrub: 1.2`
- Cloud transition: scrub with `scrub: 2`

ScrollTrigger pattern:
```js
gsap.registerPlugin(ScrollTrigger);
const ctx = gsap.context(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ref.current,
      start: "top 80%",
      end: "top 30%",
      scrub: 1.2,
    },
    defaults: { ease: "none", force3D: true },
  });
  tl.to(el, { y: "18%", scale: 1.08 }, 0);
}, scopeRef);
return () => ctx.revert();
```

Orbital emblem draw animation:
- Uses `strokeDasharray` / `strokeDashoffset` on SVG paths
- Scrubbed from `top 88%` → `top 45%`

Always close with:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In React: `usePrefersReducedMotion()` hook — skip GSAP animations and set final states directly when `reducedMotion === true`.

Background video (if used): `<video autoPlay loop muted playsInline poster="...">`, always with poster frame.

Z-index scale — use only: `0, 1, 2, 10, 40, 50, 100, 9999`. Hero is `z-0`. Cloud transition is `z-10`. Nav is `z-50`. Mobile menu is `z-40`. Global grid overlay is `z-[9999]`.

## Never do

- Use `font-cardinal`, `font-inter-tight`, or any token from the old extraction output
- Use `#ff7e15` — the accent is `#D9722C` (`skynest-accent`)
- Use raw hex values in JSX or CSS — extend tokens or use existing Tailwind classes
- Use spacing that isn't a multiple of 4px
- Put Cinzel on body text or Jakarta on display headings
- Use orange as a background fill for large areas or as body text color
- Use `linear`, `ease`, or `ease-in-out` for CSS transitions on branded interactions
- Use CSS `animation` / `@keyframes` for scroll-driven effects — use GSAP ScrollTrigger
- Skip the `prefers-reduced-motion` guard
- Use z-index values outside the scale: `0, 1, 2, 10, 40, 50, 100, 9999`
- Use `border-radius` larger than `4px` except `rounded-full`

## Workflow

1. Identify whether the section is light (`bg-paper text-ink`) or dark (`bg-ink text-white`), then pick the matching color set.
2. Set type: `font-cinzel` display (often italic), `font-jakarta` body, sizes from the scale.
3. Lay out on the 4px grid inside the container, with generous section padding.
4. Reuse a component above before inventing one.
5. Add motion with GSAP context — always `ctx.revert()` on cleanup. Use scrub for scroll-linked effects.
6. Add `usePrefersReducedMotion()` guard — set final states synchronously when reduced.
7. Audit: every color traces to a Tailwind token. No magic hex values in JSX.

## Known issues (do not repeat these mistakes)

- **Font token names**: Tailwind classes are `font-cinzel`, `font-jakarta`, `font-fraunces`, `font-playfair`. NOT `font-cardinal`, NOT `font-inter-tight`.
- **Accent color**: `#D9722C` (`skynest-accent`). NOT `#ff7e15`.
- **Background token**: `bg-paper` = `#FDFCFA`. NOT `bg-sn-bg`.
- **Easing**: Use GSAP power/expo eases. CSS transitions use `duration-200`–`duration-300` for micro-interactions only.
- **Hero structure**: The hero is `sticky top-0`, NOT `position: fixed`. Subsequent sections scroll over it.
- **Nav transparency**: Computed with inline `lerp()` — NOT CSS class toggling (`.is-scrolled` pattern is not used).
