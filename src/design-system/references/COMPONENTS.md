# Sky Nest — Component Reference

> Raw component DOM and CSS extracted from the live site. **This file is secondary.**
> Where it conflicts with `sky-nest-design.md`, follow `sky-nest-design.md`.

---

## Button — `.btn`

Base variant. Used on hero overlays and dark sections.

```html
<button class="btn" type="button">
  <div class="btn-inner">
    <span class="btn-text">Enquire</span>
    <div class="btn-icon">
      <!-- 11×11 SVG arrow, stroke-width 0.5, no fill -->
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 10L10 1M10 1H3M10 1V8" stroke="currentColor" stroke-width="0.5"/>
      </svg>
    </div>
  </div>
</button>
```

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
  transition: background 0.3s cubic-bezier(0.5, 1, 0.89, 1),
              border-color 0.3s cubic-bezier(0.5, 1, 0.89, 1);
}
.btn:hover {
  background: var(--sn-accent);
  border-color: var(--sn-accent);
}
.btn:focus-visible {
  outline: 1px auto currentColor;
}

.btn-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### Variants

| Class | Notes |
|---|---|
| `.btn-tab` | Tab-bar item; smaller padding `8px 16px`; active state fills with `--sn-accent` |
| `.btn-large` | Hero CTA; `padding: 16px 32px`; larger label text `1rem` |
| `.btn-mobile` | Full-width on mobile; `width: 100%`; `justify-content: center` |
| `.btn-image` | Sits over card imagery; uses glass surface treatment (`backdrop-filter: blur(12px)`) |

---

## Glass Surface — `.glass`

The system's signature material. A translucent panel with an inset specular highlight.

```html
<div class="glass">
  <!-- content -->
</div>
```

```css
.glass {
  position: relative;
  border: 1px solid var(--sn-border-glass);   /* rgba(255,255,255,.2) */
  border-radius: 4px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    inset 0.35px 0.35px 0 rgba(255, 255, 255, 0.2),
    inset 0 0 1.75px rgba(255, 255, 255, 0.2);
  --glass-opacity: 0.05;
  --glass-scale: 0.35;
}

/* Pseudo-element background layer */
.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(255, 255, 255, var(--glass-opacity));
  pointer-events: none;
}
```

> ⚠️ Known extraction issue: raw docs claimed "no blur effects". This is false. `backdrop-filter` is a core part of the glass material and is intentional.

---

## Card — `.card` / `.card-flick_*`

Image-led card. Content is revealed via hover overlay.

### Standard Card

```html
<div class="card">
  <div class="card_image">
    <img src="..." alt="Room name" loading="lazy" />
  </div>
  <div class="card_overlay"></div>
  <div class="card_content">
    <h3 class="card_title">Suite Name</h3>
    <div class="card_meta">
      <span>From $420 / night</span>
      <span>2 guests</span>
    </div>
  </div>
</div>
```

```css
.card {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}

.card_image {
  width: 100%;
  height: 100%;
}

.card_image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover .card_image img {
  transform: scale(1.03);
}

.card_overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(10, 10, 10, 0.7), transparent 60%);
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.5, 1, 0.89, 1);
}

.card:hover .card_overlay {
  opacity: 1;
}

.card_content {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 24px;
}

.card_title {
  font-family: "Cardinal Classic Long", serif;
  font-style: italic;
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  color: var(--sn-text-invert);
  margin-bottom: 8px;
}

.card_meta {
  display: flex;
  gap: 12px;
  font: 400 1rem "Inter Tight", sans-serif;
  color: var(--sn-text-invert-muted);
}
```

### Flick Card (`.card-flick_*`)

Carousel-style card with side-scroll interaction.

```html
<div class="card-flick">
  <div class="card-flick_track">
    <div class="card-flick_item card">
      <!-- standard card content -->
    </div>
    <!-- more items -->
  </div>
</div>
```

```css
.card-flick {
  overflow: hidden;
}

.card-flick_track {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.card-flick_track::-webkit-scrollbar {
  display: none;
}

.card-flick_item {
  flex: 0 0 calc(33.333% - 16px);
  scroll-snap-align: start;
  min-width: 280px;
}

@media (max-width: 768px) {
  .card-flick_item {
    flex: 0 0 calc(85% - 12px);
  }
}
```

---

## Input — `.input`

Underline-only input. No box border, no background fill.

```html
<div class="input-group">
  <label class="input-label" for="guest-name">Full Name</label>
  <input class="input" id="guest-name" type="text" placeholder="e.g. Jane Smith" />
</div>
```

```css
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font: 500 0.875rem "Inter Tight", sans-serif;
  color: var(--sn-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.input {
  padding: 12px 16px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--sn-border);
  border-radius: 0;
  color: var(--sn-text);
  font: 400 1.0625rem "Inter Tight", sans-serif;
  transition: border-color 0.3s cubic-bezier(0.5, 1, 0.89, 1);
  width: 100%;
}

.input:focus {
  border-color: var(--sn-accent);
  outline: none;
}

.input::placeholder {
  color: var(--sn-text-muted);
}

/* Dark section variant */
.section--dark .input {
  border-bottom-color: var(--sn-border-dark);
  color: var(--sn-text-invert);
}

.section--dark .input:focus {
  border-bottom-color: var(--sn-accent);
}
```

---

## Navigation — `.nav`

Fixed top navigation. Transparent over hero, opaque on scroll.

```html
<nav class="nav" id="site-nav">
  <div class="nav_container">
    <a class="nav_logo" href="/">Sky Nest</a>
    <ul class="nav_links" role="list">
      <li><a class="nav_link" href="/rooms">Rooms</a></li>
      <li><a class="nav_link" href="/dining">Dining</a></li>
      <li><a class="nav_link" href="/experiences">Experiences</a></li>
    </ul>
    <button class="btn btn-large nav_cta" type="button">
      <div class="btn-inner">
        <span class="btn-text">Book Now</span>
      </div>
    </button>
  </div>
</nav>
```

```css
.nav {
  position: fixed;
  inset-inline: 0;
  top: 0;
  z-index: 9999;
  transition: background 0.3s cubic-bezier(0.5, 1, 0.89, 1);
}

.nav.is-scrolled {
  background: var(--sn-bg);
  box-shadow: 0 1px 0 var(--sn-border);
}

.nav_container {
  width: calc(100% - 120px);
  max-width: 1440px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 24px;
}

.nav_logo {
  font-family: "Cardinal Classic Long", serif;
  font-size: 1.5rem;
  color: var(--sn-text-invert);
  text-decoration: none;
  transition: color 0.3s;
}

.nav.is-scrolled .nav_logo {
  color: var(--sn-text);
}

.nav_links {
  display: flex;
  gap: 32px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav_link {
  font: 500 0.875rem "Inter Tight", sans-serif;
  color: var(--sn-text-invert);
  text-decoration: none;
  transition: color 0.3s cubic-bezier(0.5, 1, 0.89, 1);
}

.nav.is-scrolled .nav_link {
  color: var(--sn-text);
}

.nav_link:hover {
  color: var(--sn-accent);
}
```
