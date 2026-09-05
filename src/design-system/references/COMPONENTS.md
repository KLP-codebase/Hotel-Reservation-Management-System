# Sky Nest — Component Reference

> Exact DOM structures and class patterns from `SkyNestHomePage.tsx`.
> **This file is secondary** — where it conflicts with `.gemini/skills/sky-nest-design.md`, follow that file.

---

## Navigation — `#skynest-nav`

Fixed top bar. Transparent over hero. Frosted glass on scroll via JS interpolation (not a CSS class toggle).

```tsx
// State
const navProgress = 0 → 1 as user scrolls past 80px

// Computed inline styles:
const bgAlpha = lerp(0, 0.72, navProgress);
const blurAmt  = lerp(0, 12,   navProgress);

// Applied to <nav>:
style={{
  background: `rgba(253,252,250,${bgAlpha})`,
  backdropFilter: `blur(${blurAmt}px)`,
  WebkitBackdropFilter: `blur(${blurAmt}px)`,
  borderBottom: `1px solid rgba(11,37,64,${lerp(0, 0.07, navProgress)})`,
}}
```

### Nav Link (White Desert bordered button style)

```tsx
<a
  href={href}
  className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
  style={{ color: textColor, borderColor: borderColor, background: fillColor }}
>
  {label}
</a>
```

`textColor`, `borderColor`, `fillColor` are interpolated from white (at hero) to navy (scrolled).

### Wordmark

```tsx
// Center of nav bar, absolute positioned
<a href="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 group">
  <MountainGlyph className="w-7 h-auto" style={{ color: wordmarkColor }} />
  <span className="font-jakarta font-700 text-[11px] tracking-[0.35em] uppercase select-none"
    style={{ color: wordmarkColor }}>
    SKYNEST
  </span>
</a>
```

### Book Now / Sign In buttons

```tsx
// Sign In / Dashboard (amber tint)
className="... text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20"

// Log Out (red tint)
className="... text-red-400 border-red-500/30 hover:border-red-400 bg-red-500/10 hover:bg-red-500/20"
```

### Mobile Hamburger Menu

Full-screen overlay on mobile. `bg-ink/[0.97] backdrop-blur-2xl`. Nav links are `font-jakarta font-semibold text-3xl text-white/80`. Animates in with staggered `transitionDelay` per item.

---

## Hero Section — `#hero`

**Pinned full-viewport.** Subsequent sections scroll over it. Background image with radial navy overlay. Giant wordmark at bottom. GSAP parallax on scroll.

```tsx
<section
  id="hero"
  className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0"
>
  {/* Background image + overlay */}
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
    <img
      ref={bgImgRef}
      src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.jpg"
      alt=""
      className="w-full h-full object-cover object-center"
      style={{ filter: "brightness(0.7) contrast(1.1)", willChange: "transform" }}
    />
    <div className="absolute inset-0" style={{
      background: "radial-gradient(ellipse 120% 70% at 50% 30%, rgba(11,37,64,0.35) 0%, rgba(7,28,48,0.6) 60%, rgba(11,37,64,0.85) 100%)"
    }} />
  </div>

  {/* Hairline column grid */}
  <HairlineGrid count={5} />

  {/* Top row: eyebrow + CTA */}
  <div ref={topRowRef} className="relative flex items-start justify-between px-6 md:px-12 pt-24 md:pt-28 z-10">
    <p className="font-cinzel font-normal italic text-white/75 text-[13px] md:text-[15px] leading-relaxed">
      Three branches.<br />One standard of hospitality.
    </p>
    <a href="#branches" className="flex items-center gap-2 font-jakarta text-[11px] md:text-[12px] font-medium tracking-[0.15em] uppercase text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2.5 transition-all duration-300">
      <span>Explore Branches</span>
      <ChevronRight className="w-3 h-3" />
    </a>
  </div>

  {/* Giant wordmark — bottom-aligned */}
  <div ref={wordmarkRef} className="relative z-10 flex-1 flex items-end justify-center overflow-hidden pointer-events-none select-none w-full">
    <span
      className="font-cinzel font-normal leading-[0.85] text-white text-center whitespace-nowrap block w-full uppercase"
      style={{ fontSize: "clamp(100px, 21vw, 260px)", letterSpacing: "0.03em", paddingBottom: "clamp(4px, 1.5vw, 8px)" }}
    >
      SKYNEST
    </span>
  </div>
</section>
```

GSAP parallax on the hero:
```js
// bgImgRef: y: "18%", scale: 1.08
// wordmarkRef: y: "30%", opacity: 0.15
// topRowRef: y: "-35px", opacity: 0.1
// scrollTrigger: start "top top", end "+=120%", scrub: 1.2
```

---

## Cloud Transition

Positioned immediately after the hero. Uses a `h-[120dvh]` div so the hero has room to be "covered". Two cloud image layers rise from bottom on scroll with different parallax depths.

```tsx
<div ref={containerRef} className="relative z-10 h-[120dvh] pointer-events-none overflow-hidden">
  <div ref={wrap1Ref} className="absolute bottom-0 left-1/2"
    style={{ width: "220%", height: "100%", marginLeft: "-110%", willChange: "transform, opacity" }}>
    <img src="/07_Clouds.png" alt="" className="w-full h-full object-cover object-bottom"
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)" }} />
  </div>
  <div ref={wrap2Ref} className="absolute bottom-0 left-1/2"
    style={{ width: "220%", height: "85%", marginLeft: "-110%", willChange: "transform, opacity" }}>
    <img src="/Clouds 3.png" alt="" className="w-full h-full object-cover object-bottom"
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)" }} />
  </div>
</div>
```

