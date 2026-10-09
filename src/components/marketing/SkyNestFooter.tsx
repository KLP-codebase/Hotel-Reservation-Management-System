"use client";

import React, { useState } from "react";

/** Mountain Glyph emblem matching the SkyNest brand identity */
function MountainGlyph({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
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

/** Small cross / plus decoration */
function CrossGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="0.8" />
      <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Organized Navigation Structure
// ---------------------------------------------------------------------------
const ABOUT_ITEMS = [
  { label: "Our Story & Legacy", href: "#story" },
  { label: "The SkyNest Standard", href: "#about" },
];

const SOCIAL_ITEMS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "YouTube", href: "https://youtube.com" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SkyNestFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubscribed(true);
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { duration: 1.5 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <footer
      id="footer"
      aria-label="SkyNest Hotels footer"
      className="relative bg-paper text-ink overflow-hidden border-t border-ink/[0.08]"
    >
      <div className="relative z-10 max-w-[1520px] mx-auto px-4 sm:px-8 lg:px-12 pt-12 md:pt-16">

        {/* ── TOP ARCHITECTURAL GRID ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 border-t border-b border-ink/[0.12]">

          {/* Column 1: Mountain Brand Mark (lg:col-span-4) */}
          <div className="md:col-span-2 lg:col-span-4 py-10 px-6 sm:px-8 border-b lg:border-b-0 lg:border-r border-ink/[0.12] flex flex-col justify-start items-start">
            <div className="flex items-center gap-3">
              <MountainGlyph className="w-10 h-auto text-ink/90" />
            </div>
            <span className="font-jakarta font-bold text-[11px] tracking-[0.3em] uppercase text-ink/75 mt-3">
              SKYNEST
            </span>
            <div className="w-full h-px bg-ink/[0.12] mt-6 mb-4" />
            <p className="font-cinzel italic text-[11px] text-ink/50 leading-relaxed max-w-[260px]">
              Three coastal sanctuaries. One uncompromising standard.
            </p>
          </div>

          {/* Column 2: About (lg:col-span-2) */}
          <div className="md:col-span-1 lg:col-span-2 py-10 px-6 sm:px-8 border-b md:border-b-0 lg:border-r border-ink/[0.12] space-y-3">
            <h3
              className="font-cinzel text-[13px] md:text-[14px] text-ink/80 tracking-[0.02em]"
              style={{ fontStyle: "italic" }}
            >
              About
            </h3>
            <ul className="space-y-1.5">
              {ABOUT_ITEMS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="font-jakarta text-[12px] text-ink/55 hover:text-ink transition-colors duration-200 block font-light leading-relaxed"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Social (lg:col-span-2) */}
          <div className="md:col-span-1 lg:col-span-2 py-10 px-6 sm:px-8 border-b md:border-b-0 lg:border-r border-ink/[0.12] space-y-3">
            <h3
              className="font-cinzel text-[13px] md:text-[14px] text-ink/80 tracking-[0.02em]"
              style={{ fontStyle: "italic" }}
            >
              Social
            </h3>
            <ul className="space-y-1.5">
              {SOCIAL_ITEMS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-jakarta text-[12px] text-ink/55 hover:text-ink transition-colors duration-200 block font-light leading-relaxed"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Right Action Column (lg:col-span-4) */}
          <div className="md:col-span-2 lg:col-span-4 p-6 sm:p-7 flex flex-col justify-start gap-3.5 bg-ink/[0.03]">

            {/* Top Row: Two Clean Pill Cards [ Dates & Rates ] [ Enquire now ] */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="#rates"
                id="footer-dates-rates"
                className="h-24 sm:h-28 flex items-center justify-center text-center p-3 rounded-sm bg-white/80 hover:bg-white border border-ink/[0.08] hover:border-ink/25 transition-all duration-200 shadow-sm group"
              >
                <span
                  className="font-cinzel text-[13px] sm:text-[14px] text-ink/80 group-hover:text-ink leading-snug"
                  style={{ fontStyle: "italic" }}
                >
                  Dates &amp; Rates
                </span>
              </a>
              <a
                href="#booking"
                id="footer-enquire-now"
                className="h-24 sm:h-28 flex items-center justify-center text-center p-3 rounded-sm bg-white/80 hover:bg-white border border-ink/[0.08] hover:border-ink/25 transition-all duration-200 shadow-sm group"
              >
                <span
                  className="font-cinzel text-[13px] sm:text-[14px] text-ink/80 group-hover:text-ink leading-snug"
                  style={{ fontStyle: "italic" }}
                >
                  Enquire now
                </span>
              </a>
            </div>

            {/* Bottom Card: Newsletter Signup */}
            <div className="p-6 rounded-sm bg-white/80 border border-ink/[0.08] shadow-sm flex flex-col justify-center text-center">
              {subscribed ? (
                <p className="font-cinzel text-[13px] text-emerald-700 py-4" style={{ fontStyle: "italic" }}>
                  Welcome to the SkyNest Gazette.
                </p>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3.5">
                  <h4
                    className="font-cinzel text-[13px] md:text-[14px] text-ink/85 tracking-[0.02em]"
                    style={{ fontStyle: "italic" }}
                  >
                    Newsletter Signup
                  </h4>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    required
                    aria-label="Email address for newsletter"
                    className="w-full h-10 px-3.5 text-[11px] font-jakarta bg-white border border-ink/20 focus:border-ink/60 outline-none text-ink placeholder:text-ink/35 transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full h-10 bg-transparent hover:bg-ink hover:text-white border border-ink/30 text-ink text-[10px] font-jakarta font-semibold tracking-[0.2em] uppercase transition-all duration-200"
                  >
                    Subscribe
                  </button>
                  <p className="text-[9px] text-ink/40 font-jakarta">
                    Unsubscribe anytime.
                  </p>
                </form>
              )}
            </div>

          </div>
        </div>

        {/* ── GIANT MONUMENTAL WORDMARK ── */}
        <div
          aria-hidden="true"
          className="relative select-none pointer-events-none overflow-hidden py-4 sm:py-6 text-center"
        >
          <span
            className="font-jakarta font-black text-ink leading-[0.8] uppercase block w-full text-center select-none"
            style={{
              fontSize: "clamp(64px, 16.5vw, 240px)",
              letterSpacing: "-0.025em",
            }}
          >
            SKYNEST
          </span>
        </div>

        {/* ── BOTTOM LUXURY SEAL & LEGAL STRIP ── */}
        <div className="border-t border-ink/[0.12] py-5 flex flex-col xl:flex-row items-center justify-between gap-5 text-ink/60 font-jakarta">

          {/* Left: Badges */}
          <div className="flex items-center gap-3">
            <CrossGlyph className="w-2.5 h-2.5 text-ink/35" />
            <div className="flex items-center gap-2">
              {[
                { label: "LK", title: "Sri Lanka Heritage" },
                { label: "CE", title: "Ceylon Standard" },
                { label: "20", title: "20th Anniversary" },
                { label: "5★", title: "Five Star Luxury" },
                { label: "ECO", title: "Sustainable Sanctuaries" },
                { label: "LGC", title: "Leading Hotels of the World" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  title={badge.title}
                  className="w-7 h-7 rounded-full border border-ink/25 bg-white/40 flex items-center justify-center"
                >
                  <span className="text-[7.5px] font-jakarta font-bold text-ink/65 uppercase tracking-tighter">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
            <CrossGlyph className="w-2.5 h-2.5 text-ink/35" />
          </div>

          {/* Center: Quote */}
          <div className="text-center">
            <p
              className="font-cinzel text-[12px] md:text-[13px] text-ink/75"
              style={{ fontStyle: "italic" }}
            >
              &ldquo;We all have our own unhurried sanctuary&rdquo;
            </p>
            <span className="text-[9px] font-jakarta tracking-[0.25em] uppercase text-ink/40 block mt-0.5">
              — SIR ERNEST OF CEYLON &nbsp;|&nbsp; SKYNEST HOTELS
            </span>
          </div>

          {/* Right: Legal & Back to top */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] text-ink/50">
            <a href="#terms" className="hover:text-ink transition-colors">Website Terms of Use</a>
            <span className="text-ink/20">·</span>
            <a href="#booking" className="hover:text-ink transition-colors">Booking Terms</a>
            <span className="text-ink/20">·</span>
            <a href="#privacy" className="hover:text-ink transition-colors">Privacy Policy</a>
            <span className="text-ink/20">·</span>
            <a href="#cookies" className="hover:text-ink transition-colors">Cookies Policy</a>
            <span className="text-ink/20">·</span>
            <span>Website by SkyNest © 2026. All rights reserved.</span>
            <button
              onClick={scrollToTop}
              aria-label="Back to top"
              className="ml-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-ink/60 hover:text-ink transition-colors flex items-center gap-1"
            >
              ↑ Top
            </button>
            <CrossGlyph className="w-2.5 h-2.5 text-ink/35 ml-1 hidden sm:inline-block" />
          </div>

        </div>

      </div>
    </footer>
  );
}

export default SkyNestFooter;

