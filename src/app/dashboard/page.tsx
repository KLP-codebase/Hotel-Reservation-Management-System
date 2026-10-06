"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import gsap from "gsap";
import {
  RefreshCw, Activity, Database, Search, Phone, Mail, ArrowUpRight, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ReceptionistHub } from "@/components/dashboard/receptionist/ReceptionistHub";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  occupancy_rate: number;
  total_rooms: number;
  occupied_rooms: number;
  available_rooms: number;
  maintenance_rooms: number;
  active_bookings: number;
  checkins_today: number;
  checkouts_today: number;
  revenue_today: number;
  total_guests: number;
  branch_id?: string | null;
  branch_name?: string | null;
  branch_city?: string | null;
}

interface RecentBooking {
  booking_id: string;
  booking_room_id?: string;
  branch_id?: string;
  booking_status: string;
  booking_created_at: string;
  branch_name: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone?: string | null;
  room_number: string | null;
  room_type_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  total_amount: number | null;
  invoice_status: string | null;
  nights?: number | null;
}

interface RoomOccupancyStatus {
  room_id: string;
  room_number: string;
  floor: number;
  type: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
  price_per_night: number;
  max_guests?: number;
  branch_id: string;
  branch_name?: string;
  guest_name?: string | null;
  guest_email?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  booking_id?: string | null;
}

interface StaffDutySchedule {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  branch_id: string;
  branch_name?: string;
  shift_today: string;
  shift_status_today: "ON_DUTY" | "SCHEDULED" | "OFF_DUTY";
  shift_tomorrow: string;
  shift_status_tomorrow: "SCHEDULED" | "OFF_DUTY";
}

interface Branch {
  branch_id: string;
  branch_name: string;
  city: string;
}

interface AuditLogEntry {
  audit_id: string;
  entity_type: string;
  action: string;
  created_at: string;
  ip_address: string | null;
  actor_username: string | null;
  actor_first_name: string | null;
  actor_last_name: string | null;
  actor_role: string | null;
  new_value: unknown;
  old_value: unknown;
}

