# Sky Nest — Layout Reference

> Page-level structure, grids, containers, and section patterns.
> **This file is secondary** — where it conflicts with `sky-nest-design.md`, follow `sky-nest-design.md`.

---

## Container

```css
.container {
  width: calc(100% - 120px);
  max-width: 1440px;
  margin-inline: auto;
}

@media (max-width: 991px) {
  .container {
    width: calc(100% - 64px);
  }
}

@media (max-width: 540px) {
  .container {
    width: calc(100% - 32px);
  }
}
```

> ⚠️ Known extraction issue: raw docs listed `991px` as a container width. Correct value is `calc(100% - 120px)` with `max-width: 1440px`.

---

## 12-Column Grid

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px 12px; /* row-gap column-gap */
}

/* Common span patterns */
.col-12 { grid-column: span 12; }
.col-10 { grid-column: span 10; }
.col-8  { grid-column: span 8; }
.col-6  { grid-column: span 6; }
.col-4  { grid-column: span 4; }
.col-3  { grid-column: span 3; }

/* Centered narrow columns */
.col-8.centered  { grid-column: 3 / span 8; }
.col-10.centered { grid-column: 2 / span 10; }

@media (max-width: 991px) {
  .col-4  { grid-column: span 6; }
  .col-3  { grid-column: span 6; }
}

@media (max-width: 768px) {
  .grid   { grid-template-columns: repeat(4, 1fr); }
  .col-4, .col-3, .col-6, .col-8, .col-10, .col-12 { grid-column: span 4; }
}
```

---

## Breakpoints

Mobile-first. All media queries use `min-width` unless noted.

| Name | Value | Use |
|---|---|---|
| `xs` | `540px` | Small phones → landscape |
| `sm` | `768px` | Tablets |
| `md` | `991px` | Small desktops / landscape tablets |
| `lg` | `1280px` | Standard desktop |
| `xl` | `1560px` | Wide desktop |

---

## Section Structure

### Light Section (default)

```html
<section class="section">
  <div class="container">
    <!-- content -->
  </div>
</section>
```

```css
.section {
  padding-block: 96px 160px;
  background: var(--sn-bg);
  color: var(--sn-text);
}
```

### Dark / Inverted Section

```html
<section class="section section--dark">
  <div class="container">
    <!-- content -->
  </div>
</section>
```

```css
.section--dark {
  background: var(--sn-bg-dark);
  color: var(--sn-text-invert);
}
```

> Swap the **entire** color set — do not mix `--sn-text` onto `--sn-bg-dark`.

### Hero Section

```html
<section class="hero">
  <div class="video-bg"><!-- video background --></div>
  <div class="hero_content container">
    <h1 class="hero_title">A Place Apart</h1>
    <p class="hero_sub">...</p>
    <button class="btn btn-large" type="button">
      <div class="btn-inner">
        <span class="btn-text">Discover</span>
      </div>
    </button>
  </div>
</section>
```

```css
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: flex-end;
  padding-bottom: 96px;
  overflow: hidden;
  z-index: 1;
}

.hero_content {
  position: relative;
  z-index: 10;
}

.hero_title {
  font-family: "Cardinal Classic Long", serif;
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-style: italic;
  line-height: 1.05;
  color: var(--sn-text-invert);
  max-width: 14ch;
  margin-bottom: 24px;
}

.hero_sub {
  font: 400 1.0625rem "Inter Tight", sans-serif;
  color: var(--sn-text-invert-muted);
  max-width: 44ch;
  margin-bottom: 40px;
}
```

---

## Section Spacing Reference

| Context | Value |
|---|---|
| Section padding (min) | `64px` |
| Section padding (typical) | `96px` |
| Section padding (max / hero) | `160px` |
| Hero top padding | `320px` |
| Group gap (large) | `64px` |
| Group gap (standard) | `32px–24px` |
| Element gap | `12px–16px` |
| Tight gap | `4px–8px` |

---

## Footer

```html
<footer class="footer">
  <div class="container">
    <div class="footer_top grid">
      <div class="col-4">
        <span class="footer_brand">Sky Nest</span>
        <p class="footer_tagline">A place apart.</p>
      </div>
      <div class="col-8 grid">
        <nav class="col-3" aria-label="Rooms">
          <h4 class="footer_heading">Rooms</h4>
          <ul class="footer_links" role="list">
            <li><a href="/rooms/suites">Suites</a></li>
            <li><a href="/rooms/villas">Villas</a></li>
          </ul>
        </nav>
        <!-- more nav columns -->
      </div>
    </div>
    <div class="footer_bottom">
      <p class="footer_legal">© 2025 Sky Nest. All rights reserved.</p>
    </div>
  </div>
</footer>
```

```css
.footer {
  background: var(--sn-bg-dark);
  color: var(--sn-text-invert);
  padding-block: 96px 48px;
  border-top: 1px solid var(--sn-border-dark);
}

.footer_brand {
  font-family: "Cardinal Classic Long", serif;
  font-size: 1.5rem;
  font-style: italic;
  color: var(--sn-text-invert);
  display: block;
  margin-bottom: 12px;
}

.footer_tagline {
  font: 400 1rem "Inter Tight", sans-serif;
  color: var(--sn-text-invert-muted);
}

.footer_heading {
  font: 500 0.875rem "Inter Tight", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sn-text-invert-muted);
  margin-bottom: 16px;
}

.footer_links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer_links a {
  font: 400 1rem "Inter Tight", sans-serif;
  color: var(--sn-text-invert);
  text-decoration: none;
  transition: color 0.3s var(--ease-out);
}

.footer_links a:hover {
  color: var(--sn-accent);
}

.footer_bottom {
  margin-top: 96px;
  padding-top: 24px;
  border-top: 1px solid var(--sn-border-dark);
}

.footer_legal {
  font: 400 1rem "Inter Tight", sans-serif;
  color: var(--sn-text-invert-muted);
}
```
