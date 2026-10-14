'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Plus, X, Utensils, Sparkles } from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  DashboardMasthead, Btn, Loading, Empty, StatusDot,
  fmtStayRange, fmtMoney, fmtDay, fmtDate, titleCase, useFlash, parseStayDate, toLocalYMD,
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


interface FolioService {
  usage_id: string;
  booking_room_id: string;
  service_name: string;
  category: string;
  quantity: number;
  price_at_usage: number;
  total_price: number;
  used_at: string;
  notes: string | null;
  appointment_time?: string | null;
  meal_time?: string | null;
}

interface CatalogueItem {
  service_id: number;
  service_name: string;
  category: string;
  base_price: number;
  is_active: boolean;
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
  const [folioServices, setFolioServices] = useState<FolioService[]>([]);
  const [catalogue, setCatalogue]         = useState<CatalogueItem[]>([]);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [serviceQty, setServiceQty]       = useState(1);
  const [serviceNotes, setServiceNotes]   = useState('');
  const [targetRoomId, setTargetRoomId]   = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  const fetchFolioServices = async () => {
    try {
      const res = await apiFetch<{ data: FolioService[] }>(`/api/v1/services/folio/${id}`);
      setFolioServices(res.data ?? []);
    } catch {
      // ignore
    }
  };

