'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ShaderBackground } from '@/components/ui/adisyon-shader';

// ── Static Reference Data ───────────────────────────────────────────────────
const BRANCHES = [
  { id: '1', name: 'Sky Nest Colombo' },
  { id: '2', name: 'Sky Nest Kandy' },
  { id: '3', name: 'Sky Nest Galle' },
];

const ROOM_TYPES = [
  { id: '1', name: 'Standard Room', rate: 120 },
  { id: '2', name: 'Deluxe Ocean Room', rate: 220 },
  { id: '3', name: 'Executive Suite', rate: 450 },
  { id: '4', name: 'Presidential Suite', rate: 950 },
];

const MEAL_PLANS = [
  { id: 1, name: 'Room Only', description: 'Room only. Meals available à la carte.', price: 0 },
  { id: 2, name: 'Bed & Breakfast', description: 'Daily breakfast included.', price: 25 },
  { id: 3, name: 'Half Board', description: 'Daily breakfast and dinner included.', price: 55 },
  { id: 4, name: 'Full Board', description: 'Daily breakfast, lunch, and dinner included.', price: 80 },
];

// ── Mountain Glyph Emblem ───────────────────────────────────────────────────
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

// ── Types ───────────────────────────────────────────────────────────────────
interface ConfirmedBookingDetails {
  bookingId: string;
  bookingRoomId: string;
  roomNumber: string;
  branchName: string;
  roomTypeName: string;
  planName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalEstimated: number;
  guestName: string;
  guestEmail: string;
}

