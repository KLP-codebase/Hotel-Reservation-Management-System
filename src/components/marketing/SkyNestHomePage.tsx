"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@/context/auth-context";

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
  "SRI LANKA HAS ALWAYS DEMANDED",
  "AN UNHURRIED ATTENTION —",
  "THREE COASTLINES, THREE SANCTUARIES,",
  "ONE UNCOMPROMISING",
  "STANDARD OF WELCOME.",
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

/**
 * GlobalGridOverlay — one fixed full-page SVG with 6 vertical lines.
 * Each line is painted with a linearGradient that transitions the stroke colour
 * from white (on dark hero/image sections) to a dark tint (on light paper sections).
 */
function GlobalGridOverlay() {
  const COLS = 6;
  const xs = Array.from({ length: COLS + 1 }, (_, i) =>
    ((i / COLS) * 100).toFixed(4) + "%"
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ isolation: "isolate" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="grid-line-grad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="36%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="46%" stopColor="rgba(11,37,64,0.10)" />
            <stop offset="62%" stopColor="rgba(11,37,64,0.10)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="80%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="88%" stopColor="rgba(11,37,64,0.10)" />
            <stop offset="100%" stopColor="rgba(11,37,64,0.10)" />
          </linearGradient>
        </defs>

        {xs.map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="0"
            x2={x}
            y2="100%"
            stroke="url(#grid-line-grad)"
            strokeWidth="0.6"
          />
        ))}
      </svg>
    </div>
  );
}

