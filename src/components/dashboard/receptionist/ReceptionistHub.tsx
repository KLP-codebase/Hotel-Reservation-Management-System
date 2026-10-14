"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown, Utensils, Sparkles, Receipt, CreditCard, LogOut, UserCheck, FileText,
} from "lucide-react";
import {
  parseStayDate, toLocalYMD, fmtStayRange, fmtMoney, fmtDate, titleCase,
  StatusDot, SectionHeader, Segmented, SearchField, Empty, DashboardMasthead, RoomBoard,
} from "../ui";
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
  error?:       string | null;
  onRefresh:    () => void;
}

type Filter = "ALL" | "ARRIVALS" | "IN_HOUSE" | "DEPARTURES" | "ROOMS";

const FILTER_TITLES: Record<Filter, string> = {
  ALL: "Reservations",
  ARRIVALS: "Arrivals Today",
  IN_HOUSE: "In House",
  DEPARTURES: "Departures Today",
  ROOMS: "Room Map",
};

const EMPTY_COPY: Record<Filter, string> = {
  ALL: "No reservations yet.",
  ARRIVALS: "No arrivals today.",
  IN_HOUSE: "No guests in house.",
  DEPARTURES: "No departures today.",
  ROOMS: "",
};

// ── Buttons ───────────────────────────────────────────────────────────────────

