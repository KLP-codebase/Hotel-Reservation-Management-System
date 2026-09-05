# Sky Nest — Full Design Extraction (Corrected from Landing Page)

> This file reflects what is actually implemented in `src/components/marketing/SkyNestHomePage.tsx`.
> **This file is secondary to `.gemini/skills/sky-nest-design.md`.**
> Always follow `sky-nest-design.md` where there is a conflict.

---

## Color Tokens (Tailwind config → `tailwind.config.js`)

| Tailwind token | Hex / value | Role |
|---|---|---|
| `paper` | `#FDFCFA` | Default light background |
| `ink` | `#0B2540` | Navy — text on light, dark section fill |
| `ink-faded` | `#B7C2CC` | Muted / secondary text on light |
| `skynest-accent` | `#D9722C` | Burnt orange — interaction only |
| `skynest-hairline` | `#E4E1DA` | Dividers, border lines on light |

> ⚠️ Correction: earlier extraction listed `#ff7e15` as the accent. The live page uses `#D9722C`. Do not use the old value.

Inline overlay values (not Tailwind classes):
- Hero radial overlay: `rgba(11,37,64, 0.35–0.85)` — navy depth fade
- Nav frosted glass: `rgba(253,252,250, 0–0.72)` at `blur(0–12px)`
- Glass hairline: `rgba(255,255,255,0.18–0.2)`

---

## Typography Tokens

| Element | Family | Tailwind | Size / class | Weight |
|---|---|---|---|---|
| Giant wordmark | Cinzel | `font-cinzel` | `clamp(100px, 21vw, 260px)` | 400 |
| Display / H1 | Cinzel italic | `font-cinzel italic` | `clamp(2.5rem, 6vw, 5rem)` | 400–500 |
| H2 | Cinzel italic | `font-cinzel italic` | `clamp(2rem, 4vw, 3.5rem)` | 400 |
| H3 / card | Cinzel italic | `font-cinzel italic` | `clamp(1.5rem, 2.5vw, 2rem)` | 500 |
| Story lines | Cinzel | `font-cinzel uppercase` | `clamp(3rem, 8vw, 8rem)` | 400 |
| Eyebrow | Cinzel italic | `font-cinzel italic` | `13–15px` | 400 |
| Body | Plus Jakarta | `font-jakarta` | `17px / 1.0625rem` | 400 |
| Caption | Plus Jakarta | `font-jakarta` | `16px / 1rem` | 400 |
| Nav label | Plus Jakarta | `font-jakarta font-medium` | `11–12px, tracking-[0.12em]` | 500 |

> ⚠️ Correction: earlier extraction referred to "Cardinal Classic Long" and "Inter Tight". The live page uses Cinzel (Google Fonts) and Plus Jakarta Sans. Font Tailwind class names are `font-cinzel` and `font-jakarta`.

---

## Spacing

| Context | Value |
|---|---|
| Hero top padding | `100dvh` (fullscreen, no explicit top pad) |
| Section padding (typical) | `py-24 md:py-32` |
| Section padding (heavy) | `py-32 md:py-40` |
| Card padding | `p-6` |
| Nav height | `h-14 md:h-16` |
| Nav horizontal padding | `px-6 md:px-8` |
| Grid gap (standard) | `gap-6` |
| Grid gap (tight) | `gap-2.5` (nav buttons) |

---

## Motion — GSAP ScrollTrigger (Corrected)

All scroll-driven animation runs through GSAP. CSS `@keyframes` are not used for scroll effects.

| Effect | Method | Config |
|---|---|---|
| Hero background parallax | ScrollTrigger scrub | `start: "top top", end: "+=120%", scrub: 1.2` |
| Wordmark sink | ScrollTrigger scrub | `y: "30%", opacity: 0.15` on scroll |
| Cloud rise | ScrollTrigger scrub | `start: "top bottom", end: "bottom bottom", scrub: 2` |
| Story line reveals | Timeline stagger | `y: 60 → 0, opacity: 0 → 1`, 120ms stagger |
| Orbital emblem draw | strokeDashoffset scrub | `start: "top 88%", end: "top 45%", scrub: 1.2` |

