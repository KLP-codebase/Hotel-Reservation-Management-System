'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BedDouble,
  Users,
  Maximize2,
  Check,
  ChevronDown,
  Coffee,
  Wine,
  Utensils,
  ArrowRight,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { SkyNestFooter } from '@/components/marketing/SkyNestFooter';

// ── Utility: Respect prefers-reduced-motion ───────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/** White Desert-style mountain glyph */
function MountainGlyph({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
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

// ── Data: Room Tiers ──────────────────────────────────────────────────────────

interface RoomTier {
  id: string;
  name: string;
  tagline: string;
  usdRate: number;
  capacity: number;
  sizeM2: number;
  sizeSqFt: number;
  properties: string[];
  image: string;
  highlights: string[];
}

const ROOM_TIERS: RoomTier[] = [
  {
    id: 'STANDARD',
    name: 'Standard Room',
    tagline: 'Refined serenity with handcrafted Ceylon teak accents',
    usdRate: 120,
    capacity: 2,
    sizeM2: 38,
    sizeSqFt: 410,
    properties: ['Colombo', 'Galle', 'Kandy'],
    image: '/about_lobby.jpg',
    highlights: [
      'Handcrafted Ceylon teak finishes & hardwood floors',
      'City or landscaped courtyard garden vistas',
      'Artisanal Ceylon loose-leaf tea & French press bar',
      'Rain shower with botanical organic extracts',
    ],
  },
  {
    id: 'DELUXE',
    name: 'Deluxe Room',
    tagline: 'Generous light, private veranda, and horizon sea breeze',
    usdRate: 180,
    capacity: 3,
    sizeM2: 52,
    sizeSqFt: 560,
    properties: ['Colombo', 'Galle', 'Kandy'],
    image: '/colorful-buildings-reflect-in-pool-on-a-sunny-day-2026-03-24-04-06-42-utc.webp',
    highlights: [
      'Private open-air veranda with rattan lounging chairs',
      'Freestanding deep marble soaking tub & dual vanities',
      'Panoramic vistas of the Indian Ocean or misty peaks',
      'Evening turndown ritual with Ceylon lemongrass infusions',
    ],
  },
  {
    id: 'SUITE',
    name: 'Executive Suite',
    tagline: 'Dual-chamber sanctuary with private heated plunge pool',
    usdRate: 280,
    capacity: 4,
    sizeM2: 85,
    sizeSqFt: 915,
    properties: ['Colombo', 'Galle', 'Kandy'],
    image: '/about_suite.jpg',
    highlights: [
      'Separate living salon and private master bedchamber',
      'Private outdoor heated plunge pool with ocean views',
      'Dedicated butler station & complimentary daily pressing',
      'Curated artisanal bar with single-estate Ceylon teas',
    ],
  },
  {
    id: 'PRESIDENTIAL',
    name: 'Presidential Suite',
    tagline: 'The pinnacle of island hospitality with dedicated 24/7 butler',
    usdRate: 500,
    capacity: 6,
    sizeM2: 160,
    sizeSqFt: 1720,
    properties: ['Colombo', 'Galle', 'Kandy'],
    image: '/pillar_architecture.jpg',
    highlights: [
      'Panoramic penthouse wrap-around terrace & sunset deck',
      'Private chef\x27s dining room for bespoke degustations',
      '24/7 dedicated personal butler and concierge service',
      'Complimentary private airport chauffeur transfer',
    ],
  },
];

// ── Data: Meal Plans ──────────────────────────────────────────────────────────

interface MealPlan {
  id: string;
  name: string;
  code: string;
  usdRate: number;
  tagline: string;
  description: string;
  inclusions: { label: string; active: boolean }[];
  highlight: string;
}

const MEAL_PLANS: MealPlan[] = [
  {
    id: 'RO',
    name: 'Room Only',
    code: 'European Plan',
    usdRate: 0,
    tagline: 'Complete culinary freedom across our sanctuaries',
    description: 'Residency only. Dine at your own unhurried pace across our oceanfront pavilions, terrace bars, or local coastal fish markets.',
    inclusions: [
      { label: 'Artisanal Breakfast', active: false },
      { label: 'Coastal Lunch', active: false },
      { label: 'Ceylon High Tea', active: false },
      { label: '4-Course Dinner', active: false },
      { label: 'À La Carte Dining', active: true },
    ],
    highlight: 'Full flexibility to explore à la carte menus',
  },
  {
    id: 'BB',
    name: 'Bed & Breakfast',
    code: 'Artisanal Morning Feast',
    usdRate: 25,
    tagline: 'Awaken to the finest tropical morning harvest',
    description: 'Daily artisanal table-service and buffet breakfast. Fresh king coconut water, Ceylon silver-tip tea ceremony, egg hoppers, tropical fruits, and French bakery.',
    inclusions: [
      { label: 'Artisanal Breakfast', active: true },
      { label: 'Coastal Lunch', active: false },
      { label: 'Ceylon High Tea', active: false },
      { label: '4-Course Dinner', active: false },
      { label: 'À La Carte Dining', active: true },
    ],
    highlight: 'Our most popular choice for daytime explorers',
  },
  {
    id: 'HB',
    name: 'Half Board',
    code: 'Breakfast & 4-Course Dinner',
    usdRate: 55,
    tagline: 'Morning energy and an evening candlelight degustation',
    description: 'Daily breakfast followed by an unhurried 4-course dinner experience featuring fresh coastal lobster, claypot curries, and Ceylon vanilla bean creations.',
    inclusions: [
      { label: 'Artisanal Breakfast', active: true },
      { label: 'Coastal Lunch', active: false },
      { label: 'Ceylon High Tea', active: true },
      { label: '4-Course Dinner', active: true },
      { label: 'À La Carte Dining', active: true },
    ],
    highlight: 'Includes evening candlelight dining & high tea',
  },
  {
    id: 'FB',
    name: 'Full Board',
    code: 'Complete Island Epicurean',
    usdRate: 80,
    tagline: 'An uncompromising, all-inclusive Ceylonese culinary odyssey',
    description: 'Comprehensive culinary journey covering breakfast, multi-course veranda lunch, afternoon tea ceremony with savouries, and 4-course dinner.',
    inclusions: [
      { label: 'Artisanal Breakfast', active: true },
      { label: 'Coastal Lunch', active: true },
      { label: 'Ceylon High Tea', active: true },
      { label: '4-Course Dinner', active: true },
      { label: 'À La Carte Dining', active: true },
    ],
    highlight: 'Full gastronomic journey with private table reserving',
  },
];

const USD_TO_LKR = 310;

// ── Navigation Bar ────────────────────────────────────────────────────────────

function RatesNav() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        id="rates-nav"
        aria-label="Rates navigation"
        className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-md border-b border-white/10 transition-colors duration-300"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-14 md:h-16 px-4 sm:px-6 md:px-8">
          {/* Left links */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/rates"
              className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border border-white/40 bg-white/10 text-white transition-colors duration-200"
            >
              Rates
            </Link>
            <Link
              href="/#about"
              className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors duration-200"
            >
              About
            </Link>
          </div>

          {/* Center Brand */}
          <Link href="/" className="flex flex-col items-center gap-0.5 group">
            <MountainGlyph className="w-6 sm:w-7 h-auto text-white/90" />
            <span className="font-jakarta font-bold text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-white/90 select-none">
              SKYNEST
            </span>
          </Link>

          {/* Right links */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/contact"
              className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors duration-200"
            >
              Contact
            </Link>
            <Link
              href="/book"
              className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase bg-white text-ink hover:bg-slate-100 transition-colors duration-200 shadow-sm"
            >
              Book Now
            </Link>
            {user ? (
              <Link
                href={user.role === 'GUEST' ? '/dashboard/activity' : '/dashboard'}
                className="flex items-center px-4 py-2 text-[11px] font-jakarta font-medium tracking-[0.12em] uppercase text-white/90 border border-white/25 bg-white/10 hover:bg-white/20 transition-colors"
              >
                {user.role === 'GUEST' ? 'Activity' : 'Dashboard'}
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center px-4 py-2 text-[11px] font-jakarta font-medium tracking-[0.12em] uppercase text-white/70 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-white/80 hover:text-white"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-ink/95 backdrop-blur-xl flex flex-col justify-center px-8 space-y-4 md:hidden">
          <Link
            href="/rates"
            onClick={() => setMenuOpen(false)}
            className="font-jakarta text-2xl font-semibold text-white tracking-wider uppercase"
          >
            Rates &amp; Plans
          </Link>
          <Link
            href="/#about"
            onClick={() => setMenuOpen(false)}
            className="font-jakarta text-2xl font-semibold text-white/80 hover:text-white tracking-wider uppercase"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="font-jakarta text-2xl font-semibold text-white/80 hover:text-white tracking-wider uppercase"
          >
            Contact
          </Link>
          <Link
            href="/book"
            onClick={() => setMenuOpen(false)}
            className="font-jakarta text-2xl font-semibold text-white/80 hover:text-white tracking-wider uppercase"
          >
            Book Now
          </Link>
          <div className="pt-4 border-t border-white/10">
            {user ? (
              <Link
                href={user.role === 'GUEST' ? '/dashboard/activity' : '/dashboard'}
                onClick={() => setMenuOpen(false)}
                className="font-jakarta text-lg text-white font-semibold"
              >
                {user.role === 'GUEST' ? 'My Activity' : 'Staff Dashboard'}
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="font-jakarta text-lg text-white/70 hover:text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Cinematic Pinned Hero Section ─────────────────────────────────────────────

function RatesHeroSection({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  const bgImgRef = useRef<HTMLImageElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || !heroRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '+=100%',
          scrub: 1.0,
        },
        defaults: {
          ease: 'none',
          force3D: true,
        },
      });

      if (bgImgRef.current) {
        tl.to(bgImgRef.current, { y: '16%', scale: 1.08 }, 0);
      }
      if (wordmarkRef.current) {
        tl.to(wordmarkRef.current, { y: '28%', opacity: 0.15 }, 0);
      }
      if (topRowRef.current) {
        tl.to(topRowRef.current, { y: '-30px', opacity: 0.1 }, 0);
      }
    }, heroRef);

    return () => ctx.revert();
  }, [heroRef, reducedMotion]);

  return (
    <section
      ref={heroRef}
      id="rates-hero"
      aria-label="Rates and pricing hero"
      className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0 select-none"
    >
      {/* Background Image */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          ref={bgImgRef}
          src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.webp"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{
            filter: 'brightness(0.68) contrast(1.12)',
            willChange: 'transform',
          }}
        />
        {/* Deep Navy Radial Contrast Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 70% at 50% 30%, rgba(11,37,64,0.35) 0%, rgba(7,28,48,0.65) 60%, rgba(11,37,64,0.9) 100%)',
          }}
        />
      </div>

      {/* Top Metadata Row */}
      <div
        ref={topRowRef}
        className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between px-6 sm:px-8 md:px-12 pt-20 sm:pt-24 md:pt-28 pb-0 gap-4 sm:gap-6 z-10"
        style={{ willChange: 'transform, opacity' }}
      >
        <div>
          <p className="font-cinzel font-normal italic text-white/80 text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed">
            Transparent Sanctuary Pricing &bull; Sri Lanka
            <br />
            Three destinated havens. One standard of welcome.
          </p>
          <span className="inline-block mt-2 font-jakarta text-[10px] tracking-[0.16em] uppercase text-white/50">
            Colombo &bull; Galle &bull; Kandy
          </span>
        </div>

        <a
          href="#rates-content"
          className="self-start sm:self-auto flex items-center gap-2 font-jakarta text-[10px] sm:text-[11px] md:text-[12px] font-medium tracking-[0.15em] uppercase text-white/85 hover:text-white border border-white/20 hover:border-white/40 px-4 sm:px-5 py-2.5 sm:py-3 transition-all duration-300"
        >
          <span>Explore Tiers &amp; Plans</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/80 animate-bounce" />
        </a>
      </div>

      {/* Giant Wordmark */}
      <div
        ref={wordmarkRef}
        aria-hidden="true"
        className="relative z-10 flex-1 flex items-end justify-center pointer-events-none select-none w-full px-4 pb-2 sm:pb-4 overflow-visible"
        style={{ willChange: 'transform, opacity' }}
      >
        <span
          className="font-cinzel font-normal leading-[0.85] text-white text-center whitespace-nowrap block w-full uppercase"
          style={{
            fontSize: 'clamp(36px, 13vw, 190px)',
            letterSpacing: '0.04em',
          }}
        >
          RATES &amp; PLANS
        </span>
      </div>
    </section>
  );
}

// ── Mystic Cloud Scrub Transition ─────────────────────────────────────────────

function RatesCloudTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cloud1Ref = useRef<HTMLImageElement>(null);
  const cloud2Ref = useRef<HTMLImageElement>(null);
  const cloud3Ref = useRef<HTMLImageElement>(null);
  const mountainMistRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
        },
      });

      if (cloud1Ref.current) {
        tl.to(cloud1Ref.current, { y: '-45px', scale: 1.08, opacity: 0.95 }, 0);
      }
      if (cloud2Ref.current) {
        tl.to(cloud2Ref.current, { y: '-90px', scale: 1.15, opacity: 0.8 }, 0);
      }
      if (cloud3Ref.current) {
        tl.to(cloud3Ref.current, { y: '-140px', scale: 1.22, opacity: 0.9 }, 0);
      }
      if (mountainMistRef.current) {
        tl.to(mountainMistRef.current, { y: '-50px', opacity: 0.85 }, 0);
      }
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative z-10 w-full pointer-events-none select-none overflow-hidden"
      style={{
        height: 'clamp(220px, 32vw, 480px)',
        marginTop: 'calc(-1 * clamp(110px, 16vw, 240px))',
      }}
    >
      {/* High-Altitude Mountain Wisps */}
      <div
        ref={mountainMistRef}
        className="absolute inset-0 z-0 bg-repeat-x opacity-40 mix-blend-screen"
        style={{
          backgroundImage: "url('/clouds/cloud_wisps.webp')",
          backgroundSize: 'contain',
          backgroundPosition: 'center bottom',
        }}
      />

      {/* Cloud Layer 1 */}
      <img
        ref={cloud1Ref}
        src="/07_Clouds.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-bottom z-10 opacity-75"
        style={{
          filter: 'brightness(1.08) contrast(1.05)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 85%, transparent 100%)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Cloud Layer 2 */}
      <img
        ref={cloud2Ref}
        src="/Clouds 3.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-bottom z-20 opacity-85"
        style={{
          filter: 'brightness(1.12) contrast(1.02)',
          maskImage: 'linear-gradient(to top, black 25%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to top, black 25%, transparent 95%)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Foreground Mountain Cloud Wisp */}
      <img
        ref={cloud3Ref}
        src="/07_Clouds.webp"
        alt=""
        className="absolute -bottom-10 left-0 right-0 w-full h-4/5 object-cover object-bottom z-30 opacity-90"
        style={{
          maskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Seamless Fog Base into Clean Content Section */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 z-40"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #F8FAFC 90%)',
        }}
      />
    </div>
  );
}

// ── Wide Gastronomy Parallax Banner (Mirrors Landing Page Kandy Section) ───────

function GastronomyBannerSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const img = imgRef.current;
    const label = labelRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    const section = sectionRef.current;
    if (!section || !img || !label || !title || !line) return;

    gsap.set(img, { scale: 1.05, y: -25 });
    gsap.set([label, title, line], { y: 15, opacity: 0 });

    const ctx = gsap.context(() => {
      // Parallax scrub on wide image
      gsap.to(img, {
        y: 25,
        scale: 1.0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });

      // Text entrance timeline triggered when section is reached
      const textTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });

      textTl
        .to(label, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
        .to(title, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, '-=0.25')
        .to(line, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, '-=0.25');
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      aria-label="Ceylonese Gastronomy banner"
      className="relative bg-[#F8FAFC] overflow-hidden w-full my-12"
    >
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-0 md:aspect-[3/2] overflow-hidden border-y border-slate-200/80 shadow-sm">
        {/* Parallax background image */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          {/* Feathered top gradient */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-28 md:h-44 pointer-events-none z-[2]"
            style={{
              background:
                'linear-gradient(to bottom, #F8FAFC 0%, rgba(248,250,252,0.85) 25%, rgba(248,250,252,0.3) 65%, transparent 100%)',
            }}
          />

          <img
            ref={imgRef}
            src="/rates_gastronomy_wide.jpg"
            alt="Sky Nest Ceylonese Gastronomy — Twilight beachside candlelit dining"
            className="w-full h-full object-cover object-center"
            style={{ willChange: 'transform' }}
          />

          {/* Feathered bottom gradient */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-28 md:h-44 pointer-events-none z-[2]"
            style={{
              background:
                'linear-gradient(to top, #F8FAFC 0%, rgba(248,250,252,0.85) 25%, rgba(248,250,252,0.3) 65%, transparent 100%)',
            }}
          />
        </div>

        {/* Text overlay — Mirrors Kandy section on landing page */}
        <div aria-hidden="false" className="absolute inset-0 pointer-events-none z-10">
          <div className="relative h-full mx-auto max-w-[1400px] px-6 sm:px-10 md:px-16 flex flex-col justify-start pt-14 sm:pt-16 md:pt-20 gap-2.5 md:gap-4">
            <span
              ref={labelRef}
              className="font-jakarta text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-white/90 drop-shadow-md"
              style={{ willChange: 'transform, opacity' }}
            >
              02 &nbsp;/&nbsp; CEYLONESE GASTRONOMY
            </span>

            <h2
              ref={titleRef}
              className="font-cinzel text-white leading-[1.05] drop-shadow-lg uppercase tracking-[0.03em]"
              style={{
                fontSize: 'clamp(28px, 4.8vw, 72px)',
                willChange: 'transform, opacity',
              }}
            >
              Fine Living &amp; Dining
            </h2>

            <p
              ref={lineRef}
              className="font-cinzel italic text-white/90 max-w-lg leading-relaxed text-sm md:text-lg drop-shadow-md"
              style={{ willChange: 'transform, opacity' }}
            >
              Where island spices, organic highland harvests, and the evening tides converge into an unhurried culinary rite.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function RatesPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // State
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [currency, setCurrency] = useState<'USD' | 'LKR'>('USD');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('STANDARD');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('RO');

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (selectedBranch === 'ALL') return ROOM_TIERS;
    return ROOM_TIERS.filter((r) => r.properties.includes(selectedBranch));
  }, [selectedBranch]);

  // Selected entities for calculator
  const currentRoom = useMemo(
    () => ROOM_TIERS.find((r) => r.id === selectedRoomId) ?? ROOM_TIERS[0],
    [selectedRoomId]
  );
  const currentPlan = useMemo(
    () => MEAL_PLANS.find((p) => p.id === selectedPlanId) ?? MEAL_PLANS[0],
    [selectedPlanId]
  );

  // Currency converter
  const formatPrice = (usd: number) => {
    if (currency === 'LKR') {
      const lkr = usd * USD_TO_LKR;
      return `Rs. ${lkr.toLocaleString('en-US')}`;
    }
    return `$${usd.toLocaleString('en-US')}`;
  };

  // 4-Tier Tax Calculation
  const subtotalUsd = currentRoom.usdRate + currentPlan.usdRate;
  const serviceChargeUsd = subtotalUsd * 0.1;
  const tdlBaseUsd = subtotalUsd + serviceChargeUsd;
  const tdlUsd = tdlBaseUsd * 0.01;
  const ssclBaseUsd = tdlBaseUsd + tdlUsd;
  const ssclUsd = ssclBaseUsd * 0.025;
  const vatBaseUsd = ssclBaseUsd + ssclUsd;
  const vatUsd = vatBaseUsd * 0.18;
  const totalWithTaxesUsd = vatBaseUsd + vatUsd;

  // ── GSAP Arising Text & Scroll Entrance Animation ───────────────────────────
  useEffect(() => {
    if (reducedMotion || !contentRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Arising text elements (overflow-hidden line reveals)
      const ariseSections = contentRef.current?.querySelectorAll('[data-arise-section]') || [];
      ariseSections.forEach((sec) => {
        const lines = sec.querySelectorAll('.arise-line');
        if (lines.length > 0) {
          gsap.set(lines, { y: '100%', opacity: 0 });
          gsap.to(lines, {
            y: '0%',
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          });
        }
      });

      // 2. Staggered card entrance reveals
      const cardContainers = contentRef.current?.querySelectorAll('[data-cards-grid]') || [];
      cardContainers.forEach((grid) => {
        const cards = grid.querySelectorAll('.arise-card');
        if (cards.length > 0) {
          gsap.set(cards, { y: 25, opacity: 0 });
          gsap.to(cards, {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: grid,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          });
        }
      });
    }, contentRef);

    return () => ctx.revert();
  }, [reducedMotion, selectedBranch]);

  return (
    <div className="relative bg-[#F8FAFC] text-slate-900 selection:bg-slate-900 selection:text-white font-jakarta min-h-screen">
      {/* ── Fixed Navigation Bar ── */}
      <RatesNav />

      {/* ── 1. CINEMATIC PINNED HERO SECTION ── */}
      <RatesHeroSection heroRef={heroRef} />

      {/* ── 2. MYSTIC CLOUD TRANSITION ── */}
      <RatesCloudTransition />

      {/* ── 3. MAIN RATES & MEAL PLANS CONTENT (Admin Dashboard Clean Palette) ── */}
      <div
        id="rates-content"
        ref={contentRef}
        className="relative z-20 bg-[#F8FAFC] min-h-screen pt-4 sm:pt-8 pb-24"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          {/* Section 01 Header — Arising Scrolling Text */}
          <div className="text-center space-y-3 pt-6" data-arise-section>
            <MountainGlyph className="w-6 h-auto text-slate-400 mx-auto" />
            <div className="overflow-hidden block py-0.5">
              <span className="arise-line block font-jakarta text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase will-change-transform">
                01 &mdash; Sanctuary Accommodations
              </span>
            </div>
            <div className="overflow-hidden block py-0.5">
              <h1 className="arise-line block font-cinzel text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[0.05em] text-slate-900 uppercase will-change-transform">
                Sanctuary Rooms &amp; Nightly Tariffs
              </h1>
            </div>
            <div className="overflow-hidden block py-0.5">
              <p className="arise-line block font-jakarta text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed will-change-transform">
                Every room and suite at Sky Nest is sculpted around uncompromised stillness, handcrafted teak architecture, and unhurried hospitality across our three island destinations.
              </p>
            </div>
          </div>

          {/* ── Control Bar: Property Filter + Currency Toggle (Admin Style) ── */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200/90 shadow-sm"
          >
            {/* Property Filter */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-2">
                Property:
              </span>
              {[
                { id: 'ALL', label: 'All Sanctuaries' },
                { id: 'Colombo', label: 'Colombo' },
                { id: 'Galle', label: 'Galle' },
                { id: 'Kandy', label: 'Kandy' },
              ].map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => setSelectedBranch(prop.id)}
                  className={`px-3.5 py-1.5 text-xs font-jakarta tracking-wide uppercase transition-all ${
                    selectedBranch === prop.id
                      ? 'bg-ink text-white font-semibold shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {prop.label}
                </button>
              ))}
            </div>

            {/* Currency Toggle */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                Currency:
              </span>
              <div className="inline-flex border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 text-xs font-jakarta font-semibold uppercase transition-all ${
                    currency === 'USD' ? 'bg-ink text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('LKR')}
                  className={`px-2.5 py-1 text-xs font-jakarta font-semibold uppercase transition-all ${
                    currency === 'LKR' ? 'bg-ink text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  LKR (Rs.)
                </button>
              </div>
            </div>
          </div>

          {/* ── 01 · Hotel Rooms Grid (Clean Admin Cards) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-cards-grid>
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="arise-card bg-white border border-slate-200/90 flex flex-col justify-between hover:border-slate-400 transition-all shadow-sm group"
              >
                <div>
                  {/* Room Image */}
                  <div className="relative overflow-hidden aspect-[16/10] bg-slate-100">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 bg-ink/90 text-white text-[11px] font-jakarta font-semibold uppercase px-2.5 py-1 tracking-wider backdrop-blur-sm">
                      {room.properties.join(' &bull; ')}
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
                      <div>
                        <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-900">{room.name}</h3>
                        <p className="font-jakarta text-xs text-slate-500 mt-1 italic">{room.tagline}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-cinzel text-2xl sm:text-3xl font-bold text-ink">
                          {formatPrice(room.usdRate)}
                        </div>
                        <div className="text-[10px] uppercase font-jakarta text-slate-500 tracking-wider mt-0.5">
                          Per Night &bull; Net Base
                        </div>
                      </div>
                    </div>

                    {/* Capacity & Specs */}
                    <div className="flex items-center gap-6 text-xs text-slate-600 font-jakarta">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Up to {room.capacity} Guests
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        {room.sizeM2} m&sup2; ({room.sizeSqFt} sq ft)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                        King Haven
                      </span>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                        Sanctuary Inclusions:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-700 font-jakarta">
                        {room.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-6 pt-0 border-t border-slate-200/80 mt-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      const el = document.getElementById('estimator-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-2.5 text-xs font-jakarta font-semibold uppercase tracking-wider border transition-all ${
                      selectedRoomId === room.id
                        ? 'bg-ink text-white border-ink shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-800 hover:text-slate-900'
                    }`}
                  >
                    {selectedRoomId === room.id ? 'Selected in Estimator' : 'Configure in Estimator'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── 02 · Wide Panoramic Gastronomy Banner (Mirrors Landing Page) ── */}
          <GastronomyBannerSection reducedMotion={reducedMotion} />

          {/* ── 02 · Ceylonese Gastronomy & Meal Plans Content ── */}
          <div className="space-y-10 pt-4">
            {/* Arising Meal Plans Header */}
            <div className="space-y-3" data-arise-section>
              <div className="overflow-hidden block py-0.5">
                <span className="arise-line block font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-slate-500 will-change-transform">
                  02 &mdash; Epicurean Journeys
                </span>
              </div>
              <div className="overflow-hidden block py-0.5">
                <h2 className="arise-line block font-cinzel text-3xl sm:text-4xl font-bold text-slate-900 uppercase will-change-transform">
                  Curated Ceylonese Meal Plans
                </h2>
              </div>
              <div className="overflow-hidden block py-0.5">
                <p className="arise-line block font-jakarta text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed will-change-transform">
                  Select your daily culinary rhythm. From complete dining freedom to an all-inclusive 4-course degustation celebrating Ceylon single-estate teas, day-boat seafood, and organic highland harvests.
                </p>
              </div>
            </div>

            {/* Meal Plan Tiers Grid (Admin Clean Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-cards-grid>
              {MEAL_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="arise-card bg-white border border-slate-200/90 p-6 flex flex-col justify-between hover:border-slate-400 transition-all shadow-sm"
                >
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                        {plan.code}
                      </span>
                      <h4 className="font-cinzel text-xl font-bold text-slate-900 mt-1">{plan.name}</h4>
                      <p className="font-jakarta text-xs text-slate-500 mt-1 leading-relaxed">{plan.tagline}</p>
                    </div>

                    <div className="py-3 border-y border-slate-200/80">
                      <div className="font-cinzel text-2xl font-bold text-ink">
                        {plan.usdRate === 0 ? 'Included' : `+${formatPrice(plan.usdRate)}`}
                      </div>
                      <div className="text-[10px] font-jakarta text-slate-500 uppercase tracking-wider mt-0.5">
                        {plan.usdRate === 0 ? 'Base stay inclusion' : 'Per guest / night'}
                      </div>
                    </div>

                    {/* Meal Inclusions */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                        Included Courses:
                      </span>
                      <ul className="space-y-1.5 text-xs font-jakarta">
                        {plan.inclusions.map((inc, i) => (
                          <li
                            key={i}
                            className={`flex items-center gap-2 ${
                              inc.active ? 'text-slate-800 font-medium' : 'text-slate-300 line-through'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${inc.active ? 'bg-ink' : 'bg-slate-200'}`} />
                            <span>{inc.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/80">
                    <div className="bg-slate-100 text-slate-700 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1.5 mb-3 border border-slate-200/60">
                      &bull; {plan.highlight}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        const el = document.getElementById('estimator-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`w-full py-2 text-xs font-jakarta font-semibold uppercase tracking-wider border transition-all ${
                        selectedPlanId === plan.id
                          ? 'bg-ink text-white border-ink shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-800 hover:text-slate-900'
                      }`}
                    >
                      {selectedPlanId === plan.id ? 'Selected in Estimator' : 'Select Plan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 03 · Interactive Nightly Rate Estimator (Clean Admin Dashboard Look) ── */}
          <div
            id="estimator-section"
            className="bg-white border border-slate-200/90 p-6 lg:p-8 space-y-6 shadow-sm"
          >
            {/* Estimator Header with Arising Text */}
            <div className="border-b border-slate-200/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" data-arise-section>
              <div>
                <div className="overflow-hidden block py-0.5">
                  <span className="arise-line block font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-slate-500 will-change-transform">
                    03 &mdash; Interactive Tariff Calculator
                  </span>
                </div>
                <div className="overflow-hidden block py-0.5">
                  <h3 className="arise-line block font-cinzel text-xl sm:text-2xl font-bold text-slate-900 uppercase will-change-transform">
                    Nightly Sanctuary Tariff Breakdown
                  </h3>
                </div>
              </div>
              <span className="text-xs font-jakarta text-slate-500">
                Rule B13 &bull; Versioned Statutory Sri Lankan Taxes
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Selectors Column */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <label className="text-xs font-jakarta font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                    1. Select Sanctuary Room Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROOM_TIERS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoomId(r.id)}
                        className={`p-3 text-left border transition-all ${
                          selectedRoomId === r.id
                            ? 'border-ink bg-slate-100 shadow-sm ring-1 ring-ink text-ink'
                            : 'border-slate-200 bg-white hover:border-slate-400 text-slate-700'
                        }`}
                      >
                        <div className="font-cinzel text-sm font-bold text-slate-900">{r.name}</div>
                        <div className="text-xs font-jakarta text-slate-600 font-semibold mt-0.5">
                          {formatPrice(r.usdRate)} / night
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-jakarta font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                    2. Select Ceylonese Gastronomy Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_PLANS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-3 text-left border transition-all ${
                          selectedPlanId === p.id
                            ? 'border-ink bg-slate-100 shadow-sm ring-1 ring-ink text-ink'
                            : 'border-slate-200 bg-white hover:border-slate-400 text-slate-700'
                        }`}
                      >
                        <div className="font-cinzel text-sm font-bold text-slate-900">{p.name}</div>
                        <div className="text-xs font-jakarta text-slate-600 font-semibold mt-0.5">
                          {p.usdRate === 0 ? 'Included' : `+${formatPrice(p.usdRate)}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimate Breakdown Column (Admin Slate Styling) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 space-y-4">
                <div className="text-xs font-jakarta font-semibold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-200">
                  Tariff Summary &bull; Per Night
                </div>

                <div className="space-y-2 text-xs font-jakarta">
                  <div className="flex items-center justify-between text-slate-700">
                    <span>{currentRoom.name} Base Rate</span>
                    <span className="font-semibold text-slate-900">{formatPrice(currentRoom.usdRate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>{currentPlan.name} ({currentPlan.code})</span>
                    <span className="font-semibold text-slate-900">
                      {currentPlan.usdRate === 0 ? 'Included' : `+${formatPrice(currentPlan.usdRate)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 pt-2 border-t border-slate-200">
                    <span>Subtotal Before Taxes</span>
                    <span className="font-semibold text-slate-900">{formatPrice(subtotalUsd)}</span>
                  </div>

                  {/* Statutory Taxes */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-1 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Service Charge (10.0%)</span>
                      <span>{formatPrice(Math.round(serviceChargeUsd))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tourism Dev Levy (TDL 1.0%)</span>
                      <span>{formatPrice(Math.round(tdlUsd))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SSCL (2.5%)</span>
                      <span>{formatPrice(Math.round(ssclUsd))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>VAT (18.0%)</span>
                      <span>{formatPrice(Math.round(vatUsd))}</span>
                    </div>
                  </div>
                </div>

                {/* Final Net Quote */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Quoted Rate</div>
                    <div className="text-[10px] text-emerald-700 font-medium">Taxes &amp; Service Included</div>
                  </div>
                  <div className="text-right">
                    <div className="font-cinzel text-3xl font-bold text-ink">
                      {formatPrice(Math.round(totalWithTaxesUsd))}
                    </div>
                    <div className="text-[10px] text-slate-500">Per Night &bull; Standard Occupancy</div>
                  </div>
                </div>

                <Link
                  href="/book"
                  className="w-full mt-2 py-3 bg-ink hover:bg-slate-800 text-white font-jakarta text-xs font-semibold uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Book This Experience</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Standard Sky Nest Footer ── */}
      <SkyNestFooter />
    </div>
  );
}
