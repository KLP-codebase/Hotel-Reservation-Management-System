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
  room_count: string;
  adults: string;
  children: string;
}

// ── Static data (matches Railway DB — branch UUIDs + ENUM room types) ────────
const BRANCHES = [
  { id: '953fd827-751c-47eb-a201-e0aac4bc444a', name: 'Sky Nest Colombo' },
  { id: 'af0167cd-c9eb-4ac5-ba22-cfd65cdc87a5', name: 'Sky Nest Kandy' },
  { id: '30a7b55d-9440-45c2-a990-08821af210ba', name: 'Sky Nest Galle' },
];

const ROOM_TYPES = [
  { id: 'ALL',          name: 'All Categories (Mixed Room Selection)' },
  { id: 'STANDARD',     name: 'Standard Room ($120/night)' },
  { id: 'DELUXE',       name: 'Deluxe Room ($180/night)' },
  { id: 'SUITE',        name: 'Suite ($280/night)' },
  { id: 'PRESIDENTIAL', name: 'Presidential Suite ($500/night)' },
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

// ── Room Booking Page ────────────────────────────────────────────────────────
export default function BookPage() {
  const router = useRouter();

  // Form parameters
  const [params, setParams] = useState<SearchParams>({
    branch_id: '',
    room_type: 'ALL', // Default to ALL to allow mixed room types!
    check_in: '',
    check_out: '',
    room_count: '1',
    adults: '1',
    children: '0',
  });

  // Search results state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const [childAges, setChildAges] = useState<number[]>([]);

  function syncChildAges(count: number) {
    setChildAges(prev => {
      if (count <= 0) return [];
      if (count === prev.length) return prev;
      if (count < prev.length) return prev.slice(0, count);
      const next = [...prev];
      while (next.length < count) {
        next.push(5);
      }
      return next;
    });
  }

  function updateChildAge(index: number, age: number) {
    const safeAge = Math.min(11, Math.max(0, isNaN(age) ? 0 : age));
    setChildAges(prev => {
      const next = [...prev];
      next[index] = safeAge;
      return next;
    });
  }

  // GSAP animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── GSAP Scroll Trigger for Hero Elements ──────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.sn-hero-line', {
        yPercent: 100,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.05,
      });

      gsap.from('.sn-booking-card', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        ease: 'power3.out',
        delay: 0.12,
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // ── GSAP Navbar Interpolation on Scroll ────────────────────────────────────
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const progress = Math.min(scrollY / 150, 1);

      if (progress > 0.15) {
        nav.style.backgroundColor = `rgba(253, 252, 250, ${0.4 + progress * 0.45})`;
        nav.style.backdropFilter = 'blur(16px)';
        nav.style.setProperty('-webkit-backdrop-filter', 'blur(16px)');
        nav.style.borderBottomColor = `rgba(11, 37, 64, ${progress * 0.08})`;
        nav.style.boxShadow = `0 4px 20px rgba(11, 37, 64, ${progress * 0.04})`;

        const textEls = nav.querySelectorAll('.sn-nav-text');
        textEls.forEach(el => ((el as HTMLElement).style.color = '#0B2540'));
        const glyph = nav.querySelector('.sn-nav-glyph');
        if (glyph) (glyph as HTMLElement).style.color = '#0B2540';
      } else {
        nav.style.backgroundColor = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.setProperty('-webkit-backdrop-filter', 'none');
        nav.style.borderBottomColor = 'transparent';
        nav.style.boxShadow = 'none';

        const textEls = nav.querySelectorAll('.sn-nav-text');
        textEls.forEach(el => ((el as HTMLElement).style.color = '#FFFFFF'));
        const glyph = nav.querySelector('.sn-nav-glyph');
        if (glyph) (glyph as HTMLElement).style.color = '#FFFFFF';
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Animate room cards when search returns ─────────────────────────────────
  useEffect(() => {
    if (rooms.length === 0 || !resultsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.sn-room-card', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power3.out',
      });
    }, resultsRef);
    return () => ctx.revert();
  }, [rooms]);

  function scrollToResults() {
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  // ── Form Handlers ──────────────────────────────────────────────────────────
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  }

  // Room count changes
  function incrementRooms() {
    const current = parseInt(params.room_count, 10) || 1;
    const nextVal = Math.min(10, current + 1);
    setParams(prev => {
      const currentAdults = parseInt(prev.adults, 10) || 1;
      const nextAdults = Math.max(currentAdults, nextVal);
      return { ...prev, room_count: String(nextVal), adults: String(nextAdults) };
    });
  }

  function decrementRooms() {
    const current = parseInt(params.room_count, 10) || 1;
    const nextVal = Math.max(1, current - 1);
    setParams(prev => ({ ...prev, room_count: String(nextVal) }));
    // If selectedRooms exceeds new room count, trim selection
    setSelectedRooms(prev => prev.slice(0, nextVal));
  }

  function handleRoomCountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.replace(/[^0-9]/g, "");
    setParams(prev => ({ ...prev, room_count: clean }));
  }

  function handleRoomCountBlur() {
    const val = parseInt(params.room_count, 10);
    const finalVal = !val || val < 1 ? 1 : Math.min(10, val);
    setParams(prev => {
      const currentAdults = parseInt(prev.adults, 10) || 1;
      const nextAdults = Math.max(currentAdults, finalVal);
      return { ...prev, room_count: String(finalVal), adults: String(nextAdults) };
    });
    setSelectedRooms(prev => prev.slice(0, finalVal));
  }

  function handleRoomCountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      incrementRooms();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrementRooms();
    }
  }

  function handleAdultsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.replace(/[^0-9]/g, "");
    setParams(prev => ({ ...prev, adults: clean }));
  }

  function handleAdultsBlur() {
    const roomCount = parseInt(params.room_count, 10) || 1;
    const minAdults = Math.max(1, roomCount);
    const val = parseInt(params.adults, 10);
    if (!val || val < minAdults) {
      setParams(prev => ({ ...prev, adults: String(minAdults) }));
    } else if (val > 20) {
      setParams(prev => ({ ...prev, adults: "20" }));
    } else {
      setParams(prev => ({ ...prev, adults: String(val) }));
    }
  }

  function incrementAdults() {
    const current = parseInt(params.adults, 10) || 1;
    setParams(prev => ({ ...prev, adults: String(Math.min(20, current + 1)) }));
  }

  function decrementAdults() {
    const current = parseInt(params.adults, 10) || 1;
    const roomCount = parseInt(params.room_count, 10) || 1;
    const minAdults = Math.max(1, roomCount);
    if (current <= minAdults) {
      setError(`Each room requires at least 1 adult (${roomCount} room${roomCount > 1 ? "s" : ""} require${roomCount === 1 ? "s" : ""} at least ${roomCount} adult${roomCount > 1 ? "s" : ""}).`);
      return;
    }
    setError(null);
    setParams(prev => ({ ...prev, adults: String(Math.max(minAdults, current - 1)) }));
  }

  function handleAdultsKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      incrementAdults();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrementAdults();
    }
  }

  function handleChildrenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.replace(/[^0-9]/g, "");
    setParams(prev => ({ ...prev, children: clean }));
    const count = parseInt(clean, 10);
    if (!isNaN(count) && count >= 0 && count <= 20) {
      syncChildAges(count);
    }
  }

  function handleChildrenBlur() {
    const val = parseInt(params.children, 10);
    let finalCount = 0;
    if (isNaN(val) || val < 0) {
      finalCount = 0;
      setParams(prev => ({ ...prev, children: "0" }));
    } else if (val > 20) {
      finalCount = 20;
      setParams(prev => ({ ...prev, children: "20" }));
    } else {
      finalCount = val;
      setParams(prev => ({ ...prev, children: String(val) }));
    }
    syncChildAges(finalCount);
  }

  function incrementChildren() {
    const current = parseInt(params.children, 10) || 0;
    const next = Math.min(20, current + 1);
    setParams(prev => ({ ...prev, children: String(next) }));
    syncChildAges(next);
  }

  function decrementChildren() {
    const current = parseInt(params.children, 10) || 0;
    const next = Math.max(0, current - 1);
    setParams(prev => ({ ...prev, children: String(next) }));
    syncChildAges(next);
  }

  function handleChildrenKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      incrementChildren();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrementChildren();
    }
  }

  // ── Search Action ──────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const roomCount = Math.max(1, parseInt(params.room_count, 10) || 1);
    const minAdults = roomCount; // Rule: At least 1 adult per room!
    const adultCount = Math.max(minAdults, parseInt(params.adults, 10) || minAdults);
    const childCount = Math.max(0, parseInt(params.children, 10) || 0);

    if (
      params.room_count !== String(roomCount) ||
      params.adults !== String(adultCount) ||
      params.children !== String(childCount)
    ) {
      setParams(prev => ({
        ...prev,
        room_count: String(roomCount),
        adults: String(adultCount),
        children: String(childCount),
      }));
    }

    // Validate required fields
    if (!params.branch_id || !params.check_in || !params.check_out) {
      setError('Please select a branch and your stay dates before searching.');
      return;
    }
    if (params.check_out <= params.check_in) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectionWarning(null);
    setSelectedRooms([]); // Reset selection on new search
    setSearched(true);
    scrollToResults();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const qs = new URLSearchParams({
        branch_id: params.branch_id,
        check_in: params.check_in,
        check_out: params.check_out,
      });

      // Pass room_type only if a specific category was chosen
      if (params.room_type && params.room_type !== 'ALL') {
        qs.append('room_type', params.room_type);
      }

      const res = await fetch(`${apiUrl}/api/v1/availability?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Something went wrong.');

      const availableRooms: Room[] = data.data || [];
      setRooms(availableRooms);

      if (availableRooms.length < roomCount) {
        setError(`Only ${availableRooms.length} room${availableRooms.length === 1 ? '' : 's'} available for these dates (${roomCount} requested). Please adjust your room count or choose different dates.`);
      }
    } catch (err: any) {
      setError(err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Room Selection Toggle Handler ──────────────────────────────────────────
  const targetRoomCount = Math.max(1, parseInt(params.room_count, 10) || 1);

  function toggleRoomSelection(room: Room) {
    setSelectionWarning(null);
    const isAlreadySelected = selectedRooms.some(r => r.id === room.id);

    if (isAlreadySelected) {
      // Remove room
      setSelectedRooms(prev => prev.filter(r => r.id !== room.id));
    } else {
      // Check if limit reached
      if (selectedRooms.length >= targetRoomCount) {
        setSelectionWarning(`You have already chosen ${targetRoomCount} room${targetRoomCount > 1 ? 's' : ''}. Deselect a room from your selection below to pick this one instead.`);
        return;
      }
      setSelectedRooms(prev => [...prev, room]);
    }
  }

  // ── Proceed to Booking Confirmation ────────────────────────────────────────
  function handleProceed() {
    if (selectedRooms.length < targetRoomCount) {
      setSelectionWarning(`Please select ${targetRoomCount - selectedRooms.length} more room${targetRoomCount - selectedRooms.length === 1 ? '' : 's'} to fulfill your chosen count of ${targetRoomCount}.`);
      return;
    }

    const adultCount = Math.max(targetRoomCount, parseInt(params.adults, 10) || targetRoomCount);
    const childCount = Math.max(0, parseInt(params.children, 10) || 0);
    const totalPartyGuests = adultCount + childCount;

    // Capacity verification: Total capacity of all selected rooms must be >= total party guests
    const totalSelectedCapacity = selectedRooms.reduce((sum, r) => sum + (r.max_guests || 2), 0);
    if (totalPartyGuests > totalSelectedCapacity) {
      setSelectionWarning(`The selected rooms have a combined capacity of ${totalSelectedCapacity} guests, but your party has ${totalPartyGuests} guests (${adultCount} adult${adultCount > 1 ? 's' : ''}, ${childCount} child${childCount > 1 ? 'ren' : ''}). Please select rooms with higher capacity (e.g. Deluxe, Suite, or Presidential) or add more rooms.`);
      return;
    }

    const roomIds = selectedRooms.map(r => r.id).join(',');
    const roomNumbers = selectedRooms.map(r => r.number).join(',');
    const roomTypes = selectedRooms.map(r => r.type).join(',');
    const roomRates = selectedRooms.map(r => r.price_per_night).join(',');
    const roomCapacities = selectedRooms.map(r => r.max_guests || 2).join(',');

    const qs = new URLSearchParams({
      room_ids: roomIds,
      room_numbers: roomNumbers,
      room_types: roomTypes,
      room_rates: roomRates,
      room_capacities: roomCapacities,
      room_id: selectedRooms[0]?.id || '',
      room_type: selectedRooms[0]?.type || 'STANDARD',
      branch_id: params.branch_id,
      check_in: params.check_in,
      check_out: params.check_out,
      rooms: String(selectedRooms.length),
      adults: String(adultCount),
      children: String(childCount),
      child_ages: childAges.slice(0, childCount).join(','),
    });

    router.push(`/book/confirm?${qs}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedBranch = BRANCHES.find(b => b.id === params.branch_id);
  const today = new Date().toISOString().split('T')[0];

  // Category counts and filtered rooms
  const categories = ['ALL', 'STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL'];
  const filteredRooms = activeCategoryFilter === 'ALL'
    ? rooms
    : rooms.filter(r => r.type === activeCategoryFilter);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>

      {/* 6-column architectural hairline grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex z-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 border-l border-ink/[0.04] last:border-r" />
        ))}
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 transition-all duration-300 border-b border-transparent bg-transparent"
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <MountainGlyph className="sn-nav-glyph w-6 h-auto text-white transition-colors duration-300 group-hover:scale-105" />
          <span className="sn-nav-text font-jakarta font-bold text-[11px] tracking-[0.35em] uppercase text-white transition-colors duration-300">
            SKYNEST
          </span>
        </Link>
        <Link
          href="/"
          className="sn-nav-text flex items-center px-5 py-2 text-[11px] md:text-[12px] font-jakarta font-medium tracking-wider uppercase border border-white/30 text-white hover:border-white hover:bg-white/10 transition-all duration-200 rounded-none"
        >
          ← Home
        </Link>
      </nav>

      {/* Hero Header */}
      <section
        ref={heroRef}
        className="relative z-10 flex flex-col items-center justify-center px-6 pt-36 pb-32 md:pt-40 md:pb-36 text-center overflow-hidden border-b border-skynest-hairline bg-ink shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
      >
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
            Reservations
          </span>
          <h1 className="sn-hero-line font-cinzel text-3xl md:text-5xl font-normal uppercase tracking-wide text-white">
            Find Your Sanctuary
          </h1>
          <p className="sn-hero-line font-cinzel italic text-white/80 text-sm mt-2">
            Select your location, dates, and tailor your multi-room selection
          </p>
        </div>
      </section>

      {/* Cloud WebGL Shader Background */}
      <div className="relative min-h-[600px]">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <ShaderBackground className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFA]/50 via-transparent to-[#FDFCFA]/60 pointer-events-none" />
        </div>

        {/* Search Card */}
        <section className="relative z-20 max-w-4xl mx-auto px-6 -mt-20 md:-mt-24 pb-16">
          <form
            onSubmit={handleSearch}
            className="sn-booking-card p-6 md:p-10 rounded-none border border-skynest-hairline bg-white shadow-[0_24px_60px_rgba(11,37,64,0.12)] space-y-6"
          >
            <div className="pb-3 border-b border-skynest-hairline">
              <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink">
                Check Availability & Room Selection
              </h2>
              <p className="font-jakarta text-xs text-ink/50 mt-0.5">
                Book single or multiple rooms. You can choose different categories (e.g. 1 Deluxe and 1 Standard) for a single booking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch */}
              <div>
                <label className="block font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase mb-2 text-ink/70">
                  Location <span className="text-skynest-accent">*</span>
                </label>
                <select
                  name="branch_id"
                  value={params.branch_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200 cursor-pointer"
                  required
                >
                  <option value="">Select a Location</option>
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Type Filter */}
              <div>
                <label className="block font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase mb-2 text-ink/70">
                  Category Filter
                </label>
                <select
                  name="room_type"
                  value={params.room_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200 cursor-pointer"
                >
                  {ROOM_TYPES.map(rt => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Check-in */}
              <div>
                <label className="block font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase mb-2 text-ink/70">
                  Check-in Date <span className="text-skynest-accent">*</span>
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={params.check_in}
                  onChange={handleChange}
                  min={today}
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                  required
                />
              </div>

              {/* Check-out */}
              <div>
                <label className="block font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase mb-2 text-ink/70">
                  Check-out Date <span className="text-skynest-accent">*</span>
                </label>
                <input
                  type="date"
                  name="check_out"
                  value={params.check_out}
                  onChange={handleChange}
                  min={params.check_in || today}
                  className="w-full px-4 py-3.5 rounded-none font-jakarta text-sm border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors duration-200"
                  required
                />
              </div>

              {/* Rooms, Adults, Children Row (3 columns spanning full width) */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Rooms Selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="rooms-input" className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                      Rooms to Book <span className="text-skynest-accent">*</span>
                    </label>
                    <span className="font-jakarta text-[10px] text-ink/40 tracking-wider uppercase font-medium">
                      Max 10
                    </span>
                  </div>
                  <div className="relative flex items-center border border-skynest-hairline bg-[#FDFCFA] focus-within:border-skynest-accent transition-colors duration-200 h-[50px]">
                    <button
                      type="button"
                      onClick={decrementRooms}
                      disabled={targetRoomCount <= 1}
                      aria-label="Decrease rooms"
                      className="w-12 h-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.04] disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-r border-skynest-hairline cursor-pointer select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="relative flex-1 flex items-center justify-center h-full">
                      <input
                        id="rooms-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="room_count"
                        value={params.room_count}
                        onChange={handleRoomCountChange}
                        onBlur={handleRoomCountBlur}
                        onKeyDown={handleRoomCountKeyDown}
                        className="w-full h-full text-center font-jakarta text-sm font-semibold text-ink bg-transparent outline-none py-3 px-2 select-all"
                        placeholder="1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={incrementRooms}
                      disabled={targetRoomCount >= 10}
                      aria-label="Increase rooms"
                      className="w-12 h-full flex items-center justify-center text-ink/60 hover:text-skynest-accent hover:bg-skynest-accent/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-l border-skynest-hairline cursor-pointer select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Adults Selector (At least 1 adult per room required) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="adults-input" className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                      Total Adults <span className="text-skynest-accent">*</span>
                    </label>
                    <span className="font-jakarta text-[10px] text-skynest-accent tracking-wider uppercase font-semibold">
                      Min {targetRoomCount} (1/rm)
                    </span>
                  </div>
                  <div className="relative flex items-center border border-skynest-hairline bg-[#FDFCFA] focus-within:border-skynest-accent transition-colors duration-200 h-[50px]">
                    <button
                      type="button"
                      onClick={decrementAdults}
                      disabled={(parseInt(params.adults, 10) || 1) <= targetRoomCount}
                      aria-label="Decrease adults"
                      className="w-12 h-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.04] disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-r border-skynest-hairline cursor-pointer select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="relative flex-1 flex items-center justify-center h-full">
                      <input
                        id="adults-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="adults"
                        value={params.adults}
                        onChange={handleAdultsChange}
                        onBlur={handleAdultsBlur}
                        onKeyDown={handleAdultsKeyDown}
                        className="w-full h-full text-center font-jakarta text-sm font-semibold text-ink bg-transparent outline-none py-3 px-2 select-all"
                        placeholder="1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={incrementAdults}
                      disabled={(parseInt(params.adults, 10) || 1) >= 20}
                      aria-label="Increase adults"
                      className="w-12 h-full flex items-center justify-center text-ink/60 hover:text-skynest-accent hover:bg-skynest-accent/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-l border-skynest-hairline cursor-pointer select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Children Selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="children-input" className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                      Total Children
                    </label>
                    <span className="font-jakarta text-[10px] text-ink/40 tracking-wider uppercase font-medium">
                      Ages 0–11
                    </span>
                  </div>
                  <div className="relative flex items-center border border-skynest-hairline bg-[#FDFCFA] focus-within:border-skynest-accent transition-colors duration-200 h-[50px]">
                    <button
                      type="button"
                      onClick={decrementChildren}
                      disabled={(parseInt(params.children, 10) || 0) <= 0}
                      aria-label="Decrease children"
                      className="w-12 h-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.04] disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-r border-skynest-hairline cursor-pointer select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="relative flex-1 flex items-center justify-center h-full">
                      <input
                        id="children-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="children"
                        value={params.children}
                        onChange={handleChildrenChange}
                        onBlur={handleChildrenBlur}
                        onKeyDown={handleChildrenKeyDown}
                        className="w-full h-full text-center font-jakarta text-sm font-semibold text-ink bg-transparent outline-none py-3 px-2 select-all"
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={incrementChildren}
                      disabled={(parseInt(params.children, 10) || 0) >= 20}
                      aria-label="Increase children"
                      className="w-12 h-full flex items-center justify-center text-ink/60 hover:text-skynest-accent hover:bg-skynest-accent/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-l border-skynest-hairline cursor-pointer select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Individual Children Ages Input (Must be 0 to 11) */}
              {(parseInt(params.children, 10) || 0) > 0 && (
                <div className="col-span-1 md:col-span-2 p-4 sm:p-5 border border-skynest-hairline bg-[#FDFCFA] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-skynest-hairline/60">
                    <div className="flex items-center gap-2">
                      <span className="font-jakarta text-[11px] font-bold tracking-[0.18em] uppercase text-ink/70">
                        Age of Each Child at Check-in <span className="text-skynest-accent">*</span>
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-jakarta font-bold uppercase tracking-wider bg-skynest-accent/10 text-skynest-accent border border-skynest-accent/30">
                        {params.children} Child{parseInt(params.children, 10) > 1 ? 'ren' : ''}
                      </span>
                    </div>
                    <span className="font-jakarta text-[10px] text-ink/50 tracking-wider uppercase font-medium">
                      Children must be between 0 to 11 years
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {Array.from({ length: parseInt(params.children, 10) || 0 }).map((_, i) => {
                      const age = childAges[i] ?? 0;
                      return (
                        <div key={i} className="flex flex-col gap-1.5 p-2.5 bg-white border border-skynest-hairline">
                          <label className="font-jakarta text-[10px] font-bold tracking-wider uppercase text-ink/60">
                            Child {i + 1} Age
                          </label>
                          <select
                            value={age}
                            onChange={(e) => updateChildAge(i, parseInt(e.target.value, 10))}
                            className="w-full px-2.5 py-1.5 rounded-none font-jakarta text-xs font-semibold border border-skynest-hairline bg-[#FDFCFA] text-ink outline-none focus:border-skynest-accent transition-colors cursor-pointer"
                          >
                            {Array.from({ length: 12 }).map((_, a) => (
                              <option key={a} value={a}>
                                {a === 0 ? 'Under 1 yr (Infant)' : `${a} yr${a > 1 ? 's' : ''} old`}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Error Banner */}
            {error && (
              <div className="p-4 rounded-none border border-red-300 bg-red-50/60 text-red-700 font-jakarta text-xs flex items-center gap-2.5">
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
          <section ref={resultsRef} className="relative z-10 px-6 pb-32 max-w-5xl mx-auto scroll-mt-24">

            {/* Result Heading */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-4 border-b border-skynest-hairline gap-2 bg-white/70 backdrop-blur-sm p-4 rounded-none">
              <div>
                <p className="font-jakarta text-[10px] tracking-[0.25em] uppercase text-skynest-accent font-bold mb-1">
                  Available Inventory
                </p>
                <h2 className="font-cinzel text-2xl md:text-3xl font-normal uppercase tracking-[0.04em] text-ink">
                  {loading
                    ? 'Checking Availability…'
                    : rooms.length > 0
                      ? `${rooms.length} Room${rooms.length > 1 ? 's' : ''} Available`
                      : 'No Rooms Available'}
                </h2>
              </div>
              {!loading && selectedBranch && (
                <p className="font-jakarta text-xs tracking-wider uppercase text-ink/60">
                  {selectedBranch.name} · Target: {targetRoomCount} Room{targetRoomCount > 1 ? 's' : ''} · {params.adults} Adult{Number(params.adults) > 1 ? 's' : ''} · {params.check_in} → {params.check_out}
                </p>
              )}
            </div>

            {/* ── Selection Control Bar (Prominently Guides the User) ─────────── */}
            {!loading && rooms.length > 0 && (
              <div className="mb-8 p-5 md:p-6 bg-white border-2 border-skynest-accent/40 shadow-[0_12px_32px_rgba(11,37,64,0.08)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-jakarta text-[11px] font-bold uppercase tracking-wider text-ink/50 block mb-0.5">
                      Your Room Selection Progress
                    </span>
                    <h3 className="font-cinzel text-lg font-bold uppercase text-ink">
                      {selectedRooms.length} of {targetRoomCount} Room{targetRoomCount > 1 ? 's' : ''} Selected
                    </h3>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {selectedRooms.length < targetRoomCount ? (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-jakarta font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                        Please choose {targetRoomCount - selectedRooms.length} more room{targetRoomCount - selectedRooms.length === 1 ? '' : 's'} to proceed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-jakarta font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                        ✓ All {targetRoomCount} rooms selected — Ready to proceed
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-ink/[0.06] h-1.5 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-skynest-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, (selectedRooms.length / targetRoomCount) * 100)}%` }}
                  />
                </div>

                {/* Warning message if user tried to select more than chosen amount */}
                {selectionWarning && (
                  <div className="p-3 text-xs font-jakarta text-amber-900 bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <span>{selectionWarning}</span>
                    <button
                      type="button"
                      onClick={() => setSelectionWarning(null)}
                      className="text-xs font-bold text-amber-700 hover:underline ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Selected Rooms Chips and Proceed Action */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pt-3 border-t border-skynest-hairline gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRooms.length === 0 ? (
                      <span className="text-xs font-jakarta text-ink/40 italic">
                        Click &ldquo;+ Select Room&rdquo; on any available room below (you can mix Standard, Deluxe, Suite, etc.)
                      </span>
                    ) : (
                      selectedRooms.map((sr, idx) => (
                        <div
                          key={sr.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FDFCFA] border border-skynest-accent text-xs font-jakarta"
                        >
                          <span className="font-bold text-ink">Room {sr.number}</span>
                          <span className="text-skynest-accent text-[11px] font-semibold uppercase">
                            ({sr.type})
                          </span>
                          <span className="font-mono text-ink/60">
                            ${Number(sr.price_per_night)}/nt
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRoomSelection(sr)}
                            className="ml-1 text-ink/40 hover:text-red-600 transition-colors font-bold text-sm leading-none"
                            title="Remove this room"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Proceed Button: STRICTLY DISABLED IF LESS THAN CHOSEN AMOUNT IS SELECTED */}
                  <button
                    type="button"
                    onClick={handleProceed}
                    disabled={selectedRooms.length !== targetRoomCount}
                    className="px-6 py-3.5 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase transition-all duration-200 border border-ink flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent shadow-xs"
                  >
                    {selectedRooms.length === targetRoomCount
                      ? `Proceed to Booking (${targetRoomCount} Rooms) →`
                      : `Select ${targetRoomCount - selectedRooms.length} More Room${targetRoomCount - selectedRooms.length === 1 ? '' : 's'} (${selectedRooms.length}/${targetRoomCount})`}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Category Filter Bar */}
            {!loading && rooms.length > 0 && (
              <div className="flex items-center gap-1 mb-6 pb-2 overflow-x-auto text-xs">
                <span className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/40 mr-2 shrink-0">
                  Filter Category:
                </span>
                {categories.map(cat => {
                  const count = cat === 'ALL' ? rooms.length : rooms.filter(r => r.type === cat).length;
                  if (count === 0 && cat !== 'ALL') return null;
                  const isActive = activeCategoryFilter === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-3 py-1 font-jakarta font-semibold uppercase tracking-wider rounded-none border transition-all shrink-0 ${
                        isActive
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-white text-ink/70 border-skynest-hairline hover:border-ink/40 hover:text-ink'
                      }`}
                    >
                      {cat === 'ALL' ? `All Types (${count})` : `${cat} (${count})`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-44 rounded-none bg-white/80 animate-pulse shadow-[0_4px_16px_rgba(11,37,64,0.04)]" />
                ))}
              </div>
            )}

            {/* Available Room Cards */}
            {!loading && filteredRooms.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredRooms.map(room => {
                  const isSelected = selectedRooms.some(r => r.id === room.id);
                  const isTargetReached = selectedRooms.length >= targetRoomCount;

                  return (
                    <div
                      key={room.id}
                      className={`sn-room-card rounded-none p-6 md:p-7 flex flex-col justify-between transition-all duration-300 border ${
                        isSelected
                          ? 'bg-skynest-accent/[0.04] border-skynest-accent shadow-[0_12px_28px_rgba(217,114,44,0.12)]'
                          : 'bg-white border-skynest-hairline shadow-[0_8px_24px_rgba(11,37,64,0.05)] hover:border-ink/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-skynest-hairline">
                          <span className="font-jakarta text-[10px] font-bold tracking-[0.24em] uppercase text-skynest-accent">
                            {room.type} ROOM
                          </span>
                          <span className="font-cinzel text-sm font-semibold text-ink">
                            ${Number(room.price_per_night)}/night
                          </span>
                        </div>

                        <div className="py-4">
                          <h3 className="font-cinzel text-2xl font-normal uppercase tracking-[0.03em] text-ink">
                            Room {room.number}
                          </h3>
                          <p className="font-jakarta text-xs text-ink/60 mt-1 tracking-wider">
                            Floor {room.floor} · Accommodates up to {room.max_guests} Guests
                          </p>
                          {room.description && (
                            <p className="font-jakarta text-xs text-ink/40 mt-2 line-clamp-2">
                              {room.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Selection Toggle Button */}
                      <div className="pt-3 border-t border-skynest-hairline flex items-center justify-between">
                        <span className="text-[11px] font-jakarta text-ink/50">
                          {isSelected ? (
                            <strong className="text-skynest-accent">Selected for this booking</strong>
                          ) : isTargetReached ? (
                            <span>Target of {targetRoomCount} rooms met</span>
                          ) : (
                            <span>Available for stay</span>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleRoomSelection(room)}
                          className={`px-5 py-2.5 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer border ${
                            isSelected
                              ? 'bg-skynest-accent text-white border-skynest-accent shadow-xs'
                              : isTargetReached
                              ? 'border-skynest-hairline text-ink/50 bg-[#FDFCFA] hover:border-ink/40'
                              : 'border-ink text-ink bg-transparent hover:bg-ink hover:text-white'
                          }`}
                        >
                          {isSelected ? '✓ Selected (Remove)' : '+ Select Room'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!loading && searched && filteredRooms.length === 0 && !error && (
              <div className="text-center py-20 bg-white p-10 rounded-none shadow-[0_16px_40px_rgba(11,37,64,0.06)] border border-skynest-hairline">
                <MountainGlyph className="w-10 h-auto mx-auto mb-4 text-ink/20" />
                <h3 className="font-cinzel text-xl uppercase tracking-[0.06em] text-ink mb-2">
                  No Rooms Found in This Category
                </h3>
                <p className="font-jakarta text-xs tracking-wider uppercase text-ink/50 max-w-md mx-auto leading-relaxed">
                  Try switching to another category tab above, or check another location or date range.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
