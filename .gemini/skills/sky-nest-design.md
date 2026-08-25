---
name: sky-nest-design
description: Sky Nest design system — cinematic editorial aesthetic with Cardinal Classic Long serif display type, Inter Tight body text, a 4px spacing grid, glass-surface components, and long-easing scroll motion. Use this skill whenever building or restyling any UI for Sky Nest — components, pages, layouts, landing pages, prototypes, or mockups — and whenever writing CSS, Tailwind, styled-components, JSX, or inline styles for this project. Also use when reviewing UI code for design consistency, or when the user mentions Sky Nest styling, theming, brand, or "match the design".
---

# Sky Nest Design System

Cinematic editorial aesthetic: full-bleed imagery and video, serif display type over generous whitespace, restrained navy-and-orange palette, slow confident motion. Light-dominant with inverted dark sections.

## Read this first

Everything you need for standard component work is in this file. Load a reference file only when the task calls for it:

| File | Read it when |
|---|---|
| `src/design-system/references/COMPONENTS.md` | Rebuilding a specific extracted component (cards, buttons) and you need its DOM structure and class names |
| `src/design-system/references/ANIMATIONS.md` | Implementing scroll reveals, page transitions, or video backgrounds |
| `src/design-system/references/LAYOUT.md` | Building page-level structure, grids, or section padding |
| `src/design-system/references/INTERACTIONS.md` | Implementing hover and focus states precisely |
| `src/design-system/references/DESIGN.md` | You want the full raw extraction dump |
| `src/design-system/tokens/*.json` | Generating a theme file, Tailwind config, or token pipeline programmatically |

**This file is authoritative.** The reference files are raw auto-extraction output and contain known contradictions — where they disagree with this file, follow this file. See "Known extraction issues" at the end.

## Color

Light-dominant. Navy is the text color, not a background. Orange is the sole accent and it appears almost exclusively on interaction.

| Role | Value | Tailwind class | Use |
|---|---|---|---|
| `--sn-bg` | `#ffffff` | `bg-sn-bg` | Default page background |
| `--sn-bg-dark` | `#0a0a0a` | `bg-sn-bg-dark` | Inverted sections, footer, video overlays |
| `--sn-surface` | `#ededed` | `bg-sn-surface` | Cards, panels on light background |
| `--sn-surface-dark` | `#12141a` | `bg-sn-surface-dark` | Cards, panels on dark background |
| `--sn-text` | `#1f2a44` | `text-sn-text` | Headings and body on light |
| `--sn-text-muted` | `#535353` | `text-sn-text-muted` | Captions, meta, placeholders |
| `--sn-text-invert` | `#ededed` | `text-sn-text-invert` | Body text on dark sections |
| `--sn-text-invert-muted` | `#a8acb3` | `text-sn-text-invert-muted` | Muted text on dark sections |
| `--sn-accent` | `#ff7e15` | `text-sn-accent` / `bg-sn-accent` | Hover fills, active states, CTAs |
| `--sn-border` | `#c0c0c0` | `border-sn-border` | Dividers, input borders on light |
| `--sn-border-dark` | `#1f2330` | `border-sn-border-dark` | Dividers on dark |
| `--sn-border-glass` | `rgba(255,255,255,.2)` | `border-sn-border-glass` | Glass component hairline |

Rules:

- Never introduce a hex outside this table. Extend the tokens first.
- Orange is an interaction color. Do not use it for large fills or body text.
- On dark sections, swap the whole set — do not mix `--sn-text` onto `--sn-bg-dark`.

## Typography

Two families. Cardinal Classic Long is a **serif display** face; Inter Tight is the sans for everything else.

| Role | Family | Tailwind class | Size | Weight | Line height |
|---|---|---|---|---|---|
| Display / H1 | Cardinal Classic Long | `font-cardinal` | `clamp(2.5rem, 6vw, 5rem)` | 400–500 | 1.05 |
| H2 | Cardinal Classic Long | `font-cardinal` | `clamp(2rem, 4vw, 3.5rem)` | 400–500 | 1.1 |
| H3 | Cardinal Classic Long | `font-cardinal` | `clamp(1.5rem, 2.5vw, 2rem)` | 500 | 1.2 |
| Title italic | Cardinal Classic Long *italic* | `font-cardinal italic` | inherits | 400 | 1.2 |
| Body | Inter Tight | `font-inter-tight` | `1.0625rem` (17px) | 400 | 1.5 |
| Caption / meta | Inter Tight | `font-inter-tight` | `1rem` (16px) | 400 | 1.4 |
| Button / nav label | Inter Tight | `font-inter-tight` | `0.875rem` (14px) | 500 | 1 |

Rules:

- Serif for headings and pull quotes. Sans for body, UI, labels, meta. Never the reverse.
- The italic serif (`.t-title-italic`) is the signature editorial voice — use it for section titles and quotes.
- Max 4 sizes per screen.
- Never add a third family.

Fonts are loaded via `src/design-system/assets/fonts.css` — already imported in `globals.css`.

## Spacing & layout

Base grid **4px**. Every margin, padding, gap, width, and height is a multiple of 4.