function PrimaryBtn({ onClick, icon: Icon, children }: {
  onClick: () => void; icon: React.FC<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-ink text-white font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-300 hover:bg-skynest-accent"
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function ActionBtn({ onClick, icon: Icon, children }: {
  onClick: () => void; icon: React.FC<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] border border-skynest-hairline bg-paper text-ink font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-300 hover:border-skynest-accent hover:text-skynest-accent"
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReceptionistHub({
  user,
  stats,
  bookings,
  roomsStatus,
  propertyName,
  error,
  onRefresh,
}: ReceptionistHubProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");
  const [searchQuery, setSearchQuery]   = useState("");

  // Modal target states
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [activeModal, setActiveModal]         = useState<"none" | "dining" | "spa" | "folio" | "bill" | "checkin" | "checkout">("none");
  const [billModalMode, setBillModalMode]     = useState<"invoice" | "pay">("invoice");
  // Keyed per booked room — a multi-room booking renders one row per room.
  const [expandedRowKey, setExpandedRowKey]   = useState<string | null>(null);

  const todayStr = toLocalYMD(new Date());
  const isToday = (v: string | null | undefined) => toLocalYMD(parseStayDate(v)) === todayStr;

  // Scoped bookings for this hotel
  const hotelBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (user?.branchId && b.branch_id && b.branch_id !== user.branchId) {
        return false;
      }
      return true;
    });
  }, [bookings, user?.branchId]);

  // Operational metrics
  const arrivingToday = useMemo(
    () => hotelBookings.filter((b) =>
      b.booking_status === "CONFIRMED" && toLocalYMD(parseStayDate(b.check_in_date)) === todayStr),
    [hotelBookings, todayStr]
  );

  const inHouseGuests = useMemo(
    () => hotelBookings.filter((b) => b.booking_status === "CHECKED_IN"),
    [hotelBookings]
  );

  const departingToday = useMemo(
    () => hotelBookings.filter((b) =>
      b.booking_status === "CHECKED_IN" && toLocalYMD(parseStayDate(b.check_out_date)) === todayStr),
    [hotelBookings, todayStr]
  );

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

  const openModalFor = (
    b: any,
    modal: "dining" | "spa" | "folio" | "invoice" | "pay" | "checkin" | "checkout"
  ) => {
    setSelectedBooking(b);
    if (modal === "invoice") {
      setBillModalMode("invoice");
      setActiveModal("bill");
    } else if (modal === "pay") {
      setBillModalMode("pay");
      setActiveModal("bill");
    } else {
      setActiveModal(modal);
    }
  };

  const closeModal = () => {
    setActiveModal("none");
    setSelectedBooking(null);
  };

  // Clicking a KPI filters to it; clicking the active one clears the filter.
  const toggleFilter = (f: Filter) => setActiveFilter((cur) => (cur === f ? "ALL" : f));

  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      {/* ── Masthead — KPIs double as filters ─────────────────────────────── */}
      <DashboardMasthead
        eyebrow={`${todayLabel} · Front Desk`}
        title={propertyName}
        imageKey={propertyName}
        error={error}
        kpis={[
          { label: "Arrivals", value: String(arrivingToday.length), sub: "Awaiting check-in", onClick: () => toggleFilter("ARRIVALS"), active: activeFilter === "ARRIVALS" },
          { label: "In House", value: String(inHouseGuests.length), sub: "Guests staying", onClick: () => toggleFilter("IN_HOUSE"), active: activeFilter === "IN_HOUSE" },
          { label: "Departures", value: String(departingToday.length), sub: "Due to check out", onClick: () => toggleFilter("DEPARTURES"), active: activeFilter === "DEPARTURES" },
          { label: "Available", value: String(stats?.available_rooms ?? 0), sub: `of ${stats?.total_rooms ?? roomsStatus.length} rooms`, onClick: () => toggleFilter("ROOMS"), active: activeFilter === "ROOMS" },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <section className="space-y-8">
          <SectionHeader index="Front Desk" title={FILTER_TITLES[activeFilter]}>
            <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
              <Segmented
                value={activeFilter}
                onChange={setActiveFilter}
                options={[
                  { value: "ALL", label: "All", count: hotelBookings.length },
                  { value: "ARRIVALS", label: "Arrivals", count: arrivingToday.length },
                  { value: "IN_HOUSE", label: "In house", count: inHouseGuests.length },
                  { value: "DEPARTURES", label: "Departures", count: departingToday.length },
                  { value: "ROOMS", label: "Rooms" },
                ]}
              />
              {activeFilter !== "ROOMS" && (
                <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search guest, room or phone" />
              )}
            </div>
          </SectionHeader>

          {activeFilter === "ROOMS" ? (
            <RoomBoard rooms={roomsStatus} />
          ) : filteredBookings.length === 0 ? (
            <Empty>{searchQuery.trim() ? `No matches for “${searchQuery.trim()}”.` : EMPTY_COPY[activeFilter]}</Empty>
          ) : (
            <ul className="divide-y divide-skynest-hairline border-b border-skynest-hairline">
              {filteredBookings.map((b, idx) => {
                const rowKey = b.booking_room_id || `${b.booking_id}-${b.room_number ?? idx}`;
                const isCheckedIn = b.booking_status === "CHECKED_IN";
                const isConfirmed = b.booking_status === "CONFIRMED";
                const isCheckedOut = b.booking_status === "CHECKED_OUT";
                const isArriving = isConfirmed && isToday(b.check_in_date);
                const isDeparting = isCheckedIn && isToday(b.check_out_date);
                // Check-in opens on the arrival day and stays open until check-out day
                // (late arrivals). The server enforces the same rule in hotel time.
                const inYmd = toLocalYMD(parseStayDate(b.check_in_date));
                const outYmd = toLocalYMD(parseStayDate(b.check_out_date));
                const canCheckIn = isConfirmed && inYmd <= todayStr && todayStr < outYmd;
                const checkInNote = isConfirmed && !canCheckIn
                  ? (todayStr < inYmd ? `Check-in opens ${fmtDate(b.check_in_date)}` : "Stay dates have passed")
                  : null;
                const checkOutLabel = isCheckedIn && todayStr < outYmd ? "Check out early" : "Check out";
                const isExpanded = expandedRowKey === rowKey;
                const nights = b.nights || 1;
                const range = fmtStayRange(b.check_in_date, b.check_out_date);
                const toggle = () => setExpandedRowKey(isExpanded ? null : rowKey);

                return (
                  <li key={rowKey} data-reveal className={isExpanded ? "bg-ink/[0.02]" : ""}>
                    {/* Main row */}
                    <div
                      onClick={toggle}
                      className="flex flex-col gap-4 py-6 cursor-pointer md:grid md:grid-cols-[96px_minmax(0,1fr)_200px_160px_176px] md:items-center md:gap-6 transition-colors duration-300 hover:bg-ink/[0.02] md:px-4"
                    >
                      {/* Room */}
                      <div className="flex items-baseline gap-4 md:block">
                        <p className="font-cinzel text-[24px] leading-none text-ink">{b.room_number || "—"}</p>
                        <p className="md:mt-2 font-jakarta text-[11px] tracking-[0.08em] uppercase text-ink/70 truncate">
                          {titleCase(b.room_type_name || b.room_type || "Room")}
                        </p>
                      </div>

                      {/* Guest */}
                      <div className="min-w-0 font-jakarta">
                        <p className="text-[15px] text-ink truncate">{b.guest_first_name} {b.guest_last_name}</p>
                        <p className="mt-1 text-[12px] text-ink/70 truncate">
                          {[b.guest_phone, b.guest_email].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      {/* Stay */}
                      <div className="font-jakarta">
                        <p className="text-[13px] text-ink whitespace-nowrap tabular-nums">
                          {range.from} <span className="text-ink/50" aria-hidden>→</span> {range.to}
                        </p>
                        <p className="mt-1 text-[12px] text-ink/70 whitespace-nowrap">
                          {nights} night{nights === 1 ? "" : "s"}
                          {isArriving && <span className="ml-2 font-medium text-sky-700">· Arrives today</span>}
                          {isDeparting && <span className="ml-2 font-medium text-amber-700">· Departs today</span>}
                        </p>
                      </div>

                      {/* Status & folio */}
                      <div className="font-jakarta">
                        <StatusDot status={b.booking_status} />
                        <p className="mt-1 text-[13px] text-ink tabular-nums">
                          {fmtMoney(b.total_amount, 2)}
                          {b.invoice_status && (
                            <span className="ml-2 text-[12px] text-ink/70">{titleCase(b.invoice_status)}</span>
                          )}
                        </p>
                      </div>

                      {/* Next step + expand */}
                      <div className="flex items-center gap-2 md:justify-end">
                        {canCheckIn && (
                          <PrimaryBtn icon={UserCheck} onClick={() => openModalFor(b, "checkin")}>Check in</PrimaryBtn>
                        )}
                        {checkInNote && (
                          <span className="font-jakarta text-[12px] text-ink/70 whitespace-nowrap">{checkInNote}</span>
                        )}
                        {isCheckedIn && (
                          <PrimaryBtn icon={LogOut} onClick={() => openModalFor(b, "checkout")}>{checkOutLabel}</PrimaryBtn>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(); }}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Hide actions" : "Show actions"}
                          className={`w-8 h-8 flex items-center justify-center rounded-[4px] border transition-colors duration-300 ${
                            isExpanded ? "border-ink text-ink" : "border-skynest-hairline text-ink/70 hover:border-ink/30 hover:text-ink"
                          }`}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded actions */}
                    {isExpanded && (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 md:px-4">
                        <p className="font-jakarta text-[12px] text-ink/70">
                          Booking ref <span className="text-ink tabular-nums">{b.booking_ref || b.booking_id.slice(-8)}</span>
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          {canCheckIn && (
                            <ActionBtn icon={UserCheck} onClick={() => openModalFor(b, "checkin")}>Check in</ActionBtn>
                          )}

                          {isCheckedIn && (
                            <>
                              <ActionBtn icon={Utensils} onClick={() => openModalFor(b, "dining")}>Dining</ActionBtn>
                              <ActionBtn icon={Sparkles} onClick={() => openModalFor(b, "spa")}>Spa</ActionBtn>
                              <ActionBtn icon={Receipt} onClick={() => openModalFor(b, "folio")}>Folio</ActionBtn>
                              <ActionBtn icon={FileText} onClick={() => openModalFor(b, "invoice")}>Invoice</ActionBtn>
                              <ActionBtn icon={CreditCard} onClick={() => openModalFor(b, "pay")}>Payment</ActionBtn>
                              <PrimaryBtn icon={LogOut} onClick={() => openModalFor(b, "checkout")}>{checkOutLabel}</PrimaryBtn>
                            </>
                          )}

                          {isCheckedOut && (
                            <>
                              <ActionBtn icon={FileText} onClick={() => openModalFor(b, "invoice")}>Invoice</ActionBtn>
                              <ActionBtn icon={CreditCard} onClick={() => openModalFor(b, "pay")}>Payment ledger</ActionBtn>
                            </>
                          )}

                          {!isConfirmed && !isCheckedIn && !isCheckedOut && (
                            <p className="font-jakarta text-[13px] text-ink/70">
                              Awaiting confirmation — no front desk actions yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <InRoomDiningModal
        isOpen={activeModal === "dining"}
        onClose={closeModal}
        booking={selectedBooking}
        onOrderPlaced={onRefresh}
      />

      <SpaBookingModal
        isOpen={activeModal === "spa"}
        onClose={closeModal}
        booking={selectedBooking}
        onOrderPlaced={onRefresh}
      />

      <FolioServicesModal
        isOpen={activeModal === "folio"}
        onClose={closeModal}
        booking={selectedBooking}
        onOpenDining={() => setActiveModal("dining")}
        onOpenSpa={() => setActiveModal("spa")}
        onFolioUpdated={onRefresh}
      />

      <TotalBillModal
        isOpen={activeModal === "bill"}
        onClose={closeModal}
        booking={selectedBooking}
        initialMode={billModalMode}
        onPaymentSaved={onRefresh}
      />

      <CheckInModal
        isOpen={activeModal === "checkin"}
        onClose={closeModal}
        booking={selectedBooking}
        onCheckInDone={onRefresh}
      />

      <CheckOutModal
        isOpen={activeModal === "checkout"}
        onClose={closeModal}
        booking={selectedBooking}
        onCheckOutDone={onRefresh}
        onOpenTotalBill={() => {
          setBillModalMode("pay");
          setActiveModal("bill");
        }}
      />
    </>
  );
}
