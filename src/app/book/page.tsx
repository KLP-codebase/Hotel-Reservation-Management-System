'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Room {
  room_id: number;
  room_number: string;
  floor: number;
}

interface SearchParams {
  branch_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
}

// ── Static data (matches seed data in the database) ──────────────────────────
const BRANCHES = [
  { id: '1', name: 'Sky Nest Colombo' },
  { id: '2', name: 'Sky Nest Galle' },
  { id: '3', name: 'Sky Nest Kandy' },
];

const ROOM_TYPES = [
  { id: '1', name: 'Standard' },
  { id: '2', name: 'Deluxe' },
  { id: '3', name: 'Suite' },
  { id: '4', name: 'Presidential' },
];

// ── Page Component ─────────────────────────────────────────────────────────────
export default function BookPage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ── State (LOGIC — understand these) ─────────────────────────────────────
  const [params, setParams] = useState<SearchParams>({
    branch_id: '',
    room_type_id: '',
    check_in: '',
    check_out: '',
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // ── GSAP Animations (AI handles) ─────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero lines rise up on page load
      gsap.from('.sn-hero-line', {
        yPercent: 120,
        opacity: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.12,
        delay: 0.1,
      });
      // Form card floats up
      gsap.from(formRef.current, {
        y: 48,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out',
        delay: 0.55,
      });
    });
    return () => ctx.revert(); // cleanup on unmount
  }, []);

  // Animate room cards in when results appear
  useEffect(() => {
    if (!searched || loading || rooms.length === 0) return;
    gsap.from('.sn-room-card', {
      y: 56,
      opacity: 0,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.09,
    });
  }, [rooms, loading, searched]);

  // ── Handlers (LOGIC — understand these) ──────────────────────────────────

  // Runs every time a form field changes
  function handleChange(e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    setParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Runs when user clicks "Search Available Rooms"
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    // Validate: all fields required
    if (!params.branch_id || !params.room_type_id || !params.check_in || !params.check_out) {
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

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const qs = new URLSearchParams({
        branch_id: params.branch_id,
        room_type_id: params.room_type_id,
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

  // Runs when user clicks "Book" on a room card
  function handleBook(room: Room) {
    const qs = new URLSearchParams({
      room_id: String(room.room_id),
      room_type_id: params.room_type_id,
      branch_id: params.branch_id,
      check_in: params.check_in,
      check_out: params.check_out,
    });
    router.push(`/book/confirm?${qs}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedBranch = BRANCHES.find(b => b.id === params.branch_id);
  const selectedRoomType = ROOM_TYPES.find(r => r.id === params.room_type_id);
  const today = new Date().toISOString().split('T')[0];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFCFA' }}>

      {/* ── Minimal Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{ backgroundColor: 'rgba(253,252,250,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E4E1DA' }}>
        <Link href="/" className="font-cinzel text-lg font-semibold tracking-wide" style={{ color: '#0B2540' }}>
          Sky Nest
        </Link>
        <Link href="/" className="font-jakarta text-sm font-medium hover:opacity-60 transition-opacity" style={{ color: '#0B2540' }}>
          ← Back to Home
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef}
        className="flex flex-col items-center justify-center px-6 pt-40 pb-24 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #0B2540 0%, #122d4a 55%, #0d2035 100%)' }}>

        {/* Orange radial glow accent */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(217,114,44,0.25) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="overflow-hidden mb-3">
            <p className="sn-hero-line font-jakarta text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#D9722C' }}>
              Reserve Your Stay
            </p>
          </div>
          <div className="overflow-hidden mb-5">
            <h1 className="sn-hero-line font-cinzel text-4xl md:text-6xl font-semibold leading-tight" style={{ color: '#FDFCFA' }}>
              Find Your Room
            </h1>
          </div>
          <div className="overflow-hidden">
            <p className="sn-hero-line font-jakarta text-base leading-relaxed" style={{ color: '#B7C2CC' }}>
              Pick your branch, room type, and dates — we'll show you what's available instantly.
            </p>
          </div>
        </div>
      </section>

      {/* ── Search Form (floats up over the hero bottom) ──────────────── */}
      <section className="px-6 max-w-4xl mx-auto -mt-10 mb-16 relative z-10">
        <form ref={formRef} onSubmit={handleSearch}
          className="rounded-2xl p-6 md:p-8 shadow-2xl"
          style={{ backgroundColor: '#fff', border: '1px solid #E4E1DA' }}>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

            {/* Branch selector */}
            <div className="flex flex-col gap-2">
              <label className="font-jakarta text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(11,37,64,0.5)' }}>
                Branch
              </label>
              <select name="branch_id" value={params.branch_id} onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg font-jakarta text-sm focus:outline-none transition-colors duration-200"
                style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}>
                <option value="">Select a branch…</option>
                {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Room type selector */}
            <div className="flex flex-col gap-2">
              <label className="font-jakarta text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(11,37,64,0.5)' }}>
                Room Type
              </label>
              <select name="room_type_id" value={params.room_type_id} onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg font-jakarta text-sm focus:outline-none transition-colors duration-200"
                style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }}>
                <option value="">Select room type…</option>
                {ROOM_TYPES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Check-in */}
            <div className="flex flex-col gap-2">
              <label className="font-jakarta text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(11,37,64,0.5)' }}>
                Check-in Date
              </label>
              <input type="date" name="check_in" value={params.check_in} onChange={handleChange} min={today}
                className="w-full px-4 py-3 rounded-lg font-jakarta text-sm focus:outline-none transition-colors duration-200"
                style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }} />
            </div>

            {/* Check-out */}
            <div className="flex flex-col gap-2">
              <label className="font-jakarta text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(11,37,64,0.5)' }}>
                Check-out Date
              </label>
              <input type="date" name="check_out" value={params.check_out} onChange={handleChange}
                min={params.check_in || today}
                className="w-full px-4 py-3 rounded-lg font-jakarta text-sm focus:outline-none transition-colors duration-200"
                style={{ border: '1px solid #E4E1DA', backgroundColor: '#FDFCFA', color: '#0B2540' }} />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg font-jakarta text-sm"
              style={{ backgroundColor: '#fff1f0', border: '1px solid #ffccc7', color: '#cf1322' }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-lg font-jakarta font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0B2540', color: '#FDFCFA' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#D9722C')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0B2540')}>
            {loading ? 'Searching…' : 'Search Available Rooms'}
          </button>
        </form>
      </section>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {searched && (
        <section className="px-6 pb-28 max-w-4xl mx-auto">

          {/* Result heading */}
          <div className="mb-6">
            <h2 className="font-cinzel text-2xl font-semibold" style={{ color: '#0B2540' }}>
              {loading
                ? 'Searching…'
                : rooms.length > 0
                  ? `${rooms.length} Room${rooms.length > 1 ? 's' : ''} Available`
                  : 'No Rooms Available'}
            </h2>
            {!loading && selectedBranch && selectedRoomType && (
              <p className="font-jakarta text-sm mt-1" style={{ color: '#B7C2CC' }}>
                {selectedRoomType.name} · {selectedBranch.name} · {params.check_in} → {params.check_out}
              </p>
            )}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: '#E4E1DA' }} />
              ))}
            </div>
          )}

          {/* Room cards */}
          {!loading && rooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map(room => (
                <div key={room.room_id} className="sn-room-card flex items-center justify-between p-6 rounded-xl transition-all duration-300"
                  style={{ backgroundColor: '#fff', border: '1px solid #E4E1DA' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#D9722C'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(217,114,44,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E1DA'; e.currentTarget.style.boxShadow = 'none'; }}>

                  <div>
                    <p className="font-jakarta text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#B7C2CC' }}>
                      {selectedRoomType?.name ?? 'Room'}
                    </p>
                    <h3 className="font-cinzel text-xl font-semibold" style={{ color: '#0B2540' }}>
                      Room {room.room_number}
                    </h3>
                    <p className="font-jakarta text-sm mt-1" style={{ color: '#B7C2CC' }}>
                      Floor {room.floor} · {selectedBranch?.name}
                    </p>
                  </div>

                  <button onClick={() => handleBook(room)}
                    className="ml-4 flex-shrink-0 px-5 py-2.5 rounded-lg font-jakarta font-semibold text-sm transition-all duration-300"
                    style={{ border: '1px solid #0B2540', color: '#0B2540', backgroundColor: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#D9722C'; e.currentTarget.style.borderColor = '#D9722C'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#0B2540'; e.currentTarget.style.color = '#0B2540'; }}>
                    Book
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && searched && rooms.length === 0 && !error && (
            <div className="text-center py-20">
              <p className="font-cinzel text-xl mb-3" style={{ color: 'rgba(11,37,64,0.3)' }}>No rooms available</p>
              <p className="font-jakarta text-sm" style={{ color: '#B7C2CC' }}>
                Try different dates, a different branch, or another room type.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
