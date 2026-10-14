'use client';

/**
 * Light-theme building blocks shared by the report tabs. They follow the
 * management primitives in components/dashboard/ui.tsx: paper surface, ink text,
 * hairline dividers, underline fields.
 */

import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const LABEL = 'font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70';

/**
 * Hides a branch picker from managers: they run one branch and the API already
 * limits their reports to it.
 */
export function HideForManager({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'MANAGER' ? null : <>{children}</>;
}

// ── Stat strip ────────────────────────────────────────────────────────────────

export interface ReportStat {
  label: string;
  value: string;
  sub?: string;
  /** `alert` draws the value in red, for arrears and similar. */
  tone?: 'default' | 'alert';
}

/** Headline figures in hairline-divided cells, the light twin of the masthead KPIs. */
export function StatStrip({ stats }: { stats: ReportStat[] }) {
  return (
    <div className="print-card grid grid-cols-2 lg:grid-cols-4 print:grid-cols-4 border-y border-skynest-hairline">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`py-6 pr-6 ${i % 2 === 1 ? 'pl-6 border-l border-skynest-hairline' : ''} ${
            i > 0 ? 'lg:pl-8 lg:border-l lg:border-skynest-hairline print:pl-6 print:border-l print:border-skynest-hairline' : ''
          } ${i > 1 ? 'border-t border-skynest-hairline lg:border-t-0 print:border-t-0' : ''}`}
        >
          <p className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">{s.label}</p>
          <p
            className={`mt-2 font-cinzel text-[28px] md:text-[32px] leading-none tabular-nums ${
              s.tone === 'alert' ? 'text-red-700' : 'text-ink'
            }`}
          >
            {s.value}
          </p>
          {s.sub && <p className="mt-2 font-jakarta text-[13px] text-ink/70">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

/** A titled block inside a report (one table, one breakdown). */
export function ReportPanel({
  title, sub, aside, children,
}: { title: string; sub?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:block break-inside-avoid break-after-avoid">
        <div>
          <h3 className="font-cinzel text-[20px] md:text-[24px] leading-tight text-ink">{title}</h3>
          {sub && <p className="mt-1 font-jakarta text-[13px] text-ink/70">{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

// ── Notice ────────────────────────────────────────────────────────────────────

const NOTICE_TONE = {
  success: { bar: 'bg-emerald-500', icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> },
  warning: { bar: 'bg-amber-500', icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" /> },
  error: { bar: 'bg-red-600', icon: <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> },
} as const;

/** Inline status message (snapshot saved, load failed, invalid range). */
export function Notice({
  tone, children, onDismiss,
}: { tone: keyof typeof NOTICE_TONE; children: React.ReactNode; onDismiss?: () => void }) {
  const t = NOTICE_TONE[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="no-print flex items-center gap-4 pl-4 pr-4 py-4 bg-paper rounded-[4px] border border-skynest-hairline font-jakarta text-[13px] text-ink"
    >
      <span className={`w-1 self-stretch rounded-full ${t.bar}`} />
      {t.icon}
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="p-1 text-ink/50 hover:text-ink transition-colors duration-300"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Meter ─────────────────────────────────────────────────────────────────────

/** Thin proportional bar, 0–100. */
export function Meter({ value, label }: { value: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-1 w-full rounded-full bg-ink/[0.08] overflow-hidden"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Filter fields (underline, with a visible inline label) ───────────────────

export function LabeledSelect({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative flex items-center gap-2 border-b border-skynest-hairline focus-within:border-skynest-accent transition-colors duration-300">
      <span className={LABEL}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent py-2 pr-6 font-jakarta text-[13px] text-ink focus:outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50 pointer-events-none" />
    </label>
  );
}

export function DateFilter({
  label, value, onChange, min, max, title,
}: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; title?: string }) {
  return (
    <label className="flex items-center gap-2 border-b border-skynest-hairline focus-within:border-skynest-accent transition-colors duration-300">
      <span className={LABEL}>{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent py-2 font-jakarta text-[13px] text-ink tabular-nums focus:outline-none cursor-pointer"
      />
    </label>
  );
}

/** Category / tag text inside a table cell. */
export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="font-jakarta text-[11px] tracking-[0.08em] uppercase text-ink/70">{children}</span>;
}
