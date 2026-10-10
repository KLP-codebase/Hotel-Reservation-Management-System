'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Receipt, AlertTriangle, CheckCircle2, Clock, Search, Download, Save, AlertCircle, Building2, RefreshCw } from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';

// ── Person 1 Workspace: Report 2 — Guest Billing Summary & Unpaid Balances ───
// Endpoint: GET /api/v1/reports/revenue/billing-summary?status=...&agingDays=...&search=...&branchId=...
// Highlights debtor aging (>30d, >60d, >90d), unpaid and partially paid balances.

export interface BillingSummaryRow {
  invoice_id: string;
  booking_reference: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  branch_name: string;
  room_numbers: string | null;
  base_amount: string;
  service_charge_tax: string;
  tdl_amount: string;
  sscl_amount: string;
  vat_amount: string;
  total_amount: string;
  total_paid: string;
  balance_due: string;
  invoice_date: string;
  aging_days: number;
  computed_status: 'SETTLED' | 'PARTIALLY_PAID' | 'UNPAID';
}

interface Props {
  selectedBranch?: string;
}

function fmt(v: string | number): string {
  const n = typeof v === 'string' ? toNum(v) : v;
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Invoices' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'SETTLED', label: 'Settled' },
] as const;

const AGING_OPTIONS = [
  { value: null, label: 'All Ages' },
  { value: 30, label: '>30 Days' },
  { value: 60, label: '>60 Days' },
  { value: 90, label: '>90 Days' },
] as const;

/**
 * StatusBadge Component
 * 
 * Renders a color-coded status badge with an accompanying icon:
 * - SETTLED: Emerald badge for fully settled invoices
 * - PARTIALLY_PAID: Amber badge for invoices with recorded partial payments
 * - UNPAID: Rose badge for folios with zero customer payments recorded
 */
