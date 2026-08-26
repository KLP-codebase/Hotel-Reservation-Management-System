"use client";

import React, { useState, useEffect } from "react";

/** Mountain Glyph emblem matching the SkyNest brand identity */
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

/** Upward arrow icon for Back to top */
function ArrowUpIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 13V3M3 8l5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Checkmark icon for newsletter success */
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SkyNestFooter() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [localTime, setLocalTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      // Sri Lanka Standard Time (Asia/Colombo) is UTC+5:30
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setLocalTime(new Intl.DateTimeFormat("en-US", options).format(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setIsSubscribed(true);
  };

  const scrollToTop = () => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1.5 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      id="footer"
      aria-label="SkyNest Hotels footer"
      className="relative bg-[#07192C] text-white overflow-hidden border-t border-white/[0.08]"
    >
      {/* Subtle vertical architectural grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex z-0"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-l border-white/[0.04] last:border-r"
          />
        ))}
      </div>

      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-skynest-accent/5 rounded-full blur-[140px] pointer-events-none"
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 pt-20 md:pt-28 pb-12">
        {/* ── Top Section: The SkyNest Journal Dispatch ── */}
        <div className="pb-16 md:pb-24 border-b border-white/[0.10]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Left Header */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-skynest-accent" />
                <span className="font-jakarta text-[10px] md:text-[11px] font-semibold tracking-[0.25em] uppercase text-white/60">
                  The SkyNest Journal
                </span>
              </div>
              <h2 className="font-cinzel text-2xl md:text-4xl lg:text-[40px] font-normal leading-[1.15] text-white tracking-[0.02em]">
                Despatches from the Coast & Highlands
              </h2>
              <p className="font-jakarta text-xs md:text-sm text-white/55 leading-relaxed max-w-lg font-light">
                Receive private seasonal itineraries, culinary cellar releases, and invitations to our intimate coastal retreats across Sri Lanka.
              </p>
            </div>

            {/* Right Newsletter Form */}
            <div className="lg:col-span-6">
              {isSubscribed ? (
                <div className="flex items-center gap-3.5 p-4 md:p-5 rounded-lg bg-white/[0.05] border border-emerald-500/30 text-emerald-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-jakarta text-xs font-semibold tracking-[0.05em] uppercase">
                      Welcome to the SkyNest Circle
                    </p>
                    <p className="font-jakarta text-[11px] text-white/60">
                      Our latest seasonal gazette has been dispatched to your inbox.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      aria-label="Email address for newsletter"
                      className="w-full h-12 md:h-14 px-5 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/15 focus:border-skynest-accent/80 rounded-md text-xs md:text-sm text-white placeholder:text-white/35 transition-colors duration-200 outline-none font-jakarta"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 md:h-14 px-7 bg-skynest-accent hover:bg-[#e07e38] active:bg-[#c46422] text-white font-jakarta text-[11px] md:text-[12px] font-semibold tracking-[0.15em] uppercase rounded-md transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-skynest-accent"
                  >
                    <span>Subscribe</span>
                  </button>
                </form>
              )}
              <p className="mt-3 text-[10px] text-white/35 font-jakarta">
                By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Links Columns ── */}
        <div className="py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Info & Live Time Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-2.5">
              <MountainGlyph className="w-8 h-auto text-white/90" />
              <span className="font-jakarta font-bold text-sm tracking-[0.35em] text-white uppercase">
                SKYNEST
              </span>
            </div>

            <p className="font-jakarta text-xs md:text-[13px] text-white/60 leading-[1.8] font-light max-w-sm">
              Three sanctuaries nestled along Sri Lanka’s revered coastlines and misted tea highlands. Dedicated to the rare luxury of unhurried presence.
            </p>

            {/* Sri Lanka Time Badge */}
            <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-jakarta text-[11px] text-white/75 tracking-wider uppercase font-medium">
                Colombo &nbsp;•&nbsp; {localTime || "09:58:00 AM"} &nbsp;•&nbsp; UTC+5:30
              </span>
            </div>
          </div>

          {/* Sanctuaries Column */}
          <div className="lg:col-span-3 space-y-5">
            <h3 className="font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-white/80">
              Sanctuaries
            </h3>
            <ul className="space-y-3 font-jakarta text-xs md:text-[13px] text-white/60">
              <li>
                <a
                  href="#branches"
                  className="group flex flex-col transition-colors hover:text-white"
                >
                  <span className="group-hover:text-skynest-accent transition-colors font-medium">
                    SkyNest Kandy
                  </span>
                  <span className="text-[10px] text-white/40">Hantana Tea Country</span>
                </a>
              </li>
              <li>
                <a
                  href="#branches"
                  className="group flex flex-col transition-colors hover:text-white"
                >
                  <span className="group-hover:text-skynest-accent transition-colors font-medium">
                    SkyNest Galle
                  </span>
                  <span className="text-[10px] text-white/40">Colonial Harbour & Ramparts</span>
                </a>
              </li>
              <li>
                <a
                  href="#branches"
                  className="group flex flex-col transition-colors hover:text-white"
                >
                  <span className="group-hover:text-skynest-accent transition-colors font-medium">
                    SkyNest Colombo
                  </span>
                  <span className="text-[10px] text-white/40">Marine Drive Promenade</span>
                </a>
              </li>
              <li className="pt-2">
                <a
                  href="#rates"
                  className="inline-flex items-center gap-1.5 text-skynest-accent hover:text-skynest-accent/80 transition-colors font-medium text-xs tracking-wide"
                >
                  <span>Seasonal Rates & Pavilions</span>
                  <span>→</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Experiences Column */}
          <div className="lg:col-span-2 space-y-5">
            <h3 className="font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-white/80">
              Experiences
            </h3>
            <ul className="space-y-3 font-jakarta text-xs md:text-[13px] text-white/60">
              <li>
                <a href="#stay" className="hover:text-white transition-colors">
                  Horizon Pools
                </a>
              </li>
              <li>
                <a href="#dining" className="hover:text-white transition-colors">
                  Private Wine Cellars
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  Ayurvedic Spa
                </a>
              </li>
              <li>
                <a href="#stay" className="hover:text-white transition-colors">
                  Ocean Yacht Charters
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  Tea Estate Trails
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Concierge & Reservations Column */}
          <div className="lg:col-span-3 space-y-5">
            <h3 className="font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-white/80">
              Concierge & Inquiries
            </h3>
            <div className="space-y-4 font-jakarta text-xs md:text-[13px] text-white/60">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Global Reservations</p>
                <a
                  href="mailto:reservations@skynesthotels.com"
                  className="hover:text-white transition-colors font-medium text-white/85"
                >
                  reservations@skynesthotels.com
                </a>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Head Office Telephone</p>
                <a
                  href="tel:+94112345600"
                  className="hover:text-white transition-colors font-medium text-white/85"
                >
                  +94 11 234 5600
                </a>
              </div>
              <div className="pt-1">
                <a
                  href="#booking"
                  className="inline-flex items-center justify-center px-4 py-2 rounded border border-white/20 hover:border-white/40 text-[11px] font-medium tracking-wider uppercase text-white hover:bg-white/5 transition-all"
                >
                  Private Residence Booking
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Geographic Coordinates Ribbon ── */}
        <div className="py-6 px-6 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-jakarta text-[10px] font-semibold tracking-[0.25em] uppercase text-white/40">
            Sanctuary Coordinates
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 font-jakarta text-[11px] text-white/60 tracking-wider">
            <span>
              <strong className="text-white/80 font-medium">Colombo:</strong> 6.9271° N, 79.8612° E
            </span>
            <span className="text-white/20">•</span>
            <span>
              <strong className="text-white/80 font-medium">Kandy:</strong> 7.2906° N, 80.6337° E
            </span>
            <span className="text-white/20">•</span>
            <span>
              <strong className="text-white/80 font-medium">Galle:</strong> 6.0535° N, 80.2210° E
            </span>
          </div>
          <button
            onClick={scrollToTop}
            aria-label="Scroll back to top of page"
            className="flex items-center gap-2 text-[10px] font-jakarta tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors group"
          >
            <span>Top</span>
            <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/50 transition-colors">
              <ArrowUpIcon className="w-2.5 h-2.5" />
            </span>
          </button>
        </div>

        {/* ── Giant Architectural Skyline Watermark ── */}
        <div
          aria-hidden="true"
          className="relative mt-12 select-none pointer-events-none overflow-hidden text-center"
        >
          <span
            className="font-cinzel text-white/[0.04] leading-none uppercase tracking-[0.06em] block"
            style={{
              fontSize: "clamp(60px, 14vw, 190px)",
            }}
          >
            SKYNEST
          </span>
        </div>

        {/* ── Bottom Copyright & Legal ── */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/45 font-jakarta">
          <p>© {new Date().getFullYear()} SkyNest Hotels & Resorts PLC. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#privacy" className="hover:text-white/80 transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-white/80 transition-colors">
              Terms of Residence
            </a>
            <a href="#sustainability" className="hover:text-white/80 transition-colors">
              Conservation Charter
            </a>
            <a href="#cookies" className="hover:text-white/80 transition-colors">
              Cookie Preferences
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SkyNestFooter;
