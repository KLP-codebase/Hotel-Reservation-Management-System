'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BedDouble,
  Users,
  Maximize2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Utensils,
  Coffee,
  Wine,
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

// ── 12 Sanctuary Room Tiles Data across 3 Hotels ─────────────────────────────
export type HotelKey = 'KANDY' | 'GALLE' | 'COLOMBO';

export interface SanctuaryRoomTile {
  id: string;
  roomType: 'STANDARD' | 'DELUXE' | 'SUITE' | 'PRESIDENTIAL';
  hotelKey: HotelKey;
  hotelName: string;
  hotelSubtitle: string;
  name: string;
  tagline: string;
  usdRate: number;
  capacity: number;
  sizeM2: number;
  sizeSqFt: number;
  scaleLabel: string;
  image: string;
  highlights: string[];
}

export const SANCTUARY_TILES: SanctuaryRoomTile[] = [
  // ── KANDY HIGHLAND SANCTUARY (Tiles 1-4) ──
  {
    id: 'KANDY-STANDARD',
    roomType: 'STANDARD',
    hotelKey: 'KANDY',
    hotelName: 'Sky Nest Kandy',
    hotelSubtitle: 'Misty Hill Country Haven',
    name: 'Standard Haven',
    tagline: 'Intimate serenity with handcrafted Ceylon teak finishes',
    usdRate: 120,
    capacity: 2,
    sizeM2: 38,
    sizeSqFt: 410,
    scaleLabel: 'Cozy Haven • 38 m²',
    image: '/standard_room.jpg',
    highlights: [
      'Handcrafted dark Ceylon teak accents & shutters',
      'Highland mist courtyard views & garden quietude',
      'Artisanal Ceylon silver-tip tea & French press bar',
      'Botanical rainfall shower with organic extracts',
    ],
  },
  {
    id: 'KANDY-DELUXE',
    roomType: 'DELUXE',
    hotelKey: 'KANDY',
    hotelName: 'Sky Nest Kandy',
    hotelSubtitle: 'Misty Hill Country Haven',
    name: 'Deluxe Veranda',
    tagline: 'Generous highland light, private balcony, and mountain breeze',
    usdRate: 180,
    capacity: 3,
    sizeM2: 52,
    sizeSqFt: 560,
    scaleLabel: 'Generous Space • 52 m²',
    image: '/deluxe_room.jpg',
    highlights: [
      'Private open-air veranda with rattan lounging chairs',
      'Four-poster draped canopy bed with fine Ceylon linens',
      'Panoramic vistas of the Knuckles mountain range',
      'Evening lemongrass turndown ritual & fireside warmers',
    ],
  },
  {
    id: 'KANDY-SUITE',
    roomType: 'SUITE',
    hotelKey: 'KANDY',
    hotelName: 'Sky Nest Kandy',
    hotelSubtitle: 'Misty Hill Country Haven',
    name: 'Executive Hill Suite',
    tagline: 'Dual-chamber sanctuary with private heated plunge pool',
    usdRate: 280,
    capacity: 4,
    sizeM2: 85,
    sizeSqFt: 915,
    scaleLabel: 'Dual-Chamber • 85 m²',
    image: '/about_suite.jpg',
    highlights: [
      'Separate living salon and master bedchamber',
      'Private outdoor heated plunge pool overlooking valleys',
      'Dedicated personal butler station & tea sommelier',
      'Curated artisanal bar with single-estate Ceylon harvests',
    ],
  },
  {
    id: 'KANDY-PRESIDENTIAL',
    roomType: 'PRESIDENTIAL',
    hotelKey: 'KANDY',
    hotelName: 'Sky Nest Kandy',
    hotelSubtitle: 'Misty Hill Country Haven',
    name: 'Presidential Penthouse',
    tagline: 'The pinnacle of highland majesty with panoramic 360° decks',
    usdRate: 500,
    capacity: 6,
    sizeM2: 160,
    sizeSqFt: 1720,
    scaleLabel: 'Palatial Penthouse • 160 m²',
    image: '/pillar_architecture.jpg',
    highlights: [
      'Wrap-around high-altitude terrace & private firepit',
      'Private chef dining salon for bespoke highland degustations',
      '24/7 dedicated personal butler and concierge service',
      'Complimentary private luxury chauffeur transfers',
    ],
  },

  // ── GALLE COASTAL FORTRESS (Tiles 5-8) ──
  {
    id: 'GALLE-STANDARD',
    roomType: 'STANDARD',
    hotelKey: 'GALLE',
    hotelName: 'Sky Nest Galle',
    hotelSubtitle: 'Historic Ocean Bastion',
    name: 'Standard Bastion Room',
    tagline: 'Refined colonial calm with whitewashed Dutch archways',
    usdRate: 120,
    capacity: 2,
    sizeM2: 38,
    sizeSqFt: 410,
    scaleLabel: 'Cozy Haven • 38 m²',
    image: '/standard_room.jpg',
    highlights: [
      'Dutch colonial teak finishes and polished terracotta',
      'Courtyard frangipani garden and fountain vistas',
      'Artisanal Ceylon loose-leaf tea & iced herbal infusions',
      'Cooling rain shower with botanical lemongrass extracts',
    ],
  },
  {
    id: 'GALLE-DELUXE',
    roomType: 'DELUXE',
    hotelKey: 'GALLE',
    hotelName: 'Sky Nest Galle',
    hotelSubtitle: 'Historic Ocean Bastion',
    name: 'Deluxe Ocean Veranda',
    tagline: 'Generous coastal suite with open balcony and ocean horizons',
    usdRate: 180,
    capacity: 3,
    sizeM2: 52,
    sizeSqFt: 560,
    scaleLabel: 'Generous Space • 52 m²',
    image: '/deluxe_room.jpg',
    highlights: [
      'Private veranda with rattan loungers overlooking surf',
      'Freestanding deep marble tub & dual vanity dressing suite',
      'Four-poster draped canopy bed catching Indian Ocean breezes',
      'Sunset turndown with chilled king coconut water',
    ],
  },
  {
    id: 'GALLE-SUITE',
    roomType: 'SUITE',
    hotelKey: 'GALLE',
    hotelName: 'Sky Nest Galle',
    hotelSubtitle: 'Historic Ocean Bastion',
    name: 'Executive Coastal Suite',
    tagline: 'Spacious dual salon with private ocean-facing plunge pool',
    usdRate: 280,
    capacity: 4,
    sizeM2: 85,
    sizeSqFt: 915,
    scaleLabel: 'Dual-Chamber • 85 m²',
    image: '/about_suite.jpg',
    highlights: [
      'Separate oceanfront sitting salon and private bedchamber',
      'Private heated infinity plunge pool overlooking lighthouse',
      'Dedicated personal butler & daily laundry pressing',
      'Bespoke afternoon Ceylon High Tea delivered to your suite',
    ],
  },
  {
    id: 'GALLE-PRESIDENTIAL',
    roomType: 'PRESIDENTIAL',
    hotelKey: 'GALLE',
    hotelName: 'Sky Nest Galle',
    hotelSubtitle: 'Historic Ocean Bastion',
    name: 'Presidential Fortress Suite',
    tagline: 'Grand colonial ocean residence overlooking the ramparts',
    usdRate: 500,
    capacity: 6,
    sizeM2: 160,
    sizeSqFt: 1720,
    scaleLabel: 'Palatial Penthouse • 160 m²',
    image: '/pillar_architecture.jpg',
    highlights: [
      'Private rooftop sunset terrace facing the historic ramparts',
      'Private dining salon with dedicated resident seafood chef',
      '24/7 personal butler and maritime heritage concierge',
      'Complimentary airport private chauffeur transfer',
    ],
  },

  // ── COLOMBO URBAN PORT SANCTUARY (Tiles 9-12) ──
  {
    id: 'COLOMBO-STANDARD',
    roomType: 'STANDARD',
    hotelKey: 'COLOMBO',
    hotelName: 'Sky Nest Colombo',
    hotelSubtitle: 'Harbour City Sanctuary',
    name: 'Standard Urban Haven',
    tagline: 'Restful minimalist teak retreat amidst the capital rhythm',
    usdRate: 120,
    capacity: 2,
    sizeM2: 38,
    sizeSqFt: 410,
    scaleLabel: 'Cozy Haven • 38 m²',
    image: '/standard_room.jpg',
    highlights: [
      'Handcrafted Ceylon teak paneling and acoustic soundproofing',
      'Skyline and lush landscaped courtyard garden vistas',
      'Artisanal espresso machine & single-estate Ceylon tea bar',
      'Spa rain shower with organic botanical sea salt scrubs',
    ],
  },
  {
    id: 'COLOMBO-DELUXE',
    roomType: 'DELUXE',
    hotelKey: 'COLOMBO',
    hotelName: 'Sky Nest Colombo',
    hotelSubtitle: 'Harbour City Sanctuary',
    name: 'Deluxe Harbour Room',
    tagline: 'Spacious urban luxury with private balcony and ocean vistas',
    usdRate: 180,
    capacity: 3,
    sizeM2: 52,
    sizeSqFt: 560,
    scaleLabel: 'Generous Space • 52 m²',
    image: '/deluxe_room.jpg',
    highlights: [
      'Private veranda with rattan seating over the harbour waters',
      'Draped canopy king bed and generous executive work desk',
      'Deep marble soaking tub and dual vanities with luxury amenities',
      'Complimentary evening cocktails at the Sky Lounge',
    ],
  },
  {
    id: 'COLOMBO-SUITE',
    roomType: 'SUITE',
    hotelKey: 'COLOMBO',
    hotelName: 'Sky Nest Colombo',
    hotelSubtitle: 'Harbour City Sanctuary',
    name: 'Executive Skyline Suite',
    tagline: 'Grand dual-salon with private infinity plunge pool',
    usdRate: 280,
    capacity: 4,
    sizeM2: 85,
    sizeSqFt: 915,
    scaleLabel: 'Dual-Chamber • 85 m²',
    image: '/about_suite.jpg',
    highlights: [
      'Separate entertainment salon and private master quarters',
      'Private heated plunge pool with skyline city & sea views',
      'Dedicated personal butler and business concierge service',
      'Private boardroom access and complimentary airport transfers',
    ],
  },
  {
    id: 'COLOMBO-PRESIDENTIAL',
    roomType: 'PRESIDENTIAL',
    hotelKey: 'COLOMBO',
    hotelName: 'Sky Nest Colombo',
    hotelSubtitle: 'Harbour City Sanctuary',
    name: 'Presidential Harbour Penthouse',
    tagline: 'The pinnacle of island urban sophistication with private elevator',
    usdRate: 500,
    capacity: 6,
    sizeM2: 160,
    sizeSqFt: 1720,
    scaleLabel: 'Palatial Penthouse • 160 m²',
    image: '/pillar_architecture.jpg',
    highlights: [
      'Double-height floor-to-ceiling panoramic ocean glass',
      'Private 10-seat dining room & private master chef kitchen',
      '24/7 dedicated butler, chauffeur, and security concierge',
      'Helipad transfers and VIP fast-track international arrival',
    ],
  },
];

