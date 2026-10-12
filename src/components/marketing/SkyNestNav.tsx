"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Rates", href: "/rates" },
  { label: "About", href: "/#about" },
];

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

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export default function SkyNestNav({
  navProgress = 0,
}: {
  /** 0 = transparent over a dark hero, 1 = solid paper bar (use 1 on light pages) */
  scrolled?: boolean;
  navProgress?: number;
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

  const bgAlpha = lerp(0, 0.88, navProgress);
  const blurAmt = lerp(0, 16, navProgress);
  const borderAlpha = lerp(0, 0.08, navProgress);

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
              href="/contact"
              id="nav-cta-contact"
              className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
              style={linkStyle}
            >
              Contact
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
                {user.role?.toUpperCase() !== 'GUEST' ? (
                  <a
                    href="/dashboard"
                    id="nav-cta-dashboard"
                    className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200 text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                  >
                    Dashboard
                  </a>
                ) : (
                  <a
                    href="/dashboard/activity"
                    id="nav-cta-activity"
                    className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200 text-amber-400 border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                  >
                    Activity
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
            { label: "Contact", href: "/contact" },
            { label: "Book Now", href: "/book" },
          ].map((link, i) => (
            <a
              key={`${link.label}-${link.href}`}
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
                {user.role?.toUpperCase() !== 'GUEST' ? (
                  <a
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 font-jakarta font-semibold text-xl text-amber-400 hover:text-amber-300"
                  >
                    Staff Dashboard
                  </a>
                ) : (
                  <a
                    href="/dashboard/activity"
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 font-jakarta font-semibold text-xl text-amber-400 hover:text-amber-300"
                  >
                    My Activity
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