  const fetchCatalogue = async () => {
    try {
      const res = await apiFetch<{ data: CatalogueItem[] }>('/api/v1/services/catalogue?is_active=true');
      setCatalogue(res.data ?? []);
    } catch {
      // ignore
    }
  };



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
    fetchFolioServices();
    fetchCatalogue();
  }, [id]);



  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) {
      flash('error', 'Please select a service from the catalogue.');
      return;
    }
    const item = catalogue.find(c => c.service_id === Number(selectedServiceId));
    if (!item) return;

    setServiceSubmitting(true);
    try {
      const chosenRoomId = targetRoomId || booking?.rooms[0]?.booking_room_id;
      await apiFetch(`/api/v1/services/folio/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          booking_room_id: chosenRoomId,
          service_name: item.service_name,
          category: item.category,
          price_at_usage: item.base_price,
          quantity: serviceQty,
          notes: serviceNotes.trim() || undefined,
        }),
      });
      flash('success', `${item.service_name} added to stay folio & updated invoice emailed to guest.`);
      setShowAddModal(false);
      setSelectedServiceId('');
      setServiceQty(1);
      setServiceNotes('');
      await Promise.all([fetchBooking(), fetchFolioServices()]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to add service.';
      flash('error', msg);
    } finally {
      setServiceSubmitting(false);
    }
  };

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
  // Check-in opens on the arrival day and closes the day before check-out (the API enforces this too).
  const todayStr = toLocalYMD(new Date());
  const inYmd    = (booking.rooms ?? []).map(r => toLocalYMD(parseStayDate(r.check_in_date))).filter(Boolean).sort()[0] ?? '';
  const outYmd   = (booking.rooms ?? []).map(r => toLocalYMD(parseStayDate(r.check_out_date))).filter(Boolean).sort().at(-1) ?? '';
  const canCheckIn  = !!inYmd && inYmd <= todayStr && todayStr < outYmd;
  const checkInNote = booking.status === 'CONFIRMED' && !canCheckIn
    ? (!inYmd ? 'No room to check in to' : todayStr < inYmd ? `Check-in opens ${fmtDate(inYmd)}` : 'Stay dates have passed')
    : null;
  const nextSteps  = (TRANSITIONS[booking.status] ?? []).filter(s => s !== 'CHECKED_IN' || canCheckIn);
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

          {/* ── SECTION: Billable Folio Services (Rules B9 & B10) ───────────── */}
          <section className="space-y-6 pt-6 border-t border-skynest-hairline">
            <div className="flex items-center justify-between pb-4 border-b border-skynest-hairline">
              <div>
                <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">
                  Guest Folio Services ({folioServices.length})
                </p>
                <p className="font-jakarta text-[12px] text-ink/50 mt-0.5">
                  Ancillary dining, wellness & housekeeping charges billed to this stay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (booking?.rooms && booking.rooms.length > 0) {
                    setTargetRoomId(booking.rooms[0].booking_room_id);
                  }
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-ink text-white font-jakarta text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-skynest-accent transition-colors duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Service
              </button>
            </div>

            {folioServices.length === 0 ? (
              <div className="p-8 border border-dashed border-skynest-hairline text-center bg-[#FDFCFA]">
                <Sparkles className="w-6 h-6 text-ink/30 mx-auto mb-2" />
                <p className="font-jakarta text-[13px] text-ink/60">No additional services logged for this reservation yet.</p>
                <p className="font-jakarta text-[11px] text-ink/40 mt-1">Use the button above to add in-room dining, spa, or transport.</p>
              </div>
            ) : (
              <div className="border border-skynest-hairline overflow-hidden">
                <table className="w-full text-left font-jakarta text-[13px]">
                  <thead className="bg-[#F8F6F2] border-b border-skynest-hairline text-[10px] uppercase font-bold tracking-wider text-ink/60">
                    <tr>
                      <th className="py-2.5 px-4">Service Item</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Frozen Rate</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                      <th className="py-2.5 px-4 text-right">Logged At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-skynest-hairline bg-white">
                    {folioServices.map((s) => (
                      <tr key={s.usage_id} className="hover:bg-[#FDFCFA] transition-colors">
                        <td className="py-3 px-4 font-medium text-ink">
                          <div className="flex items-center gap-2">
                            <span>{s.service_name}</span>
                            {s.appointment_time && (
                              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 border border-skynest-accent/40 bg-skynest-accent/10 text-skynest-accent">
                                Slot: {s.appointment_time}
                              </span>
                            )}
                          </div>
                          {s.notes && <p className="text-[11px] text-ink/50 font-normal mt-0.5">{s.notes}</p>}
                        </td>
                        <td className="py-3 px-4 text-ink/70">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-stone-100 text-stone-700">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums text-ink">{s.quantity}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-ink/70">{fmtMoney(toNum(s.price_at_usage))}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-ink">{fmtMoney(toNum(s.total_price))}</td>
                        <td className="py-3 px-4 text-right text-[11px] text-ink/50 tabular-nums">
                          {new Date(s.used_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                {checkInNote && (
                  <p className="font-jakarta text-[12px] text-ink-faded">{checkInNote}</p>
                )}
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

      {/* ── Add Service Modal (Receptionist Log to Folio) ─────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-skynest-hairline shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-skynest-hairline">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-skynest-accent" />
                <h3 className="font-cinzel text-[16px] font-bold text-ink uppercase tracking-wider">
                  Log Service Charge to Folio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink/40 hover:text-ink transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4 font-jakarta text-[13px]">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
                  Select Catalogue Service *
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3 py-2 border border-skynest-hairline bg-white text-ink text-[13px] rounded-[4px] focus:outline-none focus:border-skynest-accent"
                >
                  <option value="">-- Choose from active catalogue --</option>
                  {catalogue.map((c) => (
                    <option key={c.service_id} value={c.service_id}>
                      {c.service_name} ({c.category}) — ${Number(c.base_price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {booking.rooms && booking.rooms.length > 1 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
                    Assign to Room *
                  </label>
                  <select
                    value={targetRoomId}
                    onChange={(e) => setTargetRoomId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-skynest-hairline bg-white text-ink text-[13px] rounded-[4px] focus:outline-none focus:border-skynest-accent"
                  >
                    {booking.rooms.map((r) => (
                      <option key={r.booking_room_id} value={r.booking_room_id}>
                        Room {r.room_number ?? 'Unassigned'} ({r.room_type_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={serviceQty}
                    onChange={(e) => setServiceQty(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 border border-skynest-hairline bg-white text-ink text-[13px] rounded-[4px] focus:outline-none focus:border-skynest-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
                    Estimated Subtotal
                  </label>
                  <div className="px-3 py-2 bg-[#F8F6F2] border border-skynest-hairline font-semibold text-ink text-[13px] rounded-[4px]">
                    {(() => {
                      const item = catalogue.find(c => c.service_id === Number(selectedServiceId));
                      const total = item ? item.base_price * serviceQty : 0;
                      return fmtMoney(total);
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
                  Guest Notes / Special Requests (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. In-room dining delivered at 8:00 PM"
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-skynest-hairline bg-white text-ink text-[13px] rounded-[4px] focus:outline-none focus:border-skynest-accent"
                />
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-[4px] text-[11px] text-amber-900 leading-relaxed">
                <strong>Notice:</strong> Charging this service permanently freezes unit rate (Rule B10) on the room folio, recalculates the Sri Lankan 4-tier statutory tax cascade, and dispatches an updated folio statement email to the guest.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-skynest-hairline">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-skynest-hairline font-jakarta text-[11px] font-medium uppercase tracking-wider text-ink/70 hover:bg-stone-50 transition-colors rounded-[4px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceSubmitting}
                  className="px-5 py-2 bg-ink text-white hover:bg-skynest-accent transition-colors font-jakarta text-[11px] font-semibold uppercase tracking-wider rounded-[4px] disabled:opacity-50"
                >
                  {serviceSubmitting ? 'Charging & Notifying...' : 'Charge to Folio & Email Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
