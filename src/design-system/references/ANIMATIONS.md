# Sky Nest — Animations Reference

> Scroll reveals, page transitions, video backgrounds, and parallax.
> **This file is secondary** — where it conflicts with `sky-nest-design.md`, follow `sky-nest-design.md`.

---

## CSS Custom Properties (Motion Tokens)

Always declare in `:root`. Do not hardcode durations or easing curves:

```css
:root {
  --ease-out:   cubic-bezier(0.5, 1, 0.89, 1);   /* Micro-interactions */
  --ease-expo:  cubic-bezier(0.16, 1, 0.3, 1);   /* Scroll reveals */
  --ease-inout: cubic-bezier(0.76, 0, 0.24, 1);  /* Page transitions */

  --dur-fast: 0.3s;   /* Hover, focus */
  --dur-mid:  0.6s;   /* Moderate transitions */
  --dur-slow: 1.4s;   /* Reveals, hero enters */
  --dur-page: 0.8s;   /* Page transitions */
}
```

> ⚠️ Known extraction issue: raw output claimed `linear` easing and `0ms` durations. Both are wrong. Always use the cubic-bezier tokens.

---

## Scroll Reveal — `[data-reveal]`

Elements rise from far below and fade in. The large `translateY(20rem)` is intentional — motion is a brand signature.

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(20rem);
  transition:
    opacity  1.4s var(--ease-expo),
    transform 1.4s var(--ease-expo);
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Stagger children

Add `--reveal-delay` on each child for a cascade effect:

```css
[data-reveal-stagger] > * {
  opacity: 0;
  transform: translateY(4rem);
  transition:
    opacity  0.6s var(--ease-expo),
    transform 0.6s var(--ease-expo);
  transition-delay: var(--reveal-delay, 0ms);
}

[data-reveal-stagger].is-visible > *:nth-child(1) { --reveal-delay: 0ms;   opacity: 1; transform: none; }
[data-reveal-stagger].is-visible > *:nth-child(2) { --reveal-delay: 80ms;  opacity: 1; transform: none; }
[data-reveal-stagger].is-visible > *:nth-child(3) { --reveal-delay: 160ms; opacity: 1; transform: none; }
[data-reveal-stagger].is-visible > *:nth-child(4) { --reveal-delay: 240ms; opacity: 1; transform: none; }
```

### IntersectionObserver (JS)

```js
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target); // fire once
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach((el) => io.observe(el));
```

---

## Page Transitions

Wrap page content in a `.page-transition` element. Apply on route change or navigation:

```css
.page-transition {
  animation: page-enter 0.8s var(--ease-inout) both;
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(1.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-transition-exit {
  animation: page-exit 0.4s var(--ease-inout) both;
}

@keyframes page-exit {
  to {
    opacity: 0;
    transform: translateY(-1rem);
  }
}
```

---

## Background Video

Always include a poster frame. Video is always muted, autoplaying, looped.

```html
<div class="video-bg">
  <video
    class="video-bg_media"
    autoplay
    loop
    muted
    playsinline
    poster="/images/hero-poster.jpg"
  >
    <source src="/video/hero.mp4" type="video/mp4" />
    <source src="/video/hero.webm" type="video/webm" />
  </video>
  <div class="video-bg_overlay"></div>
</div>
```

```css
.video-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.video-bg_media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.video-bg_overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(10, 10, 10, 0.3) 0%,
    rgba(10, 10, 10, 0.5) 100%
  );
}
```

---

## Parallax (Subtle)

Tie to scroll position with JS. Keep the range small — this is editorial, not a 3D experience.

```js
const hero = document.querySelector(".hero_bg");

window.addEventListener("scroll", () => {
  const y = window.scrollY * 0.25; // 0.25× = subtle
  hero.style.transform = `translateY(${y}px)`;
}, { passive: true });
```

---

## Reduced Motion Guard

**Always close every animation file and component stylesheet with this block:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

## Z-Index Scale

Use **only** these values. No arbitrary z-indices.

| Value | Use |
|---|---|
| `1` | Base stacking context |
| `2` | Slightly elevated (overlapping siblings) |
| `10` | Floating elements (tooltips, dropdowns) |
| `100` | Section overlays, gradients |
| `1000` | Modal backdrops |
| `9999` | Navigation, modals, toasts |
