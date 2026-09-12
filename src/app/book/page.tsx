'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShaderBackground } from '@/components/ui/adisyon-shader';

gsap.registerPlugin(ScrollTrigger);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Room {
  id: string;
  number: string;
  type: string;
  floor: number;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  description: string | null;
  branch_id: string;
  status: string;
}

interface SearchParams {
  branch_id: string;
  room_type: string;
  check_in: string;
  check_out: string;
}

// ── Static data (matches Railway DB — branch UUIDs + ENUM room types) ────────
const BRANCHES = [
  { id: '953fd827-751c-47eb-a201-e0aac4bc444a', name: 'Sky Nest Colombo' },
  { id: 'af0167cd-c9eb-4ac5-ba22-cfd65cdc87a5', name: 'Sky Nest Kandy' },
  { id: '30a7b55d-9440-45c2-a990-08821af210ba', name: 'Sky Nest Galle' },
];

const ROOM_TYPES = [
  { id: 'STANDARD',     name: 'Standard Room' },
  { id: 'DELUXE',       name: 'Deluxe Room' },
  { id: 'SUITE',        name: 'Suite' },
  { id: 'PRESIDENTIAL', name: 'Presidential Suite' },
];

// ── Mountain Glyph Emblem (Matching Landing Page) ────────────────────────────
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

