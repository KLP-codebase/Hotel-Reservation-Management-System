'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Award,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  BedDouble,
  Sparkles,
  Search,
  LogOut,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Compass,
  Plus,
  X,
  UtensilsCrossed,
  HeartPulse,
  Car,
  Compass as CompassIcon,
  Home,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityService {
  serviceName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  usedAt: string;
}

interface ActivityStay {
  archiveId: string;
  bookingId: string;
  bookingRef: string;
  branchName: string;
  roomTypeName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPaid: number;
  loyaltyPoints: number;
  status: string;
  services: ActivityService[];
  isArchived: boolean;
}

interface GuestActivityData {
  guest: {
    guestId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  stats: {
    totalPoints: number;
    totalSpent: number;
    totalStays: number;
    loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  };
  bookings: ActivityStay[];
}

interface CatalogueItem {
  service_id: number;
  branch_id: string;
  service_name: string;
  category: string;
  base_price: string | number;
  is_active: boolean;
  branch_name?: string;
}

// ── Motion Guard ──────────────────────────────────────────────────────────────

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

// ── Formatting Utilities ──────────────────────────────────────────────────────

function fmtDateStr(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoString;
  }
}

function fmtMonthYear(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return isoString;
  }
}

const TIER_COLORS = {
  BRONZE: {
    bg: 'bg-stone-100 text-stone-800 border-stone-300',
    accent: 'text-amber-700',
  },
  SILVER: {
    bg: 'bg-slate-100 text-slate-800 border-slate-300',
    accent: 'text-slate-600',
  },
  GOLD: {
    bg: 'bg-amber-50 text-amber-900 border-amber-300',
    accent: 'text-amber-600',
  },
  PLATINUM: {
    bg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    accent: 'text-indigo-600',
  },
};

// ── Modal: Book Service for Guest Stay ────────────────────────────────────────