// ── Meal Plans Data ──────────────────────────────────────────────────────────
export interface MealPlan {
  id: string;
  name: string;
  code: string;
  usdRate: number;
  tagline: string;
  description: string;
  inclusions: { label: string; active: boolean }[];
  highlight: string;
}

export const MEAL_PLANS: MealPlan[] = [
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

// ── Navigation Bar (Matching SkyNestNav in SkyNestHomePage) ──────────────────
function RatesNav() {
  const { user } = useAuth();
  const [navProgress, setNavProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const p = Math.min(1, Math.max(0, scrollY / 180));
      setNavProgress(p);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const bgStyle: React.CSSProperties = {
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

  return (
    <nav
      id="rates-nav"
      aria-label="Rates navigation"
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-150"
      style={bgStyle}
    >
      <div className="flex items-center justify-between h-14 md:h-16 px-4 sm:px-6 md:px-8">
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/rates"
            className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
            style={linkStyle}
          >
            Rates
          </Link>
          <Link
            href="/#about"
            className="flex items-center px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border transition-[border-color,background-color] duration-200"
            style={linkStyle}
          >
            About
          </Link>
        </div>

        <div className="flex items-center md:absolute md:left-1/2 md:-translate-x-1/2">
          <Link
            href="/"
            className="flex items-center gap-2 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-skynest-accent"
          >
            <MountainGlyph className="w-6 h-auto" style={{ color: textColor }} />
            <span
              className="font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase"
              style={{ color: textColor }}
            >
              SKYNEST
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/contact"
            className="hidden sm:flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-colors duration-200"
            style={linkStyle}
          >
            Contact
          </Link>
          <Link
            href="/book"
            className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-colors duration-200"
            style={bookStyle}
          >
            Book Now
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-colors duration-200"
              style={linkStyle}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-colors duration-200"
              style={linkStyle}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Cinematic Pinned Hero Section (Exact Duplicate of SkyNestHomePage) ─────────
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
        defaults: { ease: 'none', force3D: true },
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
      aria-label="SkyNest rates and sanctuaries hero"
      className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col bg-ink z-0 select-none"
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          ref={bgImgRef}
          src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.webp"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{
            filter: 'brightness(0.7) contrast(1.1)',
            willChange: 'transform',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 70% at 50% 30%, rgba(11,37,64,0.35) 0%, rgba(7,28,48,0.6) 60%, rgba(11,37,64,0.85) 100%)',
          }}
        />
      </div>

      <div
        ref={topRowRef}
        className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between px-6 sm:px-8 md:px-12 pt-20 sm:pt-24 md:pt-28 pb-0 gap-4 sm:gap-6 z-10"
        style={{ willChange: 'transform, opacity' }}
      >
        <p
          className="font-cinzel font-normal italic text-white/75 text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed max-w-[320px] sm:max-w-none"
          style={{ fontStyle: 'italic' }}
        >
          Three branches. Twelve sanctuaries.
          <br />
          One transparent tariff standard.
        </p>

        <a
          href="#story"
          className="self-start sm:self-auto flex items-center gap-2 font-jakarta text-[10px] sm:text-[11px] md:text-[12px] font-medium tracking-[0.15em] uppercase text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all duration-300"
        >
          <span>Explore 12 Sanctuaries</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </a>
      </div>

      <div
        ref={wordmarkRef}
        aria-hidden="true"
        className="relative z-10 flex-1 flex items-end justify-center overflow-hidden pointer-events-none select-none w-full px-4"
        style={{ willChange: 'transform, opacity' }}
      >
        <span
          className="font-cinzel font-normal leading-[0.85] text-white text-center whitespace-nowrap block w-full uppercase"
          style={{
            fontSize: 'clamp(40px, 15vw, 220px)',
            letterSpacing: '0.03em',
            paddingBottom: 'clamp(4px, 1.5vw, 8px)',
          }}
        >
          RATES &amp; PLANS
        </span>
      </div>
    </section>
  );
}