interface ChangeLogEntry {
  change_id: string;
  table_name: string;
  record_id: string;
  operation: string;
  db_user: string;
  created_at: string;
  old_data: unknown;
  new_data: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtMoney(n: number | null | undefined, decimals = 0): string {
  return `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "—";
}

/** Branch photography for the masthead, matched on city name. */
function mastheadImage(city?: string | null): string {
  const c = (city ?? "").toLowerCase();
  if (c.includes("galle")) return "/Galle.jpg";
  if (c.includes("kandy")) return "/Kandy_hotel.jpg";
  return "/Colombo.jpg";
}

// ── Status Indicator ──────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  CHECKED_IN: "bg-emerald-500",
  AVAILABLE: "bg-emerald-500",
  ON_DUTY: "bg-emerald-500",
  INSERT: "bg-emerald-500",
  CONFIRMED: "bg-sky-500",
  RESERVED: "bg-sky-500",
  SCHEDULED: "bg-sky-500",
  OCCUPIED: "bg-ink",
  PENDING: "bg-amber-500",
  UPDATE: "bg-amber-500",
  CANCELLED: "bg-red-500",
  DELETE: "bg-red-500",
};

function StatusDot({ status, label }: { status: string; label?: string }) {
  const s = status.toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70 whitespace-nowrap">
      <span className={`w-2 h-2 shrink-0 rounded-full ${STATUS_DOT[s] ?? "bg-ink-faded"}`} />
      {label ?? s.replace(/_/g, " ")}
    </span>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ index, title, children }: { index: string; title: string; children?: React.ReactNode }) {
  return (
    <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-skynest-hairline">
      <div>
        <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">{index}</p>
        <h2 className="mt-2 font-cinzel text-[28px] md:text-[32px] leading-[1.1] text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Segmented Filter ──────────────────────────────────────────────────────────

function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-6 overflow-x-auto">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative pb-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-300 ${
              active ? "text-ink" : "text-ink/70 hover:text-ink"
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1 text-ink/70 tabular-nums">{o.count}</span>}
            <span
              className={`absolute left-0 bottom-0 h-px bg-skynest-accent transition-all duration-300 ${active ? "w-full" : "w-0"}`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-12 text-center font-jakarta text-[15px] text-ink/70">{children}</p>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const mainRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [roomsStatus, setRoomsStatus] = useState<RoomOccupancyStatus[]>([]);
  const [staffRoster, setStaffRoster] = useState<StaffDutySchedule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"app" | "db">("app");
  const [roomFilter, setRoomFilter] = useState<"ALL" | "OCCUPIED" | "AVAILABLE" | "MAINTENANCE">("ALL");
  const [rosterDay, setRosterDay] = useState<"today" | "tomorrow">("today");
  const [guestSearch, setGuestSearch] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isManager = user?.role === "MANAGER";
  const isReceptionist = user?.role === "RECEPTIONIST";
  const isAdminOrDba = user?.role === "ADMINISTRATOR" || user?.role === "DBA";

  // ── Fetch Dashboard Data ────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const branchQuery = (!isManager && !isReceptionist && selectedBranch) ? `?branchId=${selectedBranch}` : "";
    const branchPrefix = branchQuery ? `${branchQuery}&` : "?";

    try {
      const requests: [
        Promise<{ success: boolean; data: DashboardStats }>,
        Promise<{ success: boolean; data: RecentBooking[] }>,
        Promise<{ success: boolean; data: RoomOccupancyStatus[] }>,
        Promise<{ success: boolean; data: StaffDutySchedule[] }>,
        Promise<{ data: Branch[] }>,
        Promise<{ success: boolean; data: AuditLogEntry[] }>,
        Promise<{ success: boolean; data: ChangeLogEntry[] }>
      ] = [
          apiFetch<{ success: boolean; data: DashboardStats }>(`/api/v1/dashboard/stats${branchQuery}`),
          apiFetch<{ success: boolean; data: RecentBooking[] }>(`/api/v1/dashboard/bookings${branchPrefix}limit=50`),
          apiFetch<{ success: boolean; data: RoomOccupancyStatus[] }>(`/api/v1/dashboard/rooms-status${branchQuery}`),
          apiFetch<{ success: boolean; data: StaffDutySchedule[] }>(`/api/v1/dashboard/staff-roster${branchQuery}`),
          apiFetch<{ data: Branch[] }>("/api/v1/branches").catch(() => ({ data: [] })),
          apiFetch<{ success: boolean; data: AuditLogEntry[] }>("/api/v1/audit-logs?limit=30").catch(() => ({ success: false, data: [] })),
          apiFetch<{ success: boolean; data: ChangeLogEntry[] }>("/api/v1/audit-logs/changes?limit=30").catch(() => ({ success: false, data: [] })),
        ];

      const [statsRes, bookingsRes, roomsRes, rosterRes, branchesRes, auditRes, changeRes] =
        await Promise.allSettled(requests);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      } else {
        const err = statsRes.reason;
        if (err instanceof ApiError && err.status === 401) {
          window.location.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      }

      if (bookingsRes.status === "fulfilled") {
        setBookings(bookingsRes.value.data ?? []);
      }

      if (roomsRes.status === "fulfilled") {
        setRoomsStatus(roomsRes.value.data ?? []);
      }

      if (rosterRes.status === "fulfilled") {
        setStaffRoster(rosterRes.value.data ?? []);
      }

      if (branchesRes.status === "fulfilled") {
        setBranches(branchesRes.value.data ?? []);
      }

      if (auditRes.status === "fulfilled") {
        setAuditLogs(auditRes.value.data ?? []);
      }

      if (changeRes.status === "fulfilled") {
        setChangeLogs(changeRes.value.data ?? []);
      }

      setLastRefresh(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [isManager, selectedBranch]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        window.location.replace("/login");
      } else {
        fetchAll();
      }
    }
  }, [authLoading, user, fetchAll]);

  // ── Entrance Reveal (first data paint only) ─────────────────────────────────
  const ready = !!stats;
  useEffect(() => {
    if (!ready || reducedMotion || !mainRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    }, mainRef);
    return () => ctx.revert();
  }, [ready, reducedMotion]);

  // ── Room Counts & Filter ────────────────────────────────────────────────────
  const roomCounts = useMemo(() => ({
    ALL: roomsStatus.length,
    OCCUPIED: roomsStatus.filter((r) => r.status === "OCCUPIED").length,
    AVAILABLE: roomsStatus.filter((r) => r.status === "AVAILABLE").length,
    MAINTENANCE: roomsStatus.filter((r) => r.status === "MAINTENANCE" || r.status === "RESERVED").length,
  }), [roomsStatus]);

  const filteredRooms = useMemo(() => {
    if (roomFilter === "ALL") return roomsStatus;
    if (roomFilter === "OCCUPIED") return roomsStatus.filter((r) => r.status === "OCCUPIED");
    if (roomFilter === "AVAILABLE") return roomsStatus.filter((r) => r.status === "AVAILABLE");
    if (roomFilter === "MAINTENANCE") return roomsStatus.filter((r) => r.status === "MAINTENANCE" || r.status === "RESERVED");
    return roomsStatus;
  }, [roomsStatus, roomFilter]);

  // Cross-branch view (admin, no property selected) needs branch labels to disambiguate room numbers.
  const showBranch = isAdminOrDba && !selectedBranch;

  // Rooms grouped into one compact row per floor (and per branch in the cross-branch view).
  const roomGroups = useMemo(() => {
    const groups = new Map<string, { branch: string | null; floor: number; rooms: RoomOccupancyStatus[] }>();
    for (const r of filteredRooms) {
      const branch = showBranch ? (r.branch_name ?? "—") : null;
      const key = `${branch ?? ""}|${r.floor}`;
      if (!groups.has(key)) groups.set(key, { branch, floor: r.floor, rooms: [] });
      groups.get(key)!.rooms.push(r);
    }
    return [...groups.values()].sort(
      (a, b) => (a.branch ?? "").localeCompare(b.branch ?? "") || a.floor - b.floor
    );
  }, [filteredRooms, showBranch]);

  // ── Filtered In-House / Branch Guests ───────────────────────────────────────
  const inHouseGuests = useMemo(() => {
    let list = bookings;
    if (isManager) {
      // In manager view, show only guests staying at his hotel
      list = bookings.filter((b) => b.booking_status === "CHECKED_IN" || b.booking_status === "CONFIRMED");
    }
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      list = list.filter(
        (b) =>
          b.guest_first_name.toLowerCase().includes(q) ||
          b.guest_last_name.toLowerCase().includes(q) ||
          b.guest_email.toLowerCase().includes(q) ||
          (b.room_number && b.room_number.includes(q))
      );
    }
    return list;
  }, [bookings, isManager, guestSearch]);

  // ── Active Staff for Today / Tomorrow ───────────────────────────────────────
  const activeRoster = useMemo(() => {
    return staffRoster.map((s) => ({
      ...s,
      currentShift: rosterDay === "today" ? s.shift_today : s.shift_tomorrow,
      currentDutyStatus: rosterDay === "today" ? s.shift_status_today : s.shift_status_tomorrow,
    }));
  }, [staffRoster, rosterDay]);

  const workingStaff = activeRoster.filter((s) => s.currentDutyStatus !== "OFF_DUTY");
  const offDutyStaff = activeRoster.filter((s) => s.currentDutyStatus === "OFF_DUTY");

  const rosterCounts = useMemo(() => ({
    today: staffRoster.filter((s) => s.shift_status_today === "ON_DUTY" || s.shift_status_today === "SCHEDULED").length,
    tomorrow: staffRoster.filter((s) => s.shift_status_tomorrow === "SCHEDULED").length,
  }), [staffRoster]);

  // ── Navigation Items by Role ────────────────────────────────────────────────
  const navItems = useMemo(() => {
    const all = [
      { href: "/dashboard", label: "Overview", roles: ["RECEPTIONIST", "SERVICE_STAFF", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/staff", label: "Staff", roles: ["MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/branches", label: "Branches", roles: ["ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/rooms", label: "Rooms", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/catalogue", label: "Catalogue", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/bookings", label: "Bookings", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/billing", label: "Billing", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
    ];
    if (!user) return [];
    return all.filter((item) => item.roles.includes(user.role));
  }, [user]);


  // ── Property Name Resolution ────────────────────────────────────────────────
  const propertyName = stats?.branch_name || user?.branchName || "Sky Nest Galle";
  const propertyCity = stats?.branch_city || "";
  const selectedBranchRow = branches.find((b) => b.branch_id === selectedBranch);
  const mastheadTitle = isAdminOrDba
    ? (selectedBranchRow?.branch_name ?? "All Properties")
    : propertyName;
  const mastheadCity = isAdminOrDba ? selectedBranchRow?.city : propertyCity || propertyName;
  const roleLabel = isManager ? "General Manager" : isReceptionist ? "Front Desk" : titleCase(user?.role ?? "");
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const occupancy = Math.min(100, Math.max(0, Number(stats?.occupancy_rate ?? 0)));

  const kpis = [
    {
      label: "Occupancy",
      value: `${occupancy}%`,
      sub: `${stats?.occupied_rooms ?? 0} of ${stats?.total_rooms ?? 0} rooms`,
      bar: occupancy,
    },
    isManager
      ? { label: "In Residence", value: String(stats?.total_guests ?? 0), sub: `${stats?.checkins_today ?? 0} arriving today` }
      : { label: "Active Bookings", value: String(stats?.active_bookings ?? 0), sub: `${stats?.checkins_today ?? 0} arriving today` },
    { label: "Revenue Today", value: fmtMoney(stats?.revenue_today), sub: `${stats?.checkouts_today ?? 0} departing today` },
    isManager
      ? { label: "Available", value: String(stats?.available_rooms ?? 0), sub: `${stats?.maintenance_rooms ?? 0} out of service` }
      : { label: "Guests", value: String(stats?.total_guests ?? 0), sub: "In residence" },
  ];

  // ── Loading State ───────────────────────────────────────────────────────────
  if ((loading || authLoading) && !stats && !error) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <span className="font-cinzel text-[28px] tracking-[0.24em] text-white/80 animate-pulse">SKYNEST</span>
          <span className="w-12 h-px bg-white/20" />
        </div>
      </div>
    );
  }

  return (
    <div ref={mainRef} className="min-h-screen bg-paper text-ink font-jakarta">

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur-[12px] border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-4 shrink-0">
            <span className="font-cinzel text-[17px] tracking-[0.2em] text-white">SKYNEST</span>
            <span className="hidden lg:block w-px h-4 bg-white/20" />
            <span className="hidden lg:block font-jakarta text-[11px] tracking-[0.12em] uppercase text-white/60">
              {roleLabel}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative py-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase transition-colors duration-300 ${
                    active ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {label}
                  {active && <span className="absolute left-0 right-0 -bottom-1 h-px bg-skynest-accent" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={fetchAll}
              disabled={loading}
              aria-label="Refresh data"
              title={`Updated ${lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {user && (
              <span
                title={`${user.firstName} ${user.lastName}`}
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center font-jakarta text-[11px] font-medium tracking-[0.08em] text-white/80"
              >
                {initials(user.firstName, user.lastName)}
              </span>
            )}
            <button
              onClick={logout}
              className="hidden sm:flex items-center px-4 py-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-white/70 border border-white/20 hover:text-white hover:border-skynest-accent transition-colors duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {isReceptionist ? (
        <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 space-y-12">
          <ReceptionistHub
            user={user}
            stats={stats}
            bookings={bookings}
            roomsStatus={roomsStatus}
            propertyName={propertyName}
            onRefresh={fetchAll}
          />
        </main>
      ) : (
        <>
          {/* ── Masthead ──────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden bg-ink text-white">
            <Image
              src={mastheadImage(mastheadCity)}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-30"
            />
            {/* Solid ink behind the title on the left; the photo only shows through on the right. */}
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />

            <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-8">
              <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                  <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-white/60">{todayLabel}</p>
                  <h1
                    className="mt-2 font-cinzel font-normal leading-[1.05] text-white"
                    style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
                  >
                    {mastheadTitle}
                  </h1>
                </div>

                {isAdminOrDba && (
                  <label className="relative flex items-center gap-4 border-b border-white/20 focus-within:border-skynest-accent transition-colors duration-300">
                    <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-white/60">Property</span>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="appearance-none bg-transparent py-2 pr-8 font-jakarta text-[15px] text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="text-ink">All Properties</option>
                      {branches.map((b) => (
                        <option key={b.branch_id} value={b.branch_id} className="text-ink">
                          {b.branch_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 w-4 h-4 text-white/60 pointer-events-none" />
                  </label>
                )}
              </div>

              {error && (
                <p className="mt-8 font-jakarta text-[13px] text-red-300">{error}</p>
              )}

              {/* KPI strip */}
              <div className="mt-8 md:mt-12 grid grid-cols-2 lg:grid-cols-4 border-t border-white/10">
                {kpis.map((k, i) => (
                  <div
                    key={k.label}
                    data-reveal
                    className={`relative pt-6 pb-2 pr-6 ${i % 2 === 1 ? "pl-6 border-l border-white/10" : ""} ${
                      i > 0 ? "lg:pl-8 lg:border-l lg:border-white/10" : ""
                    } ${i > 1 ? "border-t border-white/10 lg:border-t-0" : ""}`}
                  >
                    {"bar" in k && typeof k.bar === "number" && (
                      <span className="absolute -top-px left-0 h-px bg-skynest-accent" style={{ width: `${k.bar}%` }} />
                    )}
                    <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-white/60">{k.label}</p>
                    <p className="mt-2 font-cinzel text-[32px] md:text-[40px] leading-none text-white tabular-nums">{k.value}</p>
                    <p className="mt-2 font-jakarta text-[13px] text-white/60">{k.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-16 md:space-y-20">

            {/* ── 01 · Rooms ────────────────────────────────────────────── */}
            <section className="space-y-8">
              <SectionHeader index="01 — Rooms" title="Room Status">
                <Segmented
                  value={roomFilter}
                  onChange={setRoomFilter}
                  options={[
                    { value: "ALL", label: "All", count: roomCounts.ALL },
                    { value: "OCCUPIED", label: "Occupied", count: roomCounts.OCCUPIED },
                    { value: "AVAILABLE", label: "Available", count: roomCounts.AVAILABLE },
                    { value: "MAINTENANCE", label: "Unavailable", count: roomCounts.MAINTENANCE },
                  ]}
                />
              </SectionHeader>

              {filteredRooms.length === 0 ? (
                <Empty>No rooms in this view.</Empty>
              ) : (
                <div className="divide-y divide-skynest-hairline">
                  {roomGroups.map((group) => (
                    <div
                      key={`${group.branch ?? ""}|${group.floor}`}
                      data-reveal
                      className="flex flex-col md:flex-row gap-4 py-4 first:pt-0"
                    >
                      <div className="md:w-40 shrink-0 md:pt-4">
                        {group.branch && <p className="font-jakarta text-[13px] text-ink">{group.branch}</p>}
                        <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">
                          Floor {group.floor}
                        </p>
                      </div>

                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {group.rooms.map((room) => {
                          const isOccupied = room.status === "OCCUPIED";
                          const isAvailable = room.status === "AVAILABLE";
                          const statusLabel = isOccupied
                            ? "Occupied"
                            : isAvailable
                              ? "Available"
                              : room.status === "RESERVED" ? "Reserved" : "Out of service";
                          return (
                            <div
                              key={room.room_id}
                              className={`flex flex-col gap-2 p-4 rounded-[4px] border transition-colors duration-300 ${
                                isOccupied
                                  ? "bg-ink text-white border-ink"
                                  : "bg-paper border-skynest-hairline hover:border-ink/30"
                              }`}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className={`font-cinzel text-[24px] leading-none ${isOccupied ? "text-white" : "text-ink"}`}>
                                  {room.room_number}
                                </span>
                                <span className={`font-jakarta text-[11px] tracking-[0.08em] uppercase truncate ${isOccupied ? "text-white/70" : "text-ink/70"}`}>
                                  {titleCase(room.type)}
                                </span>
                              </div>

                              <p className={`flex items-center gap-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase ${isOccupied ? "text-white" : "text-ink"}`}>
                                <span
                                  className={`w-2 h-2 shrink-0 rounded-full ${
                                    isOccupied ? "bg-skynest-accent" : isAvailable ? "bg-emerald-500" : room.status === "RESERVED" ? "bg-sky-500" : "bg-ink-faded"
                                  }`}
                                />
                                {statusLabel}
                              </p>

                              <p className={`font-jakarta text-[12px] truncate ${isOccupied ? "text-white/70" : "text-ink/70"}`}>
                                {isOccupied
                                  ? `${room.guest_name || "Guest"}${room.check_out_date ? ` · until ${fmtDate(room.check_out_date)}` : ""}`
                                  : isAvailable
                                    ? `${fmtMoney(room.price_per_night)} / night`
                                    : " "}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── 02 · Guests ───────────────────────────────────────────── */}
            <section className="space-y-8">
              <SectionHeader index="02 — Guests" title={isManager ? "In Residence" : "Reservations"}>
                <label className="relative w-full md:w-72 flex items-center border-b border-skynest-hairline focus-within:border-skynest-accent transition-colors duration-300">
                  <Search className="w-4 h-4 text-ink/50 shrink-0" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Search guest or room"
                    aria-label="Search guest or room"
                    className="w-full pl-4 py-2 bg-transparent font-jakarta text-[15px] text-ink placeholder:text-ink/60 focus:outline-none"
                  />
                </label>
              </SectionHeader>

              {inHouseGuests.length === 0 ? (
                <Empty>No guests to show.</Empty>
              ) : (
                <div data-reveal className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left font-jakarta">
                    <thead>
                      <tr className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70">
                        <th className="pb-4 pr-6 font-medium">Guest</th>
                        {showBranch && <th className="pb-4 pr-6 font-medium">Property</th>}
                        <th className="pb-4 pr-6 font-medium">Room</th>
                        <th className="pb-4 pr-6 font-medium">Stay</th>
                        <th className="pb-4 pr-6 font-medium">Status</th>
                        <th className="pb-4 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-skynest-hairline border-t border-skynest-hairline">
                      {inHouseGuests.map((b, idx) => (
                        <tr key={b.booking_room_id || `${b.booking_id}-${b.room_number ?? idx}`} className="group transition-colors duration-300 hover:bg-ink/[0.02]">
                          <td className="py-4 pr-6">
                            <div className="flex items-center gap-4">
                              <span className="w-8 h-8 shrink-0 rounded-full border border-skynest-hairline flex items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink/70">
                                {initials(b.guest_first_name, b.guest_last_name)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[15px] text-ink truncate">{b.guest_first_name} {b.guest_last_name}</p>
                                <p className="text-[12px] text-ink/70 truncate">{b.guest_email}</p>
                              </div>
                            </div>
                          </td>
                          {showBranch && (
                            <td className="py-4 pr-6 text-[13px] text-ink whitespace-nowrap">{b.branch_name}</td>
                          )}
                          <td className="py-4 pr-6">
                            <p className="font-cinzel text-[17px] text-ink">{b.room_number ?? "—"}</p>
                            <p className="text-[12px] text-ink/70">{b.room_type_name ? titleCase(b.room_type_name) : "Unassigned"}</p>
                          </td>
                          <td className="py-4 pr-6 text-[13px] text-ink whitespace-nowrap">
                            {fmtDate(b.check_in_date)} <span className="text-ink/50" aria-hidden>→</span> {fmtDate(b.check_out_date)}
                            {b.nights != null && <span className="ml-2 text-ink/70">· {b.nights} night{b.nights === 1 ? "" : "s"}</span>}
                          </td>
                          <td className="py-4 pr-6">
                            <StatusDot status={b.booking_status} />
                          </td>
                          <td className="py-4 text-right text-[15px] text-ink tabular-nums">
                            {b.total_amount != null ? fmtMoney(b.total_amount, 2) : <span className="text-ink/70">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── 03 · Team ─────────────────────────────────────────────── */}
            <section className="space-y-8">
              <SectionHeader index="03 — Team" title="Duty Roster">
                <div className="flex items-center gap-8">
                  <Segmented
                    value={rosterDay}
                    onChange={setRosterDay}
                    options={[
                      { value: "today", label: "Today", count: rosterCounts.today },
                      { value: "tomorrow", label: "Tomorrow", count: rosterCounts.tomorrow },
                    ]}
                  />
                  <Link
                    href="/dashboard/staff"
                    className="hidden sm:inline-flex items-center gap-1 pb-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70 hover:text-skynest-accent transition-colors duration-300"
                  >
                    Directory <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </SectionHeader>

              {workingStaff.length === 0 ? (
                <Empty>No one is scheduled {rosterDay}.</Empty>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-skynest-hairline">
                  {workingStaff.map((s) => (
                    <div
                      key={s.staff_id}
                      data-reveal
                      className="flex items-center gap-4 p-6 border-r border-b border-skynest-hairline transition-colors duration-300 hover:bg-ink/[0.02]"
                    >
                      <span className="w-12 h-12 shrink-0 rounded-full bg-ink text-white flex items-center justify-center font-cinzel text-[15px] tracking-[0.04em]">
                        {initials(s.first_name, s.last_name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-ink truncate">{s.first_name} {s.last_name}</p>
                        <p className="text-[12px] text-ink/70 truncate">
                          {titleCase(s.role)} · {s.department}
                        </p>
                        <div className="mt-2 flex items-center gap-4">
                          <StatusDot status={s.currentDutyStatus} />
                          <span className="text-[12px] text-ink/70 tabular-nums truncate">{s.currentShift}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {s.phone && (
                          <a href={`tel:${s.phone}`} aria-label={`Call ${s.first_name}`} title={s.phone} className="text-ink/50 hover:text-skynest-accent transition-colors duration-300">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <a href={`mailto:${s.email}`} aria-label={`Email ${s.first_name}`} title={s.email} className="text-ink/50 hover:text-skynest-accent transition-colors duration-300">
                          <Mail className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {offDutyStaff.length > 0 && (
                <p className="font-jakarta text-[13px] text-ink/70">
                  <span className="mr-2 text-[11px] font-medium tracking-[0.12em] uppercase text-ink">Off duty</span>
                  {offDutyStaff.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}
                </p>
              )}
            </section>

            {/* ── 04 · Activity (Admin / DBA) ───────────────────────────── */}
            {isAdminOrDba && (
              <section className="space-y-8">
                <SectionHeader index="04 — Ledger" title="Activity">
                  <Segmented
                    value={activeTab}
                    onChange={setActiveTab}
                    options={[
                      { value: "app", label: "Application" },
                      { value: "db", label: "Database" },
                    ]}
                  />
                </SectionHeader>

                {activeTab === "app" && (
                  auditLogs.length === 0 ? (
                    <Empty>No activity recorded yet.</Empty>
                  ) : (
                    <ul data-reveal className="divide-y divide-skynest-hairline">
                      {auditLogs.map((log) => (
                        <li key={log.audit_id} className="py-4 flex items-center gap-6">
                          <Activity className="w-4 h-4 text-ink/50 shrink-0" />
                          <p className="flex-1 min-w-0 text-[13px] text-ink/70 truncate">
                            <span className="text-ink">{titleCase(log.action)}</span>
                            <span className="text-ink/50"> · </span>
                            {titleCase(log.entity_type)}
                            {log.actor_first_name && (
                              <span className="text-ink/70"> — {log.actor_first_name} {log.actor_last_name}</span>
                            )}
                          </p>
                          <time className="text-[12px] text-ink/70 shrink-0 tabular-nums">
                            {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </time>
                        </li>
                      ))}
                    </ul>
                  )
                )}

                {activeTab === "db" && (
                  changeLogs.length === 0 ? (
                    <Empty>No database changes captured yet.</Empty>
                  ) : (
                    <ul data-reveal className="divide-y divide-skynest-hairline">
                      {changeLogs.map((cl) => (
                        <li key={cl.change_id} className="py-4 flex items-center gap-6">
                          <Database className="w-4 h-4 text-ink/50 shrink-0" />
                          <div className="w-24 shrink-0"><StatusDot status={cl.operation} /></div>
                          <p className="flex-1 min-w-0 text-[13px] text-ink truncate">
                            {cl.table_name}
                            <span className="ml-2 text-ink/70 tabular-nums">{cl.record_id.slice(0, 8)}</span>
                          </p>
                          <time className="text-[12px] text-ink/70 shrink-0 tabular-nums">
                            {new Date(cl.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </time>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </section>
            )}
          </main>
        </>
      )}
    </div>
  );
}