| Range | Use |
|---|---|
| 4–8px | Tight — icon to label, meta items |
| 12–16px | Medium — between elements in a group |
| 24–32px | Wide — between groups |
| 64–160px | Section padding |
| 320px | Hero and major section top padding |

- **Container:** `width: calc(100% - 120px); max-width: 1440px; margin-inline: auto`
- **Grid:** 12-column, `gap: 24px 12px`
- **Radius:** `4px` default, `8px` for larger cards, `100%` for circular. Nothing else.

Breakpoints: `540px` · `768px` · `991px` · `1280px` · `1560px`. Mobile-first.

## Components

### Button

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(31, 42, 68, 0.2);
  color: var(--sn-text-invert);
  font: 500 0.875rem "Inter Tight", sans-serif;
  cursor: pointer;
  transition: 0.3s cubic-bezier(0.5, 1, 0.89, 1);
}
.btn:hover {
  background: var(--sn-accent);
  border-color: var(--sn-accent);
}
.btn:focus-visible {
  outline: 1px auto currentColor;
}
```

Structure:

```html
<button class="btn" type="button">
  <div class="btn-inner">
    <span class="btn-text">Enquire</span>
    <div class="btn-icon"><!-- 11×11 svg, stroke-width .5 --></div>
  </div>
</button>
```

Variants: `.btn-tab`, `.btn-large`, `.btn-mobile`, `.btn-image`.

### Glass surface

```css
.glass {
  position: relative;
  border: 1px solid var(--sn-border-glass);
  border-radius: 4px;
  backdrop-filter: blur(12px);
  box-shadow:
    inset 0.35px 0.35px 0 rgba(255, 255, 255, 0.2),
    inset 0 0 1.75px rgba(255, 255, 255, 0.2);
  --glass-opacity: 0.05;
  --glass-scale: 0.35;
}
```

### Card

```css
.card { position: relative; overflow: hidden; border-radius: 4px; }
.card_image img { width: 100%; height: 100%; object-fit: cover; }
.card_overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(10,10,10,.7), transparent 60%);
  opacity: 0;
  transition: opacity 0.4s;
}
.card:hover .card_overlay { opacity: 1; }
.card_content { position: absolute; inset-inline: 0; bottom: 0; padding: 24px; }
.card_title { font-family: "Cardinal Classic Long", serif; font-style: italic; }
.card_meta { display: flex; gap: 12px; font-size: 1rem; color: var(--sn-text-invert-muted); }
```

### Input

```css
.input {
  padding: 12px 16px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--sn-border);
  border-radius: 0;
  color: var(--sn-text);
  font: 400 1.0625rem "Inter Tight", sans-serif;
  transition: border-color 0.3s;
}
.input:focus { border-color: var(--sn-accent); outline: none; }
.input::placeholder { color: var(--sn-text-muted); }
```

## Motion

```css
:root {
  --ease-out: cubic-bezier(0.5, 1, 0.89, 1);
  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-inout: cubic-bezier(0.76, 0, 0.24, 1);
  --dur-fast: 0.3s;
  --dur-mid: 0.6s;
  --dur-slow: 1.4s;
}
```

- **Micro-interactions:** `0.3s var(--ease-out)`
- **Reveals and transitions:** `1.4s var(--ease-expo)`
- **Page transitions:** `0.8s var(--ease-inout)`

Scroll reveal:

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(20rem);
  transition: opacity 1.4s var(--ease-expo), transform 1.4s var(--ease-expo);
}
[data-reveal].is-visible { opacity: 1; transform: translateY(0); }
```

Always close with:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Background video: `<video autoplay loop muted playsinline poster="...">`, always with a poster frame.

Z-index scale — use only: `1, 2, 10, 100, 1000, 9999`.

## Never do

- Introduce colors, fonts, or radii outside the tables above
- Use spacing that isn't a multiple of 4px
- Put serif on body text or sans on display headings
- Use orange as a background fill for large areas or as body text color
- Use short snappy easing (`linear`, `ease`)
- Zebra-stripe tables or lists; separate with borders
- Ship without a `prefers-reduced-motion` block

## Workflow

1. Identify whether the section is light or dark, then pick the matching color set.
2. Set type: `font-cardinal` display, `font-inter-tight` body, sizes from the scale.
3. Lay out on the 4px grid inside the container, with generous section padding.
4. Reuse a component above before inventing one.
5. Add motion with the easing tokens and a reduced-motion guard.
6. Audit: every value traces to a token. No magic numbers.

## Known extraction issues

- **Font roles were inverted.** Cardinal Classic Long is a serif display face; Inter Tight is the body sans.
- **"No blur effects" is false.** The glass surface signature component uses `backdrop-filter`.
- **Theme was flattened to "light".** It is light-dominant with fully inverted dark sections.
- **Type scale is not a real display scale.** Use the clamp-based scale above.
- **Easing guidance said `linear` and listed `0ms`.** Use the cubic-bezier tokens.
- **Container width conflicted.** `calc(100% - 120px)` is correct.
- **`tokens/typography.json` lists font filenames that aren't bundled.** Use `assets/fonts.css`.
