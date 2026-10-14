'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react';
import { Btn, Empty, IconBtn, Loading, tbl } from '@/components/dashboard/ui';
import { LabeledSelect, Notice, StatStrip } from './report-ui';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';

// ── Report 4 — Monthly Revenue per Branch ─────────────────────────────────────
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
 * Formats a numeric value or numeric string as a currency amount.
 * @param v - Number or numeric string to format
 * @returns Formatted currency string (e.g. "$125,450.00")
 */
function fmt(v: string | number): string {
  const n = typeof v === 'string' ? toNum(v) : v;
  return '$' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

const MONTH_OPTIONS = [
  { value: "", label: "Full year" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function MonthlyRevenueReport({ selectedBranch: propBranch, year: propYear }: Props = {}) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedBranch, setSelectedBranch] = useState<string>(propBranch || '');
  const [year, setYear] = useState<number>(propYear || currentYear);
  const [month, setMonth] = useState<string>('');
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
      if (month) params.set('month', month);
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
  }, [year, month, selectedBranch]);

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
      `SkyNest_Monthly_Revenue_${year}${month ? '_' + (MONTH_OPTIONS.find(m => m.value === month)?.label || month) : ''}`,
      rows,
      [
        { header: 'Month', accessor: r => r.month_label },
        { header: 'Branch Name', accessor: r => r.branch_name },
        { header: 'Room Revenue ($)', accessor: r => toNum(r.total_room_revenue).toFixed(2) },
        { header: 'Service Revenue ($)', accessor: r => toNum(r.total_service_revenue).toFixed(2) },
        { header: 'Subtotal Base ($)', accessor: r => toNum(r.subtotal_base_revenue).toFixed(2) },
        { header: 'Taxes Collected ($)', accessor: r => toNum(r.total_taxes_collected).toFixed(2) },
        { header: 'Gross Revenue ($)', accessor: r => toNum(r.gross_revenue).toFixed(2) },
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
          reportPeriodStart: month ? `${year}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`,
          reportPeriodEnd: month ? `${year}-${String(month).padStart(2, '0')}-${new Date(year, Number(month), 0).getDate()}` : `${year}-12-31`,
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
  const monthLabel = MONTH_OPTIONS.find(m => m.value === month)?.label;
  const roomShare = totalRoom + totalService > 0 ? (totalRoom / (totalRoom + totalService)) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Filters and actions */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <LabeledSelect label="Branch" value={selectedBranch} onChange={setSelectedBranch}>
            <option value="">All branches</option>
            {branches.map(b => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name} · {b.city}
              </option>
            ))}
          </LabeledSelect>

          <LabeledSelect label="Year" value={String(year)} onChange={v => setYear(Number(v))}>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </LabeledSelect>

          <LabeledSelect label="Month" value={month} onChange={setMonth}>
            {MONTH_OPTIONS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </LabeledSelect>

          <IconBtn label="Refresh" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </IconBtn>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Btn onClick={handleExportCsv} disabled={!rows.length || loading}>
            <Download className="w-4 h-4" />
            Export CSV
          </Btn>
          <Btn onClick={handleSaveSnapshot} disabled={savingSnapshot || !rows.length || loading} loading={savingSnapshot}>
            {!savingSnapshot && <Save className="w-4 h-4" />}
            Save snapshot
          </Btn>
        </div>
      </div>

      {snapshotMsg && (
        <Notice tone={snapshotMsg.startsWith('Failed') ? 'error' : 'success'} onDismiss={() => setSnapshotMsg(null)}>
          {snapshotMsg}
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <StatStrip
        stats={[
          { label: month ? `${monthLabel} gross revenue` : 'Annual gross revenue', value: fmt(totalGross), sub: 'Including statutory taxes' },
          { label: 'Room tariff', value: fmt(totalRoom), sub: `${pct(totalRoom, totalGross - totalTax || 1)} of base revenue` },
          { label: 'Services', value: fmt(totalService), sub: `${pct(totalService, totalGross - totalTax || 1)} of base revenue` },
          { label: 'Statutory taxes', value: fmt(totalTax), sub: 'SC → TDL → SSCL → VAT' },
        ]}
      />

      {/* Room vs service split */}
      {totalGross > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ink" />
              Room tariff {pct(totalRoom, totalRoom + totalService)}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ink/30" />
              Services {pct(totalService, totalRoom + totalService)}
            </span>
          </div>
          <div className="flex h-1 rounded-full overflow-hidden bg-ink/30">
            <div className="bg-ink transition-[width] duration-300" style={{ width: `${roomShare}%` }} title="Room tariff" />
          </div>
        </div>
      )}

      {loading && rows.length === 0 && <Loading label="Loading revenue" />}

      {!loading && rows.length === 0 && !error && (
        <Empty>
          No revenue for {month ? `${monthLabel} ${year}` : year}. No settled invoices were recorded in this period.
        </Empty>
      )}

      {/* Branch breakdown */}
      {Object.entries(byBranch).map(([branchId, branchRows]) => {
        const branchGross = branchRows.reduce((s, r) => s + toNum(r.gross_revenue), 0);
        const branchName = branchRows[0]?.branch_name || 'Branch';
        const isOpen = !expanded.has(branchId); // default open

        return (
          <section key={branchId} className="space-y-4">
            <button
              type="button"
              onClick={() => toggleBranch(branchId)}
              aria-expanded={isOpen}
              className="group w-full flex items-end justify-between gap-4 pb-4 border-b border-skynest-hairline text-left"
            >
              <span className="font-cinzel text-[20px] md:text-[24px] leading-tight text-ink group-hover:text-skynest-accent transition-colors duration-300">
                {branchName}
              </span>
              <span className="flex items-center gap-4 font-jakarta text-[13px] text-ink/70 tabular-nums">
                <span>
                  {month ? 'Month gross' : 'Annual gross'} <span className="text-ink font-medium">{fmt(branchGross)}</span>
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {isOpen && (
              <div className={tbl.wrap}>
                <table className={`${tbl.table} min-w-[720px]`}>
                  <thead>
                    <tr className={tbl.headRow}>
                      <th className={tbl.th}>Month</th>
                      <th className={`${tbl.th} text-right`}>Room tariff</th>
                      <th className={`${tbl.th} text-right`}>Services</th>
                      <th className={`${tbl.th} text-right`}>Base</th>
                      <th className={`${tbl.th} text-right`}>Taxes</th>
                      <th className={`${tbl.th} text-right`}>Gross</th>
                    </tr>
                  </thead>
                  <tbody className={tbl.body}>
                    {branchRows.map(row => (
                      <tr key={row.month_key} className={tbl.row}>
                        <td className={`${tbl.td} font-medium whitespace-nowrap`}>{row.month_label}</td>
                        <td className={`${tbl.td} text-right tabular-nums`}>{fmt(row.total_room_revenue)}</td>
                        <td className={`${tbl.td} text-right tabular-nums`}>{fmt(row.total_service_revenue)}</td>
                        <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{fmt(row.subtotal_base_revenue)}</td>
                        <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{fmt(row.total_taxes_collected)}</td>
                        <td className={`${tbl.td} text-right tabular-nums font-medium`}>{fmt(row.gross_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-jakarta text-[13px] font-medium text-ink">
                      <td className="pt-4 pr-6">{month ? 'Month total' : 'Annual total'}</td>
                      <td className="pt-4 pr-6 text-right tabular-nums">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_room_revenue), 0))}
                      </td>
                      <td className="pt-4 pr-6 text-right tabular-nums">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_service_revenue), 0))}
                      </td>
                      <td className="pt-4 pr-6 text-right tabular-nums text-ink/70">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.subtotal_base_revenue), 0))}
                      </td>
                      <td className="pt-4 pr-6 text-right tabular-nums text-ink/70">
                        {fmt(branchRows.reduce((s, r) => s + toNum(r.total_taxes_collected), 0))}
                      </td>
                      <td className="pt-4 pr-6 text-right tabular-nums">{fmt(branchGross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
