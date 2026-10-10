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
          <ChevronDown className="w-3.5 h-3.5 text-skynest-accent animate-bounce" />
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
  const wrapWispsRef = useRef<HTMLDivElement>(null);
  const wrap1Ref = useRef<HTMLDivElement>(null);
  const wrap2Ref = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.set([wrapWispsRef.current, wrap1Ref.current, wrap2Ref.current], { autoAlpha: 0 });
    gsap.set(wrapWispsRef.current, { y: '16%', x: '-2.5%' });
    gsap.set(wrap1Ref.current, { y: '12%', x: '1%' });
    gsap.set(wrap2Ref.current, { y: '20%', x: '-1%' });
    if (fogRef.current) gsap.set(fogRef.current, { opacity: 0.15 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1.0,
        },
        defaults: {
          ease: 'none',
          force3D: true,
        },
      });

      if (wrapWispsRef.current) {
        tl.to(wrapWispsRef.current, { y: '-6%', x: '3%', autoAlpha: 0.8 }, 0);
      }
      if (wrap1Ref.current) {
        tl.to(wrap1Ref.current, { y: '0%', x: '-1.5%', autoAlpha: 1 }, 0);
      }
      if (wrap2Ref.current) {
        tl.to(wrap2Ref.current, { y: '0%', x: '1.5%', autoAlpha: 1 }, 0.08);
      }
      if (fogRef.current) {
        tl.to(fogRef.current, { opacity: 1 }, 0.04);
      }
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative z-10 h-[50dvh] sm:h-[60dvh] md:h-[72dvh] pointer-events-none overflow-hidden select-none"
    >
      {/* High-Altitude Wisps Layer */}
      <div
        ref={wrapWispsRef}
        className="absolute bottom-10 sm:bottom-16 left-1/2 overflow-hidden pointer-events-none"
        style={{
          width: '240%',
          height: '85%',
          marginLeft: '-120%',
          willChange: 'transform, opacity',
        }}
      >
        <img
          src="/clouds/cloud_wisps.webp"
          alt=""
          className="w-full h-full object-cover object-bottom select-none pointer-events-none opacity-80"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.75) 55%, black 80%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.75) 55%, black 80%)',
          }}
        />
      </div>

      {/* Layer 1 — Base Clouds */}
      <div
        ref={wrap1Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden pointer-events-none"
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
          className="w-full h-full object-cover object-bottom select-none pointer-events-none"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.7) 38%, black 58%)',
          }}
        />
      </div>

      {/* Layer 2 — Denser Clouds */}
      <div
        ref={wrap2Ref}
        className="absolute bottom-0 left-1/2 overflow-hidden pointer-events-none"
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
          className="w-full h-full object-cover object-bottom select-none pointer-events-none"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 22%, rgba(0,0,0,0.9) 48%, black 65%)',
          }}
        />
      </div>

      {/* Layer 3 — Dense white fog blending into #FDFCFA */}
      <div
        ref={fogRef}
        className="absolute inset-x-0 bottom-0 h-[60%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(253,252,250,0.3) 20%, rgba(253,252,250,0.7) 45%, rgba(253,252,250,0.95) 75%, #FDFCFA 100%)',
          willChange: 'opacity',
        }}
      />
    </div>
  );
}

// ── Main Rates Page Component ─────────────────────────────────────────────────

