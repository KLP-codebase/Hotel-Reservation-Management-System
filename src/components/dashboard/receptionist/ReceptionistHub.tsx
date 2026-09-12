"use client";

import { useState, useMemo } from "react";
import {
  BedDouble, CalendarCheck, Users, TrendingUp, CheckCircle2,
  Clock, ShieldCheck, RefreshCw, AlertTriangle, Search,
  DoorOpen, Building, CheckCircle, ChevronRight, User,
  Utensils, Sparkles, Receipt, CreditCard, LogOut, Printer, UserCheck,
  Phone, Mail, Calendar, Key, Eye, Plus
} from "lucide-react";
import { InRoomDiningModal } from "./InRoomDiningModal";
import { SpaBookingModal } from "./SpaBookingModal";
import { FolioServicesModal } from "./FolioServicesModal";
import { TotalBillModal } from "./TotalBillModal";
import { CheckInModal } from "./CheckInModal";
import { CheckOutModal } from "./CheckOutModal";

interface ReceptionistHubProps {
  user:         any;
  stats:        any;
  bookings:     any[];
  roomsStatus:  any[];
  propertyName: string;
  onRefresh:    () => void;
}

export function ReceptionistHub({
  user,
  stats,
  bookings,
  roomsStatus,
  propertyName,
  onRefresh,
}: ReceptionistHubProps) {
  // Navigation & Filtering state
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ARRIVALS" | "IN_HOUSE" | "DEPARTURES" | "ROOMS">("ALL");
  const [searchQuery, setSearchQuery]   = useState("");

  // Modal target states
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [activeModal, setActiveModal]         = useState<"none" | "dining" | "spa" | "folio" | "bill" | "checkin" | "checkout">("none");

  const todayStr = new Date().toISOString().split("T")[0];

  // Scoped bookings for this hotel
  const hotelBookings = useMemo(() => {
    return bookings.filter((b) => {
      // If branchId exists on user, filter to user's branch
      if (user?.branchId && b.branch_id && b.branch_id !== user.branchId) {
        return false;
      }
      return true;
    });
  }, [bookings, user?.branchId]);

  // Operational metrics
  const arrivingToday = useMemo(() => {
    return hotelBookings.filter((b) => b.check_in_date === todayStr && b.booking_status === "CONFIRMED");
  }, [hotelBookings, todayStr]);

  const inHouseGuests = useMemo(() => {
    return hotelBookings.filter((b) => b.booking_status === "CHECKED_IN");
  }, [hotelBookings]);

  const departingToday = useMemo(() => {
    return hotelBookings.filter((b) => b.check_out_date === todayStr && b.booking_status === "CHECKED_IN");
  }, [hotelBookings, todayStr]);

  // Filtered list based on tab & search
  const filteredBookings = useMemo(() => {
    let list = hotelBookings;

    if (activeFilter === "ARRIVALS") {
      list = arrivingToday;
    } else if (activeFilter === "IN_HOUSE") {
      list = inHouseGuests;
    } else if (activeFilter === "DEPARTURES") {
      list = departingToday;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) =>
        (b.guest_first_name && b.guest_first_name.toLowerCase().includes(q)) ||
        (b.guest_last_name && b.guest_last_name.toLowerCase().includes(q)) ||
        (b.room_number && b.room_number.toLowerCase().includes(q)) ||
        (b.guest_phone && b.guest_phone.toLowerCase().includes(q)) ||
        (b.guest_email && b.guest_email.toLowerCase().includes(q))
      );
    }

    return list;
  }, [hotelBookings, activeFilter, arrivingToday, inHouseGuests, departingToday, searchQuery]);

  const openModalFor = (booking: any, modal: "dining" | "spa" | "folio" | "bill" | "checkin" | "checkout") => {
    setSelectedBooking(booking);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal("none");
    setSelectedBooking(null);
  };

  return (
    <div className="space-y-8">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. FRONT DESK HERO BANNER & OFFICER BADGE                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="p-6 md:p-8 rounded-[4px] border border-skynest-hairline bg-paper shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-jakarta font-semibold tracking-wider uppercase bg-skynest-accent/10 text-skynest-accent border border-skynest-accent/20">
                <span className="w-1.5 h-1.5 rounded-full bg-skynest-accent animate-pulse" />
                Front Desk Operations
              </span>
              <span className="text-ink/40 text-xs font-jakarta">
                • {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-ink tracking-wide">
              {propertyName}
            </h1>
            <p className="font-jakarta text-xs md:text-sm text-ink/60 mt-1 max-w-2xl leading-relaxed">
              Front desk guest management console: Check-in arrivals, in-room dining menus, collision-aware spa scheduling, and statutory 4-tax cascade folio billing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="font-jakarta text-xs font-semibold text-ink">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="text-[11px] font-jakarta text-skynest-accent">
                Front Desk Officer (On Duty)
              </span>
            </div>
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-[3px] border border-skynest-hairline bg-paper hover:border-skynest-accent hover:text-skynest-accent transition-all text-ink/70"
              title="Refresh operational data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* KPI CHIPS                                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-skynest-hairline">
          <div
            onClick={() => setActiveFilter("ARRIVALS")}
            className={`p-4 rounded-[4px] border cursor-pointer transition-all ${
              activeFilter === "ARRIVALS"
                ? "bg-amber-500/5 border-amber-500 shadow-xs"
                : "bg-paper border-skynest-hairline hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-jakarta text-ink/60">
              <span className="uppercase tracking-wider text-[10px] font-semibold">Arriving Today</span>
              <CalendarCheck className="w-4 h-4 text-amber-600" />
            </div>
            <p className="font-cinzel text-2xl font-bold text-ink mt-2">
              {arrivingToday.length}
            </p>
            <span className="font-jakarta text-[11px] text-ink/40">
              Ready for ID check-in
            </span>
          </div>

          <div
            onClick={() => setActiveFilter("IN_HOUSE")}
            className={`p-4 rounded-[4px] border cursor-pointer transition-all ${
              activeFilter === "IN_HOUSE"
                ? "bg-emerald-500/5 border-emerald-500 shadow-xs"
                : "bg-paper border-skynest-hairline hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-jakarta text-ink/60">
              <span className="uppercase tracking-wider text-[10px] font-semibold">In-House Residents</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-cinzel text-2xl font-bold text-ink mt-2">
              {inHouseGuests.length}
            </p>
            <span className="font-jakarta text-[11px] text-ink/40">
              Active stays & room folios
            </span>
          </div>

          <div
            onClick={() => setActiveFilter("DEPARTURES")}
            className={`p-4 rounded-[4px] border cursor-pointer transition-all ${
              activeFilter === "DEPARTURES"
                ? "bg-rose-500/5 border-rose-500 shadow-xs"
                : "bg-paper border-skynest-hairline hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-jakarta text-ink/60">
              <span className="uppercase tracking-wider text-[10px] font-semibold">Departures Today</span>
              <LogOut className="w-4 h-4 text-rose-600" />
            </div>
            <p className="font-cinzel text-2xl font-bold text-ink mt-2">
              {departingToday.length}
            </p>
            <span className="font-jakarta text-[11px] text-ink/40">
              Checkout & bill settlement
            </span>
          </div>

          <div
            onClick={() => setActiveFilter("ROOMS")}
            className={`p-4 rounded-[4px] border cursor-pointer transition-all ${
              activeFilter === "ROOMS"
                ? "bg-sky-500/5 border-sky-500 shadow-xs"
                : "bg-paper border-skynest-hairline hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-jakarta text-ink/60">
              <span className="uppercase tracking-wider text-[10px] font-semibold">Available Rooms</span>
              <DoorOpen className="w-4 h-4 text-sky-600" />
            </div>
            <p className="font-cinzel text-2xl font-bold text-ink mt-2">
              {stats?.available_rooms ?? 0}
            </p>
            <span className="font-jakarta text-[11px] text-ink/40">
              Out of {stats?.total_rooms ?? 16} inventory
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. OPERATIONS CONTROLS & FILTER BAR                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-2 rounded-[3px] font-jakarta text-xs font-semibold uppercase tracking-wider transition-all ${
              activeFilter === "ALL"
                ? "bg-ink text-paper shadow-xs"
                : "bg-paper border border-skynest-hairline text-ink/70 hover:text-ink"
            }`}
          >
            All Reservations ({hotelBookings.length})
          </button>
          <button
            onClick={() => setActiveFilter("ARRIVALS")}
            className={`px-3.5 py-2 rounded-[3px] font-jakarta text-xs font-semibold uppercase tracking-wider transition-all ${
              activeFilter === "ARRIVALS"
                ? "bg-ink text-paper shadow-xs"
                : "bg-paper border border-skynest-hairline text-ink/70 hover:text-ink"
            }`}
          >
            Arriving Today ({arrivingToday.length})
          </button>
          <button
            onClick={() => setActiveFilter("IN_HOUSE")}
            className={`px-3.5 py-2 rounded-[3px] font-jakarta text-xs font-semibold uppercase tracking-wider transition-all ${
              activeFilter === "IN_HOUSE"
                ? "bg-ink text-paper shadow-xs"
                : "bg-paper border border-skynest-hairline text-ink/70 hover:text-ink"
            }`}
          >
            In-House Residents ({inHouseGuests.length})
          </button>
          <button
            onClick={() => setActiveFilter("DEPARTURES")}
            className={`px-3.5 py-2 rounded-[3px] font-jakarta text-xs font-semibold uppercase tracking-wider transition-all ${
              activeFilter === "DEPARTURES"
                ? "bg-ink text-paper shadow-xs"
                : "bg-paper border border-skynest-hairline text-ink/70 hover:text-ink"
            }`}
          >
            Departures Today ({departingToday.length})
          </button>
          <button
            onClick={() => setActiveFilter("ROOMS")}
            className={`px-3.5 py-2 rounded-[3px] font-jakarta text-xs font-semibold uppercase tracking-wider transition-all ${
              activeFilter === "ROOMS"
                ? "bg-ink text-paper shadow-xs"
                : "bg-paper border border-skynest-hairline text-ink/70 hover:text-ink"
            }`}
          >
            Room Map
          </button>
        </div>

        {/* Search Input */}
        {activeFilter !== "ROOMS" && (
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest, room #, phone..."
              className="w-full text-xs font-jakarta p-2.5 pl-9 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent transition-colors"
            />
            <Search className="w-4 h-4 text-ink/40 absolute left-3 top-2.5" />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. MAIN CONTENT: STAYS TABLE OR ROOMS GRID                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeFilter === "ROOMS" ? (
        /* Room Status Grid */
        <div className="border border-skynest-hairline rounded-[4px] bg-paper p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-cinzel text-base font-bold text-ink tracking-wide">
                Physical Room Inventory & Status ({roomsStatus.length} Rooms)
              </h3>
              <p className="font-jakarta text-xs text-ink/60 mt-0.5">
                Real-time occupancy status across all floors
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-jakarta">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Occupied
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Reserved
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mt-4">
            {roomsStatus.map((rm) => {
              const isOccupied = rm.status === "OCCUPIED";
              const isAvailable = rm.status === "AVAILABLE";
              const isReserved = rm.status === "RESERVED";

              return (
                <div
                  key={rm.room_id}
                  className={`p-3 rounded-[3px] border text-center transition-all ${
                    isOccupied
                      ? "bg-rose-50/60 border-rose-200"
                      : isAvailable
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-amber-50/60 border-amber-200"
                  }`}
                >
                  <p className="font-cinzel font-bold text-sm text-ink">{rm.room_number}</p>
                  <p className="font-jakarta text-[10px] text-ink/60 truncate" title={rm.type}>{rm.type.split(" ")[0]}</p>
                  <span className={`inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded mt-1 ${
                    isOccupied
                      ? "bg-rose-200 text-rose-800"
                      : isAvailable
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-amber-200 text-amber-800"
                  }`}>
                    {rm.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Stays & Operations Table */
        <div className="border border-skynest-hairline rounded-[4px] bg-paper overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-skynest-hairline bg-ink/[0.02]">
                  <th className="py-3.5 px-4 font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                    Room & Category
                  </th>
                  <th className="py-3.5 px-4 font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                    Guest Information
                  </th>
                  <th className="py-3.5 px-4 font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                    Dates & Nights
                  </th>
                  <th className="py-3.5 px-4 font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                    Stay Status
                  </th>
                  <th className="py-3.5 px-4 font-cinzel text-xs font-bold text-ink uppercase tracking-wider text-right">
                    Front Desk Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skynest-hairline">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-ink/40 font-jakarta text-xs">
                      No reservations matching current view filter.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const isCheckedIn = b.booking_status === "CHECKED_IN";
                    const isConfirmed = b.booking_status === "CONFIRMED";
                    const isCheckedOut = b.booking_status === "CHECKED_OUT";
                    const isDeparting = b.check_out_date === todayStr && isCheckedIn;
                    const isArriving = b.check_in_date === todayStr && isConfirmed;

                    return (
                      <tr key={b.booking_id} className="hover:bg-ink/[0.015] transition-colors">
                        {/* Room & Category */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel text-base font-bold text-ink">
                              Room {b.room_number || "—"}
                            </span>
                          </div>
                          <p className="font-jakarta text-xs text-skynest-accent font-medium mt-0.5">
                            {b.room_type_name || "Suite"}
                          </p>
                        </td>

                        {/* Guest Details */}
                        <td className="py-4 px-4 align-top font-jakarta">
                          <p className="font-semibold text-ink text-sm">
                            {b.guest_first_name} {b.guest_last_name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-ink/60 mt-1">
                            {b.guest_phone && (
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-ink/40" /> {b.guest_phone}
                              </span>
                            )}
                            <span className="text-ink/40 truncate" title={b.guest_email}>
                              {b.guest_email}
                            </span>
                          </div>
                        </td>

                        {/* Dates of stay */}
                        <td className="py-4 px-4 align-top font-jakarta text-xs">
                          <div className="flex items-center gap-1.5 text-ink font-medium">
                            <Calendar className="w-3.5 h-3.5 text-ink/40" />
                            <span>{b.check_in_date}</span>
                            <span className="text-ink/40">→</span>
                            <span>{b.check_out_date}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-ink/50">
                              {b.nights || 1} Night{(b.nights || 1) === 1 ? "" : "s"}
                            </span>
                            {isArriving && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                Arriving Today
                              </span>
                            )}
                            {isDeparting && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                                Departing Today
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${
                              isCheckedIn
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : isConfirmed
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : isCheckedOut
                                ? "bg-ink/5 text-ink/40 border-skynest-hairline"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCheckedIn ? "bg-emerald-500 animate-pulse" : isConfirmed ? "bg-amber-500" : "bg-ink/30"
                              }`}
                            />
                            {b.booking_status.replace(/_/g, " ")}
                          </span>

                          <div className="mt-1 text-[11px] font-jakarta text-ink/60">
                            Folio: <strong className="font-cinzel text-ink">${(b.total_amount ?? 0).toFixed(2)}</strong>
                            {b.invoice_status && (
                              <span className="text-[10px] text-ink/40 ml-1">({b.invoice_status})</span>
                            )}
                          </div>
                        </td>

                        {/* Front Desk Action Buttons */}
                        <td className="py-4 px-4 align-top text-right">
                          <div className="flex items-center justify-end flex-wrap gap-1.5">
                            {/* Check-In Action */}
                            {isConfirmed && (
                              <button
                                onClick={() => openModalFor(b, "checkin")}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-[2px] font-jakarta text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Check In
                              </button>
                            )}

                            {/* In-House Resident Actions */}
                            {isCheckedIn && (
                              <>
                                <button
                                  onClick={() => openModalFor(b, "dining")}
                                  className="px-2.5 py-1.5 bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent hover:text-skynest-accent rounded-[2px] font-jakarta text-xs font-medium transition-colors flex items-center gap-1"
                                  title="Order in-room dining from menu"
                                >
                                  <Utensils className="w-3.5 h-3.5 text-skynest-accent" />
                                  Dining
                                </button>

                                <button
                                  onClick={() => openModalFor(b, "spa")}
                                  className="px-2.5 py-1.5 bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent hover:text-skynest-accent rounded-[2px] font-jakarta text-xs font-medium transition-colors flex items-center gap-1"
                                  title="Schedule collision-aware spa treatment"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-skynest-accent" />
                                  Spa
                                </button>

                                <button
                                  onClick={() => openModalFor(b, "folio")}
                                  className="px-2.5 py-1.5 bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent hover:text-skynest-accent rounded-[2px] font-jakarta text-xs font-medium transition-colors flex items-center gap-1"
                                  title="Manage active services & void charges"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  Folio
                                </button>

                                <button
                                  onClick={() => openModalFor(b, "bill")}
                                  className="px-2.5 py-1.5 bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent hover:text-skynest-accent rounded-[2px] font-jakarta text-xs font-medium transition-colors flex items-center gap-1"
                                  title="View statutory 4-tax cascade invoice & payments"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                                  Invoice & Pay
                                </button>

                                <button
                                  onClick={() => openModalFor(b, "checkout")}
                                  className="px-2.5 py-1.5 bg-ink text-paper hover:bg-rose-700 rounded-[2px] font-jakarta text-xs font-medium transition-colors flex items-center gap-1"
                                  title="Settle bill and complete checkout"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                  Check Out
                                </button>
                              </>
                            )}

                            {/* Checked-Out History */}
                            {isCheckedOut && (
                              <button
                                onClick={() => openModalFor(b, "bill")}
                                className="px-2.5 py-1.5 bg-paper border border-skynest-hairline text-ink/70 hover:text-ink rounded-[2px] font-jakarta text-xs font-medium transition-colors flex items-center gap-1"
                                title="Print official tax invoice"
                              >
                                <Printer className="w-3.5 h-3.5 text-skynest-accent" />
                                Print Invoice
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. MODALS CONTAINER                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* In-Room Dining Modal */}
      <InRoomDiningModal
        isOpen={activeModal === "dining"}
        onClose={closeModal}
        booking={selectedBooking}
        onOrderPlaced={onRefresh}
      />

      {/* Spa Booking Modal */}
      <SpaBookingModal
        isOpen={activeModal === "spa"}
        onClose={closeModal}
        booking={selectedBooking}
        onOrderPlaced={onRefresh}
      />

      {/* Folio Services & Void Modal */}
      <FolioServicesModal
        isOpen={activeModal === "folio"}
        onClose={closeModal}
        booking={selectedBooking}
        onOpenDining={() => setActiveModal("dining")}
        onOpenSpa={() => setActiveModal("spa")}
        onFolioUpdated={onRefresh}
      />

      {/* Total Bill & Partial Payments Modal */}
      <TotalBillModal
        isOpen={activeModal === "bill"}
        onClose={closeModal}
        booking={selectedBooking}
        onPaymentSaved={onRefresh}
      />

      {/* Check In Modal */}
      <CheckInModal
        isOpen={activeModal === "checkin"}
        onClose={closeModal}
        booking={selectedBooking}
        onCheckInDone={onRefresh}
      />

      {/* Check Out Modal */}
      <CheckOutModal
        isOpen={activeModal === "checkout"}
        onClose={closeModal}
        booking={selectedBooking}
        onCheckOutDone={onRefresh}
        onOpenTotalBill={() => setActiveModal("bill")}
      />
    </div>
  );
}
