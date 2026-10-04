"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BedDouble, CalendarCheck, Users, TrendingUp, CheckCircle2,
  Clock, ShieldCheck, LogOut, RefreshCw, AlertTriangle,
  Database, Activity, ArrowUpRight, ArrowDownRight, Hotel, Layers,
  Phone, Mail, UserCheck, CalendarDays, Search, DoorOpen, Building,
  CheckCircle, ChevronRight, User
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

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, string> = {
    CHECKED_IN: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CHECKED_OUT: "bg-ink/5 text-ink/60 border-skynest-hairline",
    CONFIRMED: "bg-sky-50 text-sky-700 border-sky-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    OCCUPIED: "bg-amber-50 text-amber-700 border-amber-200",
    AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MAINTENANCE: "bg-ink/5 text-ink/60 border-skynest-hairline",
    RESERVED: "bg-sky-50 text-sky-700 border-sky-200",
    INSERT: "bg-emerald-50 text-emerald-700 border-emerald-200",
    UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
    DELETE: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = map[s] ?? "bg-ink/5 text-ink/60 border-skynest-hairline";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-jakarta font-semibold tracking-wide uppercase rounded border ${cls}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string; value: string; sub: string;
  icon: React.FC<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="relative bg-paper border border-skynest-hairline rounded-[4px] p-6 group overflow-hidden transition-shadow hover:shadow-md">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "radial-gradient(circle at 80% 20%, rgba(217,114,44,0.04), transparent 60%)" }}
      />
      <div className="flex items-start justify-between">
        <p className="font-jakarta text-xs font-medium tracking-widest uppercase text-ink/50">{label}</p>
        <div className={`p-2 rounded-[4px] ${accent ? "bg-skynest-accent/10 text-skynest-accent" : "bg-ink/5 text-ink/40"} transition-colors group-hover:bg-skynest-accent/10 group-hover:text-skynest-accent`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="mt-3 font-cinzel text-3xl font-medium text-ink">{value}</p>
      <p className="mt-1 font-jakarta text-xs text-ink/50">{sub}</p>
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-jakarta font-semibold tracking-widest uppercase border-b-2 transition-colors ${active
          ? "border-skynest-accent text-skynest-accent"
          : "border-transparent text-ink/40 hover:text-ink/70"
        }`}
    >
      {children}
    </button>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();

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

  // ── Filtered Rooms ──────────────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    if (roomFilter === "ALL") return roomsStatus;
    if (roomFilter === "OCCUPIED") return roomsStatus.filter((r) => r.status === "OCCUPIED");
    if (roomFilter === "AVAILABLE") return roomsStatus.filter((r) => r.status === "AVAILABLE");
    if (roomFilter === "MAINTENANCE") return roomsStatus.filter((r) => r.status === "MAINTENANCE" || r.status === "RESERVED");
    return roomsStatus;
  }, [roomsStatus, roomFilter]);

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

  // ── Navigation Items by Role ────────────────────────────────────────────────
  const navItems = useMemo(() => {
    const all = [
      { href: "/dashboard", label: "Overview", roles: ["RECEPTIONIST", "SERVICE_STAFF", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/staff", label: "Staff", roles: ["MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/branches", label: "Branches", roles: ["ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/rooms", label: "Rooms", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/bookings", label: "Bookings", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
      { href: "/dashboard/billing", label: "Billing & Invoices", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
    ];
    if (!user) return [];
    return all.filter((item) => item.roles.includes(user.role));
  }, [user]);


  // ── Property Name Resolution ────────────────────────────────────────────────
  const propertyName = stats?.branch_name || user?.branchName || "Sky Nest Galle";
  const propertyCity = stats?.branch_city || "Southern Province";

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if ((loading || authLoading) && !stats && !error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-[4px] bg-skynest-accent/10 flex items-center justify-center mx-auto animate-pulse">
            <Hotel className="w-5 h-5 text-skynest-accent" />
          </div>
          <p className="font-jakarta text-sm text-ink/50">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-jakarta">

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-skynest-hairline bg-paper/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[4px] bg-skynest-accent flex items-center justify-center">
              <Hotel className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-cinzel text-sm font-medium text-ink">Sky Nest</span>
              <span className="ml-2 font-jakarta text-[10px] tracking-widest uppercase text-ink/40">
                {isManager ? "Property Manager" : isReceptionist ? "Front Desk Reception" : user?.role.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-jakarta text-xs font-semibold tracking-widest uppercase text-ink/50 hover:text-skynest-accent transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden sm:block font-jakarta text-xs text-ink/50">
                {user.firstName} {user.lastName}&nbsp;&middot;&nbsp;
                <span className="text-skynest-accent font-semibold">{propertyName}</span>
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2 rounded-[4px] border border-skynest-hairline text-ink/40 hover:text-skynest-accent hover:border-skynest-accent/40 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-semibold font-jakarta text-red-600 hover:bg-red-50 transition-colors border border-red-200"
            >
              <LogOut size={12} />
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Surface ────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-10 space-y-10">
        {isReceptionist ? (
          <ReceptionistHub
            user={user}
            stats={stats}
            bookings={bookings}
            roomsStatus={roomsStatus}
            propertyName={propertyName}
            onRefresh={fetchAll}
          />
        ) : (
          <>

            {/* ── Heading / Property Banner ───────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-skynest-hairline">
              {isManager && (
                <div>
                  <p className="font-cinzel italic text-xs tracking-widest text-skynest-accent mb-1">
                    Property Management Hub
                  </p>
                  <h1 className="font-cinzel text-3xl font-medium text-ink">
                    {propertyName}
                  </h1>
                  <p className="mt-1 font-jakarta text-sm text-ink/50">
                    {`Hotel Operations for ${propertyName} (${propertyCity}) · General Manager: ${user?.firstName} ${user?.lastName}`}
                  </p>
                </div>
              )}

              {/* Admin Branch Filter Selector */}
              {isAdminOrDba && (
                <div className="flex items-center gap-3 sm:ml-auto">
                  <span className="font-jakarta text-xs text-ink/50 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-skynest-accent" />
                    Branch:
                  </span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-paper border border-skynest-hairline rounded-[4px] px-3 py-1.5 text-xs font-jakarta text-ink focus:outline-none focus:border-skynest-accent"
                  >
                    <option value="">All Branches (Cross-Branch)</option>
                    {branches.map((b) => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.branch_name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manager Badge */}
              {isManager && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[10px] font-jakarta font-semibold tracking-widest uppercase border border-skynest-hairline bg-skynest-accent/5 text-skynest-accent">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Assigned Property: {propertyName}
                  </span>
                </div>
              )}
            </div>

            {/* ── KPI Stat Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Occupancy Rate"
                value={`${stats?.occupancy_rate ?? 0}%`}
                sub={`${stats?.occupied_rooms ?? 0} of ${stats?.total_rooms ?? 0} rooms occupied`}
                icon={TrendingUp}
                accent={true}
              />
              <StatCard
                label={isManager ? "In-House Guests" : "Active Bookings"}
                value={(isManager ? stats?.total_guests : stats?.active_bookings)?.toString() ?? "0"}
                sub={isManager ? `Residing at ${propertyName}` : `${stats?.checkins_today ?? 0} checking in today`}
                icon={CalendarCheck}
              />
              <StatCard
                label="Today's Revenue"
                value={`$${(stats?.revenue_today ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub={`${stats?.checkouts_today ?? 0} check-outs today`}
                icon={ArrowUpRight}
              />
              <StatCard
                label={isManager ? "Room Status" : "Active Guests"}
                value={isManager ? `${stats?.available_rooms ?? 0} Free` : (stats?.total_guests ?? 0).toString()}
                sub={isManager ? `${stats?.maintenance_rooms ?? 0} maintenance / reserved` : "Across all properties"}
                icon={BedDouble}
              />
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 1: Hotel Room Status & Occupancy Explorer               */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-paper border border-skynest-hairline rounded-[4px] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-skynest-hairline">
                <div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-skynest-accent" />
                    <h2 className="font-cinzel text-xl font-medium text-ink">
                      {isManager ? `${propertyName} Room Occupancy` : "Physical Rooms Status"}
                    </h2>
                  </div>
                  <p className="font-jakarta text-xs text-ink/50 mt-1">
                    Real-time door status, housekeeping state, and resident guest allocations across all floors.
                  </p>
                </div>

                {/* Room Filters */}
                <div className="flex items-center gap-1 bg-ink/[0.02] p-1 rounded border border-skynest-hairline">
                  {(["ALL", "OCCUPIED", "AVAILABLE", "MAINTENANCE"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRoomFilter(filter)}
                      className={`px-3 py-1 text-[10px] font-jakarta font-semibold tracking-widest uppercase rounded transition-colors ${roomFilter === filter
                          ? "bg-skynest-accent text-white"
                          : "text-ink/60 hover:text-ink hover:bg-ink/5"
                        }`}
                    >
                      {filter} ({filter === "ALL"
                        ? roomsStatus.length
                        : filter === "OCCUPIED"
                          ? roomsStatus.filter((r) => r.status === "OCCUPIED").length
                          : filter === "AVAILABLE"
                            ? roomsStatus.filter((r) => r.status === "AVAILABLE").length
                            : roomsStatus.filter((r) => r.status === "MAINTENANCE" || r.status === "RESERVED").length}
                      )
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredRooms.map((room) => {
                  const isOccupied = room.status === "OCCUPIED";
                  return (
                    <div
                      key={room.room_id}
                      className={`relative p-4 rounded-[4px] border transition-all ${isOccupied
                          ? "border-amber-300 bg-amber-50/20"
                          : room.status === "AVAILABLE"
                            ? "border-emerald-200 bg-emerald-50/10"
                            : "border-skynest-hairline bg-ink/[0.01]"
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-cinzel text-lg font-bold text-ink">
                            Room {room.room_number}
                          </span>
                          <p className="font-jakarta text-[11px] text-ink/50">
                            Floor {room.floor} &middot; {room.type}
                          </p>
                        </div>
                        <StatusBadge status={room.status} />
                      </div>

                      <div className="mt-4 pt-3 border-t border-skynest-hairline/60">
                        {isOccupied ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                              <User className="w-3.5 h-3.5 text-skynest-accent" />
                              <span>{room.guest_name || "Resident Guest"}</span>
                            </div>
                            {room.check_out_date && (
                              <p className="font-jakarta text-[11px] text-ink/50 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-ink/30" />
                                Check-out: {room.check_out_date}
                              </p>
                            )}
                            <span className="inline-block mt-1 font-mono text-[10px] text-skynest-accent">
                              Folio: {room.booking_id || "Active Stay"}
                            </span>
                          </div>
                        ) : room.status === "AVAILABLE" ? (
                          <div className="flex items-center justify-between">
                            <span className="font-jakarta text-xs text-ink/50">Rate</span>
                            <span className="font-jakarta text-xs font-semibold text-emerald-700">
                              ${room.price_per_night}/night
                            </span>
                          </div>
                        ) : (
                          <p className="font-jakarta text-[11px] text-ink/40 italic">
                            Under routine maintenance inspection
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 2: Guests Currently Staying (In-House & Folios)          */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-paper border border-skynest-hairline rounded-[4px] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-skynest-hairline">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-skynest-accent" />
                    <h2 className="font-cinzel text-xl font-medium text-ink">
                      {isManager ? `Guests Staying at ${propertyName}` : "Active Reservations & In-House Guests"}
                    </h2>
                  </div>
                  <p className="font-jakarta text-xs text-ink/50 mt-1">
                    {isManager
                      ? `Active guests currently registered and checked in at ${propertyName}.`
                      : "Latest guest reservations and stay folios across properties."}
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-ink/40" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Search guest name or room..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs font-jakarta bg-paper border border-skynest-hairline rounded-[4px] text-ink focus:outline-none focus:border-skynest-accent"
                  />
                </div>
              </div>

              {inHouseGuests.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-8 h-8 text-ink/20 mx-auto mb-3" />
                  <p className="font-jakarta text-sm text-ink/40">No active guests found matching this criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-jakarta">
                    <thead className="bg-ink/[0.02] border-b border-skynest-hairline text-ink/50 text-[10px] tracking-widest uppercase">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Guest Name</th>
                        <th className="px-6 py-3 font-semibold">Room & Type</th>
                        <th className="px-6 py-3 font-semibold">Check-In</th>
                        <th className="px-6 py-3 font-semibold">Check-Out</th>
                        <th className="px-6 py-3 font-semibold">Nights</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Folio Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-skynest-hairline">
                      {inHouseGuests.map((b, idx) => (
                        <tr key={b.booking_room_id || `${b.booking_id}-${b.room_number ?? idx}`} className="hover:bg-ink/[0.015] transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-ink">
                              {b.guest_first_name} {b.guest_last_name}
                            </p>
                            <p className="text-xs text-ink/40">{b.guest_email}</p>
                            {b.guest_phone && (
                              <p className="text-[11px] text-ink/30 font-mono mt-0.5">{b.guest_phone}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-ink">
                              Room {b.room_number ?? "TBD"}
                            </span>
                            <p className="text-xs text-ink/40">{b.room_type_name ?? "Suite"}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-ink/70">
                            {b.check_in_date ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-xs text-ink/70">
                            {b.check_out_date ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-xs text-ink/60">
                            {b.nights ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={b.booking_status} />
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-ink">
                            {b.total_amount != null
                              ? `$${Number(b.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : <span className="text-ink/30 font-normal text-xs">Pending</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 3: Staff Working Today & Tomorrow (Duty Roster)          */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-paper border border-skynest-hairline rounded-[4px] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-skynest-hairline">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-skynest-accent" />
                    <h2 className="font-cinzel text-xl font-medium text-ink">
                      {isManager ? `${propertyName} Staff Duty Roster` : "Staff On Duty Schedule"}
                    </h2>
                  </div>
                  <p className="font-jakarta text-xs text-ink/50 mt-1">
                    Staff schedule, shift timings, and department assignments for today and tomorrow.
                  </p>
                </div>

                {/* Roster Day Switcher */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-ink/[0.02] p-1 rounded border border-skynest-hairline">
                    <button
                      onClick={() => setRosterDay("today")}
                      className={`px-3 py-1 text-xs font-jakarta font-semibold rounded transition-colors ${rosterDay === "today"
                          ? "bg-skynest-accent text-white"
                          : "text-ink/60 hover:text-ink"
                        }`}
                    >
                      Working Today ({staffRoster.filter(s => s.shift_status_today === "ON_DUTY" || s.shift_status_today === "SCHEDULED").length})
                    </button>
                    <button
                      onClick={() => setRosterDay("tomorrow")}
                      className={`px-3 py-1 text-xs font-jakarta font-semibold rounded transition-colors ${rosterDay === "tomorrow"
                          ? "bg-skynest-accent text-white"
                          : "text-ink/60 hover:text-ink"
                        }`}
                    >
                      Working Tomorrow ({staffRoster.filter(s => s.shift_status_tomorrow === "SCHEDULED").length})
                    </button>
                  </div>

                  <Link
                    href="/dashboard/staff"
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-skynest-accent hover:underline"
                  >
                    Staff Directory <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {activeRoster.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-8 h-8 text-ink/20 mx-auto mb-3" />
                  <p className="font-jakarta text-sm text-ink/40">No staff scheduled for this branch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeRoster.map((s) => {
                    const isOnDuty = s.currentDutyStatus === "ON_DUTY";
                    const isOffDuty = s.currentDutyStatus === "OFF_DUTY";

                    return (
                      <div
                        key={s.staff_id}
                        className="p-5 rounded-[4px] border border-skynest-hairline bg-paper hover:shadow-sm transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-jakarta font-semibold text-ink text-sm">
                                {s.first_name} {s.last_name}
                              </p>
                              <span className="inline-block text-[10px] font-jakarta font-semibold uppercase tracking-wider text-skynest-accent">
                                {s.role.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${isOnDuty
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isOffDuty
                                    ? "bg-ink/5 text-ink/40 border-skynest-hairline"
                                    : "bg-sky-50 text-sky-700 border-sky-200"
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? "bg-emerald-500 animate-pulse" : isOffDuty ? "bg-ink/30" : "bg-sky-500"
                                  }`}
                              />
                              {s.currentDutyStatus.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-ink/60">
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-ink/40 shrink-0" />
                              <span>{s.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-ink/40 shrink-0" />
                              <span className="font-medium text-ink/80">{s.currentShift}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-skynest-hairline flex items-center justify-between text-xs text-ink/40">
                          {s.phone ? (
                            <a
                              href={`tel:${s.phone}`}
                              className="flex items-center gap-1 hover:text-skynest-accent transition-colors font-mono text-[11px]"
                            >
                              <Phone className="w-3 h-3" />
                              {s.phone}
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                          <a
                            href={`mailto:${s.email}`}
                            className="flex items-center gap-1 hover:text-skynest-accent transition-colors text-[11px]"
                            title={s.email}
                          >
                            <Mail className="w-3 h-3" />
                            Email
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 4: Dual Audit & Change Log Streams (For Admin / System)   */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {isAdminOrDba && (
              <div className="border border-skynest-hairline rounded-[4px] overflow-hidden">
                <div className="px-6 border-b border-skynest-hairline bg-paper flex items-center gap-0">
                  <TabBtn active={activeTab === "app"} onClick={() => setActiveTab("app")}>
                    <Activity className="w-3.5 h-3.5" />
                    Application Activity
                  </TabBtn>
                  <TabBtn active={activeTab === "db"} onClick={() => setActiveTab("db")}>
                    <Database className="w-3.5 h-3.5" />
                    Database Trigger Ledger
                  </TabBtn>
                  <div className="ml-auto">
                    <span className="font-jakarta text-[10px] tracking-widest uppercase text-ink/30">
                      {activeTab === "app" ? "audit_logs ← auditEmitter" : "change_log ← pg triggers"}
                    </span>
                  </div>
                </div>

                {/* Application Activity tab */}
                {activeTab === "app" && (
                  <div>
                    {auditLogs.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <Activity className="w-8 h-8 text-ink/20 mx-auto mb-3" />
                        <p className="font-jakarta text-sm text-ink/40">No application events recorded yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-skynest-hairline">
                        {auditLogs.map((log) => (
                          <div key={log.audit_id} className="px-6 py-4 flex items-start gap-4 hover:bg-ink/[0.015] transition-colors">
                            <div className="mt-0.5 w-7 h-7 rounded-full bg-ink/5 flex items-center justify-center shrink-0">
                              <Layers className="w-3.5 h-3.5 text-ink/40" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-jakarta text-xs font-semibold text-ink">{log.action}</span>
                                <span className="font-jakarta text-xs text-ink/40">on</span>
                                <span className="font-jakarta text-xs text-skynest-accent">{log.entity_type}</span>
                                {log.actor_username && (
                                  <>
                                    <span className="font-jakarta text-xs text-ink/30">by</span>
                                    <span className="font-jakarta text-xs font-medium text-ink/70">
                                      {log.actor_first_name} {log.actor_last_name}
                                      <span className="text-ink/40 font-normal"> ({log.actor_role})</span>
                                    </span>
                                  </>
                                )}
                              </div>
                              {log.ip_address && (
                                <p className="font-mono text-[10px] text-ink/30 mt-0.5">IP: {log.ip_address}</p>
                              )}
                            </div>
                            <time className="font-jakarta text-[10px] text-ink/30 shrink-0 tabular-nums">
                              {new Date(log.created_at).toLocaleString()}
                            </time>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Database Trigger Ledger tab */}
                {activeTab === "db" && (
                  <div>
                    {changeLogs.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <Database className="w-8 h-8 text-ink/20 mx-auto mb-3" />
                        <p className="font-jakarta text-sm text-ink/40">No database mutations captured yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm font-jakarta">
                          <thead className="bg-ink/[0.02] border-b border-skynest-hairline text-ink/50 text-[10px] tracking-widest uppercase">
                            <tr>
                              <th className="px-6 py-3 font-semibold">Operation</th>
                              <th className="px-6 py-3 font-semibold">Table</th>
                              <th className="px-6 py-3 font-semibold">Record ID</th>
                              <th className="px-6 py-3 font-semibold">DB User</th>
                              <th className="px-6 py-3 font-semibold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-skynest-hairline">
                            {changeLogs.map((cl) => (
                              <tr key={cl.change_id} className="hover:bg-ink/[0.015] transition-colors">
                                <td className="px-6 py-4">
                                  <StatusBadge status={cl.operation} />
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-ink/70">{cl.table_name}</td>
                                <td className="px-6 py-4 font-mono text-xs text-skynest-accent">
                                  {cl.record_id.slice(0, 8)}…
                                </td>
                                <td className="px-6 py-4 text-xs text-ink/50">{cl.db_user}</td>
                                <td className="px-6 py-4 text-xs text-ink/40 tabular-nums">
                                  {new Date(cl.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


          </>
        )}
      </main>
    </div>
  );
}
