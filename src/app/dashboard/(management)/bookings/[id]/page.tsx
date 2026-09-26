'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Building2, User, Calendar, CreditCard,
  Users, CheckCircle2, Clock, XCircle, BedDouble, ChevronRight,
} from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────
interface AccompanyingGuest {
  verification_id: string;
  first_name: string;
  last_name: string;
  id_passport_no: string;
  is_verified: boolean;
}

interface BookingRoom {
  booking_room_id: string;
  room_number: string;
  room_type_name: string;
  meal_plan_name: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  rate_at_booking: number;
  accompanying_guests: AccompanyingGuest[];
}

interface BookingDetail {
  booking_id: string;
  status: string;
  branch_name: string;
  booker_name: string;
  created_at: string;
  total_amount: number | null;
  notes: string | null;
  rooms: BookingRoom[];
}

// ─────────────────────────────────────────────────────────────────────────────

// Status config — colours & labels for each booking status
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:     { label: 'Pending',     color: 'text-amber-400 border-amber-400/40 bg-amber-400/10',     icon: <Clock size={12} /> },
  CONFIRMED:   { label: 'Confirmed',   color: 'text-sky-400 border-sky-400/40 bg-sky-400/10',           icon: <CheckCircle2 size={12} /> },
  CHECKED_IN:  { label: 'Checked In',  color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10', icon: <CheckCircle2 size={12} /> },
  CHECKED_OUT: { label: 'Checked Out', color: 'text-stone-400 border-stone-400/40 bg-stone-400/10',     icon: <CheckCircle2 size={12} /> },
  CANCELLED:   { label: 'Cancelled',   color: 'text-red-400 border-red-400/40 bg-red-400/10',           icon: <XCircle size={12} /> },
  NO_SHOW:     { label: 'No Show',     color: 'text-red-400 border-red-400/40 bg-red-400/10',           icon: <XCircle size={12} /> },
};

// Legal next-status transitions
const TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT:[],
  CANCELLED:  [],
  NO_SHOW:    [],
};

