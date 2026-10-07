'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, Building2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportCsv } from '@/lib/export-csv';

// ── Person 1 Workspace: Report 4 — Monthly Revenue per Branch ─────────────────
// Endpoint: GET /api/v1/reports/revenue/monthly?year=2026&branchId=...
// Segregates room tariff vs ancillary service revenue and shows the
// 4-tier Sri Lankan statutory tax cascade (SC → TDL → SSCL → VAT).

interface MonthlyRevenueRow {
  month_key: string;
  month_label: string;
  branch_id: string;
  branch_name: string;
  total_room_revenue: string;
  total_service_revenue: string;
  subtotal_base_revenue: string;
  total_taxes_collected: string;
  gross_revenue: string;
}

interface Props {
  selectedBranch: string;
  isLoading: boolean;
  onLoadingChange: (v: boolean) => void;
}

function fmt(v: string | number): string {
  const n = typeof v === 'string' ? toNum(v) : v;
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(part: number, total: number): string {
  if (!total) return '0.0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

export function MonthlyRevenueReport({ selectedBranch, isLoading, onLoadingChange }: Props) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [rows, setRows] = useState<MonthlyRevenueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    onLoadingChange(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (selectedBranch) params.set('branchId', selectedBranch);

      const res = await apiFetch<{ data: MonthlyRevenueRow[] }>(
        `/api/v1/reports/revenue/monthly?${params.toString()}`,
      );
      setRows(Array.isArray(res) ? res : (res?.data ?? []));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load monthly revenue data.');
    } finally {
      onLoadingChange(false);
    }
  }, [year, selectedBranch, onLoadingChange]);

  useEffect(() => {
    load();
  }, [load]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalGross = rows.reduce((s, r) => s + toNum(r.gross_revenue), 0);
  const totalRoom = rows.reduce((s, r) => s + toNum(r.total_room_revenue), 0);
  const totalService = rows.reduce((s, r) => s + toNum(r.total_service_revenue), 0);
  const totalTax = rows.reduce((s, r) => s + toNum(r.total_taxes_collected), 0);

  // ── Group rows by branch for the expand/collapse section ──────────────────
  const byBranch = rows.reduce<Record<string, MonthlyRevenueRow[]>>((acc, row) => {
    if (!acc[row.branch_id]) acc[row.branch_id] = [];
    acc[row.branch_id].push(row);
    return acc;
  }, {});

  const handleExport = () => {
    if (!rows.length) return;
    exportCsv(
      rows.map(r => ({
        Month: r.month_label,
        Branch: r.branch_name,
        'Room Revenue (LKR)': toNum(r.total_room_revenue).toFixed(2),
        'Service Revenue (LKR)': toNum(r.total_service_revenue).toFixed(2),
        'Subtotal Base (LKR)': toNum(r.subtotal_base_revenue).toFixed(2),
        'Total Taxes (LKR)': toNum(r.total_taxes_collected).toFixed(2),
        'Gross Revenue (LKR)': toNum(r.gross_revenue).toFixed(2),
      })),
      `skynest-monthly-revenue-${year}`,
    );
  };

  const toggleBranch = (branchId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  // ── Year selector ─────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6 font-jakarta">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-faded uppercase tracking-widest font-medium">Fiscal Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-ink/5 border border-skynest-hairline text-ink text-sm px-3 py-1.5 focus:outline-none focus:border-skynest-accent"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExport}
          disabled={!rows.length}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-skynest-hairline hover:border-skynest-accent text-ink hover:text-skynest-accent text-xs font-medium transition-colors duration-200 disabled:opacity-40"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-3 border border-rose-300 bg-rose-50 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Annual Gross Revenue', value: fmt(totalGross), icon: <DollarSign size={16} />, accent: true },
          { label: 'Room Tariff Revenue', value: fmt(totalRoom), sub: pct(totalRoom, totalGross - totalTax) + ' of base', icon: <Building2 size={16} /> },
          { label: 'Service Revenue', value: fmt(totalService), sub: pct(totalService, totalGross - totalTax) + ' of base', icon: <TrendingUp size={16} /> },
          { label: 'Total Taxes Collected', value: fmt(totalTax), sub: 'SC → TDL → SSCL → VAT', icon: <TrendingUp size={16} /> },
        ].map(({ label, value, sub, icon, accent }) => (
          <div
            key={label}
            className={`p-4 border ${accent ? 'border-skynest-accent/30 bg-skynest-accent/5' : 'border-skynest-hairline bg-paper'}`}
          >
            <div className={`flex items-center gap-2 mb-2 ${accent ? 'text-skynest-accent' : 'text-ink-faded'}`}>
              {icon}
              <span className="text-[11px] uppercase tracking-widest font-medium">{label}</span>
            </div>
            <div className="font-cinzel text-lg font-semibold text-ink">{value}</div>
            {sub && <div className="text-[11px] text-ink-faded mt-1">{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Revenue ratio bar ── */}
      {totalGross > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-ink-faded uppercase tracking-widest">
            <span>Room Revenue {pct(totalRoom, totalRoom + totalService)}</span>
            <span>Service Revenue {pct(totalService, totalRoom + totalService)}</span>
          </div>
          <div className="flex h-2 rounded-none overflow-hidden border border-skynest-hairline">
            <div
              className="bg-ink transition-all duration-500"
              style={{ width: pct(totalRoom, totalRoom + totalService) }}
            />
            <div
              className="bg-skynest-accent/70 transition-all duration-500"
              style={{ width: pct(totalService, totalRoom + totalService) }}
            />
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && rows.length === 0 && !error && (
        <div className="py-16 text-center border border-skynest-hairline">
          <DollarSign size={32} className="mx-auto mb-3 text-ink-faded opacity-40" />
          <p className="font-cinzel italic text-ink text-base">No revenue data for {year}</p>
          <p className="text-ink-faded text-sm mt-1">No invoices found for the selected year and branch.</p>
        </div>
      )}

      {/* ── Branch tables ── */}
      {Object.entries(byBranch).map(([branchId, branchRows]) => {
        const branchGross = branchRows.reduce((s, r) => s + toNum(r.gross_revenue), 0);
        const branchName = branchRows[0]?.branch_name ?? 'Branch';
        const isOpen = expanded.has(branchId);

        return (
          <div key={branchId} className="border border-skynest-hairline">
            {/* Branch header — click to expand */}
            <button
              onClick={() => toggleBranch(branchId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-ink text-white hover:bg-ink/90 transition-colors duration-150"
            >
              <span className="font-cinzel italic text-sm">{branchName}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-jakarta text-white/70">Annual: {fmt(branchGross)}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {/* Monthly breakdown table */}
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-ink">
                  <thead>
                    <tr className="bg-ink/5 border-b border-skynest-hairline">
                      {['Month', 'Room Revenue', 'Service Revenue', 'Subtotal', 'Taxes', 'Gross Revenue'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-medium uppercase tracking-widest text-[10px] text-ink-faded">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branchRows.map(row => (
                      <tr key={row.month_key} className="border-b border-skynest-hairline last:border-0 hover:bg-ink/5 transition-colors duration-100">
                        <td className="px-4 py-2.5 font-medium text-ink">{row.month_label}</td>
                        <td className="px-4 py-2.5 text-ink">{fmt(row.total_room_revenue)}</td>
                        <td className="px-4 py-2.5 text-skynest-accent">{fmt(row.total_service_revenue)}</td>
                        <td className="px-4 py-2.5 text-ink-faded">{fmt(row.subtotal_base_revenue)}</td>
                        <td className="px-4 py-2.5 text-ink-faded">{fmt(row.total_taxes_collected)}</td>
                        <td className="px-4 py-2.5 font-semibold text-ink">{fmt(row.gross_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-skynest-hairline bg-ink/5">
                      <td className="px-4 py-2.5 font-semibold text-ink">Annual Total</td>
                      <td className="px-4 py-2.5 font-semibold text-ink">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_room_revenue), 0))}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-skynest-accent">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_service_revenue), 0))}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-ink-faded">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.subtotal_base_revenue), 0))}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-ink-faded">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_taxes_collected), 0))}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-ink">{fmt(branchGross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