function BookServiceModal({
  stay,
  onClose,
  onSuccess,
}: {
  stay: ActivityStay;
  onClose: () => void;
  onSuccess: (serviceName: string) => void;
}) {
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [selectedService, setSelectedService] = useState<CatalogueItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [preferredDate, setPreferredDate] = useState<string>(
    stay.checkIn ? stay.checkIn.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function fetchCatalogue() {
      setLoading(true);
      try {
        const res = await apiFetch<{ data: CatalogueItem[] }>('/api/v1/services/catalogue?is_active=true');
        setCatalogue(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedService(res.data[0]);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed to retrieve available services.');
      } finally {
        setLoading(false);
      }
    }
    fetchCatalogue();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogue.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [catalogue]);

  const filteredCatalogue = useMemo(() => {
    if (categoryFilter === 'ALL') return catalogue;
    return catalogue.filter((c) => c.category === categoryFilter);
  }, [catalogue, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setSubmitting(true);
    setError(null);
    try {
      const isSpa = selectedService.category === 'Wellness';
      const isDining = selectedService.category === 'Dining';

      const body = {
        service_name: selectedService.service_name,
        category: selectedService.category,
        price_at_usage: Number(selectedService.base_price),
        quantity: Number(quantity),
        notes: notes.trim() ? notes.trim() : `Ordered for Room ${stay.roomNumber}`,
        date: preferredDate,
        appointment_time: isSpa ? timeSlot : undefined,
        meal_time: isDining ? timeSlot : undefined,
      };

      await apiFetch(`/api/v1/services/folio/${stay.bookingId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      onSuccess(selectedService.service_name);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to book service to room folio.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = selectedService ? Number(selectedService.base_price) * quantity : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-ink">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-skynest-hairline flex items-center justify-between">
          <div>
            <div className="text-[10px] font-jakarta uppercase tracking-[0.16em] text-skynest-accent font-semibold">
              Sanctuary Concierge &bull; {stay.branchName}
            </div>
            <h2 className="font-cinzel text-xl font-bold text-ink">
              Book Service or Amenity
            </h2>
            <div className="text-xs font-jakarta text-ink/60">
              Booking Ref: <span className="font-mono">{stay.bookingRef}</span> &bull; Room {stay.roomNumber}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink/60 hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs font-jakarta text-rose-800">
              {error}
            </div>
          )}

          {/* Categories Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold block">
              Filter by Service Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-jakarta transition-colors border ${
                    categoryFilter === cat
                      ? 'bg-ink text-white border-ink font-semibold'
                      : 'bg-white text-ink/70 border-skynest-hairline hover:border-ink'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold block">
              Choose Service / Amenity
            </label>
            {loading ? (
              <div className="py-6 text-center text-xs text-ink/60">Loading sanctuary services...</div>
            ) : filteredCatalogue.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink/60">No available services found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {filteredCatalogue.map((item) => {
                  const isSelected = selectedService?.service_id === item.service_id;
                  return (
                    <button
                      key={item.service_id}
                      type="button"
                      onClick={() => setSelectedService(item)}
                      className={`text-left p-3 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-skynest-accent bg-amber-50/40 shadow-sm ring-1 ring-skynest-accent'
                          : 'border-skynest-hairline bg-white hover:border-ink/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-jakarta text-xs font-semibold text-ink line-clamp-1">
                          {item.service_name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-skynest-accent shrink-0" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-jakarta text-ink/60">
                        <span className="text-[9px] uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 border border-stone-200">
                          {item.category}
                        </span>
                        <span className="font-semibold text-ink">
                          LKR {toNum(item.base_price).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-skynest-hairline">
            <div>
              <label className="text-[10px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-skynest-hairline px-3 py-2 text-xs font-jakarta focus:outline-none focus:border-skynest-accent"
              />
            </div>
            <div>
              <label className="text-[10px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold block mb-1">
                Requested Date
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full bg-white border border-skynest-hairline px-3 py-2 text-xs font-jakarta focus:outline-none focus:border-skynest-accent"
              />
            </div>
            <div>
              <label className="text-[10px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold block mb-1">
                Preferred Time
              </label>
              <input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-white border border-skynest-hairline px-3 py-2 text-xs font-jakarta focus:outline-none focus:border-skynest-accent"
              />
            </div>
          </div>

          {/* Special Requests / Notes */}
          <div>
            <label className="text-[10px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold block mb-1">
              Dietary Preferences / Special Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please deliver to room at 8:00 AM, extra towels, allergic to nuts..."
              className="w-full bg-white border border-skynest-hairline p-2.5 text-xs font-jakarta focus:outline-none focus:border-skynest-accent placeholder:text-ink/40"
            />
          </div>

          {/* Live Price Estimation */}
          <div className="bg-white border border-skynest-hairline p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-jakarta uppercase tracking-wider text-ink/50">
                Service Charge to Folio
              </div>
              <div className="text-xs font-jakarta text-ink/75">
                {selectedService?.service_name || 'Select a service'} ({quantity} &times;)
              </div>
            </div>
            <div className="text-right">
              <div className="font-cinzel text-lg font-bold text-skynest-accent">
                LKR {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] font-jakarta text-ink/50">Billed to Room {stay.roomNumber}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-jakarta uppercase tracking-wider text-ink/70 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedService}
              className="px-6 py-2.5 bg-ink hover:bg-skynest-accent text-white font-jakarta text-xs font-semibold uppercase tracking-[0.16em] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-skynest-accent" />
                  <span>Confirm Service Booking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function GuestActivityPage() {
  const { user, logout } = useAuth();
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GuestActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [bookingForStay, setBookingForStay] = useState<ActivityStay | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Accordion State
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

  const reducedMotion = usePrefersReducedMotion();

  // Fetch Guest Activity Dossier
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: GuestActivityData }>('/api/v1/guests/activity');
      setData(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to retrieve guest activity dossier.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Available Years
  const availableYears = useMemo(() => {
    if (!data?.bookings) return [];
    const years = new Set<string>();
    data.bookings.forEach((b) => {
      if (b.checkIn) {
        years.add(new Date(b.checkIn).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    if (!data?.bookings) return [];
    if (selectedYear === 'ALL') return data.bookings;
    return data.bookings.filter((b) => {
      if (!b.checkIn) return false;
      return new Date(b.checkIn).getFullYear().toString() === selectedYear;
    });
  }, [data, selectedYear]);

  // Rule 6.1: Monthly grouping toggle (>12 bookings threshold)
  const isHighVolume = filteredBookings.length > 12;

  const monthlyGroupedBookings = useMemo(() => {
    if (!isHighVolume || viewMode !== 'MONTHLY') return null;

    const map = new Map<string, { label: string; stays: ActivityStay[]; subtotalPoints: number; subtotalSpent: number }>();

    filteredBookings.forEach((stay) => {
      const my = fmtMonthYear(stay.checkIn);
      const existing = map.get(my) || { label: my, stays: [], subtotalPoints: 0, subtotalSpent: 0 };
      existing.stays.push(stay);
      existing.subtotalPoints += stay.loyaltyPoints || 0;
      existing.subtotalSpent += toNum(stay.totalPaid);
      map.set(my, existing);
    });

    return Array.from(map.values());
  }, [filteredBookings, isHighVolume, viewMode]);

  // Toggle Service Accordion
  const toggleServices = (bookingId: string) => {
    setExpandedServices((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  const handleServiceSuccess = (serviceName: string) => {
    const stayId = bookingForStay?.bookingId;
    setBookingForStay(null);
    setSuccessToast(`"${serviceName}" has been successfully booked and added to your room folio!`);
    if (stayId) {
      setExpandedServices((prev) => ({ ...prev, [stayId]: true }));
    }
    fetchData();
    setTimeout(() => setSuccessToast(null), 6000);
  };

  // GSAP reveal animation for booking items
  useEffect(() => {
    if (loading || reducedMotion || !contentContainerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = contentContainerRef.current?.querySelectorAll('[data-reveal]');
      if (!items || items.length === 0) return;

      gsap.fromTo(
        items,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
        }
      );
    }, contentContainerRef);

    return () => ctx.revert();
  }, [loading, filteredBookings, viewMode, reducedMotion]);

  const guestName = data?.guest?.firstName || user?.firstName || '';
  const totalBookingsCount = data?.bookings?.length || 0;

  return (
    <div className="relative bg-paper text-ink selection:bg-skynest-accent selection:text-white">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3.5 border border-skynest-accent shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-skynest-accent shrink-0" />
          <span className="font-jakarta text-xs">{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-white/60 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── BOOKINGS & ACTIVITY CONTENT ── */}
      <div
        id="stays-content"
        ref={contentContainerRef}
        className="relative bg-paper min-h-screen py-8 sm:py-12 pb-32"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          {/* Section Eyebrow & Title */}
          <div className="text-center space-y-3 pt-2 sm:pt-4">
            <MountainGlyph className="w-6 h-auto text-skynest-accent mx-auto" />
            <span className="font-jakarta text-[11px] font-semibold tracking-[0.2em] text-ink/50 uppercase block">
              Personal Sanctuary Dossier {guestName ? `\u2022 Welcome, ${guestName}` : ''}
            </span>
            <h1 className="font-cinzel text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[0.06em] text-ink uppercase">
              Your Bookings &amp; Rewards
            </h1>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-24 text-center space-y-4 bg-white border border-skynest-hairline">
              <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-jakarta text-xs text-ink/60 uppercase tracking-widest">
                Retrieving your sanctuary records...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8 bg-rose-50 border border-rose-200 text-center space-y-3">
              <p className="font-jakarta text-sm text-rose-800">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-300 bg-white text-xs font-jakarta font-medium text-rose-800 hover:bg-rose-50 transition-colors uppercase tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
              </button>
            </div>
          )}

          {/* Main Dashboard Cards */}
          {!loading && !error && data && (
            <>
              {/* ── Loyalty & Portfolio Summary Cards ─────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-reveal>
                {/* Tier Badge */}
                <div className="bg-white border border-skynest-hairline p-6 flex flex-col justify-between">
                  <span className="text-[10px] font-jakarta uppercase tracking-[0.16em] text-ink/50 font-semibold">
                    Member Tier
                  </span>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-skynest-accent/30 bg-amber-50/50 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-skynest-accent" />
                    </div>
                    <div>
                      <div className="font-cinzel text-lg font-bold text-ink">
                        {data.stats.loyaltyTier}
                      </div>
                      <div className="text-[11px] font-jakarta text-ink/60">Sky Nest Privilege</div>
                    </div>
                  </div>
                </div>

                {/* Points Earned */}
                <div className="bg-white border border-skynest-hairline p-6 flex flex-col justify-between">
                  <span className="text-[10px] font-jakarta uppercase tracking-[0.16em] text-ink/50 font-semibold">
                    Rewards Balance
                  </span>
                  <div className="mt-3">
                    <div className="font-cinzel text-3xl font-bold text-skynest-accent">
                      {data.stats.totalPoints.toLocaleString()} <span className="text-sm font-sans font-normal text-ink/60">PTS</span>
                    </div>
                    <div className="text-[11px] font-jakarta text-ink/60 mt-0.5">1 pt per 10 LKR settled</div>
                  </div>
                </div>

                {/* Total Expenditure Settled */}
                <div className="bg-white border border-skynest-hairline p-6 flex flex-col justify-between">
                  <span className="text-[10px] font-jakarta uppercase tracking-[0.16em] text-ink/50 font-semibold">
                    Total Settled
                  </span>
                  <div className="mt-3">
                    <div className="font-cinzel text-2xl font-bold text-ink">
                      LKR {toNum(data.stats.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] font-jakarta text-ink/60 mt-0.5">Across all properties</div>
                  </div>
                </div>

                {/* Stays Count */}
                <div className="bg-white border border-skynest-hairline p-6 flex flex-col justify-between">
                  <span className="text-[10px] font-jakarta uppercase tracking-[0.16em] text-ink/50 font-semibold">
                    Sanctuary Stays
                  </span>
                  <div className="mt-3">
                    <div className="font-cinzel text-3xl font-bold text-ink">
                      {data.stats.totalStays}
                    </div>
                    <div className="text-[11px] font-jakarta text-ink/60 mt-0.5">
                      {data.stats.totalStays === 1 ? 'Completed journey' : 'Completed journeys'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Filter Bar & High-Volume View Controller ────────────── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-b border-skynest-hairline pb-4" data-reveal>
                {/* Year Selectors */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-jakarta font-semibold text-ink/50 uppercase tracking-wider mr-1">
                    Timeline:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedYear('ALL')}
                    className={`px-3 py-1.5 text-xs font-jakarta font-medium transition-colors border ${
                      selectedYear === 'ALL'
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink/70 border-skynest-hairline hover:border-ink'
                    }`}
                  >
                    All Stays ({data.bookings.length})
                  </button>
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`px-3 py-1.5 text-xs font-jakarta font-medium transition-colors border ${
                        selectedYear === yr
                          ? 'bg-ink text-white border-ink'
                          : 'bg-white text-ink/70 border-skynest-hairline hover:border-ink'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>

                {/* Rule 6.1: Monthly Breakdown Segmented Toggle (>12 threshold) */}
                {isHighVolume && (
                  <div className="flex items-center gap-1 bg-stone-100 p-1 border border-skynest-hairline">
                    <button
                      type="button"
                      onClick={() => setViewMode('ANNUAL')}
                      className={`px-3 py-1 text-xs font-jakarta font-medium transition-colors ${
                        viewMode === 'ANNUAL' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                      }`}
                    >
                      Annual Dossier
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('MONTHLY')}
                      className={`px-3 py-1 text-xs font-jakarta font-medium transition-colors ${
                        viewMode === 'MONTHLY' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                      }`}
                    >
                      Monthly Breakdown
                    </button>
                  </div>
                )}
              </div>

              {/* ── Empty State ────────────────────────────────────────── */}
              {filteredBookings.length === 0 && (
                <div className="py-20 text-center space-y-4 bg-white border border-skynest-hairline p-8" data-reveal>
                  <Compass className="w-10 h-10 text-skynest-accent mx-auto" />
                  <h3 className="font-cinzel text-xl font-bold text-ink">
                    No Recorded Stays for this Period
                  </h3>
                  <p className="font-jakarta text-xs text-ink/60 max-w-md mx-auto">
                    You do not have any bookings registered for this selected timeline. Experience our luxury sanctuaries across Colombo, Galle, or Kandy.
                  </p>
                  <Link
                    href="/book"
                    className="inline-block mt-3 px-6 py-3 bg-ink hover:bg-skynest-accent text-white font-jakarta text-xs font-semibold uppercase tracking-[0.18em] transition-colors"
                  >
                    Reserve a Sanctuary Room
                  </Link>
                </div>
              )}

              {/* ── Monthly Grouped View (>12 threshold active) ───────── */}
              {isHighVolume && viewMode === 'MONTHLY' && monthlyGroupedBookings ? (
                <div className="space-y-8" data-reveal>
                  {monthlyGroupedBookings.map((group) => (
                    <div key={group.label} className="space-y-4">
                      {/* Month Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-skynest-hairline/80 gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-ink text-white font-cinzel text-xs flex items-center justify-center font-bold">
                            {group.stays.length}
                          </div>
                          <div>
                            <h2 className="font-cinzel text-lg font-semibold text-ink uppercase tracking-wide">
                              {group.label}
                            </h2>
                            <span className="font-jakarta text-xs text-ink/60">
                              {group.stays.length} {group.stays.length === 1 ? 'sanctuary stay' : 'sanctuary stays'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-jakarta">
                          <div className="bg-white border border-skynest-hairline px-3 py-1.5">
                            <span className="text-ink/60 mr-1.5">Points:</span>
                            <span className="font-semibold text-skynest-accent">+{group.subtotalPoints} PTS</span>
                          </div>
                          <div className="bg-white border border-skynest-hairline px-3 py-1.5">
                            <span className="text-ink/60 mr-1.5">Spend:</span>
                            <span className="font-semibold text-ink">
                              LKR {toNum(group.subtotalSpent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Month Bookings List */}
                      <div className="space-y-4">
                        {group.stays.map((stay) => (
                          <StayCard
                            key={stay.bookingId}
                            stay={stay}
                            expanded={!!expandedServices[stay.bookingId]}
                            onToggle={() => toggleServices(stay.bookingId)}
                            onBookService={() => setBookingForStay(stay)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── Standard / Annual View ─────────────────────────────── */
                <div className="space-y-4">
                  {filteredBookings.map((stay) => (
                    <div key={stay.bookingId} data-reveal>
                      <StayCard
                        stay={stay}
                        expanded={!!expandedServices[stay.bookingId]}
                        onToggle={() => toggleServices(stay.bookingId)}
                        onBookService={() => setBookingForStay(stay)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Book Service Modal */}
      {bookingForStay && (
        <BookServiceModal
          stay={bookingForStay}
          onClose={() => setBookingForStay(null)}
          onSuccess={handleServiceSuccess}
        />
      )}
    </div>
  );
}

// ── Stay Card Component ───────────────────────────────────────────────────────

function StayCard({
  stay,
  expanded,
  onToggle,
  onBookService,
}: {
  stay: ActivityStay;
  expanded: boolean;
  onToggle: () => void;
  onBookService: () => void;
}) {
  const isCompleted = stay.status === 'CHECKED_OUT';

  return (
    <div className="border border-skynest-hairline bg-white p-5 sm:p-6 transition-shadow hover:shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sanctuary & Stay Metadata */}
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="font-cinzel text-base sm:text-lg font-bold text-ink tracking-wide">
              {stay.branchName}
            </span>
            <span className="w-px h-3.5 bg-ink/20" />
            <span className="font-jakarta text-xs text-ink/75 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-skynest-accent" />
              Room {stay.roomNumber} ({stay.roomTypeName})
            </span>
            <span
              className={`text-[9px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 border ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isCompleted ? 'COMPLETED' : stay.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-jakarta text-ink/60">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-ink/40" />
              {fmtDateStr(stay.checkIn)} &mdash; {fmtDateStr(stay.checkOut)}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ink/40" />
              {stay.nights} {stay.nights === 1 ? 'Night' : 'Nights'}
            </span>
            <span>&bull;</span>
            <span className="font-mono text-[11px] text-ink/50 uppercase">Ref: {stay.bookingRef}</span>
          </div>
        </div>

        {/* Financials & Loyalty Badge */}
        <div className="flex items-center gap-6 self-start lg:self-auto shrink-0 pt-2 lg:pt-0">
          <div className="text-right">
            <div className="font-jakarta text-[11px] text-ink/50 uppercase tracking-wider">Total Settled</div>
            <div className="font-cinzel text-base sm:text-lg font-bold text-ink">
              LKR {toNum(stay.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="text-right border-l border-skynest-hairline pl-5">
            <div className="font-jakarta text-[11px] text-skynest-accent uppercase tracking-wider font-semibold">
              Rewards Earned
            </div>
            <div className="font-cinzel text-base sm:text-lg font-bold text-skynest-accent flex items-center justify-end gap-1">
              <Award className="w-4 h-4" />
              +{stay.loyaltyPoints} PTS
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Itemized Accordion Toggle + Book Service Action */}
      <div className="mt-4 pt-3.5 border-t border-skynest-hairline/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {stay.services && stay.services.length > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1.5 font-jakarta text-xs text-ink/75 hover:text-skynest-accent transition-colors font-medium select-none"
            >
              <span>
                {expanded ? 'Hide' : 'View'} Itemized Services &amp; Amenities ({stay.services.length})
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="font-jakarta text-xs text-ink/40 italic">
              No extra services billed yet
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onBookService}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase bg-ink text-white hover:bg-skynest-accent transition-colors duration-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-skynest-accent" />
          <span>Book Service / Amenity</span>
        </button>
      </div>

      {/* Expandable Accordion Body */}
      {expanded && stay.services && stay.services.length > 0 && (
        <div className="mt-3 bg-paper/60 border border-skynest-hairline p-4 rounded-none space-y-2">
          <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider font-semibold text-ink/50 pb-2 border-b border-skynest-hairline">
            <span className="col-span-6">Service / Amenity</span>
            <span className="col-span-2 text-center">Category</span>
            <span className="col-span-2 text-center">Qty x Unit</span>
            <span className="col-span-2 text-right">Total (LKR)</span>
          </div>
          {stay.services.map((svc, idx) => (
            <div key={idx} className="grid grid-cols-12 text-xs font-jakarta text-ink/80 py-1.5 items-center">
              <div className="col-span-6 font-medium text-ink flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-skynest-accent shrink-0" />
                <span className="truncate">{svc.serviceName}</span>
              </div>
              <div className="col-span-2 text-center text-[11px] text-ink/60 truncate">{svc.category}</div>
              <div className="col-span-2 text-center text-xs">
                {svc.quantity} &times; LKR {toNum(svc.unitPrice).toLocaleString()}
              </div>
              <div className="col-span-2 text-right font-medium text-ink">
                LKR {toNum(svc.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