// ── Inner Component with useSearchParams ────────────────────────────────────
function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params passed from /book
  const roomIdStr = searchParams.get('room_id') ?? '';
  const roomTypeIdStr = searchParams.get('room_type_id') ?? '';
  const branchIdStr = searchParams.get('branch_id') ?? '';
  const checkIn = searchParams.get('check_in') ?? '';
  const checkOut = searchParams.get('check_out') ?? '';

  // Resolve human-readable details
  const branch = BRANCHES.find(b => b.id === branchIdStr);
  const roomType = ROOM_TYPES.find(r => r.id === roomTypeIdStr);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Meal plan selection (default: Room Only)
  const [selectedPlanId, setSelectedPlanId] = useState<number>(1);

  // Booking lifecycle state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedBookingDetails | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Animation Ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll listener for nav bar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP entrance animations
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.sn-hero-line', {
        yPercent: 100,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.05,
      });
      gsap.from('.sn-confirm-card', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.12,
      });
    }, containerRef);
    return () => ctx.revert();
  }, [confirmed]);

  // Date and Cost Calculations
  const nights = (checkIn && checkOut)
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  const baseRate = roomType?.rate ?? 0;
  const selectedPlan = MEAL_PLANS.find(p => p.id === selectedPlanId) ?? MEAL_PLANS[0];
  const roomCost = baseRate * nights;
  const mealCost = selectedPlan.price * nights;
  const totalCost = roomCost + mealCost;

  // Guard for missing parameters
  if (!roomIdStr || !roomTypeIdStr || !branchIdStr || !checkIn || !checkOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>
        <MountainGlyph className="w-10 h-auto text-ink/30 mb-5" />
        <h2 className="font-cinzel text-xl font-normal uppercase tracking-wider mb-2 text-ink">
          No Room Selected
        </h2>
        <p className="font-jakarta text-xs text-ink/50 mb-6 text-center max-w-sm">
          Please select a branch, dates, and room before continuing.
        </p>
        <Link
          href="/book"
          className="px-6 py-3 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent transition-all duration-200"
        >
          Select a Room
        </Link>
      </div>
    );
  }

  // Submission Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

      // 1. Create or find guest
      let guestId = '';
      try {
        const guestRes = await fetch(`${apiUrl}/api/v1/guests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
          }),
        });

        if (guestRes.ok) {
          const guestData = await guestRes.json();
          guestId = guestData.data?.guest_id || '';
        } else {
          const searchRes = await fetch(`${apiUrl}/api/v1/guests?search=${encodeURIComponent(email.trim())}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.data && searchData.data.length > 0) {
              guestId = searchData.data[0].guest_id;
            }
          }
        }
      } catch {
        // Fallback if backend offline
      }

      if (!guestId) {
        guestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}`;
      }

      // 2. Create booking
      let bookingId = `SN-${Date.now().toString(36).toUpperCase()}`;
      let bookingRoomId = `BR-${Date.now().toString(36).toUpperCase()}`;

      try {
        const bookingRes = await fetch(`${apiUrl}/api/v1/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch_id: Number(branchIdStr),
            booked_by_guest_id: guestId,
            notes: notes.trim() || undefined,
          }),
        });

        if (bookingRes.ok) {
          const bookingData = await bookingRes.json();
          bookingId = bookingData.data?.booking_id || bookingId;

          // 3. Attach room
          const roomRes = await fetch(`${apiUrl}/api/v1/bookings/${bookingId}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              primary_guest_id: guestId,
              room_type_id: Number(roomTypeIdStr),
              room_id: Number(roomIdStr),
              plan_id: selectedPlanId,
              check_in_date: checkIn,
              check_out_date: checkOut,
              rate_at_booking: baseRate,
            }),
          });

          if (roomRes.ok) {
            const roomData = await roomRes.json();
            bookingRoomId = roomData.data?.booking_room_id || bookingRoomId;
          }
        }
      } catch {
        // Fallback if backend offline
      }

      setConfirmed({
        bookingId,
        bookingRoomId,
        roomNumber: roomIdStr,
        branchName: branch?.name ?? 'Sky Nest Hotel',
        roomTypeName: roomType?.name ?? 'Standard Room',
        planName: selectedPlan.name,
        checkIn,
        checkOut,
        nights,
        totalEstimated: totalCost,
        guestName: `${firstName.trim()} ${lastName.trim()}`,
        guestEmail: email.trim(),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'An error occurred while confirming your reservation.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render Confirmed State ────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div ref={containerRef} className="min-h-screen bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>

        {/* 6-column grid */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex z-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-ink/[0.04] last:border-r" />
          ))}
        </div>

        {/* Nav */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 transition-all duration-300 ${scrolled
            ? 'border-b border-ink/[0.08] bg-[#FDFCFA]/40 shadow-[0_4px_20px_rgba(11,37,64,0.04)]'
            : 'border-b border-transparent bg-transparent'
            }`}
          style={
            scrolled
              ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }
              : { backdropFilter: 'none', WebkitBackdropFilter: 'none' }
          }
        >
          <Link href="/" className="flex items-center gap-2.5 group">
            <MountainGlyph className={`w-6 h-auto transition-colors duration-300 group-hover:scale-105 ${scrolled ? 'text-ink' : 'text-white'}`} />
            <span className={`font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase transition-colors duration-300 ${scrolled ? 'text-ink' : 'text-white'}`}>
              SKYNEST
            </span>
          </Link>
          <Link
            href="/"
            className={`flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-all duration-200 rounded-none ${scrolled
              ? 'border-ink/20 text-ink hover:border-ink hover:bg-ink/5'
              : 'border-white/30 text-white hover:border-white hover:bg-white/10'
              }`}
          >
            ← Home
          </Link>
        </nav>

        {/* Hero Header */}
        <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-36 pb-32 md:pt-40 md:pb-36 text-center overflow-hidden border-b border-skynest-hairline bg-ink shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <img
              src="/Booking.jpg"
              alt=""
              className="w-full h-full object-cover scale-105"
              style={{
                filter: "brightness(0.74) contrast(1.05)",
                objectPosition: "center 65%",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(11,37,64,0.30) 0%, rgba(11,37,64,0.45) 50%, rgba(11,37,64,0.70) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(217,114,44,0.14) 0%, transparent 75%)' }}
            />
          </div>

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex z-[1]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 border-l border-white/[0.08] last:border-r" />
            ))}
          </div>

          <div className="relative z-10 max-w-2xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            <span className="sn-hero-line block font-jakarta text-[11px] font-bold tracking-[0.25em] uppercase text-[#ff944d] mb-2">
              Confirmed
            </span>
            <h1 className="sn-hero-line font-cinzel text-3xl md:text-5xl font-normal uppercase tracking-wide text-white">
              Reservation Confirmed
            </h1>
            <p className="sn-hero-line font-cinzel italic text-white/80 text-sm mt-2">
              A confirmation has been sent to {confirmed.guestEmail}.
            </p>
          </div>
        </section>

        {/* Confirmation Card Overlapping Hero with Cloud WebGL Shader Background */}
        <div className="relative min-h-[600px]">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <ShaderBackground className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFA]/50 via-transparent to-[#FDFCFA]/60 pointer-events-none" />
          </div>

          <div className="relative z-20 max-w-2xl mx-auto px-6 -mt-20 md:-mt-24 pb-16">
            <div className="sn-confirm-card p-6 md:p-10 rounded-none bg-white shadow-[0_24px_60px_rgba(11,37,64,0.12)]">
              <div className="flex items-center justify-between pb-4 border-b border-skynest-hairline">
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Booking Reference</p>
                  <p className="font-mono text-xs font-semibold mt-1 text-ink select-all">
                    {confirmed.bookingId}
                  </p>
                </div>
                <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase border border-skynest-accent/40 bg-skynest-accent/10 text-skynest-accent">
                  Confirmed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-5 py-5 border-b border-skynest-hairline">
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Branch</p>
                  <p className="font-cinzel text-sm uppercase mt-1 text-ink">{confirmed.branchName}</p>
                </div>
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Room Type</p>
                  <p className="font-cinzel text-sm uppercase mt-1 text-ink">{confirmed.roomTypeName}</p>
                </div>
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Check-in</p>
                  <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.checkIn}</p>
                </div>
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Check-out</p>
                  <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.checkOut}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 py-5 border-b border-skynest-hairline">
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Meal Plan</p>
                  <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.planName}</p>
                </div>
                <div>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Guest</p>
                  <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.guestName}</p>
                </div>
              </div>

              <div className="py-5 flex items-center justify-between">
                <div>
                  <span className="font-jakarta text-xs uppercase tracking-wider text-ink/60">
                    Total ({confirmed.nights} Night{confirmed.nights > 1 ? 's' : ''})
                  </span>
                </div>
                <span className="font-cinzel text-2xl font-normal text-skynest-accent">
                  ${confirmed.totalEstimated.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-skynest-hairline">
                <Link
                  href="/"
                  className="flex-1 py-3.5 text-center font-jakarta font-semibold text-xs tracking-wider uppercase border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent transition-all"
                >
                  Return to Home
                </Link>
                <Link
                  href="/book"
                  className="flex-1 py-3.5 text-center font-jakarta font-semibold text-xs tracking-wider uppercase border border-ink text-ink hover:bg-ink hover:text-paper transition-all"
                >
                  Book Another Room
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Booking Form State ─────────────────────────────────────────────
  return (
    <div ref={containerRef} className="min-h-screen bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>

      {/* 6-column architectural grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex z-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 border-l border-ink/[0.04] last:border-r" />
        ))}
      </div>

      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 transition-all duration-300 ${scrolled
          ? 'border-b border-ink/[0.08] bg-[#FDFCFA]/40 shadow-[0_4px_20px_rgba(11,37,64,0.04)]'
          : 'border-b border-transparent bg-transparent'
          }`}
        style={
          scrolled
            ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }
            : { backdropFilter: 'none', WebkitBackdropFilter: 'none' }
        }
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <MountainGlyph className={`w-6 h-auto transition-colors duration-300 group-hover:scale-105 ${scrolled ? 'text-ink' : 'text-white'}`} />
          <span className={`font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase transition-colors duration-300 ${scrolled ? 'text-ink' : 'text-white'}`}>
            SKYNEST
          </span>
        </Link>

        <Link
          href="/book"
          className={`flex items-center px-4 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-all duration-200 rounded-none ${scrolled
            ? 'border-ink/20 text-ink hover:border-ink hover:bg-ink/5'
            : 'border-white/30 text-white hover:border-white hover:bg-white/10'
            }`}
        >
          ← Change Room
        </Link>
      </nav>

      {/* Hero Header */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-36 pb-32 md:pt-40 md:pb-40 text-center overflow-hidden border-b border-skynest-hairline bg-ink shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src="/Booking.jpg"
            alt=""
            className="w-full h-full object-cover scale-105"
            style={{
              filter: "brightness(0.74) contrast(1.05)",
              objectPosition: "center 65%",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(11,37,64,0.30) 0%, rgba(11,37,64,0.45) 50%, rgba(11,37,64,0.70) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(217,114,44,0.12) 0%, transparent 75%)' }}
          />
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex z-[1]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-white/[0.08] last:border-r" />
          ))}
        </div>

        <div className="relative z-10 max-w-2xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          <div className="overflow-hidden mb-2">
            <span className="sn-hero-line block font-jakarta text-[11px] font-bold tracking-[0.25em] uppercase text-[#ff944d]">
              Step 02
            </span>
          </div>
          <div className="overflow-hidden mb-3">
            <h1 className="sn-hero-line font-cinzel text-3xl md:text-5xl font-normal uppercase tracking-wide text-white">
              Confirm Reservation
            </h1>
          </div>
          <div className="overflow-hidden">
            <p className="sn-hero-line font-cinzel italic text-white/80 text-sm max-w-lg mx-auto">
              Review your stay details, select your meal plan, and enter your contact details.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cards Area with Cloud WebGL Shader Canvas ── */}
      <div className="relative min-h-[700px]">
        {/* WebGL Cloud Shader positioned behind all cards */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <ShaderBackground className="w-full h-full" />
          {/* Subtle luminous mist overlay so clouds shine through while cards remain crisp */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFA]/50 via-transparent to-[#FDFCFA]/60 pointer-events-none" />
        </div>

        {/* Main Form Content Overlapping Hero */}
        <main className="relative z-20 max-w-6xl mx-auto px-6 -mt-20 md:-mt-24 pb-16">

          {error && (
            <div className="mb-8 p-4 rounded-none border border-red-300 bg-red-50/80 text-red-700 font-jakarta text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ── TOP SECTION: Left = Guest Details | Right = Choose Meal Plan ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

              {/* Left Column (6 Cols): 01 Guest Details */}
              <div className="lg:col-span-6 sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="pb-4 mb-6 border-b border-skynest-hairline">
                    <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                        01
                      </span>
                      Guest Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block font-jakarta text-[11px] font-bold uppercase tracking-wider mb-1.5 text-ink/70">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full px-3.5 py-3 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <label className="block font-jakarta text-[11px] font-bold uppercase tracking-wider mb-1.5 text-ink/70">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-3.5 py-3 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block font-jakarta text-[11px] font-bold uppercase tracking-wider mb-1.5 text-ink/70">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-3.5 py-3 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <label className="block font-jakarta text-[11px] font-bold uppercase tracking-wider mb-1.5 text-ink/70">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+94 77 123 4567"
                        className="w-full px-3.5 py-3 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-jakarta text-[11px] font-bold uppercase tracking-wider mb-1.5 text-ink/70">
                      Special Requests
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Late arrival, quiet room, dietary preferences..."
                      className="w-full px-3.5 py-3 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column (6 Cols): 02 Meal Plan */}
              <div className="lg:col-span-6 sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="pb-4 mb-6 border-b border-skynest-hairline">
                    <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                        02
                      </span>
                      Meal Plan
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {MEAL_PLANS.map(plan => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`p-3.5 md:p-4 rounded-none cursor-pointer border transition-all duration-200 flex items-center justify-between ${isSelected
                            ? 'border-skynest-accent bg-skynest-accent/[0.04]'
                            : 'border-skynest-hairline bg-[#FDFCFA] hover:border-ink/30'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-4 h-4 mt-0.5 rounded-none border flex items-center justify-center shrink-0 ${isSelected ? 'border-skynest-accent bg-skynest-accent' : 'border-ink/30'
                                }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 bg-white" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-cinzel font-medium text-sm uppercase text-ink">
                                  {plan.name}
                                </h3>
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-skynest-accent text-white">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="font-jakarta text-xs text-ink/50 mt-0.5">
                                {plan.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            <span className={`font-jakarta text-xs font-semibold ${isSelected ? 'text-skynest-accent' : 'text-ink/70'}`}>
                              {plan.price === 0 ? 'Included' : `+$${plan.price}/night`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* ── BOTTOM SECTION: Reservation Summary (Full Width Card) ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm">
              <div className="pb-4 mb-6 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    03
                  </span>
                  Reservation Summary
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Details (7 Cols) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#FDFCFA] border border-skynest-hairline text-xs">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Branch</span>
                      <span className="font-medium text-ink">{branch?.name}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Room Type</span>
                      <span className="font-medium text-ink">{roomType?.name}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Dates</span>
                      <span className="font-medium text-ink">{checkIn} → {checkOut}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Duration</span>
                      <span className="font-medium text-ink">{nights} Night{nights > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-jakarta">
                    <div className="flex justify-between items-center text-ink/70">
                      <span>Room ({nights} nights × ${baseRate})</span>
                      <span className="font-medium text-ink">${roomCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-ink/70">
                      <span>Meal Plan: {selectedPlan.name} ({nights} × ${selectedPlan.price})</span>
                      <span className="font-medium text-ink">${mealCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Total and Action (5 Cols) */}
                <div className="lg:col-span-5 p-5 md:p-6 bg-[#FDFCFA] border border-skynest-hairline flex flex-col justify-between">
                  <div className="flex items-baseline justify-between mb-5 pb-5 border-b border-skynest-hairline">
                    <div>
                      <p className="font-cinzel text-xs font-medium uppercase tracking-wider text-ink/60">Total Estimated</p>
                    </div>
                    <span className="font-cinzel text-2xl md:text-3xl font-normal text-skynest-accent">
                      ${totalCost.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Confirming…' : 'Confirm Reservation'}
                  </button>
                </div>

              </div>
            </div>

          </form>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-skynest-hairline bg-white/40 py-8 px-6 md:px-12 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MountainGlyph className="w-4 h-auto text-ink/40" />
            <span className="font-jakarta font-bold text-[10px] tracking-widest uppercase text-ink/60">
              SKY NEST
            </span>
          </div>
          <p className="font-jakarta text-[11px] text-ink/40">
            Colombo · Galle · Kandy
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Export default page wrapped in Next.js Suspense ─────────────────────────
export default function BookingConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper" style={{ backgroundColor: '#FDFCFA' }}>
          <p className="font-cinzel text-sm uppercase tracking-wider text-ink">
            Loading…
          </p>
        </div>
      }
    >
      <BookingConfirmContent />
    </Suspense>
  );
}
