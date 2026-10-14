'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Save, RefreshCw } from 'lucide-react';
import {
  Btn, Empty, IconBtn, Loading, SearchField, Segmented, StatusDot, fmtDay, tbl, titleCase,
} from '@/components/dashboard/ui';
import { LabeledSelect, Notice, StatStrip } from './report-ui';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';

// ── Report 2 — Guest Billing Summary & Unpaid Balances ───────────────────────
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
  return '$' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All invoices' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'SETTLED', label: 'Settled' },
] as const;

const AGING_OPTIONS = [
  { value: null, label: 'All' },
  { value: 30, label: 'Over 30 days' },
  { value: 60, label: 'Over 60 days' },
  { value: 90, label: 'Over 90 days' },
] as const;

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
        { header: 'Base Amount ($)', accessor: r => toNum(r.base_amount).toFixed(2) },
        { header: 'Total Invoiced ($)', accessor: r => toNum(r.total_amount).toFixed(2) },
        { header: 'Total Paid ($)', accessor: r => toNum(r.total_paid).toFixed(2) },
        { header: 'Balance Due ($)', accessor: r => toNum(r.balance_due).toFixed(2) },
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

  const agingValue = agingDays === null ? 'ALL' : String(agingDays);

  return (
    <div className="space-y-8">
      {/* Filters and actions */}
      <div className="no-print space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <LabeledSelect label="Branch" value={branchId} onChange={setBranchId}>
              <option value="">All branches</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} · {b.city}
                </option>
              ))}
            </LabeledSelect>

            <LabeledSelect label="Status" value={status} onChange={setStatus}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70 whitespace-nowrap">
              Debtor aging
            </span>
            <Segmented
              value={agingValue}
              onChange={v => setAgingDays(v === 'ALL' ? null : Number(v))}
              options={AGING_OPTIONS.map(o => ({ value: o.value === null ? 'ALL' : String(o.value), label: o.label }))}
            />
          </div>
          <div onKeyDown={e => e.key === 'Enter' && loadData()}>
            <SearchField value={search} onChange={setSearch} placeholder="Search guest, booking or room" />
          </div>
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
          { label: 'Total invoiced', value: fmt(totalInvoiced) },
          { label: 'Collected', value: fmt(totalCollected) },
          { label: 'Outstanding', value: fmt(totalOutstanding), tone: totalOutstanding > 0 ? 'alert' : 'default' },
          {
            label: 'Overdue invoices',
            value: String(aging30),
            sub: `${aging60} over 60 days · ${aging90} over 90 days`,
            tone: aging90 > 0 ? 'alert' : 'default',
          },
        ]}
      />

      {loading && rows.length === 0 && <Loading label="Loading invoices" />}

      {!loading && rows.length === 0 && !error && (
        <Empty>No matching invoices. Try a different status or aging filter.</Empty>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className={tbl.wrap}>
            <table className={`${tbl.table} min-w-[1024px]`}>
              <thead>
                <tr className={tbl.headRow}>
                  <th className={tbl.th}>Status</th>
                  <th className={tbl.th}>Booking</th>
                  <th className={tbl.th}>Guest</th>
                  <th className={tbl.th}>Branch</th>
                  <th className={`${tbl.th} text-right`}>Base</th>
                  <th className={`${tbl.th} text-right`}>Invoiced</th>
                  <th className={`${tbl.th} text-right`}>Paid</th>
                  <th className={`${tbl.th} text-right`}>Balance</th>
                  <th className={tbl.th}>Date</th>
                  <th className={`${tbl.th} text-right`}>Age</th>
                </tr>
              </thead>
              <tbody className={tbl.body}>
                {rows.map(row => {
                  const balance = toNum(row.balance_due);
                  return (
                    <tr key={row.invoice_id} className={tbl.row}>
                      <td className={tbl.td}>
                        <StatusDot status={row.computed_status} label={titleCase(row.computed_status)} />
                      </td>
                      <td className={`${tbl.td} font-medium whitespace-nowrap tabular-nums`}>{row.booking_reference}</td>
                      <td className={`${tbl.td} max-w-[240px]`}>
                        <p className="truncate">{row.guest_name.trim() || '—'}</p>
                        {row.guest_email && <p className={`${tbl.sub} truncate`}>{row.guest_email}</p>}
                      </td>
                      <td className={`${tbl.td} whitespace-nowrap`}>
                        {row.branch_name}
                        {row.room_numbers && <p className={tbl.sub}>Rooms {row.room_numbers}</p>}
                      </td>
                      <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap text-ink/70`}>{fmt(row.base_amount)}</td>
                      <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap`}>{fmt(row.total_amount)}</td>
                      <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap`}>{fmt(row.total_paid)}</td>
                      <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap font-medium ${balance > 0 ? 'text-red-700' : 'text-ink/50'}`}>
                        {balance > 0 ? fmt(row.balance_due) : '—'}
                      </td>
                      <td className={`${tbl.td} whitespace-nowrap tabular-nums`}>{fmtDay(row.invoice_date)}</td>
                      <td
                        className={`${tbl.td} text-right tabular-nums whitespace-nowrap ${
                          row.aging_days > 90 ? 'text-red-700 font-medium' : row.aging_days > 30 ? 'font-medium' : 'text-ink/70'
                        }`}
                      >
                        {row.aging_days}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between font-jakarta text-[12px] text-ink/70 tabular-nums">
            <span>{rows.length} invoice{rows.length !== 1 ? 's' : ''}</span>
            <span>Outstanding {fmt(totalOutstanding)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