// ── Cloud Transition (Exact Duplicate from SkyNestHomePage with White Fog) ───
function RatesCloudTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrap1Ref = useRef<HTMLDivElement>(null);
  const wrap2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.set([wrap1Ref.current, wrap2Ref.current], { autoAlpha: 0 });
    gsap.set(wrap1Ref.current, { y: '12%' });
    gsap.set(wrap2Ref.current, { y: '20%' });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1.0,
        },
        defaults: { ease: 'none', force3D: true },
      });

      tl.to(wrap1Ref.current, { y: '0%', autoAlpha: 1 }, 0);
      tl.to(wrap2Ref.current, { y: '0%', autoAlpha: 1 }, 0.1);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative z-10 h-[50dvh] sm:h-[60dvh] md:h-[70dvh] pointer-events-none overflow-hidden"
    >
      <div
        ref={wrap1Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden"
        style={{
          width: '220%',
          height: '100%',
          marginLeft: '-110%',
          willChange: 'transform, opacity',
        }}
      >
        <img
          src="/07_Clouds.webp"
          alt=""
          className="w-full h-full object-cover object-bottom"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)',
          }}
        />
      </div>

      <div
        ref={wrap2Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden"
        style={{
          width: '220%',
          height: '85%',
          marginLeft: '-110%',
          willChange: 'transform, opacity',
        }}
      >
        <img
          src="/Clouds 3.webp"
          alt=""
          className="w-full h-full object-cover object-bottom"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)',
          }}
        />
      </div>

      {/* Dense white fog at the bottom — blends seamlessly into paper white */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(253,252,250,0.3) 20%, rgba(253,252,250,0.7) 45%, rgba(253,252,250,0.95) 75%, #FDFCFA 100%)',
        }}
      />
    </div>
  );
}