function StatusBadge({ status }: { status: BillingSummaryRow['computed_status'] }) {
  const cfg = {
    SETTLED: { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 size={12} />, label: 'Settled' },
    PARTIALLY_PAID: { cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <Clock size={12} />, label: 'Partially Paid' },
    UNPAID: { cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: <AlertTriangle size={12} />, label: 'Unpaid' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function BillingSummaryReport({ selectedBranch: propBranch }: Props = {}) {
  const [branchId, setBranchId] = useState<string>(propBranch || '');
  const [status, setStatus] = useState<string>('ALL');
  const [agingDays, setAgingDays] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [rows, setRows] = useState<BillingSummaryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState<boolean>(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ branch_id: string; branch_name: string; city: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiFetch<{ data?: { branch_id: string; branch_name: string; city: string }[] }>("/api/v1/branches")
      .then(res => {
        if (!isMounted) return;
        if (Array.isArray(res)) setBranches(res);
        else if (res && Array.isArray(res.data)) setBranches(res.data);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (propBranch !== undefined) setBranchId(propBranch);
  }, [propBranch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status });
      if (branchId) params.set('branchId', branchId);
      if (agingDays !== null) params.set('agingDays', String(agingDays));
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<{ success: boolean; data: BillingSummaryRow[] }>(
        `/api/v1/reports/revenue/billing-summary?${params.toString()}`
      );
      if (res && res.data) {
        setRows(res.data);
      } else if (Array.isArray(res)) {
        setRows(res);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load guest billing summary data.');
    } finally {
      setLoading(false);
    }
  }, [status, agingDays, search, branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalInvoiced = useMemo(() => rows.reduce((s, r) => s + toNum(r.total_amount), 0), [rows]);
  const totalCollected = useMemo(() => rows.reduce((s, r) => s + toNum(r.total_paid), 0), [rows]);
  const totalOutstanding = useMemo(() => rows.reduce((s, r) => s + Math.max(0, toNum(r.balance_due)), 0), [rows]);

  const aging30 = useMemo(() => rows.filter(r => r.computed_status !== 'SETTLED' && r.aging_days > 30).length, [rows]);
  const aging60 = useMemo(() => rows.filter(r => r.computed_status !== 'SETTLED' && r.aging_days > 60).length, [rows]);
  const aging90 = useMemo(() => rows.filter(r => r.computed_status !== 'SETTLED' && r.aging_days > 90).length, [rows]);

  const handleExportCsv = () => {
    if (!rows.length) return;
    exportToCsv(
      'SkyNest_Billing_Summary_Debtors',
      rows,
      [
        { header: 'Booking Ref', accessor: r => r.booking_reference },
        { header: 'Guest Name', accessor: r => r.guest_name },
        { header: 'Guest Email', accessor: r => r.guest_email || '' },
        { header: 'Guest Phone', accessor: r => r.guest_phone || '' },
        { header: 'Branch Name', accessor: r => r.branch_name },
        { header: 'Rooms', accessor: r => r.room_numbers || '' },
        { header: 'Base Amount (LKR)', accessor: r => toNum(r.base_amount).toFixed(2) },
        { header: 'Total Invoiced (LKR)', accessor: r => toNum(r.total_amount).toFixed(2) },
        { header: 'Total Paid (LKR)', accessor: r => toNum(r.total_paid).toFixed(2) },
        { header: 'Balance Due (LKR)', accessor: r => toNum(r.balance_due).toFixed(2) },
        { header: 'Invoice Date', accessor: r => r.invoice_date?.split('T')[0] || '' },
        { header: 'Debtor Aging (Days)', accessor: r => r.aging_days },
        { header: 'Status', accessor: r => r.computed_status },
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
          reportType: 'BILLING_SUMMARY',
          reportPeriodStart: new Date().toISOString().split('T')[0],
          reportPeriodEnd: new Date().toISOString().split('T')[0],
          branchId: branchId || null,
          reportData: {
            status,
            agingDays,
            totalInvoiced,
            totalCollected,
            totalOutstanding,
            records: rows,
          },
        }),
      });
      setSnapshotMsg('Billing summary snapshot archived into audit ledger (Rule B17).');
    } catch (err: any) {
      setSnapshotMsg(`Failed to archive snapshot: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter and control bar */}
      <div className="space-y-3 bg-stone-950/70 border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Filter */}
            <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
              <Building2 size={14} className="text-amber-400 shrink-0" />
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
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

            {/* Status dropdown */}
            <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
              <Receipt size={14} className="text-amber-400 shrink-0" />
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-stone-900 text-stone-200">
                    {o.label}
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

        {/* Debtor Aging filter chips & search */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-stone-400 uppercase">Debtor Aging:</span>
            <div className="flex items-center gap-1">
              {AGING_OPTIONS.map(o => (
                <button
                  key={String(o.value)}
                  onClick={() => setAgingDays(o.value)}
                  className={`px-2.5 py-1 text-[11px] font-mono border transition ${
                    agingDays === o.value
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-semibold'
                      : 'border-white/10 text-stone-400 hover:border-white/20 hover:text-stone-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1 w-full max-w-xs">
            <Search size={13} className="text-stone-400 shrink-0" />
            <input
              type="text"
              placeholder="Search guest, booking ref, room..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadData()}
              className="bg-transparent text-stone-200 text-xs w-full focus:outline-none placeholder:text-stone-500 font-mono"
            />
          </div>
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
          { label: 'Total Invoiced (LKR)', value: fmt(totalInvoiced), accent: false },
          { label: 'Settled Payments (LKR)', value: fmt(totalCollected), accent: false },
          { label: 'Outstanding Arrears (LKR)', value: fmt(totalOutstanding), accent: totalOutstanding > 0 },
          {
            label: 'Debtor Aging Status',
            value: `${aging30} >30d · ${aging60} >60d · ${aging90} >90d`,
            accent: aging90 > 0,
            small: true,
          },
        ].map(({ label, value, accent, small }) => (
          <div
            key={label}
            className={`p-4 border ${accent ? 'border-rose-500/40 bg-rose-950/30' : 'border-white/10 bg-stone-950/70'}`}
          >
            <div className="text-[11px] uppercase tracking-widest font-mono text-stone-400 mb-2">{label}</div>
            <div className={`font-cinzel font-bold text-stone-100 ${small ? 'text-sm' : 'text-lg'}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && rows.length === 0 && !error && (
        <div className="py-16 text-center border border-white/10 bg-stone-950/50">
          <Receipt size={32} className="mx-auto mb-3 text-stone-600" />
          <p className="font-cinzel italic text-stone-200 text-base">No matching invoices found</p>
          <p className="text-stone-400 text-xs mt-1">Try adjusting the status or debtor aging filters.</p>
        </div>
      )}

      {/* Data Table */}
      {rows.length > 0 && (
        <div className="border border-white/10 bg-stone-950/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-stone-900/50 text-[10px] uppercase font-mono tracking-wider text-stone-400">
                  <th className="p-3">Status</th>
                  <th className="p-3">Booking Ref</th>
                  <th className="p-3">Guest</th>
                  <th className="p-3">Branch / Rooms</th>
                  <th className="p-3">Base</th>
                  <th className="p-3">Total Invoiced</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Balance Due</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Aging</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {rows.map(row => (
                  <tr key={row.invoice_id} className="hover:bg-white/5 transition">
                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge status={row.computed_status} />
                    </td>
                    <td className="p-3 text-amber-300 font-semibold whitespace-nowrap">
                      {row.booking_reference}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-stone-200">{row.guest_name.trim() || '—'}</div>
                      {row.guest_email && <div className="text-[10px] text-stone-400">{row.guest_email}</div>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-stone-300">{row.branch_name}</div>
                      {row.room_numbers && <div className="text-[10px] text-stone-500">Rooms: {row.room_numbers}</div>}
                    </td>
                    <td className="p-3 text-stone-400 whitespace-nowrap">{fmt(row.base_amount)}</td>
                    <td className="p-3 font-semibold text-stone-200 whitespace-nowrap">{fmt(row.total_amount)}</td>
                    <td className="p-3 text-emerald-400 whitespace-nowrap">{fmt(row.total_paid)}</td>
                    <td className={`p-3 font-bold whitespace-nowrap ${toNum(row.balance_due) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {toNum(row.balance_due) > 0 ? fmt(row.balance_due) : '—'}
                    </td>
                    <td className="p-3 text-stone-400 whitespace-nowrap">
                      {row.invoice_date?.split('T')[0] || '—'}
                    </td>
                    <td className={`p-3 font-bold whitespace-nowrap ${
                      row.aging_days > 90 ? 'text-rose-400'
                      : row.aging_days > 60 ? 'text-orange-400'
                      : row.aging_days > 30 ? 'text-amber-400'
                      : 'text-stone-400'
                    }`}>
                      {row.aging_days}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-stone-900/60 border-t border-white/5 flex items-center justify-between text-xs text-stone-400 font-mono">
            <span>Displaying {rows.length} invoice record{rows.length !== 1 ? 's' : ''}</span>
            <span>Total Outstanding: {fmt(totalOutstanding)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