GSAP config:
```js
// wrap1: y: "12%" → "0%", autoAlpha: 0 → 1 at position 0
// wrap2: y: "20%" → "0%", autoAlpha: 0 → 1 at position 0.12
// scrollTrigger: start "top bottom", end "bottom bottom", scrub: 2
```

---

## GlobalGridOverlay

One fixed full-page SVG mounted once at page root. 6 vertical lines using `linearGradient` that transitions stroke from white (on dark hero/image sections) to navy-tint (on light paper sections).

```tsx
<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]" style={{ isolation: "isolate" }}>
  <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
    <defs>
      <linearGradient id="grid-line-grad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
        <stop offset="36%"  stopColor="rgba(255,255,255,0.18)" />
        <stop offset="46%"  stopColor="rgba(11,37,64,0.10)" />
        <stop offset="62%"  stopColor="rgba(11,37,64,0.10)" />
        <stop offset="70%"  stopColor="rgba(255,255,255,0.15)" />
        <stop offset="80%"  stopColor="rgba(255,255,255,0.15)" />
        <stop offset="88%"  stopColor="rgba(11,37,64,0.10)" />
        <stop offset="100%" stopColor="rgba(11,37,64,0.10)" />
      </linearGradient>
    </defs>
    {/* 7 vertical lines spanning 0%–100% width */}
  </svg>
</div>
```

---

## MountainGlyph

White Desert-style mountain icon used in nav wordmark.

```tsx
<svg viewBox="0 0 28 16" fill="none">
  <path d="M1 15 L10 3 L14 8 L18 2 L27 15"
    stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" />
</svg>
```

---

## SweepingOrbitalEmblem

Editorial ornament. Used on section breaks. SVG path + ellipse drawn via `strokeDashoffset` animation (scrubbed with ScrollTrigger). Cinzel italic label in the center.

```tsx
<svg viewBox="0 0 340 90" fill="none">
  <path
    ref={path1Ref}
    d="M 2 62 C 32 62, 110 62, 205 48 C 285 36, 310 10, 235 10 C 140 10, 24 32, 38 56 C 45 74, 125 82, 255 62"
    stroke="#0B2540" strokeWidth="0.45" opacity="0.32" strokeLinecap="round"
  />
  <ellipse ref={path2Ref} cx="170" cy="45" rx="94" ry="22"
    stroke="#0B2540" strokeWidth="0.42" opacity="0.35" />
</svg>
<span
  ref={labelRef}
  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-cinzel italic text-[12px] md:text-[14px] tracking-[0.08em] text-ink/80 whitespace-nowrap"
>
  The SkyNest Standard
</span>
```

GSAP:
```js
// Start: strokeDasharray=length, strokeDashoffset=length (invisible)
// End: strokeDashoffset=0 (fully drawn)
// scrollTrigger: start "top 88%", end "top 45%", scrub: 1.2
// Label: opacity: 0, scale: 0.95 → opacity: 1, scale: 1 at 0.35
```

---

## Card — Image-led with Hover Overlay

```tsx
<div className="relative overflow-hidden rounded-[4px] group cursor-pointer">
  <div className="relative w-full aspect-[3/4]">
    <img
      src={imageSrc}
      alt={altText}
      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      style={{ willChange: "transform" }}
    />
    {/* Gradient overlay revealed on hover */}
    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
    {/* Card content — pinned to bottom */}
    <div className="absolute inset-x-0 bottom-0 p-6">
      <h3 className="font-cinzel italic text-white mb-2" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
        Suite Name
      </h3>
      <div className="flex gap-3 font-jakarta text-white/60 text-sm">
        <span>From $420 / night</span>
        <span>2 guests</span>
      </div>
    </div>
  </div>
</div>
```

---

## Input (Underline-only)

```tsx
<div className="flex flex-col gap-2">
  <label className="font-jakarta font-medium text-[14px] uppercase tracking-[0.08em] text-ink-faded">
    Full Name
  </label>
  <input
    type="text"
    placeholder="e.g. Jane Smith"
    className="w-full px-4 py-3 bg-transparent border-0 border-b border-skynest-hairline font-jakarta text-[17px] text-ink placeholder-ink-faded focus:border-skynest-accent focus:outline-none transition-colors duration-300"
  />
</div>
```

On dark sections: `border-b border-white/20 text-white placeholder-white/40 focus:border-skynest-accent`

---

## Glass Surface

```tsx
className="relative backdrop-blur-[12px] border border-white/20 rounded-[4px]"
style={{
  boxShadow: "inset 0.35px 0.35px 0 rgba(255,255,255,0.2), inset 0 0 1.75px rgba(255,255,255,0.2)"
}}
// Pseudo-layer if needed:
// ::before { background: rgba(255,255,255,0.05) }
```

---

## Story Section (Full-width animated text)

Each story section has lines of ALL-CAPS Cinzel text that animate line-by-line on scroll via GSAP stagger.

```tsx
{STORY_LINES.map((line, i) => (
  <div
    key={i}
    ref={(el) => { lineRefs.current[i] = el; }}
    className="overflow-hidden"
    style={{ opacity: 0, transform: "translateY(60px)", willChange: "transform, opacity" }}
  >
    <span className="block font-cinzel uppercase text-ink"
      style={{ fontSize: "clamp(3rem, 8vw, 8rem)", lineHeight: "0.9", letterSpacing: "0.02em" }}>
      {line}
    </span>
  </div>
))}
```

GSAP stagger:
```js
gsap.to(lineRefs.current, {
  y: 0, opacity: 1,
  duration: 1.2, ease: "power2.out",
  stagger: 0.12,
  scrollTrigger: { trigger: container, start: "top 75%", end: "top 25%", scrub: false }
});
```
