"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  BedDouble, CalendarCheck, Users, TrendingUp, CheckCircle,
  Clock, ShieldCheck, LogOut, RefreshCw, AlertTriangle,
  Database, Activity, ArrowUpRight, ArrowDownRight, Hotel, Layers
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  occupancy_rate: number;
  total_rooms: number;
  occupied_rooms: number;
  active_bookings: number;
  checkins_today: number;
  checkouts_today: number;
  revenue_today: number;
  total_guests: number;
}

interface RecentBooking {
  booking_id: string;
  booking_status: string;
  booking_created_at: string;
  branch_name: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  room_number: string | null;
  room_type_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  total_amount: number | null;
  invoice_status: string | null;
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
    CHECKED_IN:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    CHECKED_OUT: "bg-ink/5 text-ink/60 border-skynest-hairline",
    CONFIRMED:   "bg-sky-50 text-sky-700 border-sky-200",
    PENDING:     "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED:   "bg-red-50 text-red-700 border-red-200",
    INSERT:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    UPDATE:      "bg-amber-50 text-amber-700 border-amber-200",
    DELETE:      "bg-red-50 text-red-700 border-red-200",
  };
  const cls = map[s] ?? "bg-ink/5 text-ink/60 border-skynest-hairline";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-jakarta font-semibold tracking-wide uppercase rounded border ${cls}`}>
      {s.replace("_", " ")}
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
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "radial-gradient(circle at 80% 20%, rgba(217,114,44,0.04), transparent 60%)" }} />
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
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-jakarta font-semibold tracking-widest uppercase border-b-2 transition-colors ${
        active
          ? "border-skynest-accent text-skynest-accent"
          : "border-transparent text-ink/40 hover:text-ink/70"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();

  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [bookings, setBookings]         = useState<RecentBooking[]>([]);
  const [auditLogs, setAuditLogs]       = useState<AuditLogEntry[]>([]);
  const [changeLogs, setChangeLogs]     = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<"app" | "db">("app");
  const [lastRefresh, setLastRefresh]   = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, bookingsRes, auditRes, changeRes] = await Promise.allSettled([
        apiFetch<{ success: boolean; data: DashboardStats }>("/api/v1/dashboard/stats"),
        apiFetch<{ success: boolean; data: RecentBooking[] }>("/api/v1/dashboard/bookings?limit=10"),
        apiFetch<{ success: boolean; data: AuditLogEntry[] }>("/api/v1/audit-logs?limit=30"),
        apiFetch<{ success: boolean; data: ChangeLogEntry[] }>("/api/v1/audit-logs/changes?limit=30"),
      ]);

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
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        window.location.replace("/login");
      } else {
        fetchAll();
      }
    }
  }, [authLoading, user, fetchAll]);

  // ── Stat card derivations ──────────────────────────────────────────────────

  const statCards = stats
    ? [
        {
          label: "Occupancy Rate",
          value: `${stats.occupancy_rate}%`,
          sub: `${stats.occupied_rooms} of ${stats.total_rooms} rooms occupied`,
          icon: TrendingUp,
          accent: true,
        },
        {
          label: "Active Bookings",
          value: stats.active_bookings.toString(),
          sub: `${stats.checkins_today} checking in today`,
          icon: CalendarCheck,
        },
        {
          label: "Today's Revenue",
          value: `$${stats.revenue_today.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          sub: `${stats.checkouts_today} check-outs today`,
          icon: ArrowUpRight,
        },
        {
          label: "Active Guests",
          value: stats.total_guests.toString(),
          sub: "Across all branches",
          icon: Users,
        },
      ]
    : [];

  // ── Loading skeleton ──────────────────────────────────────────────────────

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

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-skynest-hairline bg-paper/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[4px] bg-skynest-accent flex items-center justify-center">
              <Hotel className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-cinzel text-sm font-medium text-ink">Sky Nest</span>
              <span className="ml-2 font-jakarta text-[10px] tracking-widest uppercase text-ink/40">Admin</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: "/dashboard",          label: "Overview" },
              { href: "/staff",    label: "Staff" },
              { href: "/branches", label: "Branches" },
            ].map(({ href, label }) => (
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
                {user.firstName}&nbsp;&middot;&nbsp;
                <span className="text-skynest-accent">{user.role.replace(/_/g, " ")}</span>
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

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-10 space-y-10">

        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-cinzel italic text-xs tracking-widest text-skynest-accent mb-1">Operations</p>
            <h1 className="font-cinzel text-3xl font-medium text-ink">System Overview</h1>
            <p className="mt-1 font-jakarta text-sm text-ink/50">
              Live operational data — triggers, invoices, and guest activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[10px] font-jakarta font-semibold tracking-widest uppercase border border-skynest-hairline text-ink/50">
              <ShieldCheck className="w-3 h-3" />
              Raw SQL · Zero ORM
            </span>
            {lastRefresh && (
              <span className="font-jakarta text-[10px] text-ink/30">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[4px] border border-amber-200 bg-amber-50 text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="font-jakarta text-sm">{error}</p>
          </div>
        )}

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* Recent Bookings Table */}
        <div className="border border-skynest-hairline rounded-[4px] overflow-hidden">
          <div className="px-6 py-4 border-b border-skynest-hairline flex items-center justify-between bg-paper">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-skynest-accent" />
              <h2 className="font-cinzel text-sm font-medium text-ink">Recent Reservations</h2>
            </div>
            <span className="font-jakarta text-[10px] tracking-widest uppercase text-ink/40">
              via v_booking_details
            </span>
          </div>

          {bookings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BedDouble className="w-8 h-8 text-ink/20 mx-auto mb-3" />
              <p className="font-jakarta text-sm text-ink/40">No bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-jakarta">
                <thead className="bg-ink/[0.02] border-b border-skynest-hairline text-ink/50 text-[10px] tracking-widest uppercase">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Booking Ref</th>
                    <th className="px-6 py-3 font-semibold">Guest</th>
                    <th className="px-6 py-3 font-semibold">Branch</th>
                    <th className="px-6 py-3 font-semibold">Room</th>
                    <th className="px-6 py-3 font-semibold">Check-in</th>
                    <th className="px-6 py-3 font-semibold">Check-out</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-skynest-hairline">
                  {bookings.map((b) => (
                    <tr key={`${b.booking_id}-${b.room_number}`} className="hover:bg-ink/[0.015] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-skynest-accent">
                        {b.booking_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">
                        {b.guest_first_name} {b.guest_last_name}
                      </td>
                      <td className="px-6 py-4 text-ink/50 text-xs">{b.branch_name}</td>
                      <td className="px-6 py-4 text-ink/70 text-xs">
                        {b.room_number ? `Rm ${b.room_number}` : "—"}
                        {b.room_type_name && (
                          <span className="ml-1 text-ink/40">· {b.room_type_name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-ink/50 text-xs">
                        {b.check_in_date ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-ink/50 text-xs">
                        {b.check_out_date ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={b.booking_status} />
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-ink">
                        {b.total_amount != null
                          ? `$${Number(b.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : <span className="text-ink/30 font-normal text-xs">Pending</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit & Change Log Dual Stream */}
        <div className="border border-skynest-hairline rounded-[4px] overflow-hidden">
          {/* Tab bar */}
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
                  <p className="font-jakarta text-xs text-ink/30 mt-1">Events are emitted by auditEmitter when staff/booking actions occur.</p>
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
                  <p className="font-jakarta text-xs text-ink/30 mt-1">
                    Mutations are recorded by PostgreSQL triggers (fn_log_table_changes) on bookings, guests, invoices, and service_usage.
                  </p>
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

        {/* Architecture legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-3 px-4 py-4 rounded-[4px] border border-skynest-hairline bg-paper">
            <Activity className="w-4 h-4 text-skynest-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-cinzel text-xs font-medium text-ink mb-0.5">Application Activity Stream</p>
              <p className="font-jakarta text-xs text-ink/50">
                Written by Node.js <code className="font-mono text-[10px] bg-ink/5 px-1 rounded">auditEmitter</code> via GoF Observer (Tier 2).
                Captures actor identity, JWT role, HTTP IP, and domain event context.
              </p>
            </div>
          </div>
          <div className="flex gap-3 px-4 py-4 rounded-[4px] border border-skynest-hairline bg-paper">
            <Database className="w-4 h-4 text-skynest-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-cinzel text-xs font-medium text-ink mb-0.5">Database Trigger Ledger</p>
              <p className="font-jakarta text-xs text-ink/50">
                Written by PostgreSQL <code className="font-mono text-[10px] bg-ink/5 px-1 rounded">fn_log_table_changes()</code> via GoF Observer (Tier 1).
                Captures raw row diffs even for mutations outside Express.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
