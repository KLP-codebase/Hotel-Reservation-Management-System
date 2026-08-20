"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NavLink {
  label: string;
  href: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NAV_LINKS: NavLink[] = [
  { label: "Stay", href: "#stay" },
  { label: "Dining", href: "#dining" },
  { label: "About", href: "#about" },
];

const STORY_LINES = [
  "Sri Lanka has always demanded",
  "an unhurried attention.",
  "Three branches, three coastlines,",
  "one uncompromising",
  "standard of welcome.",
];

// ---------------------------------------------------------------------------
// Utility — respect prefers-reduced-motion
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Vertical hairline grid columns — purely decorative, aria-hidden */
function HairlineGrid({ count = 5 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex"
      style={{ zIndex: 1 }}
    >
      {Array.from({ length: count + 1 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 border-l border-white/[0.07] last:border-r"
        />
      ))}
    </div>
  );
}

/** White Desert-style "mountain / roof peak" glyph as inline SVG */
function MountainGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 16"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 15 L10 3 L14 8 L18 2 L27 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Orbital / orrery line-art decoration for intro section */
function OrbitalDecoration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 100"
      fill="none"
      className="w-28 h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main ellipse */}
      <ellipse
        cx="60"
        cy="50"
        rx="55"
        ry="32"
        stroke="#0B2540"
        strokeWidth="0.75"
        opacity="0.45"
      />
      {/* Cross-axis line */}
      <line
        x1="5"
        y1="50"
        x2="115"
        y2="50"
        stroke="#0B2540"
        strokeWidth="0.5"
        opacity="0.3"
      />
      {/* Vertical axis */}
      <line
        x1="60"
        y1="18"
        x2="60"
        y2="82"
        stroke="#0B2540"
        strokeWidth="0.5"
        opacity="0.3"
      />
      {/* Small orbit dot */}
      <circle cx="97" cy="38" r="2.5" fill="#D9722C" opacity="0.7" />
      {/* Diagonal slash – like an ecliptic */}
      <line
        x1="10"
        y1="75"
        x2="110"
        y2="25"
        stroke="#0B2540"
        strokeWidth="0.4"
        strokeDasharray="3 4"
        opacity="0.25"
      />
    </svg>
  );
}