// ── White Header Below Clouds (Exact IntroSection Style from Landing Page) ────
function RatesIntroHeaderSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const subTextRef = useRef<HTMLDivElement>(null);

  const INTRO_LINES = [
    'THREE SANCTUARIES, TWELVE EXPERIENCES —',
    'TRANSPARENT NIGHTLY TARIFFS,',
    'UNCOMPROMISING CEYLONESE LUXURY.',
  ];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const emblem = emblemRef.current;
    const title = titleRef.current;
    const subText = subTextRef.current;

    if (reducedMotion || !section) return;

    if (emblem) gsap.set(emblem, { opacity: 0, y: 15 });
    if (title) gsap.set(title.children, { opacity: 0, y: '100%' });
    if (subText) gsap.set(subText, { opacity: 0, y: 15 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });

      if (emblem) {
        tl.to(emblem, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      }
      if (title) {
        tl.to(
          title.children,
          {
            opacity: 1,
            y: '0%',
            duration: 0.5,
            stagger: 0.08,
            ease: 'power3.out',
          },
          emblem ? '-=0.25' : 0
        );
      }
      if (subText) {
        tl.to(subText, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, '-=0.2');
      }
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="story"
      aria-label="Rates intro story"
      className="relative bg-paper overflow-hidden py-14 md:py-20 -mt-1"
    >
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-6 items-start">
          <div className="hidden md:block md:col-start-1 md:col-end-2" />

          <div className="md:col-start-2 md:col-end-6 flex flex-col items-start w-full">
            <div ref={emblemRef}>
              <SweepingOrbitalEmblem label="The SkyNest Standard" reducedMotion={reducedMotion} />
            </div>

            <h1
              ref={titleRef}
              className="font-cinzel font-normal uppercase leading-[1.14] tracking-[0.035em] text-ink w-full"
              style={{
                fontSize: 'clamp(22px, 3.2vw, 38px)',
              }}
            >
              {INTRO_LINES.map((line, i) => (
                <div key={i} className="overflow-hidden block py-0.5">
                  <span className="block font-cinzel font-normal uppercase tracking-[0.035em] text-ink will-change-transform">
                    {line}
                  </span>
                </div>
              ))}
            </h1>

            <div
              ref={subTextRef}
              className="mt-8 md:mt-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-6 pt-5 border-t border-skynest-hairline w-full"
            >
              <p className="font-jakarta text-[12px] md:text-[13px] leading-[1.8] text-ink/65 max-w-xl">
                Every sanctuary at Sky Nest is sculpted around uncompromised stillness, handcrafted Ceylon teak, and unhurried hospitality. Browse all twelve sanctuaries across Kandy, Galle, and Colombo below.
              </p>

              <a
                href="#sanctuaries-carousel"
                className="self-start sm:self-auto inline-flex items-center gap-2 font-jakarta text-[10px] md:text-[11px] font-semibold tracking-[0.2em] uppercase text-ink whitespace-nowrap border-b border-ink/30 pb-0.5 hover:border-ink transition-colors duration-300"
              >
                <span>View All 12 Havens</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="hidden md:block md:col-start-6 md:col-end-7" />
        </div>
      </div>
    </section>
  );
}

