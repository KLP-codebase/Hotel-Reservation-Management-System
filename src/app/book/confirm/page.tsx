'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';

// ── Static Reference Data ───────────────────────────────────────────────────
const BRANCHES = [
  { id: '1', name: 'Sky Nest Colombo' },
  { id: '2', name: 'Sky Nest Galle' },
  { id: '3', name: 'Sky Nest Kandy' },
];

const ROOM_TYPES = [
  { id: '1', name: 'Standard Room', rate: 120 },
  { id: '2', name: 'Deluxe Ocean Room', rate: 220 },
  { id: '3', name: 'Executive Suite', rate: 450 },
  { id: '4', name: 'Presidential Suite', rate: 950 },
];

const MEAL_PLANS = [
  { id: 1, name: 'Room Only', description: 'Exclusive accommodation, meals à la carte', price: 0 },
  { id: 2, name: 'Bed & Breakfast', description: 'Artisanal morning breakfast banquet included daily', price: 25 },
  { id: 3, name: 'Half Board', description: 'Breakfast banquet and gourmet evening course included', price: 55 },
  { id: 4, name: 'Full Board', description: 'Breakfast, luncheon, and four-course dinner included daily', price: 80 },
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

  // 1. Read URL query params passed from /book
  const roomIdStr = searchParams.get('room_id') ?? '';
  const roomTypeIdStr = searchParams.get('room_type_id') ?? '';
  const branchIdStr = searchParams.get('branch_id') ?? '';
  const checkIn = searchParams.get('check_in') ?? '';
  const checkOut = searchParams.get('check_out') ?? '';

  // 2. Resolve human-readable details
  const branch = BRANCHES.find(b => b.id === branchIdStr);
  const roomType = ROOM_TYPES.find(r => r.id === roomTypeIdStr);

  // 3. Guest details form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // 4. Meal plan selection state (default: Room Only)
  const [selectedPlanId, setSelectedPlanId] = useState<number>(1);

  // 5. Booking lifecycle state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedBookingDetails | null>(null);

  // 6. GSAP Animation Ref
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.sn-animate-card', {
        opacity: 0,
        y: 24,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }, containerRef);
    return () => ctx.revert();
  }, [confirmed]);

  // ── Date and Cost Calculations ────────────────────────────────────────────
  const nights = (checkIn && checkOut)
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  const baseRate = roomType?.rate ?? 0;
  const selectedPlan = MEAL_PLANS.find(p => p.id === selectedPlanId) ?? MEAL_PLANS[0];
  const roomCost = baseRate * nights;
  const mealCost = selectedPlan.price * nights;
  const totalCost = roomCost + mealCost;

  // ── Missing parameters guard (Square) ─────────────────────────────────────
  if (!roomIdStr || !roomTypeIdStr || !branchIdStr || !checkIn || !checkOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#FDFCFA' }}>
        <MountainGlyph className="w-12 h-auto text-ink/30 mb-6" />
        <h2 className="font-cinzel text-2xl font-normal uppercase tracking-[0.06em] mb-3 text-ink">
          Incomplete Reservation Parameters
        </h2>
        <p className="font-jakarta text-xs tracking-wider uppercase text-ink/50 mb-8 text-center max-w-md">
          Please initiate your reservation directly from our sanctuary search directory.
        </p>
        <Link
          href="/book"
          className="px-8 py-3.5 rounded-none font-jakarta font-semibold text-xs tracking-[0.2em] uppercase border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent transition-all duration-200"
        >
          Search Available Residences
        </Link>
      </div>
    );
  }

  // ── [USER LOGIC]: API Submission Handler ──────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // ── TODO: Enter your handleSubmit logic here ──
  }

  // ── Render Confirmation Receipt State (Square Architectural) ──────────────
  if (confirmed) {
    return (
      <div ref={containerRef} className="min-h-screen py-24 px-6 md:px-12 relative" style={{ backgroundColor: '#FDFCFA' }}>

        {/* Architectural hairline grid */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex z-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-ink/[0.04] last:border-r" />
          ))}
        </div>

        <div className="sn-animate-card relative z-10 max-w-2xl mx-auto p-8 md:p-14 rounded-none border border-skynest-hairline bg-white shadow-[0_20px_50px_rgba(11,37,64,0.06)]">

          {/* Square Badge */}
          <div className="w-14 h-14 rounded-none border border-skynest-accent/40 bg-skynest-accent/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-xl text-skynest-accent font-bold">✓</span>
          </div>

          <p className="font-jakarta text-[10px] font-bold tracking-[0.32em] text-center uppercase mb-2 text-skynest-accent">
            Reservation Confirmed
          </p>
          <h1 className="font-cinzel text-3xl md:text-4xl font-normal uppercase tracking-[0.04em] text-center mb-3 text-ink">
            Thank You for Your Reservation
          </h1>
          <p className="font-cinzel italic text-ink/70 text-sm text-center mb-10 max-w-md mx-auto">
            Your stay has been confirmed and logged. We look forward to welcoming you to Sky Nest.
          </p>

          {/* Reservation Card Details (Square) */}
          <div className="rounded-none p-6 md:p-8 mb-8 border border-skynest-hairline bg-[#FDFCFA]">
            <div className="flex items-center justify-between pb-5 border-b border-skynest-hairline">
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Booking Reference</p>
                <p className="font-mono text-xs font-semibold mt-1 text-ink select-all">
                  {confirmed.bookingId}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-none text-[10px] font-bold tracking-widest uppercase border border-skynest-accent/40 bg-skynest-accent/10 text-skynest-accent">
                CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 py-6 border-b border-skynest-hairline">
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Hotel Location</p>
                <p className="font-cinzel text-base font-normal uppercase mt-1 text-ink">{confirmed.branchName}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Room Type</p>
                <p className="font-cinzel text-base font-normal uppercase mt-1 text-ink">{confirmed.roomTypeName}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Check-in</p>
                <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.checkIn}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Check-out</p>
                <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.checkOut}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6">
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Meal Plan</p>
                <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.planName}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Primary Guest</p>
                <p className="font-jakarta text-xs font-semibold mt-1 text-ink">{confirmed.guestName}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-skynest-hairline flex items-center justify-between">
              <div>
                <span className="font-jakarta text-xs tracking-wider uppercase text-ink/50">
                  Total Due ({confirmed.nights} Night{confirmed.nights > 1 ? 's' : ''})
                </span>
                <p className="font-jakarta text-[10px] text-ink/40">Includes room stay and daily dining</p>
              </div>
              <span className="font-cinzel text-3xl font-normal text-skynest-accent">
                ${confirmed.totalEstimated.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons (Square) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-4 rounded-none text-center font-jakarta font-semibold text-xs tracking-[0.2em] uppercase border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent transition-all"
            >
              Return to Home
            </Link>
            <Link
              href="/book"
              className="px-8 py-4 rounded-none text-center font-jakarta font-semibold text-xs tracking-[0.2em] uppercase border border-ink text-ink bg-transparent hover:bg-ink hover:text-paper transition-all"
            >
              Book Another Sanctuary
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Booking Form State (Square Architectural) ──────────────────────
  return (
    <div ref={containerRef} className="min-h-screen py-24 px-6 md:px-12 relative" style={{ backgroundColor: '#FDFCFA' }}>

      {/* 6-column architectural hairline grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex z-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 border-l border-ink/[0.04] last:border-r" />
        ))}
      </div>

      {/* Top Architectural Navigation Bar (Square Corners, Frosted Glass) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-ink/[0.08]"
        style={{ backgroundColor: 'rgba(253,252,250,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>

        <Link href="/" className="flex items-center gap-2.5 group">
          <MountainGlyph className="w-6 h-auto text-ink transition-transform duration-300 group-hover:scale-105" />
          <span className="font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase text-ink">
            SKYNEST
          </span>
        </Link>

        <Link
          href="/book"
          className="flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.14em] uppercase border border-ink/20 text-ink hover:border-ink hover:bg-ink/5 transition-all duration-200 rounded-none"
        >
          ← Change Room
        </Link>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <span className="font-jakarta text-[11px] font-bold uppercase tracking-[0.32em] text-skynest-accent block mb-2">
            Final Step
          </span>
          <h1 className="font-cinzel text-3xl md:text-5xl font-normal uppercase tracking-[0.04em] text-ink">
            Confirm Your Reservation
          </h1>
          <p className="font-cinzel italic text-sm md:text-base text-ink/70 mt-2">
            Review your stay details, select your dining preferences, and provide guest contact information.
          </p>
        </div>

        {/* Error Alert (Square) */}
        {error && (
          <div className="mb-8 p-4 rounded-none border border-red-300 bg-red-50/70 text-red-700 font-jakarta text-xs flex items-center gap-3">
            <span className="font-bold">Notice:</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Form Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">

            {/* Section 1: Guest Information (Square) */}
            <div className="sn-animate-card p-6 md:p-10 rounded-none border border-skynest-hairline bg-white shadow-[0_12px_32px_rgba(11,37,64,0.04)]">
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-lg font-medium uppercase tracking-[0.08em] text-ink flex items-center gap-3">
                  <span className="w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    01
                  </span>
                  Guest Contact Details
                </h2>
                <span className="font-jakarta text-[10px] tracking-[0.2em] uppercase text-ink/40 font-semibold">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block font-jakarta text-[11px] font-bold uppercase tracking-[0.16em] mb-2 text-ink/70">
                    First Name <span className="text-skynest-accent">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Eleanor"
                    className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block font-jakarta text-[11px] font-bold uppercase tracking-[0.16em] mb-2 text-ink/70">
                    Last Name <span className="text-skynest-accent">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Vance"
                    className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block font-jakarta text-[11px] font-bold uppercase tracking-[0.16em] mb-2 text-ink/70">
                    Email Address <span className="text-skynest-accent">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="eleanor@example.com"
                    className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block font-jakarta text-[11px] font-bold uppercase tracking-[0.16em] mb-2 text-ink/70">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-jakarta text-[11px] font-bold uppercase tracking-[0.16em] mb-2 text-ink/70">
                  Special Requests & Dietary Preferences
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Late check-in, quiet room preference, dietary instructions..."
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                />
              </div>
            </div>

            {/* Section 2: Meal Plan Selection (Square Architectural Cards) */}
            <div className="sn-animate-card p-6 md:p-10 rounded-none border border-skynest-hairline bg-white shadow-[0_12px_32px_rgba(11,37,64,0.04)]">
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-lg font-medium uppercase tracking-[0.08em] text-ink flex items-center gap-3">
                  <span className="w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    02
                  </span>
                  Choose Meal Plan
                </h2>
                <span className="font-jakarta text-[10px] tracking-[0.2em] uppercase text-skynest-accent font-semibold">
                  Optional Dining
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEAL_PLANS.map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-5 rounded-none cursor-pointer border transition-all duration-200 flex flex-col justify-between ${isSelected
                        ? 'border-skynest-accent bg-skynest-accent/[0.04] shadow-[0_4px_16px_rgba(217,114,44,0.08)]'
                        : 'border-skynest-hairline bg-[#FDFCFA] hover:border-ink/30'
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-cinzel font-medium text-base uppercase tracking-[0.04em] text-ink">
                            {plan.name}
                          </h3>
                          <span className={`font-jakarta text-xs font-bold tracking-wider ${isSelected ? 'text-skynest-accent' : 'text-ink/60'}`}>
                            {plan.price === 0 ? 'Included' : `+$${plan.price}/night`}
                          </span>
                        </div>
                        <p className="font-jakarta text-xs text-ink/50 leading-relaxed">
                          {plan.description}
                        </p>
                      </div>

                      {/* Square selector mark */}
                      <div className="mt-5 flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center ${isSelected ? 'border-skynest-accent bg-skynest-accent' : 'border-ink/30'
                            }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 bg-white" />}
                        </div>
                        <span className={`font-jakarta text-[10px] font-bold tracking-[0.16em] uppercase ${isSelected ? 'text-skynest-accent' : 'text-ink/40'}`}>
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (5 Cols, Square) */}
          <div className="lg:col-span-5 sn-animate-card">
            <div className="p-6 md:p-10 rounded-none border border-skynest-hairline bg-white shadow-[0_16px_40px_rgba(11,37,64,0.06)] sticky top-24">

              <h2 className="font-cinzel text-lg font-medium uppercase tracking-[0.08em] text-ink pb-6 mb-6 border-b border-skynest-hairline">
                Reservation Summary
              </h2>

              <div className="space-y-4 pb-6 border-b border-skynest-hairline">
                <div className="flex justify-between items-center">
                  <span className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Location</span>
                  <span className="font-cinzel text-sm uppercase text-ink font-medium">{branch?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Room</span>
                  <span className="font-cinzel text-sm uppercase text-ink font-medium">{roomType?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Dates</span>
                  <span className="font-jakarta text-xs font-semibold text-ink">
                    {checkIn} → {checkOut}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-ink/50">Duration</span>
                  <span className="font-jakarta text-xs font-semibold text-ink">
                    {nights} Night{nights > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="py-6 space-y-3.5 border-b border-skynest-hairline">
                <div className="flex justify-between font-jakarta text-xs">
                  <span className="text-ink/60 uppercase tracking-wider">Stay ({nights} × ${baseRate})</span>
                  <span className="font-semibold text-ink">${roomCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-jakarta text-xs">
                  <span className="text-ink/60 uppercase tracking-wider">{selectedPlan.name} ({nights} × ${selectedPlan.price})</span>
                  <span className="font-semibold text-ink">${mealCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Total Due */}
              <div className="pt-6 pb-8 flex items-baseline justify-between">
                <div>
                  <p className="font-cinzel text-base font-normal uppercase tracking-wider text-ink">Total Estimate</p>
                  <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/40">Includes room stay and meals</p>
                </div>
                <p className="font-cinzel text-3xl font-normal text-skynest-accent">
                  ${totalCost.toLocaleString()}
                </p>
              </div>

              {/* Square Confirm Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-none font-jakarta font-semibold text-xs tracking-[0.22em] uppercase transition-all duration-300 flex items-center justify-center gap-2 border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Confirming Reservation…' : 'Confirm Reservation'}
              </button>

              <p className="font-jakarta text-[10px] tracking-wider uppercase text-center text-ink/40 mt-4">
                Instant Confirmation · Best Rate Guaranteed
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Export default page wrapped in Next.js Suspense ─────────────────────────
export default function BookingConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper">
          <p className="font-cinzel text-sm uppercase tracking-[0.2em] text-ink">
            Accessing Reservation Ledger…
          </p>
        </div>
      }
    >
      <BookingConfirmContent />
    </Suspense>
  );
}