/** Chevron icon for "Explore Branches" CTA */
function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function SkyNestNav({
  scrolled,
}: {
  scrolled: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        id="skynest-nav"
        aria-label="SkyNest Hotels main navigation"
        className={[
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
          scrolled && !menuOpen
            ? "bg-ink/95 backdrop-blur-sm border-b border-white/10 shadow-[0_1px_0_rgba(255,255,255,0.05)]"
            : "bg-transparent",
        ].join(" ")}
      >
        <div className="flex items-center justify-between h-14 md:h-16 px-6 md:px-8">
          {/* Left — nav links as White Desert bordered buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                id={`nav-link-${link.label.toLowerCase()}`}
                className={[
                  "flex items-center px-6 py-2.5",
                  "text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase",
                  "text-white/90 hover:text-white",
                  "bg-white/[0.10] hover:bg-white/[0.20]",
                  "border border-white/25 hover:border-white/50",
                  "transition-all duration-200",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
                ].join(" ")}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Center — wordmark */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <a
              href="/"
              id="nav-wordmark"
              aria-label="SkyNest Hotels — homepage"
              className="flex flex-col items-center gap-0.5 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50 rounded-sm"
            >
              <MountainGlyph className="w-7 h-auto text-white/90 group-hover:text-white transition-colors duration-300" />
              <span className="font-jakarta font-700 text-[11px] tracking-[0.35em] text-white uppercase select-none">
                SKYNEST
              </span>
            </a>
          </div>

          {/* Right — CTA buttons (same bordered style) */}
          <div className="hidden md:flex items-center gap-2.5">
            <a
              href="#rates"
              id="nav-cta-rates"
              className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase text-white/90 hover:text-white bg-white/[0.10] hover:bg-white/[0.20] border border-white/25 hover:border-white/50 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
            >
              Rates
            </a>
            <a
              href="#booking"
              id="nav-cta-book-now"
              className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase text-white bg-white/[0.20] hover:bg-white/[0.30] border border-white/40 hover:border-white/70 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
            >
              Book Now
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            id="nav-hamburger"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="nav-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="md:hidden flex items-center justify-center w-14 border-l border-white/[0.12] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/50"
          >
            <span className="relative w-5 h-4 flex flex-col justify-between">
              <span
                className={[
                  "block h-px bg-white origin-center transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  menuOpen ? "rotate-45 translate-y-[7.5px]" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "block h-px bg-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  menuOpen ? "opacity-0 scale-x-50" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "block h-px bg-white origin-center transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  menuOpen ? "-rotate-45 -translate-y-[7.5px]" : "",
                ].join(" ")}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile full-screen menu overlay */}
      <div
        id="nav-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          "fixed inset-0 z-40 md:hidden",
          "bg-ink/[0.97] backdrop-blur-2xl",
          "flex flex-col justify-center px-8",
          "transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="space-y-1 pt-16">
          {[...NAV_LINKS, { label: "Rates", href: "#rates" }, { label: "Book Now", href: "#booking" }].map(
            (link, i) => (
              <a
                key={link.label}
                href={link.href}
                id={`mobile-nav-${link.label.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMenuOpen(false)}
                className={[
                  "block py-4 font-jakarta font-semibold text-3xl text-white/80 hover:text-white",
                  "border-b border-white/[0.08]",
                  "transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  "focus-visible:outline-none focus-visible:text-white",
                  menuOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0",
                ].join(" ")}
                style={{
                  transitionDelay: menuOpen ? `${i * 60 + 100}ms` : "0ms",
                }}
              >
                {link.label}
              </a>
            )
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero Section — PINNED (sticky) so it stays while content scrolls over it
// ---------------------------------------------------------------------------
function HeroSection({
  heroRef,
}: {
  heroRef: React.RefObject<HTMLElement>;
}) {
  return (
    <section
      ref={heroRef}
      id="hero"
      aria-label="SkyNest Hotels hero"
      className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0"
    >
      {/* Hero Background Image — Sunset Swimming Pool (static, no scroll effects) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <img
          src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{
            filter: "brightness(0.6) contrast(1.1)",
          }}
        />
        {/* Navy Overlay for text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 70% at 50% 30%, rgba(11,37,64,0.35) 0%, rgba(7,28,48,0.6) 60%, rgba(11,37,64,0.85) 100%)",
          }}
        />
      </div>

      {/* Hairline grid */}
      <HairlineGrid count={5} />

      {/* Top row: eyebrow left + explore right */}
      <div className="relative flex items-start justify-between px-6 md:px-12 pt-24 md:pt-28 pb-0 z-10">
        {/* Eyebrow */}
        <p
          className="font-playfair font-normal italic text-white/75 text-[13px] md:text-[15px] leading-relaxed max-w-[200px] md:max-w-none"
          style={{ fontStyle: "italic" }}
        >
          Three branches.
          <br />
          One standard of hospitality.
        </p>

        {/* Explore Branches CTA */}
        <a
          href="#branches"
          id="hero-explore-cta"
          className="flex items-center gap-2 font-jakarta text-[11px] md:text-[12px] font-medium tracking-[0.15em] uppercase text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2.5 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          <span>Explore Branches</span>
          <ChevronRight className="w-3 h-3" />
        </a>
      </div>

      {/* Giant ESCAPE wordmark — centered horizontally, placed bottom */}
      <div
        aria-hidden="true"
        className="relative z-10 flex-1 flex items-end justify-center overflow-hidden pointer-events-none select-none w-full"
      >
        <span
          className="font-playfair font-normal leading-[0.85] text-white tracking-tight text-center whitespace-nowrap block w-full"
          style={{
            fontSize: "clamp(100px, 21vw, 290px)",
            letterSpacing: "-0.025em",
            paddingBottom: "clamp(4px, 1.5vw, 16px)",
          }}
        >
          ESCAPE
        </span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cloud Transition — GSAP ScrollTrigger scrub-driven cloud rise (60fps)
// ---------------------------------------------------------------------------
function CloudTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrap1Ref = useRef<HTMLDivElement>(null);
  const wrap2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Set initial state immediately (before paint) to avoid flash
    gsap.set([wrap1Ref.current, wrap2Ref.current], { autoAlpha: 0 });
    gsap.set(wrap1Ref.current, { y: "12%" });
    gsap.set(wrap2Ref.current, { y: "20%" });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 2,            // higher = smoother lag feel
        },
        defaults: {
          ease: "none",        // required for scrub — linear maps 1:1 to scroll
          force3D: true,       // always use GPU matrix for transforms
        },
      });

      // Layer 1 — base clouds rise and fade in
      tl.to(wrap1Ref.current, { y: "0%", autoAlpha: 1 }, 0);

      // Layer 2 — denser clouds, deeper parallax offset, slight delay in timeline
      tl.to(wrap2Ref.current, { y: "0%", autoAlpha: 1 }, 0.12);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative z-10 h-[120dvh] pointer-events-none overflow-hidden"
    >
      {/* Positioner 1 — CSS only handles X centering; GSAP handles Y + opacity */}
      <div
        ref={wrap1Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden"
        style={{
          width: "220%",
          height: "100%",
          marginLeft: "-110%",   // centers 220% wide div without transform conflict
          willChange: "transform, opacity",
        }}
      >
        <img
          src="/07_Clouds.png"
          alt=""
          className="w-full h-full object-cover object-bottom"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)",
          }}
        />
      </div>

      {/* Positioner 2 — Clouds 3, deeper parallax */}
      <div
        ref={wrap2Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden"
        style={{
          width: "220%",
          height: "85%",
          marginLeft: "-110%",
          willChange: "transform, opacity",
        }}
      >
        <img
          src="/Clouds 3.png"
          alt=""
          className="w-full h-full object-cover object-bottom"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)",
          }}
        />
      </div>

      {/* Dense white fog at the bottom — blends into paper white */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(253,252,250,0.3) 20%, rgba(253,252,250,0.7) 45%, rgba(253,252,250,0.95) 75%, #FDFCFA 100%)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text reveal hook — IntersectionObserver per line
// ---------------------------------------------------------------------------
function useLineReveal(lineCount: number, reducedMotion: boolean) {
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [visibleLines, setVisibleLines] = useState<boolean[]>(
    Array(lineCount).fill(reducedMotion)
  );

  useEffect(() => {
    if (reducedMotion) {
      setVisibleLines(Array(lineCount).fill(true));
      return;
    }

    const observers: IntersectionObserver[] = [];

    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleLines((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
            obs.disconnect();
          }
        },
        { threshold: 0.6 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [lineCount, reducedMotion]);

  return { lineRefs, visibleLines };
}

// ---------------------------------------------------------------------------
// Intro / Story Section
// ---------------------------------------------------------------------------
function IntroSection({ reducedMotion }: { reducedMotion: boolean }) {
  const { lineRefs, visibleLines } = useLineReveal(
    STORY_LINES.length,
    reducedMotion
  );

  return (
    <section
      id="story"
      aria-label="SkyNest Hotels story"
      className="relative bg-paper overflow-hidden"
    >
      {/* Hairline grid continues — now on light bg */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex"
        style={{ zIndex: 1 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-l border-ink/[0.05] last:border-r"
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-16 py-24 md:py-36">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1px_1fr] gap-0 items-start">

          {/* Left column — metadata sidebar */}
          <div className="flex flex-col gap-8 md:pr-12 md:pt-1 pb-12 md:pb-0">
            <OrbitalDecoration />

            <div className="flex flex-col gap-1">
              <span className="font-jakarta text-[9px] font-semibold tracking-[0.22em] uppercase text-ink/30">
                Est. 2018
              </span>
              <p
                className="font-fraunces italic text-ink/55 text-[13px] leading-snug mt-1"
                style={{ fontStyle: "italic" }}
              >
                The SkyNest<br />Standard
              </p>
            </div>

            {/* Hairline rule */}
            <div className="w-8 h-px bg-ink/15" />

            {/* Branches list */}
            <ul className="flex flex-col gap-3" aria-label="SkyNest branch locations">
              {(
                [
                  { city: "Colombo", code: "01" },
                  { city: "Kandy", code: "02" },
                  { city: "Galle", code: "03" },
                ] as const
              ).map(({ city, code }) => (
                <li
                  key={city}
                  className="flex items-baseline gap-2.5"
                >
                  <span className="font-jakarta text-[9px] tabular-nums text-ink/25 tracking-widest">{code}</span>
                  <span className="font-jakarta text-[10px] font-medium tracking-[0.16em] uppercase text-ink/50">{city}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vertical divider */}
          <div className="hidden md:block w-px bg-ink/10 self-stretch mx-0" />

          {/* Right column — reveal headline */}
          <div className="flex flex-col justify-center md:pl-14">
            <h1
              className="font-fraunces leading-[1.08] tracking-[-0.01em]"
              style={{
                fontSize: "clamp(32px, 4.5vw, 68px)",
              }}
              aria-label={STORY_LINES.join(" ")}
            >
              {STORY_LINES.map((line, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  aria-hidden="true"
                  className="block transition-colors duration-700"
                  style={{
                    color: visibleLines[i] ? "#0B2540" : "#B7C2CC",
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  {line}
                </span>
              ))}
            </h1>

            {/* Sub-text */}
            <p
              className={[
                "mt-10 md:mt-14 font-jakarta text-[13px] leading-[1.9] text-ink/55 max-w-sm",
                "transition-opacity duration-1000",
                reducedMotion || visibleLines[STORY_LINES.length - 1]
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4",
              ].join(" ")}
              style={{ transitionDelay: "480ms" }}
            >
              From the colonial harbour of Galle to the mist-veiled hills of
              Kandy, each SkyNest property is designed around its landscape —
              never despite it.
            </p>

            {/* CTA link */}
            <a
              href="#branches"
              id="intro-branches-link"
              className={[
                "mt-8 self-start inline-flex items-center gap-2.5",
                "font-jakarta text-[11px] font-semibold tracking-[0.18em] uppercase text-ink",
                "border-b border-ink/25 pb-0.5 hover:border-ink transition-colors duration-300",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink/40",
                "transition-opacity duration-700",
                reducedMotion || visibleLines[STORY_LINES.length - 1]
                  ? "opacity-100"
                  : "opacity-0",
              ].join(" ")}
              style={{ transitionDelay: "600ms" }}
            >
              View our branches
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom hairline rule */}
      <div className="border-b border-skynest-hairline" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sunset Showcase Section
// ---------------------------------------------------------------------------
function SunsetShowcaseSection() {
  return (
    <section
      id="experience"
      aria-label="SkyNest signature experience"
      className="relative bg-paper py-20 md:py-32 px-6 md:px-12 overflow-hidden border-t border-skynest-hairline"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-6">
          <div>
            <span className="font-jakarta text-[10px] font-semibold tracking-[0.25em] uppercase text-skynest-accent">
              01 / SIGNATURE EXPERIENCE
            </span>
            <h2 className="font-fraunces text-3xl md:text-5xl text-ink mt-2">
              Dusk at SkyNest Galle
            </h2>
          </div>
          <p className="font-jakarta text-xs md:text-sm text-ink/65 max-w-md leading-relaxed">
            Perched above the southern ocean, our infinity pool mirrors the Sri Lankan sunset — crafted for unhurried evenings.
          </p>
        </div>

        {/* Doppelrand Double-Bezel Frame */}
        <div className="relative group p-2 md:p-3 rounded-[2rem] bg-ink/[0.03] border border-ink/10 transition-all duration-700 hover:border-ink/20 shadow-sm">
          <div className="relative rounded-[calc(2rem-0.5rem)] overflow-hidden aspect-[16/9] md:aspect-[21/9] min-h-[360px]">
            {/* Sunset image from /public */}
            <img
              src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.jpg"
              alt="Sunset at SkyNest Galle infinity pool"
              className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />

            {/* Bottom Caption Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white z-10">
              <div>
                <span className="font-fraunces italic text-white/75 text-xs md:text-sm">
                  Galle Fort Coastline
                </span>
                <h3 className="font-fraunces text-2xl md:text-4xl text-white mt-1">
                  The Ocean Horizon Pool
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline-block font-jakarta text-[11px] tracking-[0.2em] text-white/70 uppercase">
                  6.0535° N, 80.2210° E
                </span>
                <a
                  href="#booking"
                  className="px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-jakarta text-[11px] font-medium tracking-[0.14em] uppercase transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Reserve Pavilion
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function SkyNestHomePage() {
  const heroRef = useRef<HTMLElement>(null!);
  const reducedMotion = usePrefersReducedMotion();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative bg-paper">
      {/* Skip-to-content for keyboard users */}
      <a
        href="#story"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-ink focus:px-4 focus:py-2 focus:text-sm focus:font-jakarta focus:font-semibold focus:rounded focus:shadow-lg"
      >
        Skip to content
      </a>


      {/* Navigation */}
      <SkyNestNav scrolled={scrolled} />

      {/* Hero — pinned at top, stays static while you scroll */}
      <HeroSection heroRef={heroRef} />

      {/* Cloud Transition — scrolls over the pinned hero, covers it, blends to white */}
      <CloudTransition />

      {/* Intro / Story — appears after the cloud covers everything */}
      <IntroSection reducedMotion={reducedMotion} />

      {/* Sunset Showcase Section */}
      <SunsetShowcaseSection />

      {/* Placeholder anchor for booking section */}
      <div id="how-booking-works" className="bg-paper py-8 px-6 md:px-12 border-t border-skynest-hairline">
        <p className="font-jakarta text-[11px] tracking-[0.15em] uppercase text-ink/30 text-center">
          — Booking flow coming soon —
        </p>
      </div>
    </div>
  );
}

