# Sky Nest — Full Design Extraction (Raw Dump)

> This is the raw auto-extraction output from the live site analysis.
> It contains known contradictions. **This file is secondary to `sky-nest-design.md`.**
> Always follow `sky-nest-design.md` where there is a conflict.

See the "Known extraction issues" section of `sky-nest-design.md` for a list of corrected errors.

---

## Raw Color Extraction

| Token | Raw value |
|---|---|
| Page background | `#ffffff` |
| Dark background | `#0a0a0a` |
| Surface | `#ededed` |
| Surface dark | `#12141a` |
| Text primary | `#1f2a44` |
| Text muted | `#535353` |
| Text inverted | `#ededed` |
| Text inverted muted | `#a8acb3` |
| Accent | `#ff7e15` |
| Border light | `#c0c0c0` |
| Border dark | `#1f2330` |
| Border glass | `rgba(255,255,255,0.2)` |

---

## Raw Typography Extraction

> ⚠️ Extraction issue: sizes below were computed at a narrow viewport and don't represent design intent. Use the clamp-based scale in `sky-nest-design.md`.

| Element | Family | Size (raw) | Weight |
|---|---|---|---|
| H1 | Cardinal Classic Long | ~1.5rem | 400 |
| H2 | Cardinal Classic Long | ~1.25rem | 400 |
| Body | Inter Tight | 17.3px | 400 |
| Caption | Inter Tight | 16px | 400 |
| Label/Button | Inter Tight | 14px | 500 |

> ⚠️ Extraction issue: font family roles were inverted in early analysis. Cardinal Classic Long is the **serif display** face. Inter Tight is the **body/UI sans**. This is now corrected in `sky-nest-design.md`.

---

## Raw Spacing Extraction

| Context | Value |
|---|---|
| Section padding (observed) | `64px–160px` |
| Hero top | `320px` |
| Card padding | `24px` |
| Nav padding | `24px` |
| Grid gap (col) | `12px` |
| Grid gap (row) | `24px` |

---

## Raw Motion Extraction

> ⚠️ Extraction issue: easing was logged as `linear` and durations as `0ms`. Both are wrong. Use tokens in `sky-nest-design.md`.

| Property | Raw / Corrected |
|---|---|
| Micro-interaction easing | `cubic-bezier(0.5, 1, 0.89, 1)` |
| Reveal easing | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Page transition easing | `cubic-bezier(0.76, 0, 0.24, 1)` |
| Fast duration | `0.3s` |
| Slow duration | `1.4s` |

---

## Raw Component Class Inventory

Classes observed on the live site. Not all are documented above — these are for traceability only.

```
.btn
.btn-inner
.btn-text
.btn-icon
.btn-tab
.btn-large
.btn-mobile
.btn-image
.glass
.card
.card_image
.card_overlay
.card_content
.card_title
.card_meta
.card-flick
.card-flick_track
.card-flick_item
.input
.input-group
.input-label
.nav
.nav_container
.nav_logo
.nav_links
.nav_link
.nav_cta
.nav.is-scrolled
.hero
.hero_content
.hero_title
.hero_sub
.hero_bg
.video-bg
.video-bg_media
.video-bg_overlay
.section
.section--dark
.container
.grid
.footer
.footer_top
.footer_bottom
.footer_brand
.footer_tagline
.footer_heading
.footer_links
.footer_legal
[data-reveal]
[data-reveal].is-visible
[data-reveal-stagger]
.t-title-italic
.page-transition
.page-transition-exit
```

---

## Extraction Notes

- Site uses a CMS-driven page builder. Some classes may be generated and not reusable.
- Dark/light section alternation is structural — sections carry `section--dark` explicitly.
- Glass components appear in booking widgets, overlaid CTAs, and the nav on scroll.
- Video backgrounds are used exclusively for hero sections.
- The card-flick variant is the primary room/suite listing component.
- Screenshot references were removed — image directories were not included in the package.