export default function RatesPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // State
  const [currency, setCurrency] = useState<'USD' | 'LKR'>('USD');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('DELUXE');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('HB');

  // Currency Converter helper
  const formatPrice = (usd: number) => {
    if (currency === 'USD') {
      return `$${usd.toLocaleString()}`;
    }
    const lkr = Math.round(usd * USD_TO_LKR);
    return `LKR ${lkr.toLocaleString()}`;
  };

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    if (selectedBranch === 'ALL') return ROOM_TIERS;
    return ROOM_TIERS.filter((r) => r.properties.includes(selectedBranch));
  }, [selectedBranch]);

  // Selected Room & Meal Plan for Estimator
  const currentRoom = ROOM_TIERS.find((r) => r.id === selectedRoomId) || ROOM_TIERS[1];
  const currentPlan = MEAL_PLANS.find((p) => p.id === selectedPlanId) || MEAL_PLANS[2];

  const subtotalUsd = currentRoom.usdRate + currentPlan.usdRate;
  // Sri Lankan Tax Cascade (Rule B13: 10% SC, 1% TDL, 2.5% SSCL, 18% VAT)
  const serviceChargeUsd = subtotalUsd * 0.10;
  const tdlUsd = (subtotalUsd + serviceChargeUsd) * 0.01;
  const ssclUsd = (subtotalUsd + serviceChargeUsd + tdlUsd) * 0.025;
  const vatUsd = (subtotalUsd + serviceChargeUsd + tdlUsd + ssclUsd) * 0.18;
  const totalWithTaxesUsd = subtotalUsd + serviceChargeUsd + tdlUsd + ssclUsd + vatUsd;

  // Staggered reveal for cards
  useEffect(() => {
    if (reducedMotion || !contentRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = contentRef.current?.querySelectorAll('[data-reveal]');
      if (!cards || cards.length === 0) return;

      gsap.fromTo(
        cards,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
          },
        }
      );
    }, contentRef);

    return () => ctx.revert();
  }, [reducedMotion, selectedBranch]);

  return (
    <div className="relative bg-paper text-ink selection:bg-skynest-accent selection:text-white font-jakarta">
      {/* ── Fixed Navigation Bar ── */}
      <RatesNav />

      {/* ── 1. CINEMATIC PINNED HERO SECTION ── */}
      <RatesHeroSection heroRef={heroRef} />

      {/* ── 2. MYSTIC CLOUD TRANSITION ── */}
      <RatesCloudTransition />

      {/* ── 3. MAIN RATES & MEAL PLANS CONTENT ── */}
      <div
        id="rates-content"
        ref={contentRef}
        className="relative z-20 bg-paper min-h-screen pt-4 sm:pt-8 pb-32"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">

          {/* Section Introduction */}
          <div className="text-center space-y-3 pt-6" data-reveal>
            <MountainGlyph className="w-6 h-auto text-skynest-accent mx-auto" />
            <span className="font-jakarta text-[11px] font-semibold tracking-[0.2em] text-ink/50 uppercase block">
              Transparent Sanctuary Tariffs
            </span>
            <h1 className="font-cinzel text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[0.06em] text-ink uppercase">
              Sanctuary Rooms &amp; Nightly Rates
            </h1>
            <p className="font-jakarta text-xs sm:text-sm text-ink/70 max-w-2xl mx-auto leading-relaxed">
              Every room and suite at Sky Nest is sculpted around uncompromised spaciousness, bespoke personalized service, and architectural stillness across our three island destinations.
            </p>
          </div>

          {/* ── Control Bar: Property Filter + Currency Toggle ── */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-skynest-hairline shadow-sm"
            data-reveal
          >
            {/* Property Filter */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50 mr-2">
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
                  className={`px-3 py-1.5 text-xs font-jakarta transition-colors border ${
                    selectedBranch === prop.id
                      ? 'bg-ink text-white border-ink font-semibold'
                      : 'bg-white text-ink/70 border-skynest-hairline hover:border-ink'
                  }`}
                >
                  {prop.label}
                </button>
              ))}
            </div>

            {/* Currency Toggle */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                Currency:
              </span>
              <div className="flex border border-skynest-hairline bg-stone-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    currency === 'USD' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('LKR')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    currency === 'LKR' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  LKR (Rs)
                </button>
              </div>
            </div>
          </div>

          {/* ── 01 · Hotel Rooms Grid ── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-skynest-hairline pb-3" data-reveal>
              <div>
                <span className="font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-skynest-accent">
                  01 &mdash; Accommodations
                </span>
                <h2 className="font-cinzel text-2xl font-bold text-ink uppercase">Room &amp; Suite Collections</h2>
              </div>
              <span className="text-xs text-ink/50 font-jakarta">Nightly Base Rates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  data-reveal
                  className="group bg-white border border-skynest-hairline overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image with Tag */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className="px-3 py-1 bg-ink/75 backdrop-blur-md text-white font-jakarta text-[10px] uppercase tracking-widest font-semibold border border-white/15">
                        {room.properties.join(' · ')}
                      </span>
                      <span className="px-2.5 py-1 bg-skynest-accent text-white font-cinzel text-xs font-bold tracking-wider">
                        {formatPrice(room.usdRate)} / NIGHT
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-cinzel text-2xl font-bold text-white tracking-wide">{room.name}</h3>
                      <p className="font-jakarta text-xs text-white/80 line-clamp-1 mt-0.5">{room.tagline}</p>
                    </div>
                  </div>

                  {/* Specs & Highlights */}
                  <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                    {/* Dimension / Capacity badges */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-skynest-hairline text-center text-xs font-jakarta">
                      <div>
                        <div className="text-ink/40 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
                          <Users className="w-3 h-3" /> Guests
                        </div>
                        <div className="font-semibold text-ink mt-0.5">Up to {room.capacity}</div>
                      </div>
                      <div className="border-x border-skynest-hairline">
                        <div className="text-ink/40 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
                          <Maximize2 className="w-3 h-3" /> Area
                        </div>
                        <div className="font-semibold text-ink mt-0.5">{room.sizeM2} m² / {room.sizeSqFt} ft²</div>
                      </div>
                      <div>
                        <div className="text-ink/40 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
                          <BedDouble className="w-3 h-3" /> Bed
                        </div>
                        <div className="font-semibold text-ink mt-0.5">King / Twin</div>
                      </div>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-ink/50 block">
                        Signature Sanctuary Amenities:
                      </span>
                      <ul className="space-y-1.5 text-xs text-ink/75">
                        {room.highlights.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-skynest-accent shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Book Button */}
                    <div className="pt-4 border-t border-skynest-hairline flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-jakarta uppercase tracking-wider text-ink/40">From</div>
                        <div className="font-cinzel text-xl font-bold text-ink">
                          {formatPrice(room.usdRate)}{' '}
                          <span className="text-xs font-sans font-normal text-ink/50">/ night</span>
                        </div>
                      </div>

                      <Link
                        href={`/book`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-skynest-accent text-white font-jakarta text-xs font-semibold uppercase tracking-[0.15em] transition-colors"
                      >
                        <span>Reserve Suite</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 02 · Ceylonese Gastronomy & Meal Plans ── */}
          <div className="space-y-10 pt-8" data-reveal>
            <div className="flex items-center justify-between border-b border-skynest-hairline pb-3">
              <div>
                <span className="font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-skynest-accent">
                  02 &mdash; Epicurean Journeys
                </span>
                <h2 className="font-cinzel text-2xl font-bold text-ink uppercase">Ceylonese Gastronomy &amp; Meal Plans</h2>
              </div>
              <span className="text-xs text-ink/50 font-jakarta">Culinary Tiers</span>
            </div>

            {/* Editorial Showcase with PR #84 Gastronomy Photo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-skynest-hairline p-6 lg:p-8 shadow-sm">
              <div className="lg:col-span-5 relative overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] shadow-md group">
                <img
                  src="/pillar_gastronomy.jpg"
                  alt="Refined candlelit open-air dining with Ceylon silver teapot and infused tropical spice cuisine"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(11,37,64,0.85) 0%, rgba(11,37,64,0.2) 60%, transparent 100%)',
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-jakarta tracking-[0.2em] uppercase text-amber-300 font-semibold block">
                    Living Heritage &bull; Ceylonese Flavours
                  </span>
                  <div className="font-cinzel text-lg font-bold">The Art of Island Tablecraft</div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <span className="font-cinzel text-sm italic text-skynest-accent block">
                  &ldquo;Ancient spice routes distilled into modern culinary poetry.&rdquo;
                </span>
                <h3 className="font-cinzel text-2xl font-bold text-ink">
                  A Dining Experience Rooted in Island Abundance
                </h3>
                <p className="font-jakarta text-xs sm:text-sm text-ink/75 leading-relaxed">
                  Every Sky Nest sanctuary celebrates Sri Lanka&apos;s rich agricultural tapestry. From coastal cinnamon-infused lagoon prawns to highland silver-tip tea tastings and fragrant coconut sambols prepared before you, our meal tiers are designed to seamlessly weave gourmet excellence into your itinerary.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-jakarta">
                  <div className="border border-skynest-hairline p-2.5 bg-paper">
                    <Coffee className="w-4 h-4 text-skynest-accent mb-1" />
                    <div className="font-semibold text-ink">Single-Estate Teas</div>
                    <div className="text-[11px] text-ink/50">Hand-plucked Ceylon</div>
                  </div>
                  <div className="border border-skynest-hairline p-2.5 bg-paper">
                    <Wine className="w-4 h-4 text-skynest-accent mb-1" />
                    <div className="font-semibold text-ink">Curated Cellar</div>
                    <div className="text-[11px] text-ink/50">Global pairings</div>
                  </div>
                  <div className="border border-skynest-hairline p-2.5 bg-paper col-span-2 sm:col-span-1">
                    <Utensils className="w-4 h-4 text-skynest-accent mb-1" />
                    <div className="font-semibold text-ink">Farm &amp; Ocean-to-Table</div>
                    <div className="text-[11px] text-ink/50">Day-boat catches</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meal Plan Tiers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {MEAL_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white border border-skynest-hairline p-6 flex flex-col justify-between hover:border-ink/50 transition-colors shadow-sm"
                >
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-skynest-accent font-semibold block">
                        {plan.code}
                      </span>
                      <h4 className="font-cinzel text-xl font-bold text-ink mt-1">{plan.name}</h4>
                      <p className="font-jakarta text-xs text-ink/65 mt-1 leading-relaxed">{plan.tagline}</p>
                    </div>

                    <div className="py-3 border-y border-skynest-hairline">
                      <div className="font-cinzel text-2xl font-bold text-ink">
                        {plan.usdRate === 0 ? 'Included' : `+${formatPrice(plan.usdRate)}`}
                      </div>
                      <div className="text-[10px] font-jakarta text-ink/50 uppercase tracking-wider mt-0.5">
                        {plan.usdRate === 0 ? 'Base stay inclusion' : 'Per guest / night'}
                      </div>
                    </div>

                    {/* Meal Inclusions */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-ink/50 block">
                        Included Courses:
                      </span>
                      <ul className="space-y-1.5 text-xs font-jakarta">
                        {plan.inclusions.map((inc, i) => (
                          <li
                            key={i}
                            className={`flex items-center gap-2 ${
                              inc.active ? 'text-ink font-medium' : 'text-ink/35 line-through'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${inc.active ? 'bg-skynest-accent' : 'bg-stone-300'}`} />
                            <span>{inc.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-skynest-hairline">
                    <span className="text-[10px] text-skynest-accent font-semibold tracking-wider uppercase block mb-3">
                      &bull; {plan.highlight}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full py-2 text-xs font-jakarta font-semibold uppercase tracking-wider border transition-colors ${
                        selectedPlanId === plan.id
                          ? 'bg-ink text-white border-ink'
                          : 'bg-white text-ink/80 border-skynest-hairline hover:border-ink'
                      }`}
                    >
                      {selectedPlanId === plan.id ? 'Selected in Estimator' : 'Select Plan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 03 · Interactive Nightly Rate Estimator ── */}
          <div className="bg-white border border-skynest-hairline p-6 lg:p-8 space-y-6 shadow-sm" data-reveal>
            <div className="border-b border-skynest-hairline pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-jakarta text-[11px] font-bold tracking-[0.2em] uppercase text-skynest-accent">
                  Interactive Tariff Calculator
                </span>
                <h3 className="font-cinzel text-xl font-bold text-ink uppercase">
                  Nightly Sanctuary Tariff Breakdown
                </h3>
              </div>
              <span className="text-xs font-jakarta text-ink/60">
                Rule B13 &bull; Versioned Statutory Sri Lankan Taxes
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Selectors Column */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <label className="text-xs font-jakarta font-semibold uppercase tracking-wider text-ink/60 block mb-2">
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
                            ? 'border-skynest-accent bg-amber-50/40 shadow-sm ring-1 ring-skynest-accent'
                            : 'border-skynest-hairline bg-white hover:border-ink/40'
                        }`}
                      >
                        <div className="font-cinzel text-sm font-bold text-ink">{r.name}</div>
                        <div className="text-xs font-jakarta text-skynest-accent font-semibold mt-0.5">
                          {formatPrice(r.usdRate)} / night
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-jakarta font-semibold uppercase tracking-wider text-ink/60 block mb-2">
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
                            ? 'border-skynest-accent bg-amber-50/40 shadow-sm ring-1 ring-skynest-accent'
                            : 'border-skynest-hairline bg-white hover:border-ink/40'
                        }`}
                      >
                        <div className="font-cinzel text-sm font-bold text-ink">{p.name}</div>
                        <div className="text-xs font-jakarta text-skynest-accent font-semibold mt-0.5">
                          {p.usdRate === 0 ? 'Included' : `+${formatPrice(p.usdRate)}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimate Breakdown Column */}
              <div className="lg:col-span-5 bg-paper/80 border border-skynest-hairline p-6 space-y-4">
                <div className="text-xs font-jakarta font-semibold uppercase tracking-wider text-ink/60 pb-2 border-b border-skynest-hairline">
                  Tariff Summary &bull; Per Night
                </div>

                <div className="space-y-2 text-xs font-jakarta">
                  <div className="flex items-center justify-between text-ink/80">
                    <span>{currentRoom.name} Base Rate</span>
                    <span className="font-semibold text-ink">{formatPrice(currentRoom.usdRate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-ink/80">
                    <span>{currentPlan.name} ({currentPlan.code})</span>
                    <span className="font-semibold text-ink">
                      {currentPlan.usdRate === 0 ? 'Included' : `+${formatPrice(currentPlan.usdRate)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-ink/60 pt-2 border-t border-skynest-hairline">
                    <span>Subtotal Before Taxes</span>
                    <span className="font-semibold text-ink">{formatPrice(subtotalUsd)}</span>
                  </div>

                  {/* Statutory Taxes */}
                  <div className="pt-2 border-t border-skynest-hairline/80 space-y-1 text-[11px] text-ink/60">
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
                <div className="pt-3 border-t border-skynest-hairline flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-ink/50">Total Quoted Rate</div>
                    <div className="text-[10px] text-emerald-700">Taxes &amp; Service Included</div>
                  </div>
                  <div className="text-right">
                    <div className="font-cinzel text-2xl font-bold text-skynest-accent">
                      {formatPrice(Math.round(totalWithTaxesUsd))}
                    </div>
                    <div className="text-[10px] text-ink/50">Per Night &bull; Standard Occupancy</div>
                  </div>
                </div>

                <Link
                  href="/book"
                  className="w-full mt-2 py-3 bg-ink hover:bg-skynest-accent text-white font-jakarta text-xs font-semibold uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-2"
                >
                  <span>Book This Experience</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── 04 · Transparent Sri Lankan Tax Cascade Editorial ── */}
          <div className="border border-skynest-hairline bg-white p-6 sm:p-8 space-y-4" data-reveal>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-skynest-accent" />
              <h4 className="font-cinzel text-lg font-bold text-ink">
                Our Guarantee of Transparent Hospitality
              </h4>
            </div>
            <p className="font-jakarta text-xs sm:text-sm text-ink/75 leading-relaxed">
              At Sky Nest, we operate strictly in compliance with Inland Revenue Department regulations of Sri Lanka. All room folios and invoices clearly separate statutory obligations ($SC ightarrow TDL ightarrow SSCL ightarrow VAT$). Guests never encounter surprise fees upon checkout.
            </p>
          </div>

        </div>
      </div>

      {/* ── Standard Sky Nest Footer ── */}
      <SkyNestFooter />
    </div>
  );
}
