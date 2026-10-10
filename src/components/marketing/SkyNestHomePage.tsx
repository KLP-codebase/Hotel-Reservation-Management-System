"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@/context/auth-context";
import { SkyNestFooter } from "./SkyNestFooter";


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
  { label: "Contact", href: "/contact" },
];

const STORY_LINES = [
  "SRI LANKA HAS ALWAYS DEMANDED",
  "AN UNHURRIED ATTENTION —",
  "THREE COASTLINES, THREE SANCTUARIES,",
  "ONE UNCOMPROMISING",
  "STANDARD OF WELCOME.",
];

const COASTAL_STORY_LINES = [
  "FROM MISTED HIGH PEAKS",
  "DOWN TO OCEAN HORIZONS —",
  "WHERE CENTURIES OF HERITAGE",
  "MEET THE TIMELESS RHYTHM",
  "OF SOUTHERN TIDES.",
];

const COLOMBO_STORY_LINES = [
  "WHERE THE HARBOUR CITY",
  "BREATHES WITH THE TIDES —",
  "COLONIAL GRANDEUR REIMAGINED",
  "FOR THE MODERN TRAVELLER,",
  "AT THE HEART OF THE ISLAND.",
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
          start: "top 95%",
          end: "top 65%",
          scrub: 0.8,
        },
      });

      tl.to(p1, { strokeDashoffset: 0, ease: "power1.out" }, 0);
      tl.to(p2, { strokeDashoffset: 0, ease: "power1.out" }, 0.08);
      tl.to(lbl, { opacity: 1, scale: 1, ease: "power2.out" }, 0.16);
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center justify-start w-full max-w-[280px] sm:max-w-xs md:max-w-sm h-16 sm:h-20 md:h-24 select-none mb-6 md:mb-8"
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
        className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 font-cinzel italic text-[11px] sm:text-[12px] md:text-[14px] tracking-[0.08em] text-ink/80 whitespace-nowrap"
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
        <div className="flex items-center justify-between h-14 md:h-16 px-4 sm:px-6 md:px-8">
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
          <div className="flex items-center md:absolute md:left-1/2 md:-translate-x-1/2">
            <a
              href="/"
              id="nav-wordmark"
              aria-label="SkyNest Hotels — homepage"
              className="flex flex-col items-center gap-0.5 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50 rounded-sm"
            >
              <MountainGlyph
                className="w-6 sm:w-7 h-auto"
                style={{ color: wordmarkColor } as React.CSSProperties}
              />
              <span
                className="font-jakarta font-bold text-[10px] sm:text-[11px] tracking-[0.35em] uppercase select-none"
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
              href="/book"
              id="nav-cta-book-now"
              className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
              style={bookStyle}
            >
              Book Now
            </a>

            {user ? (
              <>
                {user.role?.toUpperCase() !== 'GUEST' && (
                  <a
                    href="/dashboard"
                    id="nav-cta-dashboard"
                    className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200 text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                  >
                    Dashboard
                  </a>
                )}
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

          {/* Mobile Right Controls: Book CTA + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href="/book"
              id="mobile-quick-book"
              className="px-3 py-1.5 text-[10px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-colors duration-200"
              style={bookStyle}
            >
              Book
            </a>
            <button
              id="nav-hamburger"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="nav-mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex items-center justify-center w-9 h-9 border transition-colors duration-200 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
              style={{
                borderColor: menuOpen ? "rgba(255,255,255,0.2)" : borderColor,
              }}
            >
              <span className="relative w-4 h-3 flex flex-col justify-between">
                <span
                  className={[
                    "block h-px origin-center transition-all duration-300 ease-out",
                    menuOpen ? "rotate-45 translate-y-[5.5px] !bg-white" : "",
                  ].join(" ")}
                  style={{ backgroundColor: menuOpen ? "white" : textColor }}
                />
                <span
                  className={[
                    "block h-px transition-all duration-300 ease-out",
                    menuOpen ? "opacity-0 scale-x-50 !bg-white" : "",
                  ].join(" ")}
                  style={{ backgroundColor: menuOpen ? "white" : textColor }}
                />
                <span
                  className={[
                    "block h-px origin-center transition-all duration-300 ease-out",
                    menuOpen ? "-rotate-45 -translate-y-[5.5px] !bg-white" : "",
                  ].join(" ")}
                  style={{ backgroundColor: menuOpen ? "white" : textColor }}
                />
              </span>
            </button>
          </div>
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
          "bg-ink/[0.98] backdrop-blur-2xl",
          "flex flex-col justify-center px-8",
          "transition-opacity duration-500 ease-out",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="space-y-1 pt-12">
          {[
            ...NAV_LINKS,
            { label: "Rates", href: "#rates" },
            { label: "Book Now", href: "/book" },
          ].map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              id={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setMenuOpen(false)}
              className={[
                "block py-3.5 font-jakarta font-semibold text-2xl sm:text-3xl text-white/80 hover:text-white",
                "border-b border-white/[0.08]",
                "transition-all duration-500 ease-out",
                "focus-visible:outline-none focus-visible:text-white",
                menuOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              ].join(" ")}
              style={{
                transitionDelay: menuOpen ? `${i * 60 + 100}ms` : "0ms",
              }}
            >
              {link.label}
            </a>
          ))}

          {/* Auth link in mobile menu */}
          <div className="pt-4">
            {user ? (
              <div className="flex flex-col gap-2">
                {user.role?.toUpperCase() !== 'GUEST' && (
                  <a
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 font-jakarta font-semibold text-xl text-amber-400 hover:text-amber-300"
                  >
                    Staff Dashboard
                  </a>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="text-left py-2 font-jakarta font-semibold text-lg text-red-400 hover:text-red-300"
                >
                  Log Out ({user.firstName})
                </button>
              </div>
            ) : (
              <a
                href="/login"
                id="mobile-nav-sign-in"
                onClick={() => setMenuOpen(false)}
                className="block py-3 font-jakarta font-semibold text-xl text-amber-400 hover:text-amber-300"
              >
                Sign In
              </a>
            )}
          </div>
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
          end: "+=100%",
          scrub: 1.0,
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

      // Wordmark sinks down and fades with momentum on scroll
      if (wordmarkRef.current) {
        tl.to(wordmarkRef.current, { y: "30%", opacity: 0.15 }, 0);
      }

      // Eyebrow and CTA drift up and fade out on scroll
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
          src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.webp"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{
            filter: "brightness(0.7) contrast(1.1)",
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



      {/* Top row: eyebrow left + explore right */}
      <div
        ref={topRowRef}
        className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between px-6 sm:px-8 md:px-12 pt-20 sm:pt-24 md:pt-28 pb-0 gap-4 sm:gap-6 z-10"
        style={{ willChange: "transform, opacity" }}
      >
        {/* Eyebrow */}
        <p
          className="font-cinzel font-normal italic text-white/75 text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed max-w-[280px] sm:max-w-none"
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
          className="self-start sm:self-auto flex items-center gap-2 font-jakarta text-[10px] sm:text-[11px] md:text-[12px] font-medium tracking-[0.15em] uppercase text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          <span>Explore Branches</span>
          <ChevronRight className="w-3 h-3" />
        </a>
      </div>

      {/* Giant SKYNEST wordmark */}
      <div
        ref={wordmarkRef}
        aria-hidden="true"
        className="relative z-10 flex-1 flex items-end justify-center overflow-hidden pointer-events-none select-none w-full px-4"
        style={{ willChange: "transform, opacity" }}
      >
        <span
          className="font-cinzel font-normal leading-[0.85] text-white text-center whitespace-nowrap block w-full uppercase"
          style={{
            fontSize: "clamp(46px, 17.5vw, 260px)",
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
          scrub: 1.0, // Responsive, butter-smooth cloud rise
        },
        defaults: {
          ease: "none",
          force3D: true,
        },
      });

      // Layer 1 — base clouds rise and fade in
      tl.to(wrap1Ref.current, { y: "0%", autoAlpha: 1 }, 0);

      // Layer 2 — denser clouds, deeper parallax offset, slight delay in timeline
      tl.to(wrap2Ref.current, { y: "0%", autoAlpha: 1 }, 0.1);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative z-10 h-[50dvh] sm:h-[60dvh] md:h-[70dvh] pointer-events-none overflow-hidden"
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
          src="/07_Clouds.webp"
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
          src="/Clouds 3.webp"
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
// Intro / Story Section
// ---------------------------------------------------------------------------
function IntroSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const title = titleRef.current;
    const emblem = emblemRef.current;
    const lines = lineRefs.current.filter(Boolean) as HTMLSpanElement[];
    const subText = subTextRef.current;

    if (reducedMotion) {
      if (emblem) gsap.set(emblem, { opacity: 1, y: 0 });
      gsap.set(lines, { opacity: 1, y: 0 });
      if (subText) gsap.set(subText, { opacity: 1, y: 0 });
      return;
    }

    if (!section) return;

    if (emblem) gsap.set(emblem, { opacity: 0, y: 15 });
    gsap.set(lines, { opacity: 0, y: "100%" });
    if (subText) gsap.set(subText, { opacity: 0, y: 15 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });

      if (emblem) {
        tl.to(emblem, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
      }
      tl.to(
        lines,
        {
          opacity: 1,
          y: "0%",
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
        },
        emblem ? "-=0.25" : 0
      );
      if (subText) {
        tl.to(subText, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.2");
      }
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="story"
      aria-label="SkyNest Hotels story"
      className="relative bg-paper overflow-hidden py-14 md:py-20"
    >


      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-6 items-start">
          {/* Columns 1 & 2 */}
          <div className="hidden md:block md:col-start-1 md:col-end-3" />

          {/* Columns 3, 4, 5 */}
          <div className="md:col-start-3 md:col-end-6 md:pl-0 md:pr-8 flex flex-col items-start w-full">
            <div ref={emblemRef}>
              <SweepingOrbitalEmblem label="The SkyNest Standard" reducedMotion={reducedMotion} />
            </div>

            <h1
              ref={titleRef}
              className="font-cinzel font-normal uppercase leading-[1.12] tracking-[0.04em] text-ink w-full pl-0"
              style={{
                fontSize: "clamp(22px, 3.2vw, 40px)",
              }}
              aria-label={STORY_LINES.join(" ")}
            >
              {STORY_LINES.map((line, i) => (
                <div key={i} className="overflow-hidden block py-0.5">
                  <span
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                    aria-hidden="true"
                    className="block font-cinzel font-normal uppercase tracking-[0.035em] text-ink will-change-transform"
                  >
                    {line}
                  </span>
                </div>
              ))}
            </h1>

            {/* Sub-text & CTA */}
            <div
              ref={subTextRef}
              className="mt-8 md:mt-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pt-4 border-t border-ink/[0.08] w-full"
            >
              <p className="font-jakarta text-[12px] md:text-[13px] leading-[1.8] text-ink/55 max-w-sm">
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
// Branches Section 01 (Kandy) — Full-Bleed Parallax with Smooth Scrub
// ---------------------------------------------------------------------------
function KandyBranchSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const img = imgRef.current;
    const label = labelRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    const section = sectionRef.current;
    if (!section || !img || !label || !title || !line) return;

    if (reducedMotion) {
      gsap.set([label, title, line], { opacity: 1, y: 0 });
      return;
    }

    gsap.set(img, { scale: 1.05, y: -30 });
    gsap.set(label, { y: 15, opacity: 0 });
    gsap.set(title, { y: 15, opacity: 0 });
    gsap.set(line, { y: 15, opacity: 0 });

    const ctx = gsap.context(() => {
      // Parallax scrub on image
      gsap.to(img, {
        y: 30,
        scale: 1.0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      // Text entrance timeline triggered when section is reached
      const textTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });

      textTl
        .to(label, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .to(title, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25")
        .to(line, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25");
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="branches"
      aria-label="SkyNest Kandy branch"
      className="relative bg-paper overflow-hidden w-full"
    >
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-0 md:aspect-[3/2] overflow-hidden">
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
            src="/Kandy_hotel.webp"
            alt="SkyNest Kandy — tea-country terrace overlooking misty hill range"
            className="w-full h-full object-cover object-center"
            style={{
              willChange: "transform",
            }}
          />
        </div>



        {/* Text overlay */}
        <div
          aria-hidden="false"
          className="absolute inset-0 pointer-events-none z-10"
        >
          <div className="relative h-full mx-auto max-w-[1400px] px-6 sm:px-10 md:px-16 flex flex-col justify-start pt-14 sm:pt-16 md:pt-20 gap-2.5 md:gap-4">
            <span
              ref={labelRef}
              className="font-jakarta text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-ink/80 drop-shadow-sm"
              style={{
                willChange: "transform, opacity",
              }}
            >
              01 &nbsp;/&nbsp; KANDY HIGHLANDS
            </span>

            <h2
              ref={titleRef}
              className="font-cinzel text-ink leading-[1.05] drop-shadow-sm uppercase tracking-[0.03em]"
              style={{
                fontSize: "clamp(28px, 4.8vw, 72px)",
                willChange: "transform, opacity",
              }}
            >
              SkyNest Kandy
            </h2>

            <p
              ref={lineRef}
              className="font-cinzel italic text-ink/75 max-w-lg leading-relaxed text-sm md:text-lg drop-shadow-sm"
              style={{
                willChange: "transform, opacity",
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
// Coastal Interlude Section (Between Kandy and Galle)
// ---------------------------------------------------------------------------
function CoastalInterludeSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const title = titleRef.current;
    const emblem = emblemRef.current;
    const lines = lineRefs.current.filter(Boolean) as HTMLSpanElement[];

    if (reducedMotion) {
      if (emblem) gsap.set(emblem, { opacity: 1, y: 0 });
      gsap.set(lines, { opacity: 1, y: 0 });
      return;
    }

    if (!section) return;

    if (emblem) gsap.set(emblem, { opacity: 0, y: 15 });
    gsap.set(lines, { opacity: 0, y: "100%" });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });

      if (emblem) {
        tl.to(emblem, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
      }
      tl.to(
        lines,
        {
          opacity: 1,
          y: "0%",
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
        },
        emblem ? "-=0.25" : 0
      );
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="coastal-story"
      aria-label="SkyNest Southern Coast story"
      className="relative bg-paper overflow-hidden py-14 md:py-20"
    >


      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-6 items-start">
          {/* Columns 1 & 2 */}
          <div className="hidden md:block md:col-start-1 md:col-end-3" />

          {/* Columns 3, 4, 5 */}
          <div className="md:col-start-3 md:col-end-6 md:pl-0 md:pr-8 flex flex-col items-start w-full">
            <div ref={emblemRef}>
              <SweepingOrbitalEmblem label="The Coastal Sanctuary" reducedMotion={reducedMotion} />
            </div>

            <h2
              ref={titleRef}
              className="font-cinzel font-normal uppercase leading-[1.12] tracking-[0.04em] text-ink w-full pl-0"
              style={{
                fontSize: "clamp(22px, 3.2vw, 40px)",
              }}
              aria-label={COASTAL_STORY_LINES.join(" ")}
            >
              {COASTAL_STORY_LINES.map((line, i) => (
                <div key={i} className="overflow-hidden block py-0.5">
                  <span
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                    aria-hidden="true"
                    className="block font-cinzel font-normal uppercase tracking-[0.035em] text-ink will-change-transform"
                  >
                    {line}
                  </span>
                </div>
              ))}
            </h2>
          </div>

          {/* Column 6 */}
          <div className="hidden md:block md:col-start-6 md:col-end-7" />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Branches Section 02 (Galle) — Full-Bleed Parallax with Smooth Scrub
// ---------------------------------------------------------------------------
function GalleBranchSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const img = imgRef.current;
    const label = labelRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    const section = sectionRef.current;
    if (!section || !img || !label || !title || !line) return;

    if (reducedMotion) {
      gsap.set([label, title, line], { opacity: 1, y: 0 });
      return;
    }

    gsap.set(img, { scale: 1.05, y: -30 });
    gsap.set(label, { y: 15, opacity: 0 });
    gsap.set(title, { y: 15, opacity: 0 });
    gsap.set(line, { y: 15, opacity: 0 });

    const ctx = gsap.context(() => {
      // Parallax scrub on image
      gsap.to(img, {
        y: 30,
        scale: 1.0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      // Text entrance timeline triggered when section is reached
      const textTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });

      textTl
        .to(label, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .to(title, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25")
        .to(line, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25");
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="galle-branch"
      aria-label="SkyNest Galle branch"
      className="relative bg-paper overflow-hidden w-full"
    >
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-0 md:aspect-[3/2] overflow-hidden">
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
            src="/Galle.webp"
            alt="SkyNest Galle — colonial harbour ramparts and southern coastline"
            className="w-full h-full object-cover object-center"
            style={{
              willChange: "transform",
            }}
          />
        </div>



        {/* Text overlay */}
        <div
          aria-hidden="false"
          className="absolute inset-0 pointer-events-none z-10"
        >
          <div className="relative h-full mx-auto max-w-[1400px] px-6 sm:px-10 md:px-16 flex flex-col items-start sm:items-end justify-start pt-14 sm:pt-16 md:pt-20 gap-2.5 md:gap-4 text-left sm:text-right">
            <span
              ref={labelRef}
              className="font-jakarta text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-ink/80 drop-shadow-sm text-left sm:text-right"
              style={{
                willChange: "transform, opacity",
              }}
            >
              02 &nbsp;/&nbsp; GALLE COASTLINE
            </span>

            <h2
              ref={titleRef}
              className="font-cinzel text-ink leading-[1.05] drop-shadow-sm uppercase tracking-[0.03em] text-left sm:text-right"
              style={{
                fontSize: "clamp(28px, 4.8vw, 72px)",
                willChange: "transform, opacity",
              }}
            >
              SkyNest Galle
            </h2>

            <p
              ref={lineRef}
              className="font-cinzel italic text-ink/75 max-w-lg leading-relaxed text-sm md:text-lg drop-shadow-sm text-left sm:text-right"
              style={{
                willChange: "transform, opacity",
              }}
            >
              Perched above the southern ocean, where colonial ramparts meet the warmth of golden hour tides.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-skynest-hairline" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// City Interlude Section (Between Galle and Colombo)
// ---------------------------------------------------------------------------
function ColomboCityInterludeSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const title = titleRef.current;
    const emblem = emblemRef.current;
    const lines = lineRefs.current.filter(Boolean) as HTMLSpanElement[];

    if (reducedMotion) {
      if (emblem) gsap.set(emblem, { opacity: 1, y: 0 });
      gsap.set(lines, { opacity: 1, y: 0 });
      return;
    }

    if (!section) return;

    if (emblem) gsap.set(emblem, { opacity: 0, y: 15 });
    gsap.set(lines, { opacity: 0, y: "100%" });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });

      if (emblem) {
        tl.to(emblem, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
      }
      tl.to(
        lines,
        {
          opacity: 1,
          y: "0%",
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
        },
        emblem ? "-=0.25" : 0
      );
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="colombo-story"
      aria-label="SkyNest Colombo city story"
      className="relative bg-paper overflow-hidden py-14 md:py-20"
    >


      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-6 items-start">
          {/* Columns 1 & 2 */}
          <div className="hidden md:block md:col-start-1 md:col-end-3" />

          {/* Columns 3, 4, 5 */}
          <div className="md:col-start-3 md:col-end-6 md:pl-0 md:pr-8 flex flex-col items-start w-full">
            <div ref={emblemRef}>
              <SweepingOrbitalEmblem label="The Urban Sanctuary" reducedMotion={reducedMotion} />
            </div>

            <h2
              ref={titleRef}
              className="font-cinzel font-normal uppercase leading-[1.12] tracking-[0.04em] text-ink w-full pl-0"
              style={{
                fontSize: "clamp(22px, 3.2vw, 40px)",
              }}
              aria-label={COLOMBO_STORY_LINES.join(" ")}
            >
              {COLOMBO_STORY_LINES.map((line, i) => (
                <div key={i} className="overflow-hidden block py-0.5">
                  <span
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                    aria-hidden="true"
                    className="block font-cinzel font-normal uppercase tracking-[0.035em] text-ink will-change-transform"
                  >
                    {line}
                  </span>
                </div>
              ))}
            </h2>
          </div>

          {/* Column 6 */}
          <div className="hidden md:block md:col-start-6 md:col-end-7" />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Branches Section 03 (Colombo) — Full-Bleed Parallax with Smooth Scrub
// ---------------------------------------------------------------------------
function ColomboBranchSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const img = imgRef.current;
    const label = labelRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    const section = sectionRef.current;
    if (!section || !img || !label || !title || !line) return;

    if (reducedMotion) {
      gsap.set([label, title, line], { opacity: 1, y: 0 });
      return;
    }

    gsap.set(img, { scale: 1.1, y: 140 });
    gsap.set(label, { y: 15, opacity: 0 });
    gsap.set(title, { y: 15, opacity: 0 });
    gsap.set(line, { y: 15, opacity: 0 });

    const ctx = gsap.context(() => {
      // Parallax scrub on image
      gsap.to(img, {
        y: -30,
        scale: 1.0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      // Text entrance timeline triggered when section is reached
      const textTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });

      textTl
        .to(label, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .to(title, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25")
        .to(line, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25");
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="colombo-branch"
      aria-label="SkyNest Colombo branch"
      className="relative bg-paper overflow-hidden w-full"
    >
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-0 md:aspect-[3/2] overflow-hidden">
        {/* Parallax background image */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          {/* Feathered top gradient */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-40 md:h-64 pointer-events-none z-[2]"
            style={{
              background:
                "linear-gradient(to bottom, #FDFCFA 0%, rgba(253,252,250,0.9) 30%, rgba(253,252,250,0.45) 62%, rgba(253,252,250,0.08) 88%, transparent 100%)",
            }}
          />

          <img
            ref={imgRef}
            src="/Colombo.webp"
            alt="SkyNest Colombo — harbour city skyline meeting the Indian Ocean"
            className="w-full h-full object-cover object-top"
            style={{
              willChange: "transform",
            }}
          />
        </div>



        {/* Text overlay — left-aligned (mirrors Kandy) */}
        <div
          aria-hidden="false"
          className="absolute inset-0 pointer-events-none z-10"
        >
          <div className="relative h-full mx-auto max-w-[1400px] px-6 sm:px-10 md:px-16 flex flex-col justify-start pt-14 sm:pt-16 md:pt-20 gap-2.5 md:gap-4">
            <span
              ref={labelRef}
              className="font-jakarta text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-ink/80 drop-shadow-sm"
              style={{
                willChange: "transform, opacity",
                opacity: reducedMotion ? 1 : 0,
              }}
            >
              03 &nbsp;/&nbsp; COLOMBO CITY
            </span>

            <h2
              ref={titleRef}
              className="font-cinzel text-ink leading-[1.05] drop-shadow-sm uppercase tracking-[0.03em]"
              style={{
                fontSize: "clamp(28px, 4.8vw, 72px)",
                willChange: "transform, opacity",
                opacity: reducedMotion ? 1 : 0,
              }}
            >
              SkyNest Colombo
            </h2>

            <p
              ref={lineRef}
              className="font-cinzel italic text-ink/75 max-w-lg leading-relaxed text-sm md:text-lg drop-shadow-sm"
              style={{
                willChange: "transform, opacity",
                opacity: reducedMotion ? 1 : 0,
              }}
            >
              Where the colonial harbour city pulses with life, a sanctuary of calm above the ocean horizon.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-skynest-hairline" />
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

      {/* Branch 01 — Kandy Highlands */}
      <KandyBranchSection reducedMotion={reducedMotion} />

      {/* Interlude / Story — Southern Coast */}
      <CoastalInterludeSection reducedMotion={reducedMotion} />

      {/* Branch 02 — Galle Coastline */}
      <GalleBranchSection reducedMotion={reducedMotion} />

      {/* Interlude / Story — Colombo City */}
      <ColomboCityInterludeSection reducedMotion={reducedMotion} />

      {/* Branch 03 — Colombo City */}
      <ColomboBranchSection reducedMotion={reducedMotion} />

      {/* Premium Architectural Footer */}
      <SkyNestFooter />
    </div>
  );
}