> ⚠️ Correction: earlier extraction listed CSS `data-reveal` attribute + IntersectionObserver with `translateY(20rem)`. The live page exclusively uses GSAP ScrollTrigger with `gsap.context()` and `ctx.revert()` for cleanup.

Easing used in practice:
```js
ease: "power1.out"   // General scroll reveals
ease: "power2.out"   // Labels, overlays
ease: "none"         // scrub timelines (linear is correct inside scrub)
```

---

## Component Class Inventory (Live Page)

Classes and patterns observed in `SkyNestHomePage.tsx`:

```
// Layout
.hero → section.sticky.top-0.h-[100dvh]
.container → px-6 md:px-12 on section inner
.section-light → bg-paper text-ink py-24 md:py-32
.section-dark → bg-ink text-white py-24 md:py-32

// Nav
#skynest-nav → fixed, z-50, inline-style glass interpolation
.nav-link-btn → bordered rectangle, font-jakarta, tracking-[0.12em] uppercase
.nav-wordmark → centered absolute, MountainGlyph SVG + SKYNEST text

// Hero
#hero → sticky top-0 h-[100dvh] bg-ink
.hero-bg-image → absolute inset-0, radial-gradient overlay
.hero-wordmark → font-cinzel, clamp(100px, 21vw, 260px), leading-[0.85]
.hero-eyebrow → font-cinzel italic text-white/75 text-[13–15px]
.hero-cta → border border-white/20 hover:border-white/40 px-4 py-2.5

// Cloud Transition
.cloud-transition → relative z-10 h-[120dvh] pointer-events-none overflow-hidden
.cloud-layer → absolute bottom-0, 220% wide, mask-image gradient

// GlobalGridOverlay
.grid-overlay → fixed inset-0 z-[9999] pointer-events-none (SVG, linearGradient lines)

// HairlineGrid
.hairline-grid → absolute inset-0, N+1 flex dividers, border-white/[0.07]

// Cards
.card → relative overflow-hidden rounded-[4px] group
.card-image → absolute inset-0 object-cover, scale on hover
.card-overlay → gradient-to-t from-ink/70, opacity-0 → opacity-100 on hover
.card-title → font-cinzel italic text-white

// Buttons
.btn-white-desert → bordered rectangle, font-jakarta, tracking-[0.12em] uppercase
.btn-amber (Sign In / Dashboard) → text-amber-400 border-amber-500/30 bg-amber-500/10
.btn-red (Log Out) → text-red-400 border-red-500/30 bg-red-500/10

// Inputs
.input-underline → border-b border-skynest-hairline, focus:border-skynest-accent

// Story sections
.story-line → font-cinzel uppercase, clamp(3rem, 8vw, 8rem), GSAP stagger reveal

// Orbital emblem
.sweeping-orbital → inline SVG with path + ellipse, strokeDashoffset draw animation

// Glyph
.mountain-glyph → inline SVG path "M1 15 L10 3 L14 8 L18 2 L27 15", stroke currentColor
```

---

## Extraction Notes

- The hero is `sticky top-0` (not `position: fixed`). Subsequent sections scroll over it at `z-10+`.
- Nav interpolates inline with JS `lerp()` — not a CSS `.is-scrolled` class toggle.
- The Cloud Transition uses a `h-[120dvh]` spacer so the hero has room to be covered.
- Glass surface (`backdrop-filter: blur(12px)`) is used in the nav — confirmed intentional.
- Story text is ALL-CAPS (`uppercase`) Cinzel with very tight line-height (`leading-[0.9]`).
- The orbital emblem SVG label uses `font-cinzel italic text-[12–14px] tracking-[0.08em]`.
- `usePrefersReducedMotion()` hook gates ALL GSAP effects — final states are set synchronously.