// ── Page Component ─────────────────────────────────────────────────────────────
export default function BookPage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  // ── State (LOGIC) ─────────────────────────────────────────────────────────
  const [params, setParams] = useState<SearchParams>({
    branch_id: '',
    room_type: '',
    check_in: '',
    check_out: '',
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // ── Scroll Listener for Transparent Navbar ──────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── GSAP Animations (AI handles — crisp, snappy entrance) ───────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero lines rise up quickly on load
      gsap.from('.sn-hero-line', {
        yPercent: 100,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.05,
      });
      // Form card floats up promptly
      gsap.from(formRef.current, {
        y: 28,
        opacity: 0,
        duration: 0.65,
        ease: 'power3.out',
        delay: 0.18,
      });
    });
    return () => ctx.revert();
  }, []);

  // Animate room cards in rapidly when results appear
  useEffect(() => {
    if (!searched || loading || rooms.length === 0) return;
    gsap.from('.sn-room-card', {
      y: 28,
      opacity: 0,
      duration: 0.45,
      ease: 'power3.out',
      stagger: 0.06,
    });
  }, [rooms, loading, searched]);

  // ── Smooth Scroll Helper ──────────────────────────────────────────────────
  function scrollToResults() {
    setTimeout(() => {
      if (resultsRef.current) {
        if (typeof window !== 'undefined' && window.__lenis) {
          window.__lenis.scrollTo(resultsRef.current, {
            offset: -84,
            duration: 1.1,
          });
        } else {
          const y = resultsRef.current.getBoundingClientRect().top + window.pageYOffset - 84;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    }, 100);
  }

  // ── Handlers (LOGIC) ─────────────────────────────────────────────────────

  function handleChange(e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    setParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    // Validate: all fields required
    if (!params.branch_id || !params.room_type || !params.check_in || !params.check_out) {
      setError('Please fill in all fields before searching.');
      return;
    }
    // Validate: check-out must be after check-in
    if (params.check_out <= params.check_in) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    scrollToResults();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const qs = new URLSearchParams({
        branch_id: params.branch_id,
        room_type: params.room_type,
        check_in: params.check_in,
        check_out: params.check_out,
      });
      const res = await fetch(`${apiUrl}/api/v1/availability?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Something went wrong.');
      setRooms(data.data);
    } catch (err: any) {
      setError(err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  function handleBook(room: Room) {
    const qs = new URLSearchParams({
      room_id: room.id,
      room_type: params.room_type,
      branch_id: params.branch_id,
      check_in: params.check_in,
      check_out: params.check_out,
    });
    router.push(`/book/confirm?${qs}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedBranch = BRANCHES.find(b => b.id === params.branch_id);
  const selectedRoomType = ROOM_TYPES.find(r => r.id === params.room_type);
  const today = new Date().toISOString().split('T')[0];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>

      {/* ── 6-column architectural hairline grid (Matching Landing Page) ───── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex z-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 border-l border-ink/[0.04] last:border-r" />
        ))}
      </div>

      {/* ── Architectural Nav (Fully Transparent initially, Frosted Glass on scroll) ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 transition-all duration-300 ${scrolled
          ? 'border-b border-ink/[0.08] bg-[#FDFCFA]/40 shadow-[0_4px_20px_rgba(11,37,64,0.04)]'
          : 'border-b border-transparent bg-transparent'
          }`}
        style={
          scrolled
            ? {
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }
            : {
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            }
        }
      >
        {/* Brand Wordmark with Mountain Glyph */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <MountainGlyph className={`w-6 h-auto transition-colors duration-300 group-hover:scale-105 ${scrolled ? 'text-ink' : 'text-white'}`} />
          <span className={`font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase transition-colors duration-300 ${scrolled ? 'text-ink' : 'text-white'}`}>
            SKYNEST
          </span>
        </Link>

        {/* Square bordered action button */}
        <Link
          href="/"
          className={`flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.14em] uppercase border transition-all duration-200 rounded-none ${scrolled
            ? 'border-ink/20 text-ink hover:border-ink hover:bg-ink/5'
            : 'border-white/30 text-white hover:border-white hover:bg-white/10'
            }`}
        >
          ← Return to Home
        </Link>
      </nav>

      {/* ── Hero Section with Booking.jpg Background ──────────────────────── */}
      <section
        ref={heroRef}
        className="relative z-10 flex flex-col items-center justify-center px-6 pt-36 pb-36 md:pt-40 md:pb-44 text-center overflow-hidden border-b border-skynest-hairline bg-ink shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
      >
        {/* Background Image */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <img
            src="/Booking.jpg"
            alt=""
            className="w-full h-full object-cover scale-105"
            style={{
              filter: "brightness(0.74) contrast(1.05)",
              objectPosition: "center 65%",
            }}
          />
          {/* Subtle translucent Navy overlay for clarity while letting the image shine through */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(11,37,64,0.30) 0%, rgba(11,37,64,0.42) 50%, rgba(11,37,64,0.65) 100%)",
            }}
          />
          {/* Subtle radial warmth glow */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(217,114,44,0.12) 0%, transparent 75%)' }}
          />
        </div>

        {/* Hero grid overlay */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex z-[1]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-white/[0.08] last:border-r" />
          ))}
        </div>

        <div className="relative z-10 max-w-3xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          <div className="overflow-hidden mb-3">
            <span className="sn-hero-line block font-jakarta text-[11px] md:text-[12px] font-bold tracking-[0.32em] uppercase text-[#ff944d] drop-shadow-sm">
              Online Reservations
            </span>
          </div>
          <div className="overflow-hidden mb-5">
            <h1 className="sn-hero-line font-cinzel text-3xl md:text-5xl lg:text-6xl font-normal tracking-[0.04em] uppercase text-white leading-[1.1] drop-shadow-md">
              Find Your Perfect Stay
            </h1>
          </div>
          <div className="overflow-hidden">
            <p className="sn-hero-line font-cinzel italic text-white/90 text-sm md:text-base max-w-xl mx-auto leading-relaxed drop-shadow-sm">
              Experience the best of Sri Lanka across Colombo, Galle, and Kandy. Choose your destination and travel dates to check available rooms.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cards & Booking Engine Area (with Animated Shader Waves behind cards) ── */}
      <div className="relative min-h-[600px]">
        {/* WebGL Waves/Cloud Shader Canvas positioned behind all cards */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <ShaderBackground className="w-full h-full" />
          {/* Subtle luminous mist overlay so the serene clouds shine through while cards remain crisp */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFA]/50 via-transparent to-[#FDFCFA]/60 pointer-events-none" />
        </div>

        {/* ── Search Form (Crisp Square Architectural Box Overlapping Hero) ─────── */}
        <section className="relative z-20 px-6 max-w-4xl mx-auto -mt-20 md:-mt-24 mb-20">
          <form
            ref={formRef}
            onSubmit={handleSearch}
            className="rounded-none p-6 md:p-10 shadow-[0_24px_60px_rgba(11,37,64,0.12)]"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex items-center justify-between pb-6 mb-8 border-b border-skynest-hairline">
              <h2 className="font-cinzel text-lg font-medium uppercase tracking-[0.08em] text-ink">
                Check Room Availability
              </h2>
              <span className="font-jakarta text-[10px] tracking-[0.25em] uppercase text-ink/50 font-semibold">
                Best Rates Guaranteed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

              {/* Branch selector */}
              <div className="flex flex-col gap-2">
                <label className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                  Hotel Location <span className="text-skynest-accent">*</span>
                </label>
                <div className="relative">
                  <select
                    name="branch_id"
                    value={params.branch_id}
                    onChange={handleChange}
                    className="w-full appearance-none pl-4 pr-11 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200 cursor-pointer"
                  >
                    <option value="">Select a hotel location…</option>
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-ink/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Room type selector */}
              <div className="flex flex-col gap-2">
                <label className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                  Room Type <span className="text-skynest-accent">*</span>
                </label>
                <div className="relative">
                  <select
                    name="room_type"
                    value={params.room_type}
                    onChange={handleChange}
                    className="w-full appearance-none pl-4 pr-11 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200 cursor-pointer"
                  >
                    <option value="">Select room type…</option>
                    {ROOM_TYPES.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-ink/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Check-in Date */}
              <div className="flex flex-col gap-2">
                <label className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                  Check-in Date <span className="text-skynest-accent">*</span>
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={params.check_in}
                  onChange={handleChange}
                  min={today}
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                />
              </div>

              {/* Check-out Date */}
              <div className="flex flex-col gap-2">
                <label className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                  Check-out Date <span className="text-skynest-accent">*</span>
                </label>
                <input
                  type="date"
                  name="check_out"
                  value={params.check_out}
                  onChange={handleChange}
                  min={params.check_in || today}
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                />
              </div>
            </div>

            {/* Validation Error Banner (Square) */}
            {error && (
              <div className="mb-6 p-4 rounded-none border border-red-300 bg-red-50/60 text-red-700 font-jakarta text-xs flex items-center gap-2.5">
                <span className="font-bold">Notice:</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-none font-jakarta font-semibold text-xs tracking-[0.22em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent cursor-pointer"
            >
              {loading ? 'Searching Available Rooms…' : 'Search Available Rooms'}
            </button>
          </form>
        </section>

        {/* ── Results Section ───────────────────────────────────────────────── */}
        {searched && (
          <section ref={resultsRef} className="relative z-10 px-6 pb-32 max-w-4xl mx-auto scroll-mt-24">

            {/* Result Heading */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-skynest-hairline gap-2 bg-white/70 backdrop-blur-sm p-4 rounded-none">
              <div>
                <p className="font-jakarta text-[10px] tracking-[0.25em] uppercase text-skynest-accent font-bold mb-1">
                  Available Rooms
                </p>
                <h2 className="font-cinzel text-2xl md:text-3xl font-normal uppercase tracking-[0.04em] text-ink">
                  {loading
                    ? 'Checking Availability…'
                    : rooms.length > 0
                      ? `${rooms.length} Room${rooms.length > 1 ? 's' : ''} Available`
                      : 'No Rooms Available'}
                </h2>
              </div>
              {!loading && selectedBranch && selectedRoomType && (
                <p className="font-jakarta text-xs tracking-wider uppercase text-ink/60">
                  {selectedRoomType.name} · {selectedBranch.name} · {params.check_in} → {params.check_out}
                </p>
              )}
            </div>

            {/* Loading skeletons (Square) */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-40 rounded-none bg-white/80 animate-pulse shadow-[0_4px_16px_rgba(11,37,64,0.04)]" />
                ))}
              </div>
            )}

            {/* Available Room Cards (Square, Architectural) */}
            {!loading && rooms.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {rooms.map(room => (
                  <div
                    key={room.id}
                    className="sn-room-card rounded-none p-6 md:p-8 flex items-center justify-between bg-white shadow-[0_10px_30px_rgba(11,37,64,0.07)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(217,114,44,0.14)] group"
                  >
                    <div>
                      <span className="inline-block font-jakarta text-[10px] font-bold tracking-[0.24em] uppercase text-skynest-accent mb-1.5">
                        {selectedRoomType?.name ?? 'Standard Room'}
                      </span>
                      <h3 className="font-cinzel text-2xl font-normal uppercase tracking-[0.03em] text-ink">
                        Room {room.number}
                      </h3>
                      <p className="font-jakarta text-xs text-ink/50 mt-1 tracking-wider uppercase">
                        Floor {room.floor} · {selectedBranch?.name} · LKR {Number(room.price_per_night).toLocaleString()}/night
                      </p>
                    </div>

                    {/* Sharp Square Book Button */}
                    <button
                      onClick={() => handleBook(room)}
                      className="ml-4 flex-shrink-0 px-6 py-3 rounded-none font-jakarta font-semibold text-xs tracking-[0.16em] uppercase border border-ink text-ink bg-transparent hover:bg-skynest-accent hover:border-skynest-accent hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      Book Now
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state (Square, Editorial) */}
            {!loading && searched && rooms.length === 0 && !error && (
              <div className="text-center py-20 bg-white p-10 rounded-none shadow-[0_16px_40px_rgba(11,37,64,0.06)]">
                <MountainGlyph className="w-10 h-auto mx-auto mb-4 text-ink/20" />
                <h3 className="font-cinzel text-xl uppercase tracking-[0.06em] text-ink mb-2">
                  No Rooms Available for These Dates
                </h3>
                <p className="font-jakarta text-xs tracking-wider uppercase text-ink/50 max-w-md mx-auto leading-relaxed">
                  We couldn&apos;t find available rooms for your chosen dates. Please try different dates, another room category, or another Sky Nest location.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