// ── 12-Tile Right Scroll Carousel (Kandy, Galle, Colombo) ────────────────────
function RatesSanctuaryCarousel({
  selectedRoomId,
  onSelectRoom,
}: {
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
}) {
  const [activeHotel, setActiveHotel] = useState<HotelKey>('KANDY');
  const carouselRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smooth jump to the 4 tiles of a selected hotel
  const jumpToHotel = useCallback((hotelKey: HotelKey) => {
    setActiveHotel(hotelKey);
    let targetIndex = 0;
    if (hotelKey === 'GALLE') targetIndex = 4;
    if (hotelKey === 'COLOMBO') targetIndex = 8;

    const targetEl = tileRefs.current[targetIndex];
    if (targetEl && carouselRef.current) {
      const containerLeft = carouselRef.current.getBoundingClientRect().left;
      const targetLeft = targetEl.getBoundingClientRect().left;
      const currentScroll = carouselRef.current.scrollLeft;
      const scrollOffset = currentScroll + (targetLeft - containerLeft) - 32;

      carouselRef.current.scrollTo({
        left: Math.max(0, scrollOffset),
        behavior: 'smooth',
      });
    }
  }, []);

  // Left & right scroll helper
  const scrollDelta = (delta: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const HOTELS: { key: HotelKey; label: string; tag: string }[] = [
    { key: 'KANDY', label: 'Sky Nest Kandy', tag: 'Highland Sanctuaries' },
    { key: 'GALLE', label: 'Sky Nest Galle', tag: 'Coastal Bastions' },
    { key: 'COLOMBO', label: 'Sky Nest Colombo', tag: 'Harbour Port Sanctuaries' },
  ];

  return (
    <section
      id="sanctuaries-carousel"
      aria-label="Sanctuary rooms 12-tile showcase"
      className="relative bg-paper py-12 md:py-16 overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-12 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-skynest-hairline">
          <div>
            <span className="font-jakarta text-[11px] font-bold tracking-[0.25em] uppercase text-skynest-accent block mb-2">
              01 &nbsp;/&nbsp; Twelve Sanctuaries Across The Island
            </span>
            <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.03em] text-ink">
              Explore Our Sanctuaries
            </h2>
            <p className="font-jakarta text-xs sm:text-sm text-ink/60 mt-1 max-w-xl">
              Select a destination below to right-scroll and focus on its four tailored havens. Non-active destination tiles blur seamlessly on the sides.
            </p>
          </div>

          {/* Hotel Jump Buttons & Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {HOTELS.map((h) => {
              const isActive = activeHotel === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => jumpToHotel(h.key)}
                  className={`px-4 sm:px-5 py-2.5 text-xs font-jakarta uppercase tracking-wider font-semibold border transition-all duration-300 ${
                    isActive
                      ? 'bg-ink text-paper border-ink shadow-sm'
                      : 'bg-white text-ink/70 border-skynest-hairline hover:border-ink hover:text-ink'
                  }`}
                >
                  <span>{h.label}</span>
                </button>
              );
            })}

            {/* Left / Right arrow navigation */}
            <div className="inline-flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => scrollDelta(-340)}
                aria-label="Scroll left"
                className="w-9 h-9 border border-skynest-hairline bg-white hover:border-ink text-ink flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollDelta(340)}
                aria-label="Scroll right"
                className="w-9 h-9 border border-skynest-hairline bg-white hover:border-ink text-ink flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Carousel Track with Side Edge Blur Vignettes ── */}
      <div className="relative w-full overflow-hidden">
        {/* Left Side Vignette Blur Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 md:w-24 z-20"
          style={{
            background:
              'linear-gradient(to right, #FDFCFA 0%, rgba(253,252,250,0.8) 40%, transparent 100%)',
          }}
        />

        {/* Right Side Vignette Blur Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 md:w-24 z-20"
          style={{
            background:
              'linear-gradient(to left, #FDFCFA 0%, rgba(253,252,250,0.8) 40%, transparent 100%)',
          }}
        />

        {/* Scrollable Track */}
        <div
          ref={carouselRef}
          className="flex items-stretch gap-6 overflow-x-auto scrollbar-hide px-6 sm:px-12 md:px-16 py-4 scroll-smooth"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {SANCTUARY_TILES.map((tile, idx) => {
            const isBelong = tile.hotelKey === activeHotel;
            const isStandard = tile.roomType === 'STANDARD';
            const isDeluxe = tile.roomType === 'DELUXE';
            const isSuite = tile.roomType === 'SUITE';
            const isPresidential = tile.roomType === 'PRESIDENTIAL';

            // Distinct physical scale sizing per room category
            const widthClass = isStandard
              ? 'w-[280px] sm:w-[300px]'
              : isDeluxe
              ? 'w-[320px] sm:w-[340px]'
              : isSuite
              ? 'w-[350px] sm:w-[370px]'
              : 'w-[370px] sm:w-[390px]';

            const imgHeightClass = isStandard
              ? 'h-44'
              : isDeluxe
              ? 'h-48'
              : isSuite
              ? 'h-52'
              : 'h-56';

            return (
              <div
                key={tile.id}
                ref={(el) => {
                  tileRefs.current[idx] = el;
                }}
                className={`flex-shrink-0 flex flex-col justify-between border bg-white transition-all duration-500 ${widthClass} ${
                  isBelong
                    ? 'opacity-100 filter-none scale-100 border-skynest-hairline shadow-sm hover:border-ink hover:shadow-md'
                    : 'opacity-35 blur-[4px] scale-[0.97] pointer-events-none border-skynest-hairline/60'
                }`}
              >
                <div>
                  {/* Sanctuary Card Image with Scale Dimensions */}
                  <div className={`relative overflow-hidden ${imgHeightClass} bg-ink/5`}>
                    <img
                      src={tile.image}
                      alt={tile.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                    />

                    {/* Scale badge on image */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 border border-skynest-hairline text-[10px] font-jakarta font-semibold uppercase tracking-wider text-ink">
                      {tile.scaleLabel}
                    </div>

                    {/* Hotel indicator badge */}
                    <div className="absolute top-3 right-3 bg-ink/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-jakarta font-bold uppercase tracking-wider text-paper">
                      {tile.hotelKey}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="pb-3 border-b border-skynest-hairline">
                      <span className="text-[10px] font-jakarta uppercase tracking-wider text-ink/50 block mb-0.5">
                        {tile.hotelName} • {tile.hotelSubtitle}
                      </span>
                      <h3 className="font-cinzel text-lg sm:text-xl font-bold uppercase text-ink">
                        {tile.name}
                      </h3>
                      <p className="font-jakarta text-[11px] text-ink/60 mt-1 italic leading-relaxed">
                        {tile.tagline}
                      </p>
                    </div>

                    {/* Price & Specs */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-cinzel text-2xl font-bold text-skynest-accent">
                          ${tile.usdRate}
                        </span>
                        <span className="text-[10px] font-jakarta text-ink/50 uppercase tracking-wider block">
                          Per Night &bull; Net Base
                        </span>
                      </div>
                      <div className="text-right space-y-0.5 text-[11px] font-jakarta text-ink/70">
                        <div className="flex items-center gap-1 justify-end">
                          <Users className="w-3.5 h-3.5 text-skynest-accent" />
                          <span>Up to {tile.capacity} Guests</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Maximize2 className="w-3.5 h-3.5 text-skynest-accent" />
                          <span>{tile.sizeM2} m² ({tile.sizeSqFt} sq ft)</span>
                        </div>
                      </div>
                    </div>

                    {/* Inclusions */}
                    <div className="space-y-1.5 pt-2 border-t border-skynest-hairline">
                      <span className="text-[9px] font-jakarta uppercase tracking-wider font-bold text-ink/40 block">
                        Sanctuary Inclusions:
                      </span>
                      <ul className="space-y-1 text-[11px] font-jakarta text-ink/75">
                        {tile.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-skynest-accent flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-5 sm:p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRoom(tile.roomType);
                      const el = document.getElementById('estimator-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-2.5 text-xs font-jakarta font-semibold uppercase tracking-wider border transition-all duration-200 ${
                      selectedRoomId === tile.roomType
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-paper text-ink border-skynest-hairline hover:bg-ink hover:text-paper hover:border-ink'
                    }`}
                  >
                    {selectedRoomId === tile.roomType ? 'Selected in Estimator' : 'Configure in Estimator'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Wide Gastronomy Parallax Banner (Edge-to-Edge Full Bleed) ─────────────────
function RatesGastronomyBannerSection({ reducedMotion }: { reducedMotion: boolean }) {
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

    gsap.set(img, { scale: 1.05, y: -30 });
    gsap.set([label, title, line], { y: 15, opacity: 0 });

    const ctx = gsap.context(() => {
      gsap.to(img, {
        y: 30,
        scale: 1.0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });

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
      id="gastronomy"
      aria-label="Ceylonese Gastronomy banner"
      className="relative bg-paper overflow-hidden w-full my-8 md:my-14"
    >
      {/* Edge-to-edge full bleed aspect ratio */}
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-0 md:aspect-[21/9] lg:aspect-[24/9] overflow-hidden">
        {/* Parallax background image */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          {/* Feathered top gradient */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-28 md:h-44 pointer-events-none z-[2]"
            style={{
              background:
                'linear-gradient(to bottom, #FDFCFA 0%, rgba(253,252,250,0.85) 25%, rgba(253,252,250,0.3) 65%, transparent 100%)',
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
                'linear-gradient(to top, #FDFCFA 0%, rgba(253,252,250,0.85) 25%, rgba(253,252,250,0.3) 65%, transparent 100%)',
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
                fontSize: 'clamp(28px, 4.8vw, 68px)',
                willChange: 'transform, opacity',
              }}
            >
              Fine Living &amp; Dining
            </h2>

            <p
              ref={lineRef}
              className="font-cinzel italic text-white/90 max-w-xl leading-relaxed text-sm md:text-lg drop-shadow-md"
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

// ── 03 · Meal Plans Section (Clean Paper Luxury Aesthetic) ───────────────────
function RatesMealPlansSection({
  selectedPlanId,
  onSelectPlan,
}: {
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
}) {
  return (
    <section className="relative bg-paper py-12 md:py-16 max-w-6xl mx-auto px-6 sm:px-10">
      <div className="text-center space-y-3 mb-12">
        <MountainGlyph className="w-6 h-auto text-ink/40 mx-auto" />
        <span className="font-jakarta text-[11px] font-bold tracking-[0.25em] uppercase text-skynest-accent block">
          03 &nbsp;/&nbsp; Ceylonese Culinary Journeys
        </span>
        <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.03em] text-ink">
          Curated Meal Plans
        </h2>
        <p className="font-jakarta text-xs sm:text-sm text-ink/60 max-w-2xl mx-auto leading-relaxed">
          From unhurried morning egg hoppers to evening seaside degustations, select the culinary plan that complements your island itinerary.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MEAL_PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`border bg-white p-6 flex flex-col justify-between transition-all duration-300 ${
                isSelected
                  ? 'border-ink shadow-md ring-1 ring-ink'
                  : 'border-skynest-hairline hover:border-ink/50'
              }`}
            >
              <div className="space-y-4">
                <div className="pb-3 border-b border-skynest-hairline">
                  <span className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-skynest-accent block">
                    {plan.code}
                  </span>
                  <h3 className="font-cinzel text-lg font-bold uppercase text-ink mt-0.5">
                    {plan.name}
                  </h3>
                  <div className="mt-2">
                    <span className="font-cinzel text-2xl font-bold text-ink">
                      {plan.usdRate === 0 ? 'Included' : `+$${plan.usdRate}`}
                    </span>
                    <span className="text-[10px] font-jakarta text-ink/40 uppercase block">
                      Per Guest &bull; Per Night
                    </span>
                  </div>
                </div>

                <p className="font-jakarta text-xs text-ink/65 leading-relaxed">
                  {plan.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-skynest-hairline">
                  <span className="text-[9px] font-jakarta font-bold uppercase tracking-wider text-ink/40 block">
                    Meal Inclusions:
                  </span>
                  <ul className="space-y-1.5 text-xs font-jakarta">
                    {plan.inclusions.map((inc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check
                          className={`w-3.5 h-3.5 ${
                            inc.active ? 'text-skynest-accent' : 'text-ink/20'
                          }`}
                        />
                        <span className={inc.active ? 'text-ink' : 'text-ink/40'}>
                          {inc.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full py-2.5 text-xs font-jakarta font-semibold uppercase tracking-wider border transition-all ${
                    isSelected
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper text-ink border-skynest-hairline hover:border-ink hover:bg-ink hover:text-paper'
                  }`}
                >
                  {isSelected ? 'Selected in Estimator' : 'Select Meal Plan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── 04 · Interactive Tariff Estimator (With 4-Tier Tax Cascade) ───────────────
function RatesTariffEstimator({
  selectedRoomType,
  selectedPlanId,
  onSelectRoomType,
  onSelectPlanId,
}: {
  selectedRoomType: string;
  selectedPlanId: string;
  onSelectRoomType: (rt: string) => void;
  onSelectPlanId: (pid: string) => void;
}) {
  const ROOM_TYPES = [
    { id: 'STANDARD', name: 'Standard Haven', rate: 120 },
    { id: 'DELUXE', name: 'Deluxe Veranda', rate: 180 },
    { id: 'SUITE', name: 'Executive Suite', rate: 280 },
    { id: 'PRESIDENTIAL', name: 'Presidential Penthouse', rate: 500 },
  ];

  const currentRoom = ROOM_TYPES.find((r) => r.id === selectedRoomType) ?? ROOM_TYPES[0];
  const currentPlan = MEAL_PLANS.find((p) => p.id === selectedPlanId) ?? MEAL_PLANS[0];

  // 4-Tier Statutory Sri Lankan Tax Cascade (Rule B13)
  const baseSubtotal = currentRoom.rate + currentPlan.usdRate;
  const scTax = Math.round(baseSubtotal * 0.10 * 100) / 100;
  const tdlTax = Math.round((baseSubtotal + scTax) * 0.01 * 100) / 100;
  const sscTax = Math.round((baseSubtotal + scTax + tdlTax) * 0.025 * 100) / 100;
  const vatTax = Math.round((baseSubtotal + scTax + tdlTax + sscTax) * 0.18 * 100) / 100;
  const totalTaxes = Math.round((scTax + tdlTax + sscTax + vatTax) * 100) / 100;
  const grandTotal = Math.round((baseSubtotal + totalTaxes) * 100) / 100;

  return (
    <section
      id="estimator-section"
      aria-label="Interactive Tariff Calculator"
      className="relative bg-paper py-12 md:py-16 max-w-5xl mx-auto px-6 sm:px-10"
    >
      <div className="bg-white border border-skynest-hairline p-6 md:p-10 shadow-sm space-y-8">
        <div className="pb-4 border-b border-skynest-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-jakarta text-[11px] font-bold tracking-[0.25em] uppercase text-skynest-accent block">
              04 &nbsp;/&nbsp; Tariff Calculator
            </span>
            <h3 className="font-cinzel text-xl sm:text-2xl font-bold uppercase text-ink mt-0.5">
              Nightly Sanctuary Tariff Breakdown
            </h3>
          </div>
          <span className="text-[11px] font-jakarta text-ink/50 uppercase tracking-wider">
            Rule B13 &bull; Versioned Statutory Sri Lankan Taxes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Controls */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <label className="text-xs font-jakarta font-bold uppercase tracking-wider text-ink/70 block mb-2">
                1. Select Room Tier
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {ROOM_TYPES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRoomType(r.id)}
                    className={`p-3 text-left border transition-all ${
                      selectedRoomType === r.id
                        ? 'border-ink bg-ink text-paper shadow-xs'
                        : 'border-skynest-hairline bg-paper text-ink hover:border-ink/50'
                    }`}
                  >
                    <div className="font-cinzel text-xs sm:text-sm font-bold uppercase">
                      {r.name}
                    </div>
                    <div className={`text-[11px] font-jakarta mt-0.5 ${selectedRoomType === r.id ? 'text-paper/80' : 'text-skynest-accent font-semibold'}`}>
                      ${r.rate} / night
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-jakarta font-bold uppercase tracking-wider text-ink/70 block mb-2">
                2. Select Ceylonese Meal Plan
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {MEAL_PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPlanId(p.id)}
                    className={`p-3 text-left border transition-all ${
                      selectedPlanId === p.id
                        ? 'border-ink bg-ink text-paper shadow-xs'
                        : 'border-skynest-hairline bg-paper text-ink hover:border-ink/50'
                    }`}
                  >
                    <div className="font-cinzel text-xs sm:text-sm font-bold uppercase">
                      {p.name}
                    </div>
                    <div className={`text-[11px] font-jakarta mt-0.5 ${selectedPlanId === p.id ? 'text-paper/80' : 'text-skynest-accent font-semibold'}`}>
                      {p.usdRate === 0 ? 'Included' : `+$${p.usdRate}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="md:col-span-5 bg-paper border border-skynest-hairline p-6 space-y-4 shadow-xs">
            <span className="text-xs font-jakarta font-bold uppercase tracking-wider text-ink/60 pb-2 border-b border-skynest-hairline block">
              Tariff Summary &bull; Per Night
            </span>

            <div className="space-y-2 text-xs font-jakarta">
              <div className="flex justify-between items-center text-ink/80">
                <span>{currentRoom.name} Base Rate</span>
                <span className="font-bold text-ink">${currentRoom.rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-ink/80">
                <span>{currentPlan.name} ({currentPlan.code})</span>
                <span className="font-bold text-ink">
                  {currentPlan.usdRate === 0 ? 'Included' : `+$${currentPlan.usdRate.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-ink font-semibold pt-2 border-t border-skynest-hairline">
                <span>Net Subtotal (Before Taxes)</span>
                <span>${baseSubtotal.toFixed(2)}</span>
              </div>

              {/* Statutory Tax Cascade */}
              <div className="pt-2 border-t border-skynest-hairline/70 space-y-1 text-[11px] text-ink/60">
                <div className="flex justify-between items-center">
                  <span>+ Service Charge (SC 10%)</span>
                  <span>${scTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Tourism Dev Levy (TDL 1%)</span>
                  <span>${tdlTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ SSCL (2.5%)</span>
                  <span>${sscTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ VAT (18%)</span>
                  <span>${vatTax.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-skynest-hairline flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink/50 block">
                  Total Quoted Rate
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">
                  Taxes &amp; Service Included
                </span>
              </div>
              <div className="text-right">
                <span className="font-cinzel text-3xl font-normal text-skynest-accent">
                  ${grandTotal.toFixed(2)}
                </span>
                <span className="text-[10px] font-jakarta text-ink/40 block">Per Night</span>
              </div>
            </div>

            <Link
              href="/book"
              className="w-full mt-3 py-3.5 bg-ink hover:bg-skynest-accent text-paper font-jakarta text-xs font-semibold uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-2"
            >
              <span>Book This Experience</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function RatesPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // State for interactive calculator
  const [selectedRoomType, setSelectedRoomType] = useState<string>('STANDARD');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('RO');

  return (
    <div className="relative bg-paper text-ink selection:bg-skynest-accent selection:text-white font-jakarta min-h-screen">
      {/* ── Fixed Navigation with Inline Lerp ── */}
      <RatesNav />

      {/* ── 1. Cinematic Pinned Hero Section (Wordmark RATES & PLANS) ── */}
      <RatesHeroSection heroRef={heroRef} />

      {/* ── 2. Cloud Transition Scrub (Seamlessly Fading into Paper White) ── */}
      <RatesCloudTransition />

      {/* ── 3. White Header / Story Section (Integrating Clouds with Editorial Tone) ── */}
      <RatesIntroHeaderSection reducedMotion={reducedMotion} />

      {/* ── 4. 12-Tile Right Scroll Carousel (Kandy, Galle, Colombo + Side Blur) ── */}
      <RatesSanctuaryCarousel
        selectedRoomId={selectedRoomType}
        onSelectRoom={setSelectedRoomType}
      />

      {/* ── 5. Full Bleed Wide Gastronomy Parallax Banner ── */}
      <RatesGastronomyBannerSection reducedMotion={reducedMotion} />

      {/* ── 6. Curated Meal Plans Section ── */}
      <RatesMealPlansSection
        selectedPlanId={selectedPlanId}
        onSelectPlan={setSelectedPlanId}
      />

      {/* ── 7. Interactive Tariff Estimator (Sri Lanka Statutory Tax Cascade) ── */}
      <RatesTariffEstimator
        selectedRoomType={selectedRoomType}
        selectedPlanId={selectedPlanId}
        onSelectRoomType={setSelectedRoomType}
        onSelectPlanId={setSelectedPlanId}
      />

      {/* ── 8. Standard Sky Nest Footer ── */}
      <SkyNestFooter />
    </div>
  );
}
