'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DollarSign, Building2, TrendingUp, Download, ChevronDown, ChevronUp, Save, CheckCircle2, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';

// ── Person 1 Workspace: Report 4 — Monthly Revenue per Branch ─────────────────
// Endpoint: GET /api/v1/reports/revenue/monthly?year=2026&branchId=...
// Segregates room tariff vs ancillary service revenue and calculates the
// 4-tier Sri Lankan statutory tax cascade (SC → TDL → SSCL → VAT).

export interface MonthlyRevenueRow {
  month_key: string;         // e.g. "2026-01"
  month_label: string;       // e.g. "Jan 2026"
  branch_id: string;
  branch_name: string;
  total_room_revenue: string;
  total_service_revenue: string;
  subtotal_base_revenue: string;
  total_taxes_collected: string;
  gross_revenue: string;
}

interface Props {
  selectedBranch?: string;
  year?: number;
}

/**
 * Formats a numeric value or string representation into standard Sri Lankan Rupee currency display.
 * @param v - Number or numeric string to format
 * @returns Formatted currency string (e.g. "LKR 125,450.00")
 */
function fmt(v: string | number): string {
  const n = typeof v === 'string' ? toNum(v) : v;
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Calculates and formats the percentage ratio of a given revenue stream.
 * @param part - Component revenue value
 * @param total - Denominator base revenue
 * @returns Percentage string with one decimal place (e.g. "68.4%")
 */
function pct(part: number, total: number): string {
  if (!total) return '0.0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

export function MonthlyRevenueReport({ selectedBranch: propBranch, year: propYear }: Props = {}) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedBranch, setSelectedBranch] = useState<string>(propBranch || '');
  const [year, setYear] = useState<number>(propYear || currentYear);
  const [rows, setRows] = useState<MonthlyRevenueRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingSnapshot, setSavingSnapshot] = useState<boolean>(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ branch_id: string; branch_name: string; city: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiFetch<{ data?: { branch_id: string; branch_name: string; city: string }[] }>('/api/v1/branches')
      .then(res => {
        if (!isMounted) return;
        if (Array.isArray(res)) setBranches(res);
        else if (res && Array.isArray(res.data)) setBranches(res.data);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Sync prop changes
  useEffect(() => {
    if (propBranch !== undefined) setSelectedBranch(propBranch);
  }, [propBranch]);

  useEffect(() => {
    if (propYear !== undefined) setYear(propYear);
  }, [propYear]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (selectedBranch) params.set('branchId', selectedBranch);

      const res = await apiFetch<{ success: boolean; data: MonthlyRevenueRow[] }>(
        `/api/v1/reports/revenue/monthly?${params.toString()}`
      );
      if (res && res.data) {
        setRows(res.data);
      } else if (Array.isArray(res)) {
        setRows(res);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load monthly revenue data.');
    } finally {
      setLoading(false);
    }
  }, [year, selectedBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalGross = useMemo(() => rows.reduce((s, r) => s + toNum(r.gross_revenue), 0), [rows]);
  const totalRoom = useMemo(() => rows.reduce((s, r) => s + toNum(r.total_room_revenue), 0), [rows]);
  const totalService = useMemo(() => rows.reduce((s, r) => s + toNum(r.total_service_revenue), 0), [rows]);
  const totalTax = useMemo(() => rows.reduce((s, r) => s + toNum(r.total_taxes_collected), 0), [rows]);

  // Group by branch
  const byBranch = useMemo(() => {
    return rows.reduce<Record<string, MonthlyRevenueRow[]>>((acc, row) => {
      if (!acc[row.branch_id]) acc[row.branch_id] = [];
      acc[row.branch_id].push(row);
      return acc;
    }, {});
  }, [rows]);

  const handleExportCsv = () => {
    if (!rows.length) return;
    exportToCsv(
      `SkyNest_Monthly_Revenue_${year}`,
      rows,
      [
        { header: 'Month', accessor: r => r.month_label },
        { header: 'Branch Name', accessor: r => r.branch_name },
        { header: 'Room Revenue (LKR)', accessor: r => toNum(r.total_room_revenue).toFixed(2) },
        { header: 'Service Revenue (LKR)', accessor: r => toNum(r.total_service_revenue).toFixed(2) },
        { header: 'Subtotal Base (LKR)', accessor: r => toNum(r.subtotal_base_revenue).toFixed(2) },
        { header: 'Taxes Collected (LKR)', accessor: r => toNum(r.total_taxes_collected).toFixed(2) },
        { header: 'Gross Revenue (LKR)', accessor: r => toNum(r.gross_revenue).toFixed(2) },
      ]
    );
  };

  const handleSaveSnapshot = async () => {
    if (!rows.length) return;
    setSavingSnapshot(true);
    setSnapshotMsg(null);
    try {
      await apiFetch('/api/v1/reports/snapshots', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'MONTHLY_REVENUE',
          reportPeriodStart: `${year}-01-01`,
          reportPeriodEnd: `${year}-12-31`,
          branchId: selectedBranch || null,
          reportData: {
            year,
            totalGross,
            totalRoom,
            totalService,
            totalTax,
            records: rows,
          },
        }),
      });
      setSnapshotMsg('Monthly revenue report archived to audit ledger (Rule B17).');
    } catch (err: any) {
      setSnapshotMsg(`Failed to archive snapshot: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

  const toggleBranch = (branchId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-950/70 border border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
            <Building2 size={14} className="text-amber-400 shrink-0" />
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-transparent text-stone-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-stone-900 text-stone-200">All Branches (Global)</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id} className="bg-stone-900 text-stone-200">
                  {b.branch_name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Fiscal Year Selector */}
          <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
            <Calendar size={14} className="text-amber-400 shrink-0" />
            <span className="text-stone-500 font-mono text-[11px]">Fiscal Year:</span>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y} className="bg-stone-900 text-stone-200">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800 border border-white/10 text-stone-300 hover:text-white text-xs transition duration-150 disabled:opacity-50 cursor-pointer"
            title="Reload Report Data"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-amber-400" : "text-stone-400"} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleExportCsv}
            disabled={!rows.length || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot || !rows.length || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Save size={13} className="text-amber-400" />
            <span>{savingSnapshot ? 'Archiving...' : 'Archive Snapshot (B17)'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot status notification */}
      {snapshotMsg && (
        <div className="p-3 bg-stone-900 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
            <span>{snapshotMsg}</span>
          </div>
          <button onClick={() => setSnapshotMsg(null)} className="text-stone-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Annual Gross Revenue', value: fmt(totalGross), icon: <DollarSign size={16} />, accent: true },
          { label: 'Room Tariff Revenue', value: fmt(totalRoom), sub: `${pct(totalRoom, totalGross - totalTax || 1)} of base`, icon: <Building2 size={16} /> },
          { label: 'Ancillary Service Revenue', value: fmt(totalService), sub: `${pct(totalService, totalGross - totalTax || 1)} of base`, icon: <TrendingUp size={16} /> },
          { label: 'Statutory Taxes (4-Tier)', value: fmt(totalTax), sub: 'SC → TDL → SSCL → VAT', icon: <TrendingUp size={16} /> },
        ].map(({ label, value, sub, icon, accent }) => (
          <div
            key={label}
            className={`p-4 border ${accent ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-stone-950/70'}`}
          >
            <div className={`flex items-center gap-2 mb-2 ${accent ? 'text-amber-400' : 'text-stone-400'}`}>
              {icon}
              <span className="text-[11px] uppercase tracking-widest font-medium font-jakarta">{label}</span>
            </div>
            <div className="font-cinzel text-lg font-bold text-stone-100">{value}</div>
            {sub && <div className="text-[11px] text-stone-400 mt-1 font-jakarta">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Revenue Ratio Bar */}
      {totalGross > 0 && (
        <div className="bg-stone-950/70 border border-white/10 p-4 space-y-2">
          <div className="flex justify-between text-[11px] text-stone-400 uppercase tracking-widest font-jakarta">
            <span>Room Tariff: {pct(totalRoom, totalRoom + totalService)}</span>
            <span>Services: {pct(totalService, totalRoom + totalService)}</span>
          </div>
          <div className="flex h-2.5 overflow-hidden border border-white/10 bg-stone-900">
            <div
              className="bg-stone-400 transition-all duration-500"
              style={{ width: pct(totalRoom, totalRoom + totalService) }}
              title="Room Tariff"
            />
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: pct(totalService, totalRoom + totalService) }}
              title="Service Catalogue"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && rows.length === 0 && !error && (
        <div className="py-16 text-center border border-white/10 bg-stone-950/50">
          <DollarSign size={32} className="mx-auto mb-3 text-stone-600" />
          <p className="font-cinzel italic text-stone-200 text-base">No revenue data for {year}</p>
          <p className="text-stone-400 text-xs mt-1">No settled invoices recorded for the selected period.</p>
        </div>
      )}

      {/* Branch Breakdown Sections */}
      {Object.entries(byBranch).map(([branchId, branchRows]) => {
        const branchGross = branchRows.reduce((s, r) => s + toNum(r.gross_revenue), 0);
        const branchName = branchRows[0]?.branch_name || 'Branch';
        const isOpen = !expanded.has(branchId); // default open

        return (
          <div key={branchId} className="border border-white/10 bg-stone-950/70 overflow-hidden">
            {/* Branch Header */}
            <button
              onClick={() => toggleBranch(branchId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-stone-900 hover:bg-stone-850 border-b border-white/10 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-amber-400" />
                <span className="font-cinzel text-sm font-semibold text-stone-100">{branchName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-stone-300">Annual Gross: {fmt(branchGross)}</span>
                {isOpen ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
              </div>
            </button>

            {/* Table */}
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-stone-900/50 text-[10px] uppercase font-mono tracking-wider text-stone-400">
                      <th className="p-3">Month</th>
                      <th className="p-3">Room Tariff (LKR)</th>
                      <th className="p-3">Services (LKR)</th>
                      <th className="p-3">Subtotal Base</th>
                      <th className="p-3">Taxes Collected</th>
                      <th className="p-3">Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {branchRows.map(row => (
                      <tr key={row.month_key} className="hover:bg-white/5 transition">
                        <td className="p-3 font-semibold text-stone-200">{row.month_label}</td>
                        <td className="p-3 text-stone-300">{fmt(row.total_room_revenue)}</td>
                        <td className="p-3 text-amber-400">{fmt(row.total_service_revenue)}</td>
                        <td className="p-3 text-stone-400">{fmt(row.subtotal_base_revenue)}</td>
                        <td className="p-3 text-stone-400">{fmt(row.total_taxes_collected)}</td>
                        <td className="p-3 font-bold text-stone-100">{fmt(row.gross_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-stone-900/80 font-mono font-bold text-xs text-stone-200">
                      <td className="p-3">Annual Total</td>
                      <td className="p-3">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_room_revenue), 0))}
                      </td>
                      <td className="p-3 text-amber-400">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_service_revenue), 0))}
                      </td>
                      <td className="p-3 text-stone-400">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.subtotal_base_revenue), 0))}
                      </td>
                      <td className="p-3 text-stone-400">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_taxes_collected), 0))}
                      </td>
                      <td className="p-3 text-amber-400">{fmt(branchGross)}</td>
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
