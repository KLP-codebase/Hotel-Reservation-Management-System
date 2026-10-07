'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ShaderBackground } from '@/components/ui/adisyon-shader';
import { apiFetch, ApiError } from '@/lib/api-client';

// ── Static Reference Data ───────────────────────────────────────────────────
const BRANCHES = [
  { id: '953fd827-751c-47eb-a201-e0aac4bc444a', name: 'Sky Nest Colombo' },
  { id: 'af0167cd-c9eb-4ac5-ba22-cfd65cdc87a5', name: 'Sky Nest Kandy' },
  { id: '30a7b55d-9440-45c2-a990-08821af210ba', name: 'Sky Nest Galle' },
];

const ROOM_TYPES = [
  { id: 'STANDARD', name: 'Standard Room', rate: 120, capacity: 2 },
  { id: 'DELUXE', name: 'Deluxe Room', rate: 180, capacity: 3 },
  { id: 'SUITE', name: 'Suite', rate: 280, capacity: 4 },
  { id: 'PRESIDENTIAL', name: 'Presidential Suite', rate: 500, capacity: 6 },
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

// ── Per-Room State Structure ────────────────────────────────────────────────
interface ConfiguredRoom {
  index: number;
  roomId: string;
  roomNumber: string;
  roomType: string;
  roomTypeName: string;
  baseRate: number;
  maxGuests: number;
  adults: number; // MUST be >= 1!
  children: number;
  childAges: number[];
  mealPlanId: number;
}

// ── Sri Lanka 4-Tier Statutory Tax Cascade ──────────────────────────────────
// SC (10%) -> TDL (1% on Base + SC) -> SSCL (2.5% on Base + SC + TDL) -> VAT (18% on Base + SC + TDL + SSCL)
interface TaxCascadeBreakdown {
  baseAmount: number;
  scTax: number;
  tdlTax: number;
  sscTax: number;
  vatTax: number;
  totalTaxes: number;
  grandTotal: number;
}

function computeTaxCascade(baseAmount: number): TaxCascadeBreakdown {
  const roundedBase = Math.round(baseAmount * 100) / 100;
  const scTax       = Math.round(roundedBase * 0.10 * 100) / 100;
  const tdlTax      = Math.round((roundedBase + scTax) * 0.01 * 100) / 100;
  const sscTax      = Math.round((roundedBase + scTax + tdlTax) * 0.025 * 100) / 100;
  const vatTax      = Math.round((roundedBase + scTax + tdlTax + sscTax) * 0.18 * 100) / 100;
  const totalTaxes  = Math.round((scTax + tdlTax + sscTax + vatTax) * 100) / 100;
  const grandTotal  = Math.round((roundedBase + totalTaxes) * 100) / 100;

  return { baseAmount: roundedBase, scTax, tdlTax, sscTax, vatTax, totalTaxes, grandTotal };
}

// ── Confirmed Booking Details Type ──────────────────────────────────────────
interface ConfirmedBookingDetails {
  bookingId: string;
  branchName: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  baseAmount: number;
  taxes: TaxCascadeBreakdown;
  grandTotal: number;
  guestName: string;
  guestEmail: string;
  totalAdults: number;
  totalChildren: number;
  allChildAges?: number[];
  rooms: {
    roomNumber: string;
    roomTypeName: string;
    baseRate: number;
    maxGuests: number;
    adults: number;
    children: number;
    childAges: number[];
    planName: string;
    planPrice: number;
    roomCost: number;
    mealCost: number;
    subtotal: number;
  }[];
}

// ── Helper: Synchronously build initial room configurations ──────────────────
function buildInitialRooms(
  roomIdsParam: string,
  roomNumbersParam: string,
  roomTypesParam: string,
  roomRatesParam: string,
  roomCapacitiesParam: string,
  roomIdStr: string,
  roomTypeIdStr: string,
  roomsCountParam: number,
  initialAdults: number,
  initialChildren: number,
  childAgesParam: string,
): ConfiguredRoom[] {
  const rawIds = roomIdsParam ? roomIdsParam.split(',').map(s => s.trim()).filter(Boolean) : (roomIdStr ? [roomIdStr] : []);
  const rawNumbers = roomNumbersParam ? roomNumbersParam.split(',').map(s => s.trim()).filter(Boolean) : [];
  const rawTypes = roomTypesParam ? roomTypesParam.split(',').map(s => s.trim()).filter(Boolean) : [];
  const rawRates = roomRatesParam ? roomRatesParam.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : [];
  const rawCapacities = roomCapacitiesParam ? roomCapacitiesParam.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : [];
  const parsedChildAges = childAgesParam ? childAgesParam.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 11) : [];

  const count = Math.max(1, roomsCountParam, rawIds.length);
  const totalAdults = Math.max(count, initialAdults);
  const totalChildren = Math.max(0, initialChildren);

  const initialList: ConfiguredRoom[] = [];
  for (let i = 0; i < count; i++) {
    const rType = rawTypes[i] || roomTypeIdStr || 'STANDARD';
    const rTypeObj = ROOM_TYPES.find(r => r.id === rType);
    const rTypeName = rTypeObj?.name || (rType.charAt(0).toUpperCase() + rType.slice(1).toLowerCase() + ' Room');
    const rRate = rawRates[i] !== undefined ? rawRates[i] : (rTypeObj?.rate || 120);
    const rCapacity = rawCapacities[i] !== undefined ? rawCapacities[i] : (rTypeObj?.capacity || 2);

    initialList.push({
      index: i + 1,
      roomId: rawIds[i] || rawIds[0] || roomIdStr || `room-${i + 1}`,
      roomNumber: rawNumbers[i] || (rawNumbers[0] ? `${parseInt(rawNumbers[0], 10) + i}` : `${101 + i}`),
      roomType: rType,
      roomTypeName: rTypeName,
      baseRate: rRate,
      maxGuests: Math.max(1, rCapacity),
      adults: 1, // Rule: Strictly at least 1 adult per room!
      children: 0,
      childAges: [],
      mealPlanId: 1, // Default Room Only
    });
  }

  // Distribute remaining extra adults respecting room max capacity
  let remainingAdults = totalAdults - count;
  while (remainingAdults > 0) {
    let allocated = false;
    for (const rm of initialList) {
      if (remainingAdults > 0 && rm.adults + rm.children < rm.maxGuests) {
        rm.adults++;
        remainingAdults--;
        allocated = true;
      }
    }
    if (!allocated) break;
  }

  // Distribute children respecting room max capacity
  let remainingChildren = totalChildren;
  let childAgeIndex = 0;
  while (remainingChildren > 0) {
    let allocated = false;
    for (const rm of initialList) {
      if (remainingChildren > 0 && rm.adults + rm.children < rm.maxGuests) {
        rm.children++;
        rm.childAges.push(parsedChildAges[childAgeIndex] ?? 5);
        childAgeIndex++;
        remainingChildren--;
        allocated = true;
      }
    }
    if (!allocated) break;
  }

  return initialList;
}