/** Vertical hairline grid columns */
function HairlineGrid({
  count = 5,
  color = "border-white/[0.07]",
}: {
  count?: number;
  color?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex"
      style={{ zIndex: 1 }}
    >
      {Array.from({ length: count + 1 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 border-l ${color} last:border-r`}
        />
      ))}
    </div>
  );
}

/** White Desert-style mountain glyph */
function MountainGlyph({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 16"
      fill="none"
      className={className}
      style={style}
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

/** Grand sweeping orbital emblem with SVG line-drawing scroll animation */
function SweepingOrbitalEmblem({
  label = "The SkyNest Standard",
  reducedMotion = false,
}: {
  label?: string;
  reducedMotion?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGEllipseElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (reducedMotion) {
      if (path1Ref.current) gsap.set(path1Ref.current, { strokeDashoffset: 0 });
      if (path2Ref.current) gsap.set(path2Ref.current, { strokeDashoffset: 0 });
      if (labelRef.current) gsap.set(labelRef.current, { opacity: 1 });
      return;
    }

    const p1 = path1Ref.current;
    const p2 = path2Ref.current;
    const lbl = labelRef.current;
    if (!p1 || !p2 || !lbl || !containerRef.current) return;

    const len1 = p1.getTotalLength ? p1.getTotalLength() : 700;
    const len2 = 600;

    gsap.set(p1, { strokeDasharray: len1, strokeDashoffset: len1 });
    gsap.set(p2, { strokeDasharray: len2, strokeDashoffset: len2 });
    gsap.set(lbl, { opacity: 0, scale: 0.95 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 88%",
          end: "top 45%",
          scrub: 1.2,
        },
      });

      tl.to(p1, { strokeDashoffset: 0, ease: "power1.out" }, 0);
      tl.to(p2, { strokeDashoffset: 0, ease: "power1.out" }, 0.15);
      tl.to(lbl, { opacity: 1, scale: 1, ease: "power2.out" }, 0.35);
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center justify-start w-72 md:w-96 h-20 md:h-24 select-none mb-6 md:mb-8"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 340 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full pointer-events-none overflow-visible"
      >
        <path
          ref={path1Ref}
          d="M 2 62 C 32 62, 110 62, 205 48 C 285 36, 310 10, 235 10 C 140 10, 24 32, 38 56 C 45 74, 125 82, 255 62"
          stroke="#0B2540"
          strokeWidth="0.45"
          opacity="0.32"
          strokeLinecap="round"
        />
        <ellipse
          ref={path2Ref}
          cx="170"
          cy="45"
          rx="94"
          ry="22"
          stroke="#0B2540"
          strokeWidth="0.42"
          opacity="0.35"
        />
      </svg>
      <span
        ref={labelRef}
        className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 font-cinzel italic text-[12px] md:text-[14px] tracking-[0.08em] text-ink/80 whitespace-nowrap"
        style={{ fontStyle: "italic" }}
      >
        {label}
      </span>
    </div>
  );
}

/** Chevron icon for CTA */
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
  navProgress,
}: {
  scrolled: boolean;
  navProgress: number;
}) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

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

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const bgAlpha = lerp(0, 0.72, navProgress);
  const blurAmt = lerp(0, 12, navProgress);
  const borderAlpha = lerp(0, 0.07, navProgress);

  const textR = lerp(255, 11, navProgress);
  const textG = lerp(255, 37, navProgress);
  const textB = lerp(255, 64, navProgress);
  const textA = lerp(0.88, 0.72, navProgress);

  const borderR = lerp(255, 11, navProgress);
  const borderG = lerp(255, 37, navProgress);
  const borderB = lerp(255, 64, navProgress);
  const borderA = lerp(0.25, 0.18, navProgress);

  const fillA = lerp(0.10, 0.04, navProgress);

  const textColor = `rgba(${textR | 0},${textG | 0},${textB | 0},${textA.toFixed(2)})`;
  const borderColor = `rgba(${borderR | 0},${borderG | 0},${borderB | 0},${borderA.toFixed(2)})`;
  const fillColor = `rgba(${textR | 0},${textG | 0},${textB | 0},${fillA.toFixed(2)})`;

  const bgStyle: React.CSSProperties = menuOpen
    ? { background: "transparent" }
    : {
        background: `rgba(253,252,250,${bgAlpha.toFixed(3)})`,
        backdropFilter: `blur(${blurAmt.toFixed(1)}px)`,
        WebkitBackdropFilter: `blur(${blurAmt.toFixed(1)}px)`,
        borderBottom: `1px solid rgba(11,37,64,${borderAlpha.toFixed(3)})`,
      };

  const linkStyle: React.CSSProperties = {
    color: textColor,
    borderColor: borderColor,
    background: fillColor,
  };

  const bookStyle: React.CSSProperties = {
    color: textColor,
    borderColor: `rgba(${borderR | 0},${borderG | 0},${borderB | 0},${(borderA * 1.4).toFixed(2)})`,
    background: `rgba(${textR | 0},${textG | 0},${textB | 0},${(fillA * 1.8).toFixed(2)})`,
  };

  const wordmarkColor = `rgba(${textR | 0},${textG | 0},${textB | 0},${lerp(0.88, 0.80, navProgress).toFixed(2)})`;

  return (
    <>
      <nav
        id="skynest-nav"
        aria-label="SkyNest Hotels main navigation"
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-150"
        style={bgStyle}
      >
        <div className="flex items-center justify-between h-14 md:h-16 px-6 md:px-8">
          {/* Left — nav links as White Desert bordered buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                id={`nav-link-${link.label.toLowerCase()}`}
                className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
                style={linkStyle}
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
              <MountainGlyph
                className="w-7 h-auto"
                style={{ color: wordmarkColor } as React.CSSProperties}
              />
              <span
                className="font-jakarta font-700 text-[11px] tracking-[0.35em] uppercase select-none"
                style={{ color: wordmarkColor }}
              >
                SKYNEST
              </span>
            </a>
          </div>

          {/* Right — CTA buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            <a
              href="#rates"
              id="nav-cta-rates"
              className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
              style={linkStyle}
            >
              Rates
            </a>
            <a
              href="#booking"
              id="nav-cta-book-now"
              className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
              style={bookStyle}
            >
              Book Now
            </a>

            {user ? (
              <>
                <a
                  href="/dashboard"
                  id="nav-cta-dashboard"
                  className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200 text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  Dashboard
                </a>
                <button
                  onClick={logout}
                  id="nav-cta-logout"
                  className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200 text-red-400 border-red-500/30 hover:border-red-400 bg-red-500/10 hover:bg-red-500/20"
                >
                  Log Out
                </button>
              </>
            ) : (
              <a
                href="/login"
                id="nav-cta-sign-in"
                className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200 text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
              >
                Sign In
              </a>
            )}
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
          {[...NAV_LINKS, { label: "Rates", href: "#rates" }, { label: "Book Now", href: "#booking" }, { label: "Sign In", href: "/login" }].map(

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
// Hero Section — PINNED (sticky) so it stays while clouds float over it
// ---------------------------------------------------------------------------
function HeroSection({
  heroRef,
}: {
  heroRef: React.RefObject<HTMLElement>;
}) {
  const bgImgRef = useRef<HTMLImageElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "+=120%",
          scrub: 1.2,
        },
        defaults: {
          ease: "none",
          force3D: true,
        },
      });

      // Background image slowly glides down and scales with momentum
      if (bgImgRef.current) {
        tl.to(bgImgRef.current, { y: "18%", scale: 1.08 }, 0);
      }

      // Wordmark sinks down and fades with momentum
      if (wordmarkRef.current) {
        tl.to(wordmarkRef.current, { y: "30%", opacity: 0.15 }, 0);
      }

      // Eyebrow and CTA drift up and fade out
      if (topRowRef.current) {
        tl.to(topRowRef.current, { y: "-35px", opacity: 0.1 }, 0);
      }
    }, heroRef);

    return () => ctx.revert();
  }, [heroRef]);

  return (
    <section
      ref={heroRef}
      id="hero"
      aria-label="SkyNest Hotels hero"
      className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0"
    >
      {/* Hero Background Image */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <img
          ref={bgImgRef}
          src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{
            filter: "brightness(0.6) contrast(1.1)",
            willChange: "transform",
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
      <div
        ref={topRowRef}
        className="relative flex items-start justify-between px-6 md:px-12 pt-24 md:pt-28 pb-0 z-10"
        style={{ willChange: "transform, opacity" }}
      >
        {/* Eyebrow */}
        <p
          className="font-cinzel font-normal italic text-white/75 text-[13px] md:text-[15px] leading-relaxed max-w-[200px] md:max-w-none"
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

      {/* Giant SKYNEST wordmark */}
      <div
        ref={wordmarkRef}
        aria-hidden="true"
        className="relative z-10 flex-1 flex items-end justify-center overflow-hidden pointer-events-none select-none w-full"
        style={{ willChange: "transform, opacity" }}
      >
        <span
          className="font-cinzel font-normal leading-[0.85] text-white text-center whitespace-nowrap block w-full uppercase"
          style={{
            fontSize: "clamp(100px, 21vw, 260px)",
            letterSpacing: "0.03em",
            paddingBottom: "clamp(4px, 1.5vw, 8px)",
          }}
        >
          SKYNEST
        </span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cloud Transition — GSAP ScrollTrigger butter-smooth scrub cloud rise (60fps)
// ---------------------------------------------------------------------------
function CloudTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrap1Ref = useRef<HTMLDivElement>(null);
  const wrap2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.set([wrap1Ref.current, wrap2Ref.current], { autoAlpha: 0 });
    gsap.set(wrap1Ref.current, { y: "12%" });
    gsap.set(wrap2Ref.current, { y: "20%" });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 2, // Smooth lag momentum feel
        },
        defaults: {
          ease: "none",
          force3D: true,
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
      {/* Positioner 1 */}
      <div
        ref={wrap1Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden"
        style={{
          width: "220%",
          height: "100%",
          marginLeft: "-110%",
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

      {/* Positioner 2 */}
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
      className="relative bg-paper overflow-hidden py-14 md:py-20"
    >
      {/* 6-column hairline grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex"
        style={{ zIndex: 1 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-l border-ink/[0.06] last:border-r"
          />
        ))}
      </div>

      <div className="relative z-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-6 items-start">
          {/* Columns 1 & 2 */}
          <div className="hidden md:block md:col-start-1 md:col-end-3" />

          {/* Columns 3, 4, 5 */}
          <div className="md:col-start-3 md:col-end-6 pl-0 pr-4 md:pr-8 flex flex-col items-start">
            <SweepingOrbitalEmblem label="The SkyNest Standard" reducedMotion={reducedMotion} />

            <h1
              className="font-cinzel font-normal uppercase leading-[1.12] tracking-[0.04em] text-ink w-full pl-0"
              style={{
                fontSize: "clamp(24px, 3.2vw, 50px)",
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
                  className="block transition-colors duration-700 font-cinzel font-normal uppercase tracking-[0.035em]"
                  style={{
                    color: visibleLines[i] ? "#0B2540" : "#D4DCE3",
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  {line}
                </span>
              ))}
            </h1>

            {/* Sub-text & CTA */}
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pt-4 border-t border-ink/[0.08] w-full">
              <p
                className={[
                  "font-jakarta text-[12px] md:text-[13px] leading-[1.8] text-ink/55 max-w-sm",
                  "transition-opacity duration-1000",
                  reducedMotion || visibleLines[STORY_LINES.length - 1]
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3",
                ].join(" ")}
                style={{ transitionDelay: "450ms" }}
              >
                From the colonial harbour of Galle to the mist-veiled hills of Kandy, each SkyNest property is designed around its landscape.
              </p>

              <a
                href="#branches"
                id="intro-branches-link"
                className="self-start sm:self-auto inline-flex items-center gap-2 font-jakarta text-[10px] md:text-[11px] font-semibold tracking-[0.2em] uppercase text-ink whitespace-nowrap border-b border-ink/30 pb-0.5 hover:border-ink transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink/40"
              >
                View our branches
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Column 6 */}
          <div className="hidden md:block md:col-start-6 md:col-end-7" />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Branches Section — Full-Bleed Parallax with Smooth Scrub
// ---------------------------------------------------------------------------
function BranchesSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (reducedMotion) {
      if (labelRef.current) gsap.set(labelRef.current, { opacity: 1, y: 0 });
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0 });
      if (lineRef.current) gsap.set(lineRef.current, { opacity: 1, y: 0 });
      return;
    }

    const img = imgRef.current;
    const label = labelRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    if (!img || !label || !title || !line || !sectionRef.current) return;

    gsap.set(img, { scale: 1.05, y: -30 });
    gsap.set(label, { y: 20, opacity: 0.4 });
    gsap.set(title, { y: 15, opacity: 0.4 });
    gsap.set(line, { y: 10, opacity: 0.4 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
        defaults: {
          ease: "none",
          force3D: true,
        },
      });

      tl.to(img, { y: 30, scale: 1.0 }, 0);
      tl.to(label, { y: -20, opacity: 1 }, 0);
      tl.to(title, { y: -15, opacity: 1 }, 0);
      tl.to(line, { y: -10, opacity: 1 }, 0);
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="branches"
      aria-label="SkyNest Hotels branches"
      className="relative bg-paper overflow-hidden w-full"
    >
      <div className="relative w-full aspect-[3/2] overflow-hidden">
        {/* Parallax background image */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          {/* Feathered top gradient */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-28 md:h-44 pointer-events-none z-[2]"
            style={{
              background:
                "linear-gradient(to bottom, #FDFCFA 0%, rgba(253,252,250,0.85) 25%, rgba(253,252,250,0.3) 65%, transparent 100%)",
            }}
          />

          <img
            ref={imgRef}
            src="/Kandy_hotel.jpg"
            alt="SkyNest Kandy — tea-country terrace overlooking misty hill range"
            className="w-full h-full object-cover object-center"
            style={{
              willChange: "transform",
            }}
          />
        </div>

        {/* 6-column grid lines */}
        <div className="absolute inset-0 pointer-events-none z-[5]">
          <HairlineGrid count={5} color="border-white/[0.15] md:border-white/[0.12]" />
        </div>

        {/* Text overlay */}
        <div
          aria-hidden="false"
          className="absolute inset-0 pointer-events-none z-10"
        >
          <div className="relative h-full mx-auto max-w-[1400px] px-6 md:px-16 flex flex-col justify-start pt-12 md:pt-20 gap-2.5 md:gap-4">
            <span
              ref={labelRef}
              className="font-jakarta text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-ink/80 drop-shadow-sm"
              style={{
                willChange: "transform, opacity",
                opacity: reducedMotion ? 1 : 0,
              }}
            >
              02 &nbsp;/&nbsp; KANDY HIGHLANDS
            </span>

            <h2
              ref={titleRef}
              className="font-cinzel text-ink leading-[1.05] drop-shadow-sm uppercase tracking-[0.03em]"
              style={{
                fontSize: "clamp(32px, 4.8vw, 72px)",
                willChange: "transform, opacity",
                opacity: reducedMotion ? 1 : 0,
              }}
            >
              SkyNest Kandy
            </h2>

            <p
              ref={lineRef}
              className="font-cinzel italic text-ink/75 max-w-lg leading-relaxed text-sm md:text-lg drop-shadow-sm"
              style={{
                willChange: "transform, opacity",
                opacity: reducedMotion ? 1 : 0,
              }}
            >
              High in the hill country, where early morning mist meets endless emerald tea gardens.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-skynest-hairline" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sunset Showcase Section
// ---------------------------------------------------------------------------
function SunsetShowcaseSection({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (reducedMotion) return;
    const img = imgRef.current;
    const sec = sectionRef.current;
    if (!img || !sec) return;

    gsap.set(img, { scale: 1.12, y: -25 });

    const ctx = gsap.context(() => {
      gsap.to(img, {
        y: 25,
        scale: 1.02,
        ease: "none",
        force3D: true,
        scrollTrigger: {
          trigger: sec,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, sec);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
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
            <h2 className="font-cinzel text-3xl md:text-5xl text-ink mt-2">
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
            <img
              ref={imgRef}
              src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.jpg"
              alt="Sunset at SkyNest Galle infinity pool"
              className="w-full h-full object-cover"
              style={{ willChange: "transform" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white z-10">
              <div>
                <span className="font-cinzel italic text-white/75 text-xs md:text-sm">
                  Galle Fort Coastline
                </span>
                <h3 className="font-cinzel text-2xl md:text-4xl text-white mt-1">
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
  const [navProgress, setNavProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const vh = window.innerHeight;
      const start = vh * 0.60;
      const end = vh * 1.00;
      const raw = (y - start) / (end - start);
      const t = Math.max(0, Math.min(1, raw));
      const smooth = t * t * (3 - 2 * t);
      setNavProgress(smooth);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative bg-paper">
      {/* Single global adaptive grid */}
      <GlobalGridOverlay />

      <a
        href="#story"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-ink focus:px-4 focus:py-2 focus:text-sm focus:font-jakarta focus:font-semibold focus:rounded focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <SkyNestNav scrolled={scrolled} navProgress={navProgress} />

      {/* Hero — pinned at top, stays static while you scroll */}
      <HeroSection heroRef={heroRef} />

      {/* Cloud Transition — scrolls over the pinned hero, covers it, blends to white */}
      <CloudTransition />

      {/* Intro / Story — appears after the cloud covers everything */}
      <IntroSection reducedMotion={reducedMotion} />

      {/* Branches — Kandy hotel sky-to-white bleed */}
      <BranchesSection reducedMotion={reducedMotion} />

      {/* Sunset Showcase Section */}
      <SunsetShowcaseSection reducedMotion={reducedMotion} />

      {/* Placeholder anchor for booking section */}
      <div id="how-booking-works" className="bg-paper py-8 px-6 md:px-12 border-t border-skynest-hairline">
        <p className="font-jakarta text-[11px] tracking-[0.15em] uppercase text-ink/30 text-center">
          — Booking flow coming soon —
        </p>
      </div>
    </div>
  );
}
