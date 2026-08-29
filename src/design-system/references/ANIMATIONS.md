# Sky Nest — Animations Reference

> GSAP ScrollTrigger patterns from `SkyNestHomePage.tsx`.
> All scroll-driven effects use GSAP. CSS `@keyframes` are NOT used for scroll effects.
> **This file is secondary** — where it conflicts with `.gemini/skills/sky-nest-design.md`, follow that file.

---

## Required Setup

Always register plugins inside the component. Always clean up with `ctx.revert()`:

```tsx
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);

  const ctx = gsap.context(() => {
    // ... all gsap.to / timelines go here
  }, scopeRef); // scope to component ref

  return () => ctx.revert(); // cleanup on unmount
}, []);
```

Respect reduced motion:
```tsx
const reducedMotion = usePrefersReducedMotion();

useEffect(() => {
  if (reducedMotion) {
    // Set final state directly — skip animation
    gsap.set(ref.current, { y: 0, opacity: 1 });
    return;
  }
  // ... run GSAP
}, [reducedMotion]);
```

---

## Hero Parallax (Scrub)

The hero background image, wordmark, and eyebrow row all move independently as the user scrolls.

```js
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: heroRef.current,
    start: "top top",
    end: "+=120%",
    scrub: 1.2,
  },
  defaults: { ease: "none", force3D: true },
});

// Background image glides down and scales (kenburns momentum)
tl.to(bgImgRef.current, { y: "18%", scale: 1.08 }, 0);

// Wordmark sinks + fades
tl.to(wordmarkRef.current, { y: "30%", opacity: 0.15 }, 0);

// Eyebrow + CTA drift upward + fade
tl.to(topRowRef.current, { y: "-35px", opacity: 0.1 }, 0);
```

> Always add `willChange: "transform"` to animated elements.

---

## Cloud Transition (Scrub)

Cloud images rise from below and cover the hero as the user scrolls into the first light section. Two layers with different parallax depths for depth illusion.

```js
// Initial state
gsap.set([wrap1Ref.current, wrap2Ref.current], { autoAlpha: 0 });
gsap.set(wrap1Ref.current, { y: "12%" });
gsap.set(wrap2Ref.current, { y: "20%" });

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: containerRef.current,
    start: "top bottom",
    end: "bottom bottom",
    scrub: 2,             // Smooth lag momentum
  },
  defaults: { ease: "none", force3D: true },
});

// Layer 1 — base clouds
tl.to(wrap1Ref.current, { y: "0%", autoAlpha: 1 }, 0);

// Layer 2 — denser, deeper offset, slight timeline delay
tl.to(wrap2Ref.current, { y: "0%", autoAlpha: 1 }, 0.12);
```

Cloud images use CSS `mask-image` (gradient fade-in at top):
- Layer 1: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)`
- Layer 2: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)`

---

## Orbital Emblem SVG Draw (Scrub)

SVG paths are drawn using `strokeDasharray` + `strokeDashoffset` scrolled to 0 on scroll.

```js
const len1 = path1Ref.current.getTotalLength(); // ~700
const len2 = 600; // ellipse estimate

// Initial state — fully hidden
gsap.set(path1Ref.current, { strokeDasharray: len1, strokeDashoffset: len1 });
gsap.set(path2Ref.current, { strokeDasharray: len2, strokeDashoffset: len2 });
gsap.set(labelRef.current, { opacity: 0, scale: 0.95 });

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: containerRef.current,
    start: "top 88%",
    end: "top 45%",
    scrub: 1.2,
  },
});

tl.to(path1Ref.current, { strokeDashoffset: 0, ease: "power1.out" }, 0);
tl.to(path2Ref.current, { strokeDashoffset: 0, ease: "power1.out" }, 0.15);
tl.to(labelRef.current, { opacity: 1, scale: 1, ease: "power2.out" }, 0.35);
```

---

## Story Line Reveal (Stagger)

Lines animate from `y: 60, opacity: 0` to `y: 0, opacity: 1` with staggered delay.

```js
gsap.to(lineRefs.current, {
  y: 0,
  opacity: 1,
  duration: 1.2,
  ease: "power2.out",
  stagger: 0.12,
  scrollTrigger: {
    trigger: containerRef.current,
    start: "top 75%",
    end: "top 25%",
    scrub: false, // NOT scrubbed — fires and plays once
    toggleActions: "play none none none",
  },
});
```

Initial state (set before GSAP fires):
```js
gsap.set(lineRefs.current, { y: 60, opacity: 0 });
```

Or via inline style on the element: `style={{ opacity: 0, transform: "translateY(60px)", willChange: "transform, opacity" }}`

---

## Page Transitions (CSS, not GSAP)

Light enter/exit animation for route changes. Applied at the page wrapper level:

```css
.page-enter {
  animation: page-enter 0.8s cubic-bezier(0.76, 0, 0.24, 1) both;
}

@keyframes page-enter {
  from { opacity: 0; transform: translateY(1.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
```

In Tailwind: `animate-[page-enter_0.8s_cubic-bezier(0.76,0,0.24,1)_both]`

---

## Scrollbar Hiding (horizontal carousels)

```css
.scroll-hide { scrollbar-width: none; }
.scroll-hide::-webkit-scrollbar { display: none; }
```

---

## Nav Scroll Detection (JS, not GSAP)

```tsx
useEffect(() => {
  const THRESHOLD = 80;
  const handleScroll = () => {
    const progress = Math.min(window.scrollY / THRESHOLD, 1);
    setNavProgress(progress);
    setScrolled(window.scrollY > THRESHOLD);
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

---

## Reduced Motion Guard

**Always apply — both in CSS and in the React `usePrefersReducedMotion()` hook.**

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

React hook:
```tsx
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}
```

When `reducedMotion === true`:
- Skip all GSAP setup
- Immediately set final states: `gsap.set(el, { y: 0, opacity: 1, strokeDashoffset: 0 })`

---

## GSAP Easing Reference (Sky Nest usage)

| Use case | GSAP ease | CSS equivalent |
|---|---|---|
| ScrollTrigger scrub | `"none"` | N/A (linear inside scrub is correct) |
| Element reveal | `"power2.out"` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Orbital draw | `"power1.out"` | `cubic-bezier(0.5, 1, 0.89, 1)` |
| Label/overlay | `"power2.out"` | — |
| Page transition (CSS) | — | `cubic-bezier(0.76, 0, 0.24, 1)` |
| Micro-interactions (CSS) | — | `cubic-bezier(0.5, 1, 0.89, 1)` at `0.2–0.3s` |

---

## Z-Index Scale

Use **only** these values:

| Value | Use |
|---|---|
| `0` | Hero (`z-0`) — lets content scroll over it |
| `1` | Background layers inside hero |
| `2` | Mid-layer stacking (overlapping siblings) |
| `10` | Cloud transition layer |
| `40` | Mobile menu overlay |
| `50` | Navigation (`z-50`) |
| `100` | Tooltips, dropdowns |
| `9999` | GlobalGridOverlay (always on top, pointer-events-none) |
