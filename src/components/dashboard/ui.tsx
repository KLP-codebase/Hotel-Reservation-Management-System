"use client";

/**
 * Shared Sky Nest dashboard primitives — used by the manager/admin overview
 * (src/app/dashboard/page.tsx) and the front desk view (ReceptionistHub).
 */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Loader2, RefreshCw, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Parses a stay date into a local calendar date. Accepts "YYYY-MM-DD" (no UTC
 * shift), ISO timestamps, and stringified JS dates — including truncated ones
 * like "Fri Nov 20 2026 00:00:00 GM" that the bookings endpoint can return.
 */
export function parseStayDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const s = String(val);
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const mdy = /([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/.exec(s);
  if (mdy) {
    const fallback = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    if (!isNaN(fallback.getTime())) return fallback;
  }
  return null;
}

/** Local "YYYY-MM-DD" for comparing calendar days (toISOString would use UTC). */
export function toLocalYMD(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDate(v?: string | null): string {
  const d = parseStayDate(v);
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";
}

/** "06 Oct 2026" */
export function fmtDay(v?: string | null): string {
  const d = parseStayDate(v);
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

/** "20 Nov → 22 Nov 2026" parts — the year is shown once unless the stay spans years. */
export function fmtStayRange(inVal?: string | null, outVal?: string | null): { from: string; to: string } {
  const a = parseStayDate(inVal);
  const b = parseStayDate(outVal);
  const dm = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const dmy = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (!a || !b) return { from: a ? dmy(a) : "—", to: b ? dmy(b) : "—" };
  return { from: a.getFullYear() === b.getFullYear() ? dm(a) : dmy(a), to: dmy(b) };
}

/** "LKR 25,000.00" */
export function fmtLKR(n: number | string | null | undefined, decimals = 2): string {
  return `LKR ${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** "LKR 1.2M" — for headline figures where the full amount would not fit. */
export function fmtLKRCompact(n: number | string | null | undefined): string {
  return `LKR ${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n ?? 0))}`;
}

export function fmtMoney(n: number | string | null | undefined, decimals = 0): string {
  return `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "—";
}

/** Branch photography for the masthead, matched on city or property name. */
export function mastheadImage(city?: string | null): string {
  const c = (city ?? "").toLowerCase();
  if (c.includes("galle")) return "/Galle.webp";
  if (c.includes("kandy")) return "/Kandy_hotel.webp";
  return "/Colombo.webp";
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
  NO_SHOW: "bg-red-500",
  ACTIVE: "bg-emerald-500",
  INACTIVE: "bg-ink-faded",
  SUPERSEDED: "bg-ink-faded",
  CHECKED_OUT: "bg-ink-faded",
  MAINTENANCE: "bg-amber-500",
  OUT_OF_SERVICE: "bg-ink-faded",
  SETTLED: "bg-emerald-500",
  PARTIALLY_PAID: "bg-amber-500",
  OPEN: "bg-red-500",
  PAID: "bg-emerald-500",
  VERIFIED: "bg-emerald-500",
  UNVERIFIED: "bg-ink-faded",
};

export function StatusDot({ status, label }: { status: string; label?: string }) {
  const s = status.toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70 whitespace-nowrap">
      <span className={`w-2 h-2 shrink-0 rounded-full ${STATUS_DOT[s] ?? "bg-ink-faded"}`} />
      {label ?? s.replace(/_/g, " ")}
    </span>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

export function SectionHeader({ index, title, children }: { index: string; title: string; children?: React.ReactNode }) {
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

export function Segmented<T extends string>({
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

// ── Search Field (underline) ──────────────────────────────────────────────────

export function SearchField({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative w-full md:w-72 flex items-center border-b border-skynest-hairline focus-within:border-skynest-accent transition-colors duration-300">
      <Search className="w-4 h-4 text-ink/50 shrink-0" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-4 py-2 bg-transparent font-jakarta text-[15px] text-ink placeholder:text-ink/60 focus:outline-none"
      />
    </label>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-12 text-center font-jakarta text-[15px] text-ink/70">{children}</p>
  );
}

// ── Masthead ──────────────────────────────────────────────────────────────────

export interface MastheadKpi {
  label: string;
  value: string;
  sub: string;
  /** 0–100 — drawn as an accent line along the cell's top hairline. */
  bar?: number;
  /** Clickable KPIs act as filters; the active one is highlighted. */
  onClick?: () => void;
  active?: boolean;
}

export function DashboardMasthead({
  eyebrow, title, imageKey, kpis, aside, error,
}: {
  eyebrow: string;
  title: string;
  imageKey?: string | null;
  kpis?: MastheadKpi[];
  aside?: React.ReactNode;
  error?: string | null;
}) {
  kpis = kpis ?? [];
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <Image
        src={mastheadImage(imageKey)}
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
            <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-white/60">{eyebrow}</p>
            <h1
              className="mt-2 font-cinzel font-normal leading-[1.05] text-white"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              {title}
            </h1>
          </div>
          {aside}
        </div>

        {error && <p className="mt-8 font-jakarta text-[13px] text-red-300">{error}</p>}

        {kpis.length > 0 && <div className="mt-8 md:mt-12 grid grid-cols-2 lg:grid-cols-4 border-t border-white/10">
          {kpis.map((k, i) => {
            const cellCls = `relative text-left pt-6 pb-2 pr-6 ${i % 2 === 1 ? "pl-6 border-l border-white/10" : ""} ${
              i > 0 ? "lg:pl-8 lg:border-l lg:border-white/10" : ""
            } ${i > 1 ? "border-t border-white/10 lg:border-t-0" : ""}`;
            const line = k.active ? 100 : k.bar;
            const body = (
              <>
                {typeof line === "number" && (
                  <span className="absolute -top-px left-0 h-px bg-skynest-accent" style={{ width: `${line}%` }} />
                )}
                <p className={`font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase ${k.active ? "text-white" : "text-white/60"}`}>
                  {k.label}
                </p>
                <p className="mt-2 font-cinzel text-[32px] md:text-[40px] leading-none text-white tabular-nums">{k.value}</p>
                <p className="mt-2 font-jakarta text-[13px] text-white/60">{k.sub}</p>
              </>
            );
            return k.onClick ? (
              <button
                key={k.label}
                type="button"
                data-reveal
                onClick={k.onClick}
                aria-pressed={!!k.active}
                className={`${cellCls} transition-colors duration-300 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/[0.06]`}
              >
                {body}
              </button>
            ) : (
              <div key={k.label} data-reveal className={cellCls}>{body}</div>
            );
          })}
        </div>}
      </div>
    </section>
  );
}

// ── Room Board ────────────────────────────────────────────────────────────────

export interface BoardRoom {
  room_id: string;
  room_number: string;
  floor: number;
  type: string;
  status: string;
  price_per_night: number | string;
  branch_name?: string | null;
  guest_name?: string | null;
  check_out_date?: string | null;
}

/** Rooms in one compact row per floor (and per branch when `showBranch`). */
export function RoomBoard({ rooms, showBranch = false }: { rooms: BoardRoom[]; showBranch?: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, { branch: string | null; floor: number; rooms: BoardRoom[] }>();
    for (const r of rooms) {
      const branch = showBranch ? (r.branch_name ?? "—") : null;
      const key = `${branch ?? ""}|${r.floor}`;
      if (!map.has(key)) map.set(key, { branch, floor: r.floor, rooms: [] });
      map.get(key)!.rooms.push(r);
    }
    return [...map.values()].sort(
      (a, b) => (a.branch ?? "").localeCompare(b.branch ?? "") || a.floor - b.floor
    );
  }, [rooms, showBranch]);

  if (rooms.length === 0) return <Empty>No rooms in this view.</Empty>;

  return (
    <div className="divide-y divide-skynest-hairline">
      {groups.map((group) => (
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
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Management primitives (light theme) — rooms, catalogue, bookings, billing
// ══════════════════════════════════════════════════════════════════════════════

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[4px] font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skynest-accent/40";

const BTN_VARIANTS = {
  primary: "bg-ink text-white hover:bg-skynest-accent",
  outline: "border border-skynest-hairline bg-paper text-ink hover:border-skynest-accent hover:text-skynest-accent",
  ghost: "text-ink/70 hover:text-ink hover:bg-ink/[0.04]",
  danger: "border border-skynest-hairline bg-paper text-red-700 hover:border-red-600 hover:bg-red-50",
  inverse: "border border-white/20 text-white/80 hover:text-white hover:border-white/60",
} as const;

export function Btn({
  variant = "outline", loading, className = "", children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN_VARIANTS; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`${BTN_BASE} px-4 py-2 ${BTN_VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Square icon-only button; `label` is required for screen readers. */
export function IconBtn({
  label, variant = "ghost", loading, className = "", children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: keyof typeof BTN_VARIANTS; loading?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      disabled={props.disabled || loading}
      className={`${BTN_BASE} w-8 h-8 ${BTN_VARIANTS[variant]} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

/** Refresh control for the dark masthead. */
export function MastheadRefresh({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <IconBtn label="Refresh" variant="inverse" onClick={onClick} disabled={loading}>
      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
    </IconBtn>
  );
}

// ── Form fields (underline, per the design system) ────────────────────────────

const FIELD_LABEL = "font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70";
const FIELD_INPUT =
  "w-full bg-transparent border-0 border-b py-2 font-jakarta text-[15px] text-ink placeholder:text-ink/50 focus:outline-none transition-colors duration-300 disabled:text-ink/50";

export function Field({
  label, error, hint, id, className = "", ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className={FIELD_LABEL}>{label}</label>
      <input
        id={inputId}
        aria-invalid={!!error}
        {...props}
        className={`${FIELD_INPUT} ${error ? "border-red-600" : "border-skynest-hairline focus:border-skynest-accent"} ${className}`}
      />
      {error ? <span className="font-jakarta text-[12px] text-red-700">{error}</span>
        : hint ? <span className="font-jakarta text-[12px] text-ink/70">{hint}</span> : null}
    </div>
  );
}

export function SelectField({
  label, value, onChange, children, error, disabled,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; error?: string; disabled?: boolean }) {
  const id = `s-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={FIELD_LABEL}>{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD_INPUT} appearance-none pr-8 cursor-pointer ${error ? "border-red-600" : "border-skynest-hairline focus:border-skynest-accent"}`}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50 pointer-events-none" />
      </div>
      {error && <span className="font-jakarta text-[12px] text-red-700">{error}</span>}
    </div>
  );
}

/** Compact inline filter select for toolbars. */
export function FilterSelect({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative flex items-center border-b border-skynest-hairline focus-within:border-skynest-accent transition-colors duration-300">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent py-2 pr-6 font-jakarta text-[13px] text-ink focus:outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-0 w-4 h-4 text-ink/50 pointer-events-none" />
    </label>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function Modal({
  eyebrow, title, onClose, children, footer, size = "md",
}: {
  eyebrow?: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${size === "lg" ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] flex flex-col bg-paper rounded-[4px] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6 border-b border-skynest-hairline">
          <div>
            {eyebrow && <p className={FIELD_LABEL}>{eyebrow}</p>}
            <h2 className="mt-1 font-cinzel text-[24px] leading-tight text-ink">{title}</h2>
          </div>
          <IconBtn label="Close" onClick={onClose}><X className="w-4 h-4" /></IconBtn>
        </div>
        <div className="px-8 py-6 space-y-6 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-8 py-4 border-t border-skynest-hairline">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export function Toast({ tone, message }: { tone: "success" | "error"; message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed top-20 right-6 z-[100] flex items-center gap-4 max-w-sm pl-4 pr-6 py-4 bg-paper rounded-[4px] border border-skynest-hairline shadow-lg font-jakarta text-[13px] text-ink"
    >
      <span className={`w-1 self-stretch rounded-full ${tone === "success" ? "bg-emerald-500" : "bg-red-600"}`} />
      {tone === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
        : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
      {message}
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-4 py-24 font-jakarta text-[13px] text-ink/70">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
}

// ── Table styling ─────────────────────────────────────────────────────────────

export const tbl = {
  wrap: "overflow-x-auto",
  table: "w-full text-left font-jakarta",
  headRow: "text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70",
  th: "pb-4 pr-6 font-medium whitespace-nowrap",
  body: "divide-y divide-skynest-hairline border-t border-b border-skynest-hairline",
  row: "transition-colors duration-300 hover:bg-ink/[0.02]",
  td: "py-4 pr-6 text-[13px] text-ink align-middle",
  sub: "mt-1 text-[12px] text-ink/70",
} as const;

/** Toolbar row above a table: filters on the left, count + primary action on the right. */
export function Toolbar({ children, count, action }: { children?: React.ReactNode; count?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex flex-wrap items-center gap-6">{children}</div>
      <div className="flex items-center gap-6 md:ml-auto">
        {count && <span className="font-jakarta text-[12px] text-ink/70 tabular-nums">{count}</span>}
        {action}
      </div>
    </div>
  );
}

/** Flash message state shared by the management pages. */
export function useFlash() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flash = useCallback((type: "success" | "error", msg: string) => {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); }
    else { setError(msg); setTimeout(() => setError(null), 4000); }
  }, []);
  const toasts = (
    <>
      <Toast tone="success" message={success} />
      <Toast tone="error" message={error} />
    </>
  );
  return { flash, toasts };
}
