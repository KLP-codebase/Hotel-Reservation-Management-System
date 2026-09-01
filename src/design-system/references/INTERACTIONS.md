# Sky Nest — Interactions Reference

> Hover states, focus rings, micro-interaction patterns, and nav interpolation.
> **This file is secondary** — where it conflicts with `.gemini/skills/sky-nest-design.md`, follow that file.

---

## Easing Quick Reference

All CSS micro-interactions use `duration-200` or `duration-300` with default Tailwind easing:

```css
transition-[border-color,background-color] duration-200
transition-all duration-300
transition-colors duration-300
```

For branded custom easing in CSS:
```css
transition: ... 0.3s cubic-bezier(0.5, 1, 0.89, 1);
```

> Do NOT use `ease-linear`, `ease-in`, or bare `ease` for branded interactions.

---

## Nav Scroll Interpolation

The nav transitions from transparent → frosted-glass via JS `lerp()`, NOT by toggling a CSS class.

```tsx
// navProgress: 0 = at hero top, 1 = after 80px scroll

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Text: white (hero) → navy (scrolled)
const textColor = `rgba(${lerp(255,11,p)|0},${lerp(255,37,p)|0},${lerp(255,64,p)|0},${lerp(0.88,0.72,p).toFixed(2)})`;

// Border: white/25 → navy/18
const borderColor = `rgba(${lerp(255,11,p)|0},${lerp(255,37,p)|0},${lerp(255,64,p)|0},${lerp(0.25,0.18,p).toFixed(2)})`;

// Fill: white/10 → navy/04
const fillColor = `rgba(${lerp(255,11,p)|0},${lerp(255,37,p)|0},${lerp(255,64,p)|0},${lerp(0.10,0.04,p).toFixed(2)})`;

// Background: transparent → paper/72 with blur
const bgStyle = {
  background: `rgba(253,252,250,${lerp(0, 0.72, p).toFixed(3)})`,
  backdropFilter: `blur(${lerp(0, 12, p).toFixed(1)}px)`,
  borderBottom: `1px solid rgba(11,37,64,${lerp(0, 0.07, p).toFixed(3)})`,
};
```

---

## Hover States

### Nav Link (White Desert bordered button)

The border and background color are driven by `navProgress`-interpolated inline styles. On hover, the border intensifies:
```tsx
className="... transition-[border-color,background-color] duration-200"
// Hover effect built into the linkStyle inline style (border gets slightly more opaque)
```

For nav sign-in / dashboard (amber tint):
```tsx
className="... hover:border-amber-400 hover:bg-amber-500/20"
```

### Hero CTA Button (Explore Branches)

```tsx
className="... text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-all duration-300"
```

### Card Image Zoom

```tsx
// Parent card needs: className="group"
// Image: className="... transition-transform duration-700 ease-out group-hover:scale-[1.03]"
```

### Card Overlay Reveal

```tsx
// Overlay: className="... opacity-0 group-hover:opacity-100 transition-opacity duration-400"
```

### Footer Links

```tsx
className="font-jakarta text-base text-white/70 hover:text-white transition-colors duration-300"
```

### Input Focus

```tsx
className="... border-b border-skynest-hairline focus:border-skynest-accent focus:outline-none transition-colors duration-300"
```

On dark sections:
```tsx
className="... border-b border-white/20 focus:border-skynest-accent focus:outline-none"
```

---

## Focus Rings

Use `focus-visible` — never bare `focus` — to avoid mouse focus rings:

```tsx
// General interactive elements:
className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50"

// Nav wordmark:
className="... focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50 rounded-sm"

// Hamburger button:
className="... focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/50"

// Input — no ring (underline border handles it):
className="focus-visible:outline-none"
```

CSS accent-based ring (for light sections):
```css
:focus-visible {
  outline: 2px solid #D9722C;
  outline-offset: 4px;
}
```

---

## Active / Selected States

Use `skynest-accent` (`#D9722C`) for active tabs, current page, selected filters. Never as large fill:

```tsx
// Active tab
className={`... ${isActive ? "border-skynest-accent text-skynest-accent bg-skynest-accent/10" : ""}`}

// Current nav link
aria-current="page" // CSS: [aria-current="page"] { color: #D9722C }

// Amber variant used for Sign In
className="text-amber-400 border-amber-500/30 bg-amber-500/10"
```

---

## Disabled States

```tsx
// Button disabled
className="... disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"

// Input disabled
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## Mobile Hamburger Animation

Three-line → X morphing hamburger:

```tsx
// Line 1: rotates +45° and shifts down
className={["block h-px bg-white origin-center transition-all duration-300 ease-out",
  menuOpen ? "rotate-45 translate-y-[7.5px]" : ""].join(" ")}

// Line 2: fades and shrinks horizontally
className={["block h-px bg-white transition-all duration-300 ease-out",
  menuOpen ? "opacity-0 scale-x-50" : ""].join(" ")}

// Line 3: rotates -45° and shifts up
className={["block h-px bg-white origin-center transition-all duration-300 ease-out",
  menuOpen ? "-rotate-45 -translate-y-[7.5px]" : ""].join(" ")}
```

---

## Mobile Menu Overlay Entrance

```tsx
// Overlay container
className={["fixed inset-0 z-40 md:hidden bg-ink/[0.97] backdrop-blur-2xl flex flex-col justify-center px-8",
  "transition-opacity duration-500 ease-out",
  menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"].join(" ")}

// Each nav link — staggers in with transitionDelay
style={{ transitionDelay: menuOpen ? `${i * 60 + 100}ms` : "0ms" }}
```

---

## Pointer Cursor

Apply `cursor-pointer` only to interactive elements. Do not add it to non-interactive divs:

```tsx
// These need cursor-pointer:
button, a, [role="button"], label[for]
```

---

## Scroll Locking (for modal/menu overlays)

When the mobile menu is open, lock the scroll and pause Lenis smooth scroll:

```tsx
useEffect(() => {
  if (menuOpen) {
    document.body.style.overflow = "hidden";
    window.__lenis?.stop();
  } else {
    document.body.style.overflow = "";
    window.__lenis?.start();
  }
  return () => {
    document.body.style.overflow = "";
    window.__lenis?.start();
  };
}, [menuOpen]);
```
