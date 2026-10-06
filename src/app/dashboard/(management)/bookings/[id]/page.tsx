'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  DashboardMasthead, Btn, Loading, Empty, StatusDot,
  fmtStayRange, fmtMoney, fmtDay, titleCase, useFlash,
} from '@/components/dashboard/ui';

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

// Legal next-status transitions
const TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT:[],
  CANCELLED:  [],
  NO_SHOW:    [],
};

const ACTION_LABEL: Record<string, string> = {
  CONFIRMED:   'Confirm booking',
  CHECKED_IN:  'Check in',
  CHECKED_OUT: 'Check out',
  CANCELLED:   'Cancel booking',
};

const BACK_LINK =
  'inline-flex items-center gap-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70 hover:text-skynest-accent transition-colors duration-300';

// ─────────────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {

  const params   = useParams();
  const id       = params.id as string;
  const { user } = useAuth();
  const { flash, toasts } = useFlash();
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
      flash('success', `Booking ${titleCase(newStatus).toLowerCase()}.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Action failed.';
      flash('error', msg);
    } finally {
      setActionLoading(false);
    }
  };


  // ── Loading / error / not found ───────────────────────────────────────────
  if (loading || error || !booking) {
    return (
      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
        <Link href="/dashboard/bookings" className={BACK_LINK}>
          <ArrowLeft className="w-4 h-4" /> All bookings
        </Link>
        {loading ? <Loading label="Loading booking" />
          : <Empty>{error ?? 'Booking not found.'}</Empty>}
      </main>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const nextSteps  = TRANSITIONS[booking.status] ?? [];
  const totalNights = (booking.rooms ?? []).reduce((n, r) => Math.max(n, toNum(r.nights)), 0);

  // ── Page render ───────────────────────────────────────────────────────────
  return (
    <>
      {toasts}

      <DashboardMasthead
        eyebrow={`Booking · ${booking.booking_id.slice(0, 8).toUpperCase()}`}
        title={booking.booker_name}
        imageKey={booking.branch_name ?? user?.branchName}
        aside={
          <div className="flex items-center gap-2 px-4 py-2 rounded-[4px] bg-paper">
            <StatusDot status={booking.status} />
          </div>
        }
        kpis={[
          { label: 'Rooms',    value: String(booking.rooms?.length ?? 0), sub: `At ${booking.branch_name}` },
          { label: 'Stay',     value: String(totalNights),                sub: `Night${totalNights === 1 ? '' : 's'}` },
          { label: 'Total',    value: booking.total_amount ? fmtMoney(toNum(booking.total_amount)) : '—', sub: 'Booking value' },
          { label: 'Booked',   value: fmtDay(booking.created_at).slice(0, 6), sub: fmtDay(booking.created_at) },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-8">
        <Link href="/dashboard/bookings" className={BACK_LINK}>
          <ArrowLeft className="w-4 h-4" /> All bookings
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* ── Rooms ───────────────────────────────────────────────────── */}
          <section className="lg:col-span-2 space-y-6">
            <div className="pb-6 border-b border-skynest-hairline">
              <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">
                {booking.rooms?.length ?? 0} {(booking.rooms?.length ?? 0) === 1 ? 'room' : 'rooms'}
              </p>
              <h2 className="mt-2 font-cinzel text-[28px] md:text-[32px] leading-[1.1] text-ink">Rooms</h2>
            </div>

            {(!booking.rooms || booking.rooms.length === 0) ? (
              <Empty>No rooms assigned to this booking yet.</Empty>
            ) : (
              <ul className="divide-y divide-skynest-hairline">
                {booking.rooms.map((room) => {
                  const range  = fmtStayRange(room.check_in_date, room.check_out_date);
                  const nights = toNum(room.nights);
                  const rate   = toNum(room.rate_at_booking);
                  return (
                    <li key={room.booking_room_id} className="py-6 first:pt-0 space-y-4">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-baseline gap-4">
                          <span className="font-cinzel text-[32px] leading-none text-ink">{room.room_number}</span>
                          <div className="font-jakarta">
                            <p className="text-[15px] text-ink">{titleCase(room.room_type_name)}</p>
                            {room.meal_plan_name && <p className="mt-1 text-[12px] text-ink/70">{room.meal_plan_name}</p>}
                          </div>
                        </div>
                        <div className="text-right font-jakarta">
                          <p className="text-[15px] text-ink tabular-nums">{fmtMoney(nights * rate, 2)}</p>
                          <p className="mt-1 text-[12px] text-ink/70 tabular-nums">{fmtMoney(rate, 2)} × {nights} night{nights === 1 ? '' : 's'}</p>
                        </div>
                      </div>

                      <p className="font-jakarta text-[13px] text-ink tabular-nums">
                        {range.from} <span className="text-ink/50" aria-hidden>→</span> {range.to}
                      </p>

                      {room.accompanying_guests && room.accompanying_guests.length > 0 && (
                        <div className="pt-4 border-t border-skynest-hairline space-y-2">
                          <p className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70">Guests</p>
                          {room.accompanying_guests.map((ag) => (
                            <div key={ag.verification_id} className="flex items-center justify-between gap-4 font-jakarta text-[13px]">
                              <span className="text-ink">
                                {ag.first_name} {ag.last_name}
                                <span className="ml-2 text-ink/70 tabular-nums">{ag.id_passport_no}</span>
                              </span>
                              <StatusDot status={ag.is_verified ? 'VERIFIED' : 'UNVERIFIED'} label={ag.is_verified ? 'Verified' : 'Unverified'} />
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="space-y-12">
            <div className="space-y-6">
              <p className="pb-4 border-b border-skynest-hairline font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">Progress</p>
              <StatusTimeline currentStatus={booking.status} />
            </div>

            {nextSteps.length > 0 && (
              <div className="space-y-4">
                <p className="pb-4 border-b border-skynest-hairline font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">Next step</p>
                <div className="flex flex-col gap-2">
                  {nextSteps.map(next => (
                    <Btn
                      key={next}
                      variant={next === 'CANCELLED' ? 'danger' : 'primary'}
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(next)}
                      className="w-full justify-between"
                    >
                      {ACTION_LABEL[next] ?? titleCase(next)}
                      <ChevronRight className="w-4 h-4" />
                    </Btn>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="pb-4 border-b border-skynest-hairline font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">Billing</p>
              <Link
                href={`/dashboard/billing?q=${encodeURIComponent(booking.booking_id)}`}
                className="flex items-center justify-between px-4 py-2 rounded-[4px] border border-skynest-hairline font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink hover:border-skynest-accent hover:text-skynest-accent transition-colors duration-300"
              >
                View invoice
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {booking.notes && (
              <div className="space-y-4">
                <p className="pb-4 border-b border-skynest-hairline font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">Notes</p>
                <p className="font-jakarta text-[15px] leading-relaxed text-ink">{booking.notes}</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (UI only)
// ─────────────────────────────────────────────────────────────────────────────

const TIMELINE_STEPS = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx  = TIMELINE_STEPS.indexOf(currentStatus);

  if (currentStatus === 'CANCELLED' || currentStatus === 'NO_SHOW') {
    return <StatusDot status={currentStatus} label={currentStatus === 'CANCELLED' ? 'Booking cancelled' : 'No show'} />;
  }

  return (
    <ol className="relative space-y-4 pl-6 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-skynest-hairline">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        return (
          <li key={step} className="relative flex items-center gap-4">
            <span className={`absolute -left-6 w-2 h-2 rounded-full ring-4 ring-paper ${
              done ? 'bg-emerald-500' : current ? 'bg-skynest-accent' : 'bg-ink-faded'
            }`} />
            <span className={`font-jakarta text-[13px] ${current ? 'text-ink font-medium' : 'text-ink/70'}`}>
              {titleCase(step)}
            </span>
            {current && <span className="font-jakarta text-[11px] tracking-[0.12em] uppercase text-skynest-accent">Current</span>}
          </li>
        );
      })}
    </ol>
  );
}
