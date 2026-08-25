# Sky Nest — Interactions Reference

> Hover states, focus rings, and micro-interaction patterns.
> **This file is secondary** — where it conflicts with `sky-nest-design.md`, follow `sky-nest-design.md`.

---

## Easing Quick Reference

All interactions use `0.3s var(--ease-out)` for micro-interactions:

```css
--ease-out: cubic-bezier(0.5, 1, 0.89, 1);
```

> ⚠️ Known extraction issue: raw docs said `linear`. Never use `linear` or bare `ease` for this system.

---

## Hover States

### Link / Nav

```css
.nav_link {
  color: var(--sn-text-invert);
  transition: color 0.3s var(--ease-out);
}
.nav_link:hover { color: var(--sn-accent); }

/* On scrolled / light nav */
.nav.is-scrolled .nav_link {
  color: var(--sn-text);
}
.nav.is-scrolled .nav_link:hover { color: var(--sn-accent); }
```

### Button

```css
.btn {
  background: rgba(31, 42, 68, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
  transition: background 0.3s var(--ease-out), border-color 0.3s var(--ease-out);
}
.btn:hover {
  background: var(--sn-accent);
  border-color: var(--sn-accent);
}
```

### Card Image Zoom

```css
.card_image img {
  transition: transform 0.6s var(--ease-expo);
}
.card:hover .card_image img {
  transform: scale(1.03);
}
```

### Card Overlay Reveal

```css
.card_overlay {
  opacity: 0;
  transition: opacity 0.4s var(--ease-out);
}
.card:hover .card_overlay {
  opacity: 1;
}
```

### Footer Links

```css
.footer_links a {
  transition: color 0.3s var(--ease-out);
}
.footer_links a:hover {
  color: var(--sn-accent);
}
```

### Input Focus

```css
.input {
  border-bottom-color: var(--sn-border);
  transition: border-color 0.3s var(--ease-out);
}
.input:focus {
  border-bottom-color: var(--sn-accent);
  outline: none;
}
```

---

## Focus Rings

Accessible focus rings. Use `focus-visible` — not `focus` — to avoid mouse focus rings:

```css
/* Default: respect browser ring */
:focus-visible {
  outline: 2px solid var(--sn-accent);
  outline-offset: 4px;
}

/* Button: current color, looks correct on any background */
.btn:focus-visible {
  outline: 1px auto currentColor;
}

/* Input: no extra ring, the border handles it */
.input:focus-visible {
  outline: none;
}

/* Nav links */
.nav_link:focus-visible {
  outline: 1px solid var(--sn-accent);
  outline-offset: 4px;
  border-radius: 2px;
}
```

---

## Pointer Cursor

Apply `cursor: pointer` only to interactive elements. Do not add it to non-interactive divs.

```css
button, [role="button"], a, label[for], .card-flick_item { cursor: pointer; }
```

---

## Active / Selected States

Use `--sn-accent` for active tab, selected filter, or current nav item. Never use it as a large fill:

```css
.btn-tab.is-active {
  background: var(--sn-accent);
  border-color: var(--sn-accent);
  color: #ffffff;
}

.nav_link[aria-current="page"] {
  color: var(--sn-accent);
}
```

---

## Disabled States

```css
.btn:disabled,
.btn[aria-disabled="true"] {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Scroll-Triggered Class Toggle (JS)

For the sticky nav transparency change:

```js
const nav = document.getElementById("site-nav");
const SCROLL_THRESHOLD = 80;

window.addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", window.scrollY > SCROLL_THRESHOLD);
}, { passive: true });
```