// ─────────────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {

  const params   = useParams();
  const router   = useRouter();
  const id       = params.id as string;
  const [booking, setBooking]             = useState<BookingDetail | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);


   const fetchBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: BookingDetail }>(`/api/v1/bookings/${id}`);
      setBooking(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load booking.');
      }
    } finally {
      setLoading(false);
    }
  };


   useEffect(() => {
    fetchBooking();
  }, [id]);


  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/v1/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchBooking();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Action failed.';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };


  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-500 text-sm font-jakarta">
        Loading booking…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle size={32} className="text-red-400" />
        <p className="text-stone-400 text-sm font-jakarta">{error}</p>
        <Link href="/dashboard/bookings"
          className="text-xs text-amber-400 underline underline-offset-4">
          Back to ledger
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BedDouble size={32} className="text-stone-600" />
        <p className="text-stone-500 text-sm font-jakarta">Booking not found.</p>
        <Link href="/dashboard/bookings"
          className="text-xs text-amber-400 underline underline-offset-4">
          Back to ledger
        </Link>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG['PENDING'];
  const nextSteps = TRANSITIONS[booking.status]   ?? [];

  // ── Page render ───────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Back link ── */}
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors mb-6 font-jakarta"
      >
        <ArrowLeft size={13} />
        Back to Bookings Ledger
      </Link>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100 font-cinzel">
            Booking Detail
          </h1>
          <p className="font-mono text-xs text-amber-400/80 mt-1">
            #{booking.booking_id}
          </p>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border rounded-none ${statusCfg.color}`}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Left — Booking info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/3 border border-white/8 p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-stone-500 font-jakarta mb-3">
              Booking Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={<Building2 size={14} />} label="Branch"  value={booking.branch_name} />
              <InfoRow icon={<User size={14} />}      label="Booker"  value={booking.booker_name} />
              <InfoRow icon={<Calendar size={14} />}  label="Created" value={new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <InfoRow icon={<CreditCard size={14} />} label="Total"  value={booking.total_amount ? `$${toNum(booking.total_amount).toFixed(2)}` : '—'} />
            </div>
            {booking.notes && (
              <div className="pt-3 border-t border-white/6">
                <p className="text-xs text-stone-500 mb-1 font-jakarta">Notes</p>
                <p className="text-sm text-stone-300 font-jakarta">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Status timeline + actions */}
        <div className="space-y-4">

          <div className="bg-white/3 border border-white/8 p-5">
            <h2 className="text-xs uppercase tracking-widest text-stone-500 font-jakarta mb-4">
              Lifecycle
            </h2>
            <StatusTimeline currentStatus={booking.status} />
          </div>

          {nextSteps.length > 0 && (
            <div className="bg-white/3 border border-white/8 p-5 space-y-2">
              <h2 className="text-xs uppercase tracking-widest text-stone-500 font-jakarta mb-3">
                Actions
              </h2>
              {nextSteps.map(next => (
                <button
                  key={next}
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(next)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-all ${
                    next === 'CANCELLED'
                      ? 'border-red-400/30 text-red-400 hover:bg-red-400/10'
                      : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span>{next.replace('_', ' ')}</span>
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          )}

          <div className="bg-white/3 border border-white/8 p-5">
            <h2 className="text-xs uppercase tracking-widest text-stone-500 font-jakarta mb-3">
              Billing
            </h2>
            <Link
              href={`/dashboard/invoices?booking_id=${booking.booking_id}`}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-white/10 text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-all"
            >
              <span>View Invoice</span>
              <ChevronRight size={13} />
            </Link>
          </div>

        </div>
      </div>

      {/* ── Room Lines ── */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-stone-500 font-jakarta mb-4">
          Room Reservations
        </h2>

        {(!booking.rooms || booking.rooms.length === 0) ? (
          <div className="bg-white/3 border border-white/8 p-8 text-center">
            <BedDouble size={28} className="text-stone-600 mx-auto mb-2" />
            <p className="text-stone-500 text-sm font-jakarta">No rooms assigned to this booking yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {booking.rooms.map((room) => (
              <div key={room.booking_room_id} className="bg-white/3 border border-white/8 p-6">

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-stone-100 font-semibold font-jakarta">
                      Room {room.room_number}
                      <span className="text-stone-500 font-normal ml-2 text-sm">— {room.room_type_name}</span>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 font-jakarta">{room.meal_plan_name}</p>
                  </div>
                  <p className="font-cinzel text-amber-300 font-medium text-sm">
                    ${toNum(room.rate_at_booking).toFixed(2)}
                    <span className="text-stone-600 text-xs font-jakarta">/night</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-400 mb-4 font-jakarta">
                  <Calendar size={12} className="text-stone-500" />
                  <span>{room.check_in_date}</span>
                  <span className="text-stone-600">→</span>
                  <span>{room.check_out_date}</span>
                  <span className="text-stone-600">·</span>
                  <span>
                    {toNum(room.nights)} night{toNum(room.nights) === 1 ? '' : 's'} = ${(toNum(room.nights) * toNum(room.rate_at_booking)).toFixed(2)}
                  </span>
                </div>

                {room.accompanying_guests && room.accompanying_guests.length > 0 && (
                  <div className="border-t border-white/6 pt-4">
                    <p className="text-xs uppercase tracking-widest text-stone-600 font-jakarta mb-3 flex items-center gap-1.5">
                      <Users size={11} /> Accompanying Guests
                    </p>
                    <div className="space-y-1.5">
                      {room.accompanying_guests.map((ag) => (
                        <div key={ag.verification_id} className="flex items-center justify-between text-xs font-jakarta">
                          <span className="text-stone-300">
                            {ag.first_name} {ag.last_name}
                            <span className="text-stone-600 ml-2">· {ag.id_passport_no}</span>
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase border ${ag.is_verified ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8' : 'text-stone-500 border-stone-600/40'}`}>
                            {ag.is_verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (UI only)
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-stone-600 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-600 font-jakarta">{label}</p>
        <p className="text-sm text-stone-200 font-jakarta">{value}</p>
      </div>
    </div>
  );
}

const TIMELINE_STEPS = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx  = TIMELINE_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs font-jakarta">
        <XCircle size={14} />
        <span>Booking Cancelled</span>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        return (
          <li key={step} className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              done    ? 'bg-emerald-400' :
              current ? 'bg-amber-400 ring-2 ring-amber-400/30' :
                        'bg-stone-700'
            }`} />
            <span className={`text-xs font-jakarta ${
              current ? 'text-amber-300 font-semibold' :
              done    ? 'text-stone-400' :
                        'text-stone-700'
            }`}>
              {step.replace('_', ' ')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
