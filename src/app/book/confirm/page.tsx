'use client';

import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Sparkles, Printer } from 'lucide-react';
import { printTaxInvoice, PrintableInvoiceData } from '@/lib/invoice-print';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ShaderBackground } from '@/components/ui/adisyon-shader';
import { useBranches } from '@/hooks/useBranches';
import { apiFetch, ApiError } from '@/lib/api-client';
import { formatLKR } from '@/lib/currency';

function generateReferenceNumber(): string {
  return `ONLINE-${Date.now().toString(36).toUpperCase()}`;
}

// ── Static Reference Data ───────────────────────────────────────────────────
const ROOM_TYPES = [
  { id: 'STANDARD', name: 'Standard Room', rate: 37200, capacity: 2 },
  { id: 'DELUXE', name: 'Deluxe Room', rate: 55800, capacity: 3 },
  { id: 'SUITE', name: 'Suite', rate: 86800, capacity: 4 },
  { id: 'PRESIDENTIAL', name: 'Presidential Suite', rate: 155000, capacity: 6 },
];

const MEAL_PLANS = [
  { id: 1, name: 'Room Only', description: 'Room only. Meals available à la carte.', price: 0 },
  { id: 2, name: 'Bed & Breakfast', description: 'Daily breakfast included.', price: 7800 },
  { id: 3, name: 'Half Board', description: 'Daily breakfast and dinner included.', price: 17100 },
  { id: 4, name: 'Full Board', description: 'Daily breakfast, lunch, and dinner included.', price: 24800 },
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

interface AvailableCatalogueService {
  service_id: number;
  service_name: string;
  category: string;
  base_price: number;
  is_active: boolean;
}

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
// SC (10% of base) · TDL (1% of base) · SSCL (2.5% of base) · VAT (18% of base + TDL + SSCL)
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
  // ARCHITECTURE.md §5.1 — same as the API and sp_generate_final_bill.
  // SC, TDL and SSCL are on the base; VAT is on base + TDL + SSCL (SC is exempt).
  const scTax       = Math.round(roundedBase * 0.10 * 100) / 100;
  const tdlTax      = Math.round(roundedBase * 0.01 * 100) / 100;
  const sscTax      = Math.round(roundedBase * 0.025 * 100) / 100;
  const vatTax      = Math.round((roundedBase + tdlTax + sscTax) * 0.18 * 100) / 100;
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
  guestPhone?: string;
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
  /** Services booked alongside the reservation */
  bookedServices?: {
    service_id: number;
    service_name: string;
    category: string;
    base_price: number;
    quantity: number;
    date: string;
    appointment_time?: string;
    notes?: string;
  }[];
  /** Total amount paid today (deposit or full) */
  amountPaid?: number;
  /** Payment mode chosen: DEPOSIT | FULL | ARRIVAL */
  paymentMode?: 'DEPOSIT' | 'FULL' | 'ARRIVAL';
  /** Service cost subtotal */
  serviceCost?: number;
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
    const rRate = rawRates[i] !== undefined ? rawRates[i] : (rTypeObj?.rate || 37200);
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
  const { branches: BRANCHES } = useBranches();
  const branch = BRANCHES.find(b => b.id === branchIdStr);
  const roomType = ROOM_TYPES.find(r => r.id === roomTypeIdStr);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  // Add-on Services State
  const [availableServices, setAvailableServices] = useState<AvailableCatalogueService[]>([]);
  const [selectedServices, setSelectedServices]   = useState<Record<number, number>>({});
  const [serviceSchedules, setServiceSchedules] = useState<Record<number, { date: string; timeSlot: string; notes?: string }>>({});
  const [spaSlotsData, setSpaSlotsData] = useState<Record<string, { time: string; is_available: boolean; available_count?: number; booked_count?: number }[]>>({});
  
  // Payment Option State
  const [paymentOption, setPaymentOption]         = useState<'DEPOSIT' | 'FULL' | 'ARRIVAL'>('DEPOSIT');
  const [cardNumber, setCardNumber]               = useState('');
  const [cardholderName, setCardholderName]       = useState('');
  const [cardExpiry, setCardExpiry]               = useState('');
  const [cardCvc, setCardCvc]                     = useState('');


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
  const [holdConflict, setHoldConflict] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const isBookingCompletedRef = useRef(false);

  // Animation Ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup holds on page unmount if booking was not completed
  useEffect(() => {
    return () => {
      if (!isBookingCompletedRef.current && typeof window !== 'undefined') {
        const sessId = localStorage.getItem('sn_booking_session') || '';
        if (sessId) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
          fetch(`${apiUrl}/api/v1/availability/hold-rooms?session_id=${encodeURIComponent(sessId)}`, {
            method: 'DELETE',
            keepalive: true,
          }).catch(() => {});
        }
      }
    };
  }, []);


  const fetchSpaSlotsForDate = useCallback(async (date: string) => {
    if (!branchIdStr || !date) return;
    try {
      const res = await apiFetch<{
        success: boolean;
        data: { time: string; is_available: boolean; available_count?: number; booked_count?: number }[];
      }>(`/api/v1/services/spa-slots?date=${encodeURIComponent(date)}&branchId=${encodeURIComponent(branchIdStr)}`);
      if (res.success && res.data) {
        setSpaSlotsData(prev => ({ ...prev, [date]: res.data }));
      }
    } catch (err) {
      console.warn('[ConfirmBooking] Failed to fetch spa slots:', err);
    }
  }, [branchIdStr]);

  // Fetch catalogue services for branch (with fallback)
  useEffect(() => {
    let isMounted = true;
    async function loadServices() {
      try {
        const query = branchIdStr ? `?branch_id=${encodeURIComponent(branchIdStr)}&is_active=true` : '?is_active=true';
        const res = await apiFetch<{ data: AvailableCatalogueService[] }>(`/api/v1/services/catalogue${query}`);
        if (isMounted && res.data && res.data.length > 0) {
          setAvailableServices(res.data);
          return;
        }
        // Fallback: load all active services if branch query returned empty
        const fallbackRes = await apiFetch<{ data: AvailableCatalogueService[] }>('/api/v1/services/catalogue?is_active=true');
        if (isMounted) {
          setAvailableServices(fallbackRes.data ?? []);
        }
      } catch (err) {
        console.warn('[ConfirmBooking] Could not load catalogue services:', err);
      }
    }
    loadServices();
    return () => { isMounted = false; };
  }, [branchIdStr]);

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

  // Competitive Booking Protection: Verify or acquire exclusive hold on mount
  useEffect(() => {
    if (!branchIdStr || !checkIn || !checkOut || rooms.length === 0) return;

    let active = true;
    async function acquireHold() {
      try {
        let sessId = '';
        if (typeof window !== 'undefined') {
          sessId = localStorage.getItem('sn_booking_session') || '';
          if (!sessId) {
            sessId = 'sn_sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('sn_booking_session', sessId);
          }
        }

        const targetRoomIds = rooms.map(r => r.roomId).filter(Boolean);
        if (targetRoomIds.length === 0) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/availability/hold-rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_ids: targetRoomIds,
            check_in: checkIn,
            check_out: checkOut,
            session_id: sessId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (active) {
            setHoldConflict(
              data.message ||
              'Competitive Booking Notice: One or more of these rooms are currently held by another guest completing their reservation on overlapping dates.'
            );
          }
        }
      } catch {
        // Fallback for non-fatal network error
      }
    }

    acquireHold();
    return () => {
      active = false;
    };
  }, [branchIdStr, checkIn, checkOut, rooms]);

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

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    setDownloadSuccessMessage(null);

    try {
      // 1. Change dynamic import from html2pdf.js to html2canvas-pro & jspdf
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const element = contentRef.current;

      // 2. Render canvas using html2canvas-pro (bypasses the lab() color error)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // 3. Convert canvas image to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('portrait', 'in', 'letter');
      
      const imgWidth = 8.5 - 0.8; // 0.4in margins on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0.4, 0.4, imgWidth, imgHeight);
      pdf.save(`SkyNest_Reservation_${confirmed?.bookingId || 'Receipt'}.pdf`);

      setDownloadSuccessMessage('Your reservation PDF receipt has been downloaded successfully!');
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintOfficialBill = () => {
    if (!confirmed) return;
    const isSettled = (confirmed.amountPaid ?? 0) >= confirmed.grandTotal - 0.01;
    const isDeposit = !isSettled && (confirmed.amountPaid ?? 0) > 0;

    const line_items: NonNullable<PrintableInvoiceData['line_items']> = [];

    // 1. Rooms accommodation
    confirmed.rooms.forEach((r) => {
      line_items.push({
        description: `Room Accommodation — Room ${r.roomNumber} (${r.roomTypeName})`,
        details: `${confirmed.nights} Night(s) (${confirmed.checkIn} to ${confirmed.checkOut}) @ ${formatLKR(r.baseRate)}/nt`,
        category: 'Accommodation',
        quantity: confirmed.nights,
        unitRate: r.baseRate,
        amount: r.baseRate * confirmed.nights,
      });

      if (r.mealCost > 0) {
        line_items.push({
          description: `Meal Plan: ${r.planName} — Room ${r.roomNumber}`,
          details: `${r.adults} Guest(s) × ${confirmed.nights} nt @ ${formatLKR(r.planPrice)}/nt`,
          category: 'Dining',
          quantity: confirmed.nights,
          unitRate: r.planPrice,
          amount: r.mealCost,
        });
      }
    });

    // 2. Add-on services with scheduling details
    if (confirmed.bookedServices && confirmed.bookedServices.length > 0) {
      confirmed.bookedServices.forEach((svc) => {
        const isSpa = svc.category?.toUpperCase() === 'SPA';
        let details = '';
        if (svc.appointment_time) {
          details = `Appointment: ${svc.appointment_time}${svc.date ? ` on ${svc.date}` : ''}`;
        } else if (isSpa && svc.date) {
          details = `Booked Spa Date: ${svc.date}`;
        } else if (svc.date) {
          details = `Booked Date: ${svc.date}`;
        }
        if (svc.notes) {
          details = details ? `${details} | ${svc.notes}` : svc.notes;
        }

        line_items.push({
          description: svc.service_name,
          details: details || undefined,
          category: svc.category,
          quantity: svc.quantity,
          unitRate: svc.base_price,
          amount: svc.base_price * svc.quantity,
        });
      });
    }

    printTaxInvoice({
      invoice_id: `INV-${confirmed.bookingId.replace(/[^A-Za-z0-9]/g, '').slice(-8)}`,
      booking_id: confirmed.bookingId,
      guest_name: confirmed.guestName,
      guest_email: confirmed.guestEmail,
      guest_phone: confirmed.guestPhone,
      room_number: confirmed.rooms.map(r => `Room ${r.roomNumber}`).join(', '),
      room_type_name: Array.from(new Set(confirmed.rooms.map(r => r.roomTypeName))).join(' & '),
      branch_name: confirmed.branchName,
      check_in_date: confirmed.checkIn,
      check_out_date: confirmed.checkOut,
      nights: confirmed.nights,
      base_amount: confirmed.baseAmount,
      sc_amount: confirmed.taxes.scTax,
      tdl_amount: confirmed.taxes.tdlTax,
      sscl_amount: confirmed.taxes.sscTax,
      vat_amount: confirmed.taxes.vatTax,
      total_amount: confirmed.grandTotal,
      total_paid: confirmed.amountPaid ?? 0,
      balance_due: Math.max(0, confirmed.grandTotal - (confirmed.amountPaid ?? 0)),
      status: isSettled ? 'SETTLED' : isDeposit ? 'PARTIALLY_PAID' : 'OPEN',
      line_items,
    });
  };

  // Date and Duration Calculations
  const nights = (checkIn && checkOut)
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  // Aggregate cost calculations across ALL chosen rooms
  const totalAdults = rooms.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = rooms.reduce((sum, r) => sum + r.children, 0);
  
  // Total accommodation = sum of (rate_i * nights) for each room
  const totalRoomCost = rooms.reduce((sum, r) => sum + (r.baseRate * nights), 0);

  // Per-room detailed calculations (Multiplying meal plan rate by number of guests)
  const roomCalculations = rooms.map(r => {
    const plan = MEAL_PLANS.find(p => p.id === r.mealPlanId) ?? MEAL_PLANS[0];
    const roomCost = r.baseRate * nights;
    const guestCount = Math.max(1, (r.adults || 1) + (r.children || 0));
    const mealCost = plan.price * nights * guestCount;
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

  // Total ancillary services charges
  const totalServiceCost = availableServices.reduce((sum, s) => {
    const qty = selectedServices[s.service_id] || 0;
    return sum + (s.base_price * qty);
  }, 0);

  // Service booking quantity caps based on guest count and stay duration
  // - Spa / Wellness: capped at totalAdults * nights
  // - In-room Breakfast / Dining: capped at (totalAdults + totalChildren) * nights
  const totalGuests = totalAdults + totalChildren;
  const getServiceCap = (svc: { service_name: string; category?: string }) => {
    const cat = (svc.category || '').toLowerCase();
    const name = (svc.service_name || '').toLowerCase();

    // Spa / Wellness services: capped at totalAdults * nights
    if (cat === 'wellness' || name.includes('spa') || name.includes('massage') || name.includes('ayurvedic')) {
      const max = Math.max(1, totalAdults * nights);
      return {
        max,
        label: `Max ${max} (${totalAdults} adult${totalAdults > 1 ? 's' : ''} × ${nights} nt${nights > 1 ? 's' : ''})`,
        isSpa: true,
      };
    }

    // In-room Breakfast / Dining: capped at (totalAdults + totalChildren) * nights
    if (name.includes('breakfast') || (cat === 'dining' && (name.includes('breakfast') || name.includes('dining')))) {
      const max = Math.max(1, totalGuests * nights);
      return {
        max,
        label: `Max ${max} (${totalGuests} guest${totalGuests > 1 ? 's' : ''} × ${nights} nt${nights > 1 ? 's' : ''})`,
        isBreakfast: true,
      };
    }

    return {
      max: 99,
      label: null,
      isSpa: false,
    };
  };

  // Curated services list with scheduling details
  const selectedServiceList: {
    service_id: number;
    service_name: string;
    category: string;
    base_price: number;
    quantity: number;
    date: string;
    appointment_time?: string;
    notes?: string;
  }[] = useMemo(() => {
    return availableServices
      .filter(s => (selectedServices[s.service_id] || 0) > 0)
      .map(s => {
        const sched = serviceSchedules[s.service_id];
        return {
          service_id: s.service_id,
          service_name: s.service_name,
          category: s.category,
          base_price: Number(s.base_price),
          quantity: selectedServices[s.service_id],
          date: sched?.date || checkIn,
          appointment_time: sched?.timeSlot || (s.category === 'Wellness' ? '10:00' : undefined),
          notes: sched?.notes || undefined,
        };
      });
  }, [availableServices, selectedServices, serviceSchedules, checkIn]);

  // Base Amount before taxes
  const baseAmount = totalRoomCost + totalMealCost + totalServiceCost;

  // 4-Tier Statutory Sri Lankan Tax Cascade
  const taxes = computeTaxCascade(baseAmount);
  const grandTotal = taxes.grandTotal;
  const depositAmount = grandTotal * 0.20;

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

  // Guard for competitive booking collision
  if (holdConflict) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper relative selection:bg-skynest-accent selection:text-white" style={{ backgroundColor: '#FDFCFA' }}>
        <MountainGlyph className="w-10 h-auto text-skynest-accent mb-5" />
        <div className="max-w-md w-full bg-white border border-skynest-hairline p-8 shadow-[0_16px_40px_rgba(11,37,64,0.06)] text-center space-y-4">
          <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 text-[10px] font-jakarta font-bold uppercase tracking-wider border border-amber-200">
            Competitive Booking Notice
          </span>
          <h2 className="font-cinzel text-xl font-normal uppercase tracking-wider text-ink">
            Room Temporarily Unavailable
          </h2>
          <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
            {holdConflict}
          </p>
          <p className="font-jakarta text-[11px] text-ink/40 leading-relaxed">
            To prevent double bookings, rooms are held when a guest proceeds to confirmation. Please return to room selection to choose an alternate room or dates.
          </p>
          <div className="pt-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const sessId = localStorage.getItem('sn_booking_session') || '';
                  if (sessId) {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
                    fetch(`${apiUrl}/api/v1/availability/hold-rooms?session_id=${encodeURIComponent(sessId)}`, {
                      method: 'DELETE',
                    }).catch(() => {});
                  }
                }
                router.push('/book');
              }}
              className="inline-block w-full py-3 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent transition-all duration-200 cursor-pointer"
            >
              Return to Room Selection
            </button>
          </div>
        </div>
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
      // 1. Find or create the guest record (the API matches returning guests by email)
      type GuestRow = { id?: string; guest_id?: string };
      const guest = await apiFetch<{ data: GuestRow }>('/api/v1/guests', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      const guestId = guest.data.id || guest.data.guest_id || '';

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

      const payloadServices = selectedServiceList;

      // Validate service quantity caps and stay date boundaries
      for (const s of payloadServices) {
        const cap = getServiceCap(s);
        if (s.quantity > cap.max) {
          setError(`Service "${s.service_name}" exceeds the allowed limit of ${cap.max} (${cap.label}).`);
          setLoading(false);
          return;
        }
        if (s.date && (s.date < checkIn || s.date > checkOut)) {
          setError(`Service date for "${s.service_name}" (${s.date}) cannot be outside your stay dates (${checkIn} to ${checkOut}).`);
          setLoading(false);
          return;
        }
      }

      const payloadPayment = paymentOption === 'ARRIVAL' ? undefined : {
        amount: Number((paymentOption === 'DEPOSIT' ? depositAmount : grandTotal).toFixed(2)),
        payment_method: 'CARD',
        is_deposit: paymentOption === 'DEPOSIT',
        reference_number: generateReferenceNumber(),
      };

      const res = await apiFetch<{
        data: {
          booking_id: string;
          status: string;
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
          services: payloadServices.length > 0 ? payloadServices : undefined,
          payment: payloadPayment,
          session_id: typeof window !== 'undefined' ? localStorage.getItem('sn_booking_session') || undefined : undefined,
        }),
      });

      isBookingCompletedRef.current = true;

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
        guestPhone: phone.trim() || undefined,
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
        bookedServices: selectedServiceList.length > 0 ? selectedServiceList : undefined,
        amountPaid: paymentOption === 'ARRIVAL' ? 0 : Number((paymentOption === 'DEPOSIT' ? depositAmount : grandTotal).toFixed(2)),
        paymentMode: paymentOption,
        serviceCost: totalServiceCost,
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ROOM_UNAVAILABLE') {
          setError('One or more selected rooms have just been booked for these dates. Please go back and select available rooms.');
        } else if (err.code === 'VALIDATION_ERROR') {
          const detailMsgs = err.errors
            ? Object.entries(err.errors)
                .map(([field, msgs]) => {
                  const msgText = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
                  return `${field.replace(/_/g, ' ')}: ${msgText}`;
                })
                .join(' • ')
            : '';
          setError(detailMsgs || (err.message && err.message !== 'Validation failed' ? err.message : 'Please verify your personal information and try again.'));
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
          <div ref={contentRef} className="sn-confirm-card border border-skynest-hairline bg-white p-8 md:p-12 shadow-[0_16px_40px_rgba(11,37,64,0.06)] space-y-8">
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
                          {rm.roomTypeName} ({formatLKR(rm.baseRate, 0)}/nt)
                        </span>
                      </div>
                      <p className="font-jakarta text-[11px] text-ink/60 mt-1">
                        Guests: <strong className="text-ink">{rm.adults} Adult{rm.adults > 1 ? 's' : ''}</strong>{rm.children > 0 ? `, ${rm.children} Child${rm.children > 1 ? 'ren' : ''}` : ''}{rm.childAges && rm.childAges.length > 0 ? ` (Child Ages: ${rm.childAges.join(', ')})` : ''} • Meal Plan: <strong className="text-ink">{rm.planName}</strong> ({rm.planPrice === 0 ? 'Included' : `+${formatLKR(rm.planPrice, 0)}/nt`})
                      </p>
                    </div>
                    <div className="text-right sm:border-l sm:pl-4 border-skynest-hairline">
                      <span className="text-[10px] uppercase tracking-wider text-ink/40 block">Room Subtotal</span>
                      <span className="font-cinzel text-sm font-semibold text-ink">
                        {formatLKR(rm.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ancillary Services */}
            {confirmed.bookedServices && confirmed.bookedServices.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-skynest-hairline/60">
                <div className="flex justify-between items-center text-ink/80 font-semibold">
                  <span className="font-cinzel text-xs uppercase tracking-wider">Booked Services &amp; Add-Ons ({confirmed.bookedServices.length})</span>
                  <span className="font-mono text-ink">{formatLKR((confirmed.serviceCost ?? 0))}</span>
                </div>
                {confirmed.bookedServices.map((svc) => {
                  const isSpa = svc.category?.toUpperCase() === 'SPA';
                  return (
                    <div key={svc.service_id} className="p-3 bg-[#FDFCFA] border border-skynest-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{svc.service_name}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 bg-ink/5 border border-skynest-hairline text-ink/60 font-mono">
                            {svc.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink/60 mt-1 space-x-2">
                          <span>Quantity: <strong className="text-ink">{svc.quantity}</strong> × {formatLKR(svc.base_price)}</span>
                          {svc.date && <span className="text-skynest-accent font-medium">· {isSpa ? 'Spa Session Date' : 'Date'}: {svc.date}</span>}
                          {svc.appointment_time && <span className="font-medium text-ink">· Slot: {svc.appointment_time}</span>}
                          {svc.notes && <span className="italic text-ink/40">({svc.notes})</span>}
                        </div>
                      </div>
                      <div className="text-right sm:border-l sm:pl-3 border-skynest-hairline">
                        <span className="font-mono font-bold text-ink">{formatLKR((svc.base_price * svc.quantity))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Complete Statutory Tax Cascade Breakdown */}
            <div className="py-4 border-b border-skynest-hairline space-y-2 text-xs font-jakarta">
              <div className="flex justify-between items-center text-ink/70">
                <span>Total Accommodation ({confirmed.rooms.length} Rooms × {confirmed.nights} Nights)</span>
                <span className="font-medium text-ink">{formatLKR(confirmed.rooms.reduce((s, r) => s + r.roomCost, 0))}</span>
              </div>
              <div className="flex justify-between items-center text-ink/70">
                <span>Total Meal Plans</span>
                <span className="font-medium text-ink">{formatLKR(confirmed.rooms.reduce((s, r) => s + r.mealCost, 0))}</span>
              </div>
              {confirmed.bookedServices && confirmed.bookedServices.length > 0 && (
                <div className="flex justify-between items-center text-ink/70">
                  <span>Total Booked Services ({confirmed.bookedServices.length} items)</span>
                  <span className="font-medium text-ink">{formatLKR((confirmed.serviceCost ?? 0))}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-ink font-semibold pt-1 border-t border-skynest-hairline">
                <span>Base Subtotal (Net of Taxes)</span>
                <span>{formatLKR(confirmed.baseAmount)}</span>
              </div>
              
              {/* Sri Lanka Statutory Levies */}
              <div className="pt-2 space-y-1.5 text-ink/60 text-[11px]">
                <div className="flex justify-between items-center">
                  <span>+ Service Charge (SC 10%)</span>
                  <span>{formatLKR(confirmed.taxes.scTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Tourism Development Levy (TDL 1%)</span>
                  <span>{formatLKR(confirmed.taxes.tdlTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Social Security Contribution Levy (SSCL 2.5%)</span>
                  <span>{formatLKR(confirmed.taxes.sscTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>+ Value Added Tax (VAT 18%)</span>
                  <span>{formatLKR(confirmed.taxes.vatTax)}</span>
                </div>
              </div>
            </div>

            {/* Total Cost All-Inclusive */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <span className="font-cinzel text-xs uppercase tracking-wider text-ink/60 block">
                  Grand Total ({confirmed.rooms.length} Room{confirmed.rooms.length > 1 ? 's' : ''} • All-Inclusive)
                </span>
                <p className="text-[10px] font-jakarta text-ink/40">Includes all accommodation, selected meal plans, services &amp; statutory taxes</p>
              </div>
              <span className="font-cinzel text-2xl md:text-3xl font-normal text-skynest-accent">
                {formatLKR(confirmed.grandTotal)}
              </span>
            </div>

            {/* Payment Summary & Folio Settlement */}
            <div className="p-5 bg-[#FDFCFA] border border-skynest-hairline space-y-3 text-xs font-jakarta">
              <div className="flex items-center justify-between pb-3 border-b border-skynest-hairline">
                <span className="font-cinzel text-xs uppercase tracking-wider text-ink font-bold">
                  Payment Status &amp; Settlement
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${
                  confirmed.paymentMode === 'FULL' || (confirmed.amountPaid ?? 0) >= confirmed.grandTotal - 0.01
                    ? 'border-emerald-600/40 bg-emerald-50 text-emerald-700'
                    : confirmed.paymentMode === 'DEPOSIT'
                    ? 'border-sky-600/40 bg-sky-50 text-sky-700'
                    : 'border-amber-600/40 bg-amber-50 text-amber-700'
                }`}>
                  {confirmed.paymentMode === 'FULL' || (confirmed.amountPaid ?? 0) >= confirmed.grandTotal - 0.01
                    ? '✓ PAID IN FULL'
                    : confirmed.paymentMode === 'DEPOSIT'
                    ? '✓ 20% DEPOSIT PAID'
                    : '○ PAYMENT ON ARRIVAL'}
                </span>
              </div>

              {confirmed.amountPaid !== undefined && confirmed.amountPaid > 0 ? (
                <div className="flex justify-between items-center text-sky-700 font-semibold pt-1">
                  <span>
                    {confirmed.paymentMode === 'DEPOSIT'
                      ? 'Deposit Paid Online (20%)'
                      : 'Amount Paid Online (Full Prepayment)'}
                  </span>
                  <span className="font-mono text-sm">&#8722; {formatLKR(confirmed.amountPaid)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-ink/60 pt-1">
                  <span>Amount Paid Online (Hold Reservation)</span>
                  <span className="font-mono">Rs 0.00</span>
                </div>
              )}

              <div className={`flex justify-between items-center font-bold text-sm pt-2 border-t border-dashed border-skynest-hairline ${
                Math.max(0, confirmed.grandTotal - (confirmed.amountPaid ?? 0)) > 0.01
                  ? 'text-amber-800'
                  : 'text-emerald-700'
              }`}>
                <span>Balance Due on Arrival:</span>
                <span className="font-mono">
                  {formatLKR(Math.max(0, confirmed.grandTotal - (confirmed.amountPaid ?? 0)))}
                </span>
              </div>
            </div>

            <div data-html2canvas-ignore="true" className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-skynest-hairline">
              <Link
                href="/"
                className="flex-1 py-3.5 text-center font-jakarta font-semibold text-xs tracking-wider uppercase border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent transition-all"
              >
                Return to Home
              </Link>

              {/* 1-PAGE OFFICIAL FISCAL TAX INVOICE */}
              <button
                type="button"
                onClick={handlePrintOfficialBill}
                className="flex-1 py-3.5 text-center font-jakarta font-semibold text-xs tracking-wider uppercase border border-skynest-accent bg-skynest-accent text-white hover:bg-skynest-accent/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Tax Invoice</span>
              </button>

              {/* DOWNLOAD PDF RECEIPT */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1 py-3.5 text-center font-jakarta font-semibold text-xs tracking-wider uppercase border border-ink text-ink hover:bg-ink hover:text-paper transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDownloading ? (
                  'Generating PDF...'
                ) : (
                  <>
                    <span>Download PDF Receipt</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </>
                )}
              </button>

              <Link
                href="/book"
                className="flex-1 py-3.5 text-center font-jakarta font-semibold text-xs tracking-wider uppercase border border-skynest-hairline text-ink/70 hover:border-ink hover:text-ink transition-all"
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
                        className="px-2.5 py-1 text-[11px] font-jakarta font-medium border border-skynest-hairline bg-[#FDFCFA] hover:border-ink hover:text-ink hover:bg-ink/[0.03] text-ink/70 transition-colors"
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
                  const roomGuestCount = Math.max(1, (room.adults || 1) + (room.children || 0));
                  const roomMealCost = currentPlan.price * nights * roomGuestCount;
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
                            {room.roomTypeName} • {formatLKR(room.baseRate, 0)}/nt
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
                            {formatLKR(roomSubtotal)}
                          </span>
                          <span className="text-[9px] font-jakarta text-ink/40">
                            ({nights} nt{nights > 1 ? 's' : ''})
                          </span>
                        </div>
                      </div>

                      {/* Designated Guest Occupancy (Fixed for this designated booking) */}
                      <div className="p-4 bg-white border border-skynest-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div>
                          <span className="block text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/50">
                            Designated Guest Allocation (Fixed)
                          </span>
                          <span className="text-sm font-jakarta font-bold text-ink">
                            {room.adults} Adult{room.adults > 1 ? 's' : ''}
                            {room.children > 0 ? `, ${room.children} Child${room.children > 1 ? 'ren' : ''}` : ''}
                            {room.childAges && room.childAges.length > 0 ? ` (Ages: ${room.childAges.join(', ')})` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-jakarta font-semibold uppercase tracking-wider px-2.5 py-1 bg-ink/5 text-ink/80 border border-skynest-hairline">
                            {room.adults + room.children} of Max {room.maxGuests} Guests
                          </span>
                          <span className="text-[10px] font-jakarta text-ink/40 uppercase font-medium">
                            Locked for Stay
                          </span>
                        </div>
                      </div>

                      {/* Multiple Meal Plan Selection directly on EACH room card */}
                      <div className="pt-2 border-t border-skynest-hairline space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/70">
                            Meal Plan for Room {room.roomNumber}
                          </label>
                          <span className="text-[10px] font-jakarta text-ink/70 font-semibold">
                            {currentPlan.name} ({currentPlan.price === 0 ? 'Included' : `+${formatLKR(currentPlan.price, 0)}/nt per guest (${formatLKR(roomMealCost)} total)`})
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
                                    ? 'border-ink bg-ink/[0.04] shadow-xs'
                                    : 'border-skynest-hairline bg-white hover:border-ink/40'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-cinzel text-xs font-bold text-ink uppercase truncate">
                                    {plan.name}
                                  </span>
                                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSel ? 'border-ink bg-ink' : 'border-ink/30'
                                  }`}>
                                    {isSel && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                </div>
                                <p className="font-jakarta text-[10px] text-ink/50 mt-1 line-clamp-1">{plan.description}</p>
                                <span className={`text-[11px] font-jakarta font-bold mt-2 text-right ${
                                  isSel ? 'text-ink font-bold' : 'text-ink/70'
                                }`}>
                                  {plan.price === 0 ? 'Included' : `+${formatLKR(plan.price, 0)}/nt`}
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

                        {/* ── SECTION 03: Curated Add-On Services & Experiences ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-skynest-hairline gap-2">
                <div>
                  <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                      03
                    </span>
                    Curated Add-On Services & Experiences
                  </h2>
                  <p className="font-jakarta text-xs text-ink/50 mt-1">
                    Select optional airport transfers, spa therapies, or destination tours curated for {branch?.name ?? 'your stay'}.
                  </p>
                </div>
                {totalServiceCost > 0 && (
                  <span className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider bg-ink/[0.05] px-3 py-1 border border-skynest-hairline">
                    Add-ons: +{formatLKR(totalServiceCost)}
                  </span>
                )}
              </div>

              {availableServices.length === 0 ? (
                <p className="font-jakarta text-xs text-ink/40 py-4 text-center">Loading luxury services for this branch...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableServices.map((svc) => {
                    const qty = selectedServices[svc.service_id] || 0;
                    const isSelected = qty > 0;
                    const cap = getServiceCap(svc);
                    const isMaxReached = qty >= cap.max;
                    return (
                      <div
                        key={svc.service_id}
                        className={`p-4 border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-ink bg-ink/[0.03] shadow-xs'
                            : 'border-skynest-hairline bg-[#FDFCFA] hover:border-ink/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[9px] font-jakarta font-bold uppercase tracking-wider px-2 py-0.5 bg-ink/5 text-ink/70 border border-skynest-hairline">
                              {svc.category}
                            </span>
                            <span className="font-cinzel text-xs font-bold text-ink">
                              {formatLKR(Number(svc.base_price))}
                            </span>
                          </div>
                          <h4 className="font-cinzel text-sm font-semibold text-ink line-clamp-2">
                            {svc.service_name}
                          </h4>
                          <p className="font-jakarta text-[11px] text-ink/50 mt-1">
                            Available during your stay. Itemized in your room folio statement.
                          </p>
                          {cap.label && (
                            <div className="mt-2.5">
                              <span className={`inline-block text-[10px] font-jakarta px-2 py-0.5 border ${
                                isMaxReached
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                                  : 'bg-ink/[0.02] text-ink/60 border-skynest-hairline font-medium'
                              }`}>
                                {isMaxReached ? `Limit Reached: ${cap.label}` : cap.label}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-3 border-t border-skynest-hairline flex items-center justify-between">
                          {isSelected ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedServices(prev => {
                                  const updated = { ...prev };
                                  if (qty <= 1) delete updated[svc.service_id];
                                  else updated[svc.service_id] = qty - 1;
                                  return updated;
                                })}
                                className="w-6 h-6 flex items-center justify-center border border-skynest-hairline text-ink hover:bg-ink hover:text-white transition-colors text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="font-jakarta text-xs font-bold text-ink px-1 tabular-nums">
                                {qty}
                              </span>
                              <button
                                type="button"
                                disabled={isMaxReached}
                                onClick={() => setSelectedServices(prev => ({
                                  ...prev,
                                  [svc.service_id]: Math.min(cap.max, qty + 1),
                                }))}
                                className={`w-6 h-6 flex items-center justify-center border text-xs font-bold transition-colors ${
                                  isMaxReached
                                    ? 'border-skynest-hairline text-ink/30 bg-ink/[0.02] cursor-not-allowed'
                                    : 'border-skynest-hairline text-ink hover:bg-ink hover:text-white'
                                }`}
                                title={isMaxReached ? `Maximum limit reached (${cap.label})` : 'Add one more'}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={cap.max < 1}
                              onClick={() => setSelectedServices(prev => ({
                                ...prev,
                                [svc.service_id]: 1,
                              }))}
                              className="px-3 py-1 text-[11px] font-jakarta font-semibold uppercase tracking-wider border border-skynest-hairline bg-white hover:border-ink hover:text-ink hover:bg-ink/[0.03] transition-colors text-ink/80 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              + Add to Stay
                            </button>
                          )}
                          <span className="font-jakarta text-[11px] text-ink font-semibold">
                            {isSelected ? `${formatLKR((svc.base_price * qty))}` : ''}
                          </span>
                        </div>

                        {isSelected && cap.isSpa && (
                          <div className="mt-3 pt-3 border-t border-skynest-hairline space-y-2 bg-paper/70 p-2.5 border border-skynest-hairline/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-jakarta font-semibold uppercase tracking-wider text-skynest-accent flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Spa Appointment Schedule
                              </span>
                              <span className="text-[9px] font-jakarta text-ink/50">Capacity: 20/hr</span>
                            </div>

                            <div>
                              <label className="block text-[9px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold mb-0.5">
                                Appointment Date (Within Stay: {checkIn} → {checkOut})
                              </label>
                              <input
                                type="date"
                                value={serviceSchedules[svc.service_id]?.date || checkIn}
                                min={checkIn}
                                max={checkOut}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  setServiceSchedules(prev => ({
                                    ...prev,
                                    [svc.service_id]: {
                                      ...(prev[svc.service_id] || { timeSlot: '10:00' }),
                                      date: newDate,
                                    },
                                  }));
                                  fetchSpaSlotsForDate(newDate);
                                }}
                                className="w-full bg-white border border-skynest-hairline px-2 py-1 text-[11px] font-jakarta focus:outline-none focus:border-skynest-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-jakarta uppercase tracking-wider text-ink/60 font-semibold mb-0.5">
                                Preferred 1-Hour Time Slot
                              </label>
                              <select
                                value={serviceSchedules[svc.service_id]?.timeSlot || '10:00'}
                                onChange={(e) => {
                                  const newSlot = e.target.value;
                                  setServiceSchedules(prev => ({
                                    ...prev,
                                    [svc.service_id]: {
                                      ...(prev[svc.service_id] || { date: checkIn }),
                                      timeSlot: newSlot,
                                    },
                                  }));
                                }}
                                className="w-full bg-white border border-skynest-hairline px-2 py-1 text-[11px] font-jakarta focus:outline-none focus:border-skynest-accent"
                              >
                                {(spaSlotsData[serviceSchedules[svc.service_id]?.date || checkIn] || [
                                  { time: '09:00', is_available: true, available_count: 20 },
                                  { time: '10:00', is_available: true, available_count: 20 },
                                  { time: '11:00', is_available: true, available_count: 20 },
                                  { time: '12:00', is_available: true, available_count: 20 },
                                  { time: '13:00', is_available: true, available_count: 20 },
                                  { time: '14:00', is_available: true, available_count: 20 },
                                  { time: '15:00', is_available: true, available_count: 20 },
                                  { time: '16:00', is_available: true, available_count: 20 },
                                  { time: '17:00', is_available: true, available_count: 20 },
                                  { time: '18:00', is_available: true, available_count: 20 },
                                  { time: '19:00', is_available: true, available_count: 20 },
                                  { time: '20:00', is_available: true, available_count: 20 },
                                ]).map((slot) => {
                                  const disabled = !slot.is_available;
                                  return (
                                    <option key={slot.time} value={slot.time} disabled={disabled}>
                                      {slot.time} {disabled ? '— Fully Booked (20/20)' : `(${slot.available_count ?? 20} slots left)`}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div>
                              <input
                                type="text"
                                placeholder="Special requests, therapist note..."
                                value={serviceSchedules[svc.service_id]?.notes || ''}
                                onChange={(e) => {
                                  const newNotes = e.target.value;
                                  setServiceSchedules(prev => ({
                                    ...prev,
                                    [svc.service_id]: {
                                      ...(prev[svc.service_id] || { date: checkIn, timeSlot: '10:00' }),
                                      notes: newNotes,
                                    },
                                  }));
                                }}
                                className="w-full bg-white border border-skynest-hairline px-2 py-1 text-[10px] font-jakarta placeholder:text-ink/40 focus:outline-none focus:border-skynest-accent"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            {/* ── SECTION 04: Payment & Reservation Guarantee (Rule B12) ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm space-y-6">
              <div className="pb-4 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    04
                  </span>
                  Payment Guarantee & Confirmation
                </h2>
                <p className="font-jakarta text-xs text-ink/50 mt-1">
                  Select whether to guarantee your booking instantly via partial deposit, full prepayment, or hold for front desk review.
                </p>
              </div>

              {/* 3 Payment Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: 20% Deposit */}
                <div
                  onClick={() => setPaymentOption('DEPOSIT')}
                  className={`p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                    paymentOption === 'DEPOSIT'
                      ? 'border-ink bg-ink/[0.03] shadow-sm'
                      : 'border-skynest-hairline bg-[#FDFCFA] hover:border-ink/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                        20% Deposit (Recommended)
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentOption === 'DEPOSIT' ? 'border-ink bg-ink' : 'border-ink/30'
                      }`}>
                        {paymentOption === 'DEPOSIT' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="font-jakarta text-[11px] text-ink/60 leading-relaxed">
                      Instant guaranteed confirmation. Pay 20% today, settle remainder on arrival.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-skynest-hairline flex items-baseline justify-between">
                    <span className="font-jakarta text-[10px] text-ink/40 uppercase font-semibold">Charge Now</span>
                    <span className="font-cinzel text-base font-bold text-ink">{formatLKR(depositAmount)}</span>
                  </div>
                </div>

                {/* Option 2: Full Prepayment */}
                <div
                  onClick={() => setPaymentOption('FULL')}
                  className={`p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                    paymentOption === 'FULL'
                      ? 'border-ink bg-ink/[0.03] shadow-sm'
                      : 'border-skynest-hairline bg-[#FDFCFA] hover:border-ink/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                        Pay in Full
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentOption === 'FULL' ? 'border-ink bg-ink' : 'border-ink/30'
                      }`}>
                        {paymentOption === 'FULL' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="font-jakarta text-[11px] text-ink/60 leading-relaxed">
                      Instant guaranteed confirmation with zero outstanding balance upon check-in.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-skynest-hairline flex items-baseline justify-between">
                    <span className="font-jakarta text-[10px] text-ink/40 uppercase font-semibold">Charge Now</span>
                    <span className="font-cinzel text-base font-bold text-ink">{formatLKR(grandTotal)}</span>
                  </div>
                </div>

                {/* Option 3: Pay on Arrival */}
                <div
                  onClick={() => setPaymentOption('ARRIVAL')}
                  className={`p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                    paymentOption === 'ARRIVAL'
                      ? 'border-ink bg-ink/[0.03] shadow-sm'
                      : 'border-skynest-hairline bg-[#FDFCFA] hover:border-ink/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                        Pay Upon Arrival
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentOption === 'ARRIVAL' ? 'border-ink bg-ink' : 'border-ink/30'
                      }`}>
                        {paymentOption === 'ARRIVAL' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="font-jakarta text-[11px] text-ink/60 leading-relaxed">
                      Provisional hold. Submitted as PENDING for Front Desk Reception review & verification.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-skynest-hairline flex items-baseline justify-between">
                    <span className="font-jakarta text-[10px] text-ink/40 uppercase font-semibold">Charge Now</span>
                    <span className="font-cinzel text-base font-bold text-ink/70">Rs 0.00</span>
                  </div>
                </div>
              </div>

              {/* Credit Card Inputs (Rendered when Deposit or Full is active) */}
              {paymentOption !== 'ARRIVAL' && (
                <div className="p-5 bg-[#F8F6F2] border border-skynest-hairline space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-jakarta font-bold uppercase tracking-wider text-ink/70">
                      Payment Card Details (Encrypted SSL Transaction)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-jakarta text-[10px] font-bold uppercase tracking-wider mb-1 text-ink/60">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Name on card"
                        value={cardholderName}
                        onChange={e => setCardholderName(e.target.value)}
                        className="w-full px-3 py-2.5 font-jakarta text-xs border border-skynest-hairline bg-white text-ink outline-none focus:border-skynest-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-jakarta text-[10px] font-bold uppercase tracking-wider mb-1 text-ink/60">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="4242 •••• •••• 4242"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2.5 font-jakarta text-xs border border-skynest-hairline bg-white text-ink outline-none focus:border-skynest-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-jakarta text-[10px] font-bold uppercase tracking-wider mb-1 text-ink/60">
                        Expiry (MM/YY) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        className="w-full px-3 py-2.5 font-jakarta text-xs border border-skynest-hairline bg-white text-ink outline-none focus:border-skynest-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-jakarta text-[10px] font-bold uppercase tracking-wider mb-1 text-ink/60">
                        CVV / CVC *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="•••"
                        maxLength={4}
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                        className="w-full px-3 py-2.5 font-jakarta text-xs border border-skynest-hairline bg-white text-ink outline-none focus:border-skynest-accent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 05: Consolidated Reservation Summary & Statutory Taxes ── */}
            <div className="sn-confirm-card p-6 md:p-8 rounded-none border border-skynest-hairline bg-white shadow-sm space-y-6">
              <div className="pb-4 border-b border-skynest-hairline">
                <h2 className="font-cinzel text-base font-medium uppercase tracking-wider text-ink flex items-center gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-ink">
                    05
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
                      <span>{formatLKR(totalRoomCost)}</span>
                    </div>
                    {rooms.map((rm) => (
                      <div key={rm.index} className="flex justify-between items-center text-ink/60 text-[11px] pl-3">
                        <span>Room {rm.roomNumber} ({rm.roomTypeName}): {nights} nt × {formatLKR(rm.baseRate, 0)}/nt</span>
                        <span>{formatLKR((rm.baseRate * nights))}</span>
                      </div>
                    ))}
                  </div>

                  {/* Meal charges itemized with explicit guest and nights multiplication */}
                  <div className="space-y-1.5 text-xs font-jakarta pt-2">
                    <div className="flex justify-between items-center text-ink font-semibold border-b border-skynest-hairline pb-1">
                      <span>Meal Plans ({rooms.length} Room{rooms.length > 1 ? 's' : ''})</span>
                      <span>{formatLKR(totalMealCost)}</span>
                    </div>
                    {roomCalculations.map((rm) => {
                      const guestCount = Math.max(1, (rm.adults || 1) + (rm.children || 0));
                      return (
                        <div key={rm.index} className="flex justify-between items-center text-ink/60 text-[11px] pl-3">
                          <span>
                            Room {rm.roomNumber}: {rm.planName}{' '}
                            {rm.planPrice > 0
                              ? `(${guestCount} guest${guestCount > 1 ? 's' : ''} × ${nights} nt × ${formatLKR(rm.planPrice, 0)}/guest/nt)`
                              : '(Included)'}
                          </span>
                          <span className="font-semibold text-ink">{formatLKR(rm.mealCost)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Curated Services & Add-Ons itemized */}
                  {selectedServiceList.length > 0 && (
                    <div className="space-y-1.5 text-xs font-jakarta pt-2">
                      <div className="flex justify-between items-center text-ink font-semibold border-b border-skynest-hairline pb-1">
                        <span>Curated Services & Add-Ons ({selectedServiceList.length} Selected)</span>
                        <span>{formatLKR(totalServiceCost)}</span>
                      </div>
                      {selectedServiceList.map((svc) => {
                        const isSpa = svc.category?.toUpperCase() === 'SPA';
                        return (
                          <div key={svc.service_id} className="flex justify-between items-start text-ink/70 text-[11px] pl-3 py-1 bg-[#FDFCFA] border border-skynest-hairline/40 my-0.5">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-ink">{svc.service_name}</span>
                                <span className="text-[9px] uppercase px-1 py-0.2 bg-ink/5 border border-skynest-hairline text-ink/50 font-mono">
                                  {svc.category}
                                </span>
                              </div>
                              <div className="text-[10px] text-ink/50 mt-0.5 space-x-1.5">
                                <span>Quantity: <strong className="text-ink">{svc.quantity}</strong> × {formatLKR(svc.base_price)}</span>
                                {svc.date && <span className="text-skynest-accent font-medium">· {isSpa ? 'Spa Session Date' : 'Date'}: {svc.date}</span>}
                                {svc.appointment_time && <span className="font-medium text-ink">· Slot: {svc.appointment_time}</span>}
                                {svc.notes && <span className="italic text-ink/40">({svc.notes})</span>}
                              </div>
                            </div>
                            <span className="font-semibold text-ink font-mono">{formatLKR((svc.base_price * svc.quantity))}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Base Subtotal */}
                  <div className="flex justify-between items-center text-ink font-bold text-xs pt-2 border-t border-skynest-hairline">
                    <span>Base Subtotal (Net of Taxes)</span>
                    <span>{formatLKR(baseAmount)}</span>
                  </div>

                  {/* 4-Tier Tax Cascade itemized */}
                  <div className="space-y-1 text-[11px] font-jakarta text-ink/60 pt-2 border-t border-skynest-hairline">
                    <div className="flex justify-between items-center">
                      <span>Service Charge (SC 10%)</span>
                      <span>+{formatLKR(taxes.scTax)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tourism Development Levy (TDL 1%)</span>
                      <span>+{formatLKR(taxes.tdlTax)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Social Security Contribution Levy (SSCL 2.5%)</span>
                      <span>+{formatLKR(taxes.sscTax)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Value Added Tax (VAT 18%)</span>
                      <span>+{formatLKR(taxes.vatTax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-ink/80 font-medium pt-1 border-t border-dashed border-skynest-hairline">
                      <span>Total Statutory Levies & Taxes</span>
                      <span>+{formatLKR(taxes.totalTaxes)}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total Card and Submission Button (5 Cols) */}
                <div className="lg:col-span-5 p-6 bg-[#FDFCFA] border border-skynest-hairline flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-jakarta uppercase tracking-wider text-ink/40 block mb-1">
                        Estimated Grand Total
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="font-cinzel text-3xl font-normal text-skynest-accent">
                          {formatLKR(grandTotal)}
                        </span>
                        <span className="text-[10px] font-jakarta text-ink/50 uppercase font-semibold">
                          All Taxes Included
                        </span>
                      </div>
                      <p className="text-[10px] font-jakarta text-ink/40 mt-1">
                        Covers all accommodation for {rooms.length} room{rooms.length > 1 ? 's' : ''}, individual meal plans, curated add-ons, and statutory levies (SC, TDL, SSCL, VAT).
                      </p>
                    </div>

                    {/* Settlement Breakdown based on Tile 04 Payment Selection */}
                    <div className="pt-3 border-t border-skynest-hairline space-y-2 text-xs font-jakarta">
                      <div className="flex justify-between items-center text-ink/60 text-[11px]">
                        <span>Selected Payment Mode</span>
                        <span className="font-semibold text-ink uppercase text-[10px] px-2 py-0.5 bg-ink/5 border border-skynest-hairline">
                          {paymentOption === 'DEPOSIT' ? '20% Guarantee Deposit' : paymentOption === 'FULL' ? 'Full Prepayment' : 'Pay on Arrival'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sky-700 font-semibold bg-sky-50/70 p-2.5 border border-sky-100">
                        <span>
                          {paymentOption === 'DEPOSIT'
                            ? 'Deposit Due Today (20%)'
                            : paymentOption === 'FULL'
                            ? 'Amount Due Today (Full)'
                            : 'Amount Due Today'}
                        </span>
                        <span className="font-mono text-sm">
                          {paymentOption === 'DEPOSIT'
                            ? `${formatLKR(depositAmount)}`
                            : paymentOption === 'FULL'
                            ? `${formatLKR(grandTotal)}`
                            : 'Rs 0.00'}
                        </span>
                      </div>
                      <div className={`flex justify-between items-center font-semibold p-2.5 border ${
                        paymentOption === 'FULL'
                          ? 'text-emerald-700 bg-emerald-50/70 border-emerald-100'
                          : 'text-amber-800 bg-amber-50/70 border-amber-100'
                      }`}>
                        <span>Balance Due on Arrival:</span>
                        <span className="font-mono text-sm">
                          {paymentOption === 'DEPOSIT'
                            ? `${formatLKR((grandTotal - depositAmount))}`
                            : paymentOption === 'FULL'
                            ? 'Rs 0.00 (Fully Settled)'
                            : `${formatLKR(grandTotal)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-none font-jakarta font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 border border-ink bg-ink text-paper hover:bg-skynest-accent hover:border-skynest-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Processing Reservation…' : paymentOption === 'DEPOSIT'
                      ? `Confirm & Pay 20% Deposit (${formatLKR(depositAmount)})`
                      : paymentOption === 'FULL'
                      ? `Confirm & Pay Full Amount (${formatLKR(grandTotal)})`
                      : `Submit Reservation (Rs 0.00 today · Pay on Arrival)`}
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
