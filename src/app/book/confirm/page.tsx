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
  { id: 1, name: 'Room Only', description: 'No meals included', price: 0 },
  { id: 2, name: 'Bed & Breakfast', description: 'Breakfast buffet included', price: 25 },
  { id: 3, name: 'Half Board', description: 'Breakfast and gourmet dinner included', price: 55 },
  { id: 4, name: 'Full Board', description: 'All three meals included daily', price: 80 },
];

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
        duration: 0.8,
        stagger: 0.15,
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

  // ── Missing parameters guard ──────────────────────────────────────────────
  if (!roomIdStr || !roomTypeIdStr || !branchIdStr || !checkIn || !checkOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#FDFCFA' }}>
        <h2 className="font-cinzel text-2xl font-semibold mb-3" style={{ color: '#0B2540' }}>
          Incomplete Booking Information
        </h2>
        <p className="font-jakarta text-sm mb-6 text-center" style={{ color: '#64748b' }}>
          Please start your reservation from our room availability search page.
        </p>
        <Link
          href="/book"
          className="px-6 py-3 rounded-lg font-jakarta font-semibold text-sm transition-all"
          style={{ backgroundColor: '#D9722C', color: '#fff' }}
        >
          Search Rooms
        </Link>
      </div>
    );
  }

  // ── [USER LOGIC]: API Submission Handler ──────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // ── TODO: Enter your handleSubmit logic here ──
  }

  // ── Render Confirmation Receipt State ─────────────────────────────────────
  if (confirmed) {
    return (
      <div ref={containerRef} className="min-h-screen py-24 px-6" style={{ backgroundColor: '#FDFCFA' }}>
        <div className="sn-animate-card max-w-2xl mx-auto p-8 md:p-12 rounded-2xl border"
          style={{ backgroundColor: '#fff', borderColor: '#E4E1DA', boxShadow: '0 20px 48px rgba(11,37,64,0.06)' }}>

          {/* Success Badge */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(217,114,44,0.1)' }}>
            <span className="text-2xl" style={{ color: '#D9722C' }}>✓</span>
          </div>

          <p className="font-jakarta text-xs font-bold tracking-widest text-center uppercase mb-2" style={{ color: '#D9722C' }}>
            Reservation Confirmed
          </p>
          <h1 className="font-cinzel text-3xl font-semibold text-center mb-4" style={{ color: '#0B2540' }}>
            We Look Forward to Welcoming You
          </h1>
          <p className="font-jakarta text-sm text-center mb-8" style={{ color: '#64748b' }}>
            A confirmation email and stay details have been logged for your arrival.
          </p>

          {/* Reservation Card Details */}
          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#FDFCFA', border: '1px solid #E4E1DA' }}>
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: '#E4E1DA' }}>
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Booking Reference</p>
                <p className="font-mono text-xs font-medium mt-1 select-all" style={{ color: '#0B2540' }}>
                  {confirmed.bookingId}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(217,114,44,0.12)', color: '#D9722C' }}>
                CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-b" style={{ borderColor: '#E4E1DA' }}>
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Destination</p>
                <p className="font-cinzel font-semibold mt-1" style={{ color: '#0B2540' }}>{confirmed.branchName}</p>
              </div>
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Accommodation</p>
                <p className="font-cinzel font-semibold mt-1" style={{ color: '#0B2540' }}>{confirmed.roomTypeName}</p>
              </div>
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Check-in</p>
                <p className="font-jakarta text-sm font-medium mt-1" style={{ color: '#0B2540' }}>{confirmed.checkIn}</p>
              </div>
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Check-out</p>
                <p className="font-jakarta text-sm font-medium mt-1" style={{ color: '#0B2540' }}>{confirmed.checkOut}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Meal Plan</p>
                <p className="font-jakarta text-sm font-semibold mt-1" style={{ color: '#0B2540' }}>{confirmed.planName}</p>
              </div>
              <div>
                <p className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Guest</p>
                <p className="font-jakarta text-sm font-semibold mt-1" style={{ color: '#0B2540' }}>{confirmed.guestName}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: '#E4E1DA' }}>
              <span className="font-jakarta text-sm font-medium" style={{ color: '#64748b' }}>
                Estimated Total ({confirmed.nights} night{confirmed.nights > 1 ? 's' : ''})
              </span>
              <span className="font-cinzel text-2xl font-bold" style={{ color: '#D9722C' }}>
                ${confirmed.totalEstimated.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-lg text-center font-jakarta font-semibold text-sm transition-all"
              style={{ backgroundColor: '#0B2540', color: '#fff' }}
            >
              Return to Home
            </Link>
            <Link
              href="/book"
              className="px-6 py-3 rounded-lg text-center font-jakarta font-semibold text-sm transition-all"
              style={{ border: '1px solid #0B2540', color: '#0B2540' }}
            >
              Book Another Room
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Booking Form State ─────────────────────────────────────────────
  return (
    <div ref={containerRef} className="min-h-screen py-24 px-6 md:px-12" style={{ backgroundColor: '#FDFCFA' }}>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{ backgroundColor: 'rgba(253,252,250,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E4E1DA' }}>
        <Link href="/" className="font-cinzel text-lg font-semibold tracking-wide" style={{ color: '#0B2540' }}>
          Sky Nest
        </Link>
        <Link href="/book" className="font-jakarta text-sm font-medium hover:opacity-75 transition-opacity" style={{ color: '#0B2540' }}>
          ← Change Room Selection
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <p className="font-jakarta text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D9722C' }}>
            Complete Your Stay
          </p>
          <h1 className="font-cinzel text-3xl md:text-4xl font-semibold" style={{ color: '#0B2540' }}>
            Confirm Your Reservation
          </h1>
          <p className="font-jakarta text-sm mt-2" style={{ color: '#64748b' }}>
            Enter your details and review your selected itinerary below.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-4 rounded-xl font-jakarta text-sm border flex items-center gap-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Form Details (8 Cols) */}
          <div className="lg:col-span-7 space-y-8">

            {/* Section 1: Guest Information */}
            <div className="sn-animate-card p-6 md:p-8 rounded-2xl border"
              style={{ backgroundColor: '#fff', borderColor: '#E4E1DA' }}>
              <h2 className="font-cinzel text-xl font-semibold mb-6 flex items-center gap-3" style={{ color: '#0B2540' }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: '#0B2540' }}>
                  1
                </span>
                Primary Guest Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-jakarta text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0B2540' }}>
                    First Name <span style={{ color: '#D9722C' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Eleanor"
                    className="w-full px-4 py-3 rounded-lg font-jakarta text-sm outline-none transition-all"
                    style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}
                  />
                </div>
                <div>
                  <label className="block font-jakarta text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0B2540' }}>
                    Last Name <span style={{ color: '#D9722C' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Vance"
                    className="w-full px-4 py-3 rounded-lg font-jakarta text-sm outline-none transition-all"
                    style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-jakarta text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0B2540' }}>
                    Email Address <span style={{ color: '#D9722C' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="eleanor@example.com"
                    className="w-full px-4 py-3 rounded-lg font-jakarta text-sm outline-none transition-all"
                    style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}
                  />
                </div>
                <div>
                  <label className="block font-jakarta text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0B2540' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full px-4 py-3 rounded-lg font-jakarta text-sm outline-none transition-all"
                    style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-jakarta text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0B2540' }}>
                  Special Requests / Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Late check-in, high floor preference, dietary notes..."
                  className="w-full px-4 py-3 rounded-lg font-jakarta text-sm outline-none transition-all"
                  style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}
                />
              </div>
            </div>

            {/* Section 2: Meal Plan Selection */}
            <div className="sn-animate-card p-6 md:p-8 rounded-2xl border"
              style={{ backgroundColor: '#fff', borderColor: '#E4E1DA' }}>
              <h2 className="font-cinzel text-xl font-semibold mb-6 flex items-center gap-3" style={{ color: '#0B2540' }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: '#0B2540' }}>
                  2
                </span>
                Dining & Meal Plan
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEAL_PLANS.map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className="p-5 rounded-xl cursor-pointer border transition-all duration-200 flex flex-col justify-between"
                      style={{
                        backgroundColor: isSelected ? 'rgba(217,114,44,0.04)' : '#FDFCFA',
                        borderColor: isSelected ? '#D9722C' : '#E4E1DA',
                        boxShadow: isSelected ? '0 4px 16px rgba(217,114,44,0.12)' : 'none',
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-cinzel font-semibold text-base" style={{ color: '#0B2540' }}>
                            {plan.name}
                          </h3>
                          <span className="font-jakarta text-xs font-bold" style={{ color: isSelected ? '#D9722C' : '#64748b' }}>
                            {plan.price === 0 ? 'Included' : `+$${plan.price}/night`}
                          </span>
                        </div>
                        <p className="font-jakarta text-xs" style={{ color: '#64748b' }}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border flex items-center justify-center"
                          style={{ borderColor: isSelected ? '#D9722C' : '#CBD5E1' }}>
                          {isSelected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D9722C' }} />}
                        </div>
                        <span className="font-jakarta text-xs font-medium" style={{ color: isSelected ? '#D9722C' : '#64748b' }}>
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (5 Cols) */}
          <div className="lg:col-span-5 sn-animate-card">
            <div className="p-6 md:p-8 rounded-2xl border sticky top-24"
              style={{ backgroundColor: '#fff', borderColor: '#E4E1DA', boxShadow: '0 12px 32px rgba(11,37,64,0.04)' }}>

              <h2 className="font-cinzel text-xl font-semibold mb-6" style={{ color: '#0B2540' }}>
                Reservation Summary
              </h2>

              <div className="space-y-4 pb-6 border-b" style={{ borderColor: '#E4E1DA' }}>
                <div className="flex justify-between">
                  <span className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Location</span>
                  <span className="font-jakarta text-sm font-semibold text-right" style={{ color: '#0B2540' }}>{branch?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Room</span>
                  <span className="font-jakarta text-sm font-semibold text-right" style={{ color: '#0B2540' }}>{roomType?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Dates</span>
                  <span className="font-jakarta text-sm font-medium text-right" style={{ color: '#0B2540' }}>
                    {checkIn} → {checkOut}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-jakarta text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Duration</span>
                  <span className="font-jakarta text-sm font-medium" style={{ color: '#0B2540' }}>
                    {nights} night{nights > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="py-6 space-y-3 border-b" style={{ borderColor: '#E4E1DA' }}>
                <div className="flex justify-between font-jakarta text-sm">
                  <span style={{ color: '#64748b' }}>Room ({nights} × ${baseRate})</span>
                  <span className="font-medium" style={{ color: '#0B2540' }}>${roomCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-jakarta text-sm">
                  <span style={{ color: '#64748b' }}>{selectedPlan.name} ({nights} × ${selectedPlan.price})</span>
                  <span className="font-medium" style={{ color: '#0B2540' }}>${mealCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6 pb-8 flex items-center justify-between">
                <div>
                  <p className="font-cinzel text-lg font-bold" style={{ color: '#0B2540' }}>Total Due</p>
                  <p className="font-jakarta text-xs" style={{ color: '#64748b' }}>Inclusive of nightly stay & dining</p>
                </div>
                <p className="font-cinzel text-2xl font-bold" style={{ color: '#D9722C' }}>
                  ${totalCost.toLocaleString()}
                </p>
              </div>

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-jakarta font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: loading ? '#B7C2CC' : '#D9722C',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(217,114,44,0.3)',
                }}
              >
                {loading ? 'Confirming Reservation…' : 'Complete Reservation'}
              </button>

              <p className="font-jakarta text-xs text-center mt-4" style={{ color: '#64748b' }}>
                Guaranteed reservation · Instant confirmation
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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDFCFA' }}>
          <p className="font-cinzel text-lg font-semibold" style={{ color: '#0B2540' }}>
            Loading reservation details…
          </p>
        </div>
      }
    >
      <BookingConfirmContent />
    </Suspense>
  );
}
