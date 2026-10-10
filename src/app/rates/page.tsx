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
  ChevronRight,
  ChevronDown,
  Sparkles,
  Utensils,
  Coffee,
  Wine,
  Sun,
  Moon,
  Clock,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import SkyNestFooter from '@/components/marketing/SkyNestFooter';

// ── Motion Guard ──────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ── Mountain Glyph ────────────────────────────────────────────────────────────

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
      'Private chef\'s dining room for bespoke degustations',
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
        className="fixed top-0 left-0 right-0 z-50 bg-ink/90 backdrop-blur-md border-b border-white/10 transition-colors duration-300"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-14 md:h-16 px-4 sm:px-6 md:px-8">
          {/* Left links */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/rates"
              className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase border border-skynest-accent bg-skynest-accent/15 text-white transition-colors duration-200"
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
              className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-semibold tracking-[0.12em] uppercase border border-skynest-accent bg-skynest-accent text-white hover:bg-skynest-accent/90 transition-colors duration-200"
            >
              Book Now
            </Link>
            {user ? (
              <Link
                href={user.role === 'GUEST' ? '/dashboard/activity' : '/dashboard'}
                className="flex items-center px-4 py-2 text-[11px] font-jakarta font-medium tracking-[0.12em] uppercase text-amber-400 border border-amber-500/30 hover:border-amber-400 bg-amber-500/10 transition-colors"
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
            className="font-jakarta text-2xl font-semibold text-skynest-accent tracking-wider uppercase"
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
                className="font-jakarta text-lg text-amber-400 font-semibold"
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

// ── Hero Section (Pinned with Parallax & Wordmark) ────────────────────────────


function RatesHeroSection({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={heroRef} className="pt-32 pb-16 text-center bg-ink text-white">
      <h1 className="font-cinzel text-4xl tracking-widest">RATES & TARIFFS</h1>
    </div>
  );
}

function RatesCloudTransition() {
  return <div className="h-16 bg-gradient-to-b from-ink to-paper" />;
}

export default function RatesPage() {
  return (
    <div className="relative bg-paper text-ink selection:bg-skynest-accent selection:text-white font-jakarta min-h-screen">
      <RatesNav />
      <RatesHeroSection heroRef={{ current: null }} />
      <RatesCloudTransition />
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <p className="text-ink/60">Sky Nest curated room tiers and meal plans.</p>
      </div>
    </div>
  );
}