// ── Inner Component with useSearchParams ────────────────────────────────────
function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params passed from /book
  const roomIdStr = searchParams.get('room_id') ?? '';
  const roomIdsParam = searchParams.get('room_ids') ?? '';
  const roomNumbersParam = searchParams.get('room_numbers') ?? '';
  const roomTypesParam = searchParams.get('room_types') ?? '';
  const roomRatesParam = searchParams.get('room_rates') ?? '';
  const roomTypeIdStr = searchParams.get('room_type') ?? '';
  const branchIdStr = searchParams.get('branch_id') ?? '';
  const checkIn = searchParams.get('check_in') ?? '';
  const checkOut = searchParams.get('check_out') ?? '';
  const roomsCountParam = parseInt(searchParams.get('rooms') ?? '1', 10) || 1;
  const initialAdults = parseInt(searchParams.get('adults') ?? '1', 10) || 1;
  const initialChildren = parseInt(searchParams.get('children') ?? '0', 10) || 0;
  const roomCapacitiesParam = searchParams.get('room_capacities') ?? '';
  const childAgesParam = searchParams.get('child_ages') ?? '';

  // Resolve human-readable details
  const branch = BRANCHES.find(b => b.id === branchIdStr);
  const roomType = ROOM_TYPES.find(r => r.id === roomTypeIdStr);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Multi-room configuration state — synchronously initialized
  const [rooms, setRooms] = useState<ConfiguredRoom[]>(() =>
    buildInitialRooms(
      roomIdsParam,
      roomNumbersParam,
      roomTypesParam,
      roomRatesParam,
      roomCapacitiesParam,
      roomIdStr,
      roomTypeIdStr,
      roomsCountParam,
      initialAdults,
      initialChildren,
      childAgesParam,
    )
  );

  // Booking lifecycle state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedBookingDetails | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Animation Ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-sync if query params change
  useEffect(() => {
    setRooms(
      buildInitialRooms(
        roomIdsParam,
        roomNumbersParam,
        roomTypesParam,
        roomRatesParam,
        roomCapacitiesParam,
        roomIdStr,
        roomTypeIdStr,
        roomsCountParam,
        initialAdults,
        initialChildren,
        childAgesParam,
      )
    );
  }, [roomIdsParam, roomNumbersParam, roomTypesParam, roomRatesParam, roomCapacitiesParam, roomIdStr, roomTypeIdStr, roomsCountParam, initialAdults, initialChildren, childAgesParam]);

  // Bulk apply one meal plan to all rooms
  const applyMealPlanToAll = (planId: number) => {
    setRooms(prev => prev.map(r => ({ ...r, mealPlanId: planId })));
  };

  // Update specific room adults (MUST ALWAYS BE >= 1 AND <= maxGuests - children)
  const updateRoomAdults = (index: number, delta: number) => {
    setRooms(prev => prev.map(r => {
      if (r.index !== index) return r;
      const minAdults = 1; // Strict rule: At least 1 adult per room!
      const maxAdults = Math.max(minAdults, r.maxGuests - r.children);
      const next = Math.min(maxAdults, Math.max(minAdults, r.adults + delta));
      return { ...r, adults: next };
    }));
  };

  // Directly set room adults from numeric input (strictly clamped to capacity)
  const setRoomAdultsDirect = (index: number, val: number) => {
    setRooms(prev => prev.map(r => {
      if (r.index !== index) return r;
      const minAdults = 1;
      const maxAdults = Math.max(minAdults, r.maxGuests - r.children);
      const safeVal = Math.min(maxAdults, Math.max(minAdults, isNaN(val) ? minAdults : val));
      return { ...r, adults: safeVal };
    }));
  };

  // Update specific room children (>= 0 AND <= maxGuests - adults)
  const updateRoomChildren = (index: number, delta: number) => {
    setRooms(prev => prev.map(r => {
      if (r.index !== index) return r;
      const minChildren = 0;
      const maxChildren = Math.max(0, r.maxGuests - r.adults);
      const next = Math.min(maxChildren, Math.max(minChildren, r.children + delta));

      const newAges = [...r.childAges];
      if (next > newAges.length) {
        while (newAges.length < next) newAges.push(5);
      } else if (next < newAges.length) {
        newAges.splice(next);
      }
      return { ...r, children: next, childAges: newAges };
    }));
  };

  // Directly set room children from numeric input
  const setRoomChildrenDirect = (index: number, val: number) => {
    setRooms(prev => prev.map(r => {
      if (r.index !== index) return r;
      const minChildren = 0;
      const maxChildren = Math.max(0, r.maxGuests - r.adults);
      const safeVal = Math.min(maxChildren, Math.max(0, isNaN(val) ? 0 : val));

      const newAges = [...r.childAges];
      if (safeVal > newAges.length) {
        while (newAges.length < safeVal) newAges.push(5);
      } else if (safeVal < newAges.length) {
        newAges.splice(safeVal);
      }
      return { ...r, children: safeVal, childAges: newAges };
    }));
  };

  // Update individual child age in a room
  const updateRoomChildAge = (roomIndex: number, childIndex: number, age: number) => {
    const safeAge = Math.min(11, Math.max(0, isNaN(age) ? 0 : age));
    setRooms(prev => prev.map(r => {
      if (r.index !== roomIndex) return r;
      const newAges = [...r.childAges];
      newAges[childIndex] = safeAge;
      return { ...r, childAges: newAges };
    }));
  };

  // Update specific room meal plan
  const updateRoomMealPlan = (index: number, planId: number) => {
    setRooms(prev => prev.map(r => r.index === index ? { ...r, mealPlanId: planId } : r));
  };

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

  // Date and Duration Calculations
  const nights = (checkIn && checkOut)
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  // Aggregate cost calculations across ALL chosen rooms
  const totalAdults = rooms.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = rooms.reduce((sum, r) => sum + r.children, 0);
  
  // Total accommodation = sum of (rate_i * nights) for each room
  const totalRoomCost = rooms.reduce((sum, r) => sum + (r.baseRate * nights), 0);

  // Per-room detailed calculations
  const roomCalculations = rooms.map(r => {
    const plan = MEAL_PLANS.find(p => p.id === r.mealPlanId) ?? MEAL_PLANS[0];
    const roomCost = r.baseRate * nights;
    const mealCost = plan.price * nights;
    const roomSubtotal = roomCost + mealCost;
    return {
      ...r,
      maxGuests: r.maxGuests,
      childAges: r.childAges,
      planName: plan.name,
      planPrice: plan.price,
      roomCost,
      mealCost,
      roomSubtotal,
    };
  });

  // Total meal charges across all rooms
  const totalMealCost = roomCalculations.reduce((sum, r) => sum + r.mealCost, 0);

  // Base Amount before taxes
  const baseAmount = totalRoomCost + totalMealCost;

  // 4-Tier Statutory Sri Lankan Tax Cascade
  const taxes = computeTaxCascade(baseAmount);
  const grandTotal = taxes.grandTotal;

  // Guard for missing parameters
  if ((!roomIdStr && !roomIdsParam) || !branchIdStr || !checkIn || !checkOut) {
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

    // Double check constraint 1: at least 1 adult per room
    const invalidRoom = rooms.find(r => r.adults < 1);
    if (invalidRoom) {
      setError(`Room ${invalidRoom.roomNumber} requires at least 1 adult. Please adjust guest allocations.`);
      return;
    }

    // Double check constraint 2: max capacity per room cannot be exceeded
    const overCapacityRoom = rooms.find(r => r.adults + r.children > r.maxGuests);
    if (overCapacityRoom) {
      setError(`Room ${overCapacityRoom.roomNumber} (${overCapacityRoom.roomTypeName}) exceeds its maximum capacity of ${overCapacityRoom.maxGuests} guests (${overCapacityRoom.adults} adults + ${overCapacityRoom.children} children). Please adjust your allocations.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Find or create the guest record
      type GuestRow = { id?: string; guest_id?: string; email?: string | null };
      const pickGuestId = (g: GuestRow) => g.id || g.guest_id || '';

      let guestId = '';
      try {
        const created = await apiFetch<{ data: GuestRow }>('/api/v1/guests', {
          method: 'POST',
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
          }),
        });
        guestId = pickGuestId(created.data);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 409) throw err;
        const found = await apiFetch<{ data: GuestRow[] }>(
          `/api/v1/guests?search=${encodeURIComponent(email.trim())}`,
        );
        const match = found.data.find(
          g => g.email?.toLowerCase() === email.trim().toLowerCase(),
        );
        if (match) guestId = pickGuestId(match);
      }

      if (!guestId) {
        throw new Error('We could not save your guest details. Please try again.');
      }

      // 2. Prepare payload for single booking with multiple rooms
      const payloadRooms = rooms.map(r => ({
        primary_guest_id: guestId,
        room_id: r.roomId,
        plan_id: r.mealPlanId,
        check_in_date: checkIn,
        check_out_date: checkOut,
      }));

      const res = await apiFetch<{
        data: {
          booking_id: string;
          rooms: { booking_room_id: string; room_number: string | null; room_id: string }[];
        };
      }>('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: branchIdStr,
          booked_by_guest_id: guestId,
          notes: (() => {
            const allChildrenAgesList = rooms.flatMap(r => r.childAges);
            let formattedNotes = notes.trim();
            if (allChildrenAgesList.length > 0) {
              const agesNote = `Children Ages: ${allChildrenAgesList.join(', ')}`;
              formattedNotes = formattedNotes ? `${formattedNotes} | ${agesNote}` : agesNote;
            }
            return formattedNotes || undefined;
          })(),
          adults: totalAdults,
          children: totalChildren,
          rooms: payloadRooms,
        }),
      });

      // 3. Mark as confirmed
      const summaryRoomTypes = Array.from(new Set(rooms.map(r => r.roomTypeName))).join(' & ');
      const allChildrenAgesList = rooms.flatMap(r => r.childAges);
      setConfirmed({
        bookingId: res.data.booking_id,
        branchName: branch?.name ?? 'Sky Nest Hotel',
        roomTypeName: summaryRoomTypes || roomType?.name || 'Selected Rooms',
        checkIn,
        checkOut,
        nights,
        baseAmount,
        taxes,
        grandTotal,
        guestName: `${firstName.trim()} ${lastName.trim()}`,
        guestEmail: email.trim(),
        totalAdults,
        totalChildren,
        allChildAges: allChildrenAgesList,
        rooms: roomCalculations.map((rc, idx) => ({
          roomNumber: res.data.rooms[idx]?.room_number || rc.roomNumber,
          roomTypeName: rc.roomTypeName,
          baseRate: rc.baseRate,
          maxGuests: rc.maxGuests,
          adults: rc.adults,
          children: rc.children,
          childAges: rc.childAges,
          planName: rc.planName,
          planPrice: rc.planPrice,
          roomCost: rc.roomCost,
          mealCost: rc.mealCost,
          subtotal: rc.roomSubtotal,
        })),
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ROOM_UNAVAILABLE') {
          setError('One or more selected rooms have just been booked for these dates. Please go back and select available rooms.');
        } else if (err.code === 'VALIDATION_ERROR') {
          setError('Please verify your personal information and try again.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof TypeError) {
        setError('Unable to connect to the booking server. Please verify your network connection.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while confirming your reservation.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render Confirmed State ────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-skynest-hairline bg-[#FDFCFA]/90 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2.5">
            <MountainGlyph className="w-6 h-auto text-ink" />
            <span className="font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase text-ink">
              SKYNEST
            </span>
          </Link>
          <span className="text-[11px] font-jakarta uppercase tracking-wider text-skynest-accent font-semibold">
            ✓ Reservation Confirmed
          </span>
        </nav>

        <div className="pt-28 pb-16 px-6 max-w-4xl mx-auto">
          <div className="sn-confirm-card border border-skynest-hairline bg-white p-8 md:p-12 shadow-[0_16px_40px_rgba(11,37,64,0.06)] space-y-8">
            <div className="text-center pb-6 border-b border-skynest-hairline space-y-2">
              <span className="w-12 h-12 mx-auto flex items-center justify-center text-white bg-skynest-accent text-xl">
                ✓
              </span>
              <h1 className="font-cinzel text-2xl md:text-3xl uppercase tracking-wider text-ink font-normal mt-4">
                Reservation Confirmed
              </h1>
              <p className="font-jakarta text-xs text-ink/50">
                A confirmation summary has been registered for your stay at Sky Nest.
              </p>
            </div>

            {/* Booking Header Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FDFCFA] border border-skynest-hairline">
              <div>
                <span className="text-[10px] font-jakarta uppercase tracking-widest text-ink/40 block">Booking Reference</span>
                <span className="font-cinzel font-bold text-sm text-ink">{confirmed.bookingId}</span>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase border border-skynest-accent/40 bg-skynest-accent/10 text-skynest-accent">
                  {confirmed.rooms.length} Room{confirmed.rooms.length > 1 ? 's' : ''} Reserved
                </span>
              </div>
            </div>

            {/* General Trip Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-skynest-hairline text-xs">
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Branch</p>
                <p className="font-cinzel text-sm uppercase mt-0.5 text-ink font-semibold">{confirmed.branchName}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Primary Guest</p>
                <p className="font-jakarta text-xs font-semibold mt-0.5 text-ink">{confirmed.guestName}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Stay Dates</p>
                <p className="font-jakarta text-xs font-semibold mt-0.5 text-ink">{confirmed.checkIn} → {confirmed.checkOut}</p>
              </div>
              <div>
                <p className="font-jakarta text-[10px] uppercase tracking-wider text-ink/50">Duration & Guests</p>
                <p className="font-jakarta text-xs font-semibold mt-0.5 text-ink">{confirmed.nights} Night{confirmed.nights > 1 ? 's' : ''} • {confirmed.totalAdults} Ad, {confirmed.totalChildren} Ch</p>
              </div>
            </div>

            {/* Itemized Room Allocation List */}
            <div className="py-4 border-b border-skynest-hairline space-y-4">
              <p className="font-cinzel text-xs font-bold uppercase tracking-wider text-ink">
                Allocated Room & Meal Plan Breakdown
              </p>
              <div className="space-y-3">
                {confirmed.rooms.map((rm, idx) => (
                  <div key={idx} className="p-3.5 bg-[#FDFCFA] border border-skynest-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel font-bold text-ink">Room {rm.roomNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-ink/5 border border-skynest-hairline text-ink/70 uppercase">
                          {rm.roomTypeName} (${rm.baseRate}/nt)
                        </span>
                      </div>
                      <p className="font-jakarta text-[11px] text-ink/60 mt-1">
                        Guests: <strong className="text-ink">{rm.adults} Adult{rm.adults > 1 ? 's' : ''}</strong>{rm.children > 0 ? `, ${rm.children} Child${rm.children > 1 ? 'ren' : ''}` : ''}{rm.childAges && rm.childAges.length > 0 ? ` (Child Ages: ${rm.childAges.join(', ')})` : ''} • Meal Plan: <strong className="text-ink">{rm.planName}</strong> ({rm.planPrice === 0 ? 'Included' : `+$${rm.planPrice}/nt`})
                      </p>
                    </div>
                    <div className="text-right sm:border-l sm:pl-4 border-skynest-hairline">
                      <span className="text-[10px] uppercase tracking-wider text-ink/40 block">Room Subtotal</span>
                      <span className="font-cinzel text-sm font-semibold text-ink">
                        ${rm.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Statutory Tax Cascade Breakdown */}
            <div className="py-4 border-b border-skynest-hairline space-y-2 text-xs font-jakarta">
              <div className="flex justify-between items-center text-ink/70">
                <span>Total Accommodation ({confirmed.rooms.length} Rooms × {confirmed.nights} Nights)</span>
                <span className="font-medium text-ink">${confirmed.rooms.reduce((s, r) => s + r.roomCost, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-ink/70">
                <span>Total Meal Plans</span>
                <span className="font-medium text-ink">${confirmed.rooms.reduce((s, r) => s + r.mealCost, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-ink font-semibold pt-1 border-t border-skynest-hairline">
                <span>Base Subtotal (Net of Taxes)</span>
                <span>${confirmed.baseAmount.toFixed(2)}</span>
              </div>
              
              {/* Sri Lanka Statutory Levies */}
              <div className="pt-2 space-y-1.5 text-ink/60 text-[11px]">
                <div className="flex justify-between items-center">
                  <span>+ Service Charge (SC 10%)</span>
                  <span>${confirmed.taxes.scTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Tourism Development Levy (TDL 1%)</span>
                  <span>${confirmed.taxes.tdlTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Social Security Contribution Levy (SSCL 2.5%)</span>
                  <span>${confirmed.taxes.sscTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Value Added Tax (VAT 18%)</span>
                  <span>${confirmed.taxes.vatTax.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Total Cost All-Inclusive */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <span className="font-cinzel text-xs uppercase tracking-wider text-ink/60 block">
                  Grand Total ({confirmed.rooms.length} Room{confirmed.rooms.length > 1 ? 's' : ''} • All-Inclusive)
                </span>
                <p className="text-[10px] font-jakarta text-ink/40">Includes all accommodation, selected meal plans, and statutory taxes</p>
              </div>
              <span className="font-cinzel text-2xl md:text-3xl font-normal text-skynest-accent">
                ${confirmed.grandTotal.toFixed(2)}
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
                Book More Rooms
              </Link>
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
          className={`flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border transition-all duration-200 rounded-none ${scrolled
            ? 'border-ink/20 text-ink hover:border-ink hover:bg-ink/5'
            : 'border-white/30 text-white hover:border-white hover:bg-white/10'
            }`}
        >
          ← Change Selection
        </Link>
      </nav>

      {/* Hero Header */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-36 pb-32 md:pt-40 md:pb-36 text-center overflow-hidden border-b border-skynest-hairline bg-ink shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src="/Booking.webp"
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
            Confirm Your Stay
          </span>
          <h1 className="sn-hero-line font-cinzel text-3xl md:text-5xl font-normal uppercase tracking-wide text-white">
            {rooms.length > 1 ? `Book ${rooms.length} Rooms` : 'Complete Reservation'}
          </h1>
          <p className="sn-hero-line font-cinzel italic text-white/80 text-sm mt-2">
            {branch?.name} • {nights} Night{nights > 1 ? 's' : ''} ({checkIn} → {checkOut})
          </p>
        </div>
      </section>

      {/* Cloud WebGL Shader Background */}
      <div className="relative min-h-[600px]">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <ShaderBackground className="w-full h-full" />
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
            {/* ── SECTION 01: Multi-Room Setup & Meal Plan Selection ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-skynest-hairline gap-4">
                <div>
                  <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                      01
                    </span>
                    Rooms & Meal Plan Selection ({rooms.length} Room{rooms.length > 1 ? 's' : ''})
                  </h2>
                  <p className="font-jakarta text-xs text-ink/50 mt-1">
                    Select a meal plan and configure guests for each room individually. At least 1 adult is required per room.
                  </p>
                </div>

                {/* Quick Action: Apply Meal Plan to All */}
                {rooms.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/40">
                      Quick set all:
                    </span>
                    {MEAL_PLANS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyMealPlanToAll(p.id)}
                        className="px-2.5 py-1 text-[11px] font-jakarta font-medium border border-skynest-hairline bg-[#FDFCFA] hover:border-skynest-accent hover:text-skynest-accent text-ink/70 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Per-Room Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rooms.map((room) => {
                  const currentPlan = MEAL_PLANS.find(p => p.id === room.mealPlanId) ?? MEAL_PLANS[0];
                  const roomNightsCost = room.baseRate * nights;
                  const roomMealCost = currentPlan.price * nights;
                  const roomSubtotal = roomNightsCost + roomMealCost;

                  return (
                    <div
                      key={room.index}
                      className="border border-skynest-hairline bg-[#FDFCFA] p-5 space-y-5 shadow-[0_2px_10px_rgba(11,37,64,0.03)]"
                    >
                      {/* Room Card Title & Price */}
                      <div className="flex items-center justify-between pb-3 border-b border-skynest-hairline">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-ink text-white">
                            {room.index}
                          </span>
                          <h3 className="font-cinzel text-sm font-bold text-ink uppercase">
                            Room {room.roomNumber}
                          </h3>
                          <span className="text-[10px] font-jakarta px-2 py-0.5 border border-skynest-hairline bg-white text-ink font-semibold uppercase">
                            {room.roomTypeName} • ${room.baseRate}/nt
                          </span>
                          <span className={`text-[10px] font-jakarta px-2 py-0.5 font-semibold uppercase tracking-wider border ${
                            room.adults + room.children >= room.maxGuests
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-ink/[0.03] text-ink/60 border-skynest-hairline'
                          }`}>
                            Max {room.maxGuests} Guests ({room.adults + room.children}/{room.maxGuests})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-cinzel text-xs font-semibold text-skynest-accent block">
                            ${roomSubtotal.toFixed(2)}
                          </span>
                          <span className="text-[9px] font-jakarta text-ink/40">
                            ({nights} nt{nights > 1 ? 's' : ''})
                          </span>
                        </div>
                      </div>

                      {/* Guest Allocation Steppers (Strictly Enforcing Max Capacity) */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Adults Stepper */}
                        <div className="p-3 bg-white border border-skynest-hairline">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/60">
                              Adults (Min 1) *
                            </label>
                            <span className="text-[9px] font-jakarta text-ink/40 uppercase">
                              Max {Math.max(1, room.maxGuests - room.children)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => updateRoomAdults(room.index, -1)}
                              disabled={room.adults <= 1}
                              className="w-7 h-7 flex items-center justify-center border border-skynest-hairline text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                              title="Minimum 1 adult required per room"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, room.maxGuests - room.children)}
                              value={room.adults}
                              onChange={(e) => setRoomAdultsDirect(room.index, parseInt(e.target.value, 10))}
                              className="w-12 text-center font-jakarta font-bold text-sm bg-transparent outline-none text-ink"
                            />
                            <button
                              type="button"
                              onClick={() => updateRoomAdults(room.index, 1)}
                              disabled={room.adults + room.children >= room.maxGuests}
                              className="w-7 h-7 flex items-center justify-center border border-skynest-hairline text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                              title={room.adults + room.children >= room.maxGuests ? `Room capacity reached (Max ${room.maxGuests})` : "Add adult"}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Children Stepper */}
                        <div className="p-3 bg-white border border-skynest-hairline">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/60">
                              Children (0–11 yrs)
                            </label>
                            <span className="text-[9px] font-jakarta text-ink/40 uppercase">
                              Max {Math.max(0, room.maxGuests - room.adults)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => updateRoomChildren(room.index, -1)}
                              disabled={room.children <= 0}
                              className="w-7 h-7 flex items-center justify-center border border-skynest-hairline text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={Math.max(0, room.maxGuests - room.adults)}
                              value={room.children}
                              onChange={(e) => setRoomChildrenDirect(room.index, parseInt(e.target.value, 10))}
                              className="w-12 text-center font-jakarta font-bold text-sm bg-transparent outline-none text-ink"
                            />
                            <button
                              type="button"
                              onClick={() => updateRoomChildren(room.index, 1)}
                              disabled={room.adults + room.children >= room.maxGuests}
                              className="w-7 h-7 flex items-center justify-center border border-skynest-hairline text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                              title={room.adults + room.children >= room.maxGuests ? `Room capacity reached (Max ${room.maxGuests})` : "Add child"}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* If room has children: Individual child ages for this room */}
                      {room.children > 0 && (
                        <div className="p-3 bg-[#FDFCFA] border border-skynest-hairline space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/70">
                              Child Age{room.children > 1 ? 's' : ''} (Ages 0–11)
                            </span>
                            <span className="text-[9px] font-jakarta text-ink/50 uppercase">
                              {room.children} Child{room.children > 1 ? 'ren' : ''} in Room {room.roomNumber}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Array.from({ length: room.children }).map((_, cIdx) => (
                              <div key={cIdx} className="flex flex-col gap-1 p-1.5 bg-white border border-skynest-hairline">
                                <span className="text-[9px] font-jakarta font-semibold uppercase tracking-wider text-ink/60">
                                  Child {cIdx + 1}
                                </span>
                                <select
                                  value={room.childAges[cIdx] ?? 0}
                                  onChange={(e) => updateRoomChildAge(room.index, cIdx, parseInt(e.target.value, 10))}
                                  className="w-full px-2 py-1 text-xs font-jakarta bg-[#FDFCFA] border border-skynest-hairline text-ink outline-none focus:border-skynest-accent cursor-pointer"
                                >
                                  {Array.from({ length: 12 }).map((_, a) => (
                                    <option key={a} value={a}>
                                      {a === 0 ? 'Under 1 yr (Infant)' : `${a} yr${a > 1 ? 's' : ''} old`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Multiple Meal Plan Selection directly on EACH room card */}
                      <div className="pt-2 border-t border-skynest-hairline space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/70">
                            Meal Plan for Room {room.roomNumber}
                          </label>
                          <span className="text-[10px] font-jakarta text-skynest-accent font-semibold">
                            {currentPlan.name} ({currentPlan.price === 0 ? 'Included' : `+$${currentPlan.price}/nt`})
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {MEAL_PLANS.map(plan => {
                            const isSel = room.mealPlanId === plan.id;
                            return (
                              <div
                                key={plan.id}
                                onClick={() => updateRoomMealPlan(room.index, plan.id)}
                                className={`p-2.5 border cursor-pointer transition-all flex flex-col justify-between ${
                                  isSel
                                    ? 'border-skynest-accent bg-skynest-accent/[0.08] shadow-xs'
                                    : 'border-skynest-hairline bg-white hover:border-ink/40'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-cinzel text-xs font-bold text-ink uppercase truncate">
                                    {plan.name}
                                  </span>
                                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSel ? 'border-skynest-accent bg-skynest-accent' : 'border-ink/30'
                                  }`}>
                                    {isSel && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                </div>
                                <p className="font-jakarta text-[10px] text-ink/50 mt-1 line-clamp-1">{plan.description}</p>
                                <span className={`text-[11px] font-jakarta font-bold mt-2 text-right ${
                                  isSel ? 'text-skynest-accent' : 'text-ink/70'
                                }`}>
                                  {plan.price === 0 ? 'Included' : `+$${plan.price}/nt`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SECTION 02: Primary Guest Details ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm space-y-6">
              <div className="pb-4 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    02
                  </span>
                  Primary Guest Contact Information
                </h2>
                <p className="font-jakarta text-xs text-ink/50 mt-1">
                  The primary contact person responsible for this single reservation across all {rooms.length} room{rooms.length > 1 ? 's' : ''}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Special Requests / Dietary Requirements
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Connecting rooms, quiet floor, dietary restrictions, airport pickup..."
                  className="w-full px-3.5 py-3 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                />
              </div>
            </div>

            {/* ── SECTION 03: Consolidated Reservation Summary & Statutory Taxes ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm space-y-6">
              <div className="pb-4 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    03
                  </span>
                  Consolidated Reservation Summary & Bill
                </h2>
                <p className="font-jakarta text-xs text-ink/50 mt-1">
                  Itemized breakdown of accommodation for all {rooms.length} room{rooms.length > 1 ? 's' : ''}, individual meal plans, and Sri Lankan statutory taxes.
                </p>
              </div>

              {/* Trip Overview Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#FDFCFA] border border-skynest-hairline text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Branch</span>
                  <span className="font-medium text-ink">{branch?.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Room Types</span>
                  <span className="font-medium text-ink">
                    {Array.from(new Set(rooms.map(r => r.roomTypeName))).join(' & ')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-ink/40 mb-0.5">Rooms & Guests</span>
                  <span className="font-medium text-ink">{rooms.length} Room{rooms.length > 1 ? 's' : ''} • {totalAdults} Ad, {totalChildren} Ch</span>
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

              {/* Comprehensive Financial Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Itemized Lines (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Room Accommodation itemized */}
                  <div className="space-y-1.5 text-xs font-jakarta">
                    <div className="flex justify-between items-center text-ink font-semibold border-b border-skynest-hairline pb-1">
                      <span>Room Accommodation ({rooms.length} Room{rooms.length > 1 ? 's' : ''} × {nights} Night{nights > 1 ? 's' : ''})</span>
                      <span>${totalRoomCost.toFixed(2)}</span>
                    </div>
                    {rooms.map((rm) => (
                      <div key={rm.index} className="flex justify-between items-center text-ink/60 text-[11px] pl-3">
                        <span>Room {rm.roomNumber} ({rm.roomTypeName}): {nights} nt × ${rm.baseRate}/nt</span>
                        <span>${(rm.baseRate * nights).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Meal charges itemized */}
                  <div className="space-y-1.5 text-xs font-jakarta pt-2">
                    <div className="flex justify-between items-center text-ink font-semibold border-b border-skynest-hairline pb-1">
                      <span>Meal Plans ({rooms.length} Room{rooms.length > 1 ? 's' : ''})</span>
                      <span>${totalMealCost.toFixed(2)}</span>
                    </div>
                    {roomCalculations.map((rm) => (
                      <div key={rm.index} className="flex justify-between items-center text-ink/60 text-[11px] pl-3">
                        <span>Room {rm.roomNumber}: {rm.planName} {rm.planPrice > 0 ? `(${nights} nt × $${rm.planPrice})` : '(Included)'}</span>
                        <span>${rm.mealCost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Base Subtotal */}
                  <div className="flex justify-between items-center text-ink font-bold text-xs pt-2 border-t border-skynest-hairline">
                    <span>Base Subtotal (Net of Taxes)</span>
                    <span>${baseAmount.toFixed(2)}</span>
                  </div>

                  {/* 4-Tier Tax Cascade itemized */}
                  <div className="space-y-1 text-[11px] font-jakarta text-ink/60 pt-2 border-t border-skynest-hairline">
                    <div className="flex justify-between items-center">
                      <span>Service Charge (SC 10%)</span>
                      <span>+${taxes.scTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tourism Development Levy (TDL 1%)</span>
                      <span>+${taxes.tdlTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Social Security Contribution Levy (SSCL 2.5%)</span>
                      <span>+${taxes.sscTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Value Added Tax (VAT 18%)</span>
                      <span>+${taxes.vatTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-ink/80 font-medium pt-1 border-t border-dashed border-skynest-hairline">
                      <span>Total Statutory Levies & Taxes</span>
                      <span>+${taxes.totalTaxes.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total Card and Submission Button (5 Cols) */}
                <div className="lg:col-span-5 p-6 bg-[#FDFCFA] border border-skynest-hairline flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[10px] font-jakarta uppercase tracking-wider text-ink/40 block mb-1">
                      Estimated Grand Total
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-cinzel text-3xl font-normal text-skynest-accent">
                        ${grandTotal.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-jakarta text-ink/50 uppercase font-semibold">
                        All Taxes Included
                      </span>
                    </div>
                    <p className="text-[10px] font-jakarta text-ink/40 mt-2">
                      Covers all accommodation for {rooms.length} room{rooms.length > 1 ? 's' : ''}, individual meal plans, and statutory levies (SC, TDL, SSCL, VAT).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Confirming Reservation…' : `Confirm Reservation (${rooms.length} Room${rooms.length > 1 ? 's' : ''} • $${grandTotal.toFixed(2)})`}
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
