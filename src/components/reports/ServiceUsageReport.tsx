'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Sparkles, Download, Save, RefreshCw, Search, Building2, 
  Calendar, Layers, DollarSign, Bed, FileText, Printer, CheckCircle2, AlertCircle
} from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';
import { exportToWord } from '@/lib/export-doc';

export interface ServiceUsageReportRow {
  category: string;
  service_name: string;
  room_number: string;
  branch_name: string;
  orders_count: number;
  total_quantity: number;
  avg_unit_price: number;
  total_service_revenue: number;
  first_used: string | Date;
  last_used: string | Date;
}

interface BranchOption {
  branch_id: string;
  branch_name: string;
  city: string;
}

const CATEGORIES = [
  'ALL',
  'Dining',
  'Wellness',
  'Transport',
  'Experience',
  'Housekeeping',
] as const;

function fmt(v: string | number): string {
  const n = typeof v === 'string' ? toNum(v) : v;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ServiceUsageReport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const defaultStart = `${year}-${month}-01`;

  const [branchId, setBranchId] = useState<string>('');
  const [category, setCategory] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'LEDGER' | 'BY_ROOM'>('LEDGER');

  const [rows, setRows] = useState<ServiceUsageReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState<boolean>(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Fetch branch options
  useEffect(() => {
    let isMounted = true;
    apiFetch<{ data?: BranchOption[] }>('/api/v1/branches')
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res)) setBranches(res);
        else if (res && Array.isArray(res.data)) setBranches(res.data);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (category && category !== 'ALL') params.set('category', category);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await apiFetch<{ success: boolean; data: ServiceUsageReportRow[] }>(
        `/api/v1/reports/services/usage?${params.toString()}`
      );

      if (res && res.data) {
        setRows(res.data);
      } else if (Array.isArray(res)) {
        setRows(res);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to retrieve service usage breakdown.');
    } finally {
      setLoading(false);
    }
  }, [branchId, category, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side room search filter
  const filteredRows = useMemo(() => {
    if (!roomFilter.trim()) return rows;
    const term = roomFilter.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.room_number && r.room_number.toLowerCase().includes(term)) ||
        (r.service_name && r.service_name.toLowerCase().includes(term))
    );
  }, [rows, roomFilter]);

  // Aggregate KPI metrics
  const totals = useMemo(() => {
    let totalOrders = 0;
    let totalQuantity = 0;
    let totalRevenue = 0;
    const uniqueRooms = new Set<string>();

    for (const r of filteredRows) {
      totalOrders += Number(r.orders_count || 0);
      totalQuantity += Number(r.total_quantity || 0);
      totalRevenue += Number(r.total_service_revenue || 0);
      if (r.room_number) uniqueRooms.add(r.room_number);
    }

    return {
      totalOrders,
      totalQuantity,
      totalRevenue,
      roomCount: uniqueRooms.size,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [filteredRows]);

  // Grouped by room
  const rowsByRoom = useMemo(() => {
    const map = new Map<string, { roomNumber: string; branchName: string; totalRevenue: number; items: ServiceUsageReportRow[] }>();
    for (const r of filteredRows) {
      const roomKey = r.room_number || 'Unassigned';
      if (!map.has(roomKey)) {
        map.set(roomKey, {
          roomNumber: roomKey,
          branchName: r.branch_name || 'Sanctuary',
          totalRevenue: 0,
          items: [],
        });
      }
      const entry = map.get(roomKey)!;
      entry.totalRevenue += Number(r.total_service_revenue || 0);
      entry.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredRows]);

  // CSV Export
  const handleExportCsv = () => {
    exportToCsv(
      `Service_Usage_Report_${startDate}_to_${endDate}`,
      filteredRows,
      [
        { header: 'Room Number', accessor: (r) => r.room_number },
        { header: 'Service Name', accessor: (r) => r.service_name },
        { header: 'Category', accessor: (r) => r.category },
        { header: 'Branch', accessor: (r) => r.branch_name },
        { header: 'Orders Count', accessor: (r) => r.orders_count },
        { header: 'Total Quantity', accessor: (r) => r.total_quantity },
        { header: 'Avg Unit Price ($)', accessor: (r) => Number(r.avg_unit_price).toFixed(2) },
        { header: 'Total Revenue ($)', accessor: (r) => Number(r.total_service_revenue).toFixed(2) },
        { header: 'First Used', accessor: (r) => r.first_used ? new Date(r.first_used).toLocaleDateString() : '' },
        { header: 'Last Used', accessor: (r) => r.last_used ? new Date(r.last_used).toLocaleDateString() : '' },
      ]
    );
  };

  // Word (.doc) Export
  const handleExportWord = () => {
    const kpiHtml = `
      <table class="kpi-table">
        <tr>
          <td><div class="kpi-label">Total Ancillary Revenue</div><div class="kpi-val">${fmt(totals.totalRevenue)}</div></td>
          <td><div class="kpi-label">Total Service Orders</div><div class="kpi-val">${totals.totalOrders.toLocaleString()}</div></td>
          <td><div class="kpi-label">Units Consumed</div><div class="kpi-val">${totals.totalQuantity.toLocaleString()}</div></td>
          <td><div class="kpi-label">Serviced Rooms</div><div class="kpi-val">${totals.roomCount} Rooms</div></td>
        </tr>
      </table>
    `;

    const tableRows = filteredRows.map(r => `
      <tr>
        <td><strong>Room ${r.room_number}</strong></td>
        <td>${r.service_name}</td>
        <td>${r.category}</td>
        <td>${r.branch_name}</td>
        <td style="text-align:center;">${r.orders_count}</td>
        <td style="text-align:center;">${r.total_quantity}</td>
        <td style="text-align:right;">${fmt(r.avg_unit_price)}</td>
        <td style="text-align:right;font-weight:bold;">${fmt(r.total_service_revenue)}</td>
      </tr>
    `).join('');

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Service Name</th>
            <th>Category</th>
            <th>Branch</th>
            <th style="text-align:center;">Orders</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    exportToWord(
      `Service_Usage_Report_${startDate}_to_${endDate}`,
      'Service Usage Breakdown per Room & Service Type',
      `Period: ${startDate} to ${endDate} | Category: ${category}`,
      tableHtml,
      kpiHtml
    );
  };

  // Save Snapshot for Audit Ledger (Rule B17)
  const handleSaveSnapshot = async () => {
    setSavingSnapshot(true);
    setSnapshotMsg(null);
    try {
      await apiFetch('/api/v1/reports/snapshots', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'SERVICES',
          reportPeriodStart: startDate,
          reportPeriodEnd: endDate,
          branchId: branchId || null,
          reportData: {
            filters: { branchId, category, startDate, endDate },
            totals,
            rows: filteredRows,
          },
        }),
      });
      setSnapshotMsg('Snapshot archived successfully to the audit ledger.');
      setTimeout(() => setSnapshotMsg(null), 5000);
    } catch (e: any) {
      setSnapshotMsg(`Failed to archive snapshot: ${e?.message || 'Server error'}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Filter & Command Toolbar (Hidden on Print) ────────────────────── */}
      <div className="no-print space-y-4 bg-stone-950/80 p-5 border border-white/10 text-stone-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Selector */}
            <div className="flex items-center gap-2 bg-stone-900 border border-white/10 px-3 py-1.5 text-xs">
              <Building2 size={14} className="text-amber-400" />
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-stone-900 text-stone-200">All Branches</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id} className="bg-stone-900 text-stone-200">
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-2 bg-stone-900 border border-white/10 px-3 py-1.5 text-xs">
              <Layers size={14} className="text-amber-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-stone-900 text-stone-200">
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 bg-stone-900 border border-white/10 px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-amber-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none text-xs"
              />
              <span className="text-stone-500">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none text-xs"
              />
            </div>

            {/* Room Filter Search */}
            <div className="flex items-center gap-2 bg-stone-900 border border-white/10 px-3 py-1.5 text-xs">
              <Search size={14} className="text-stone-400" />
              <input
                type="text"
                placeholder="Search Room / Service..."
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none text-xs placeholder:text-stone-500 w-36"
              />
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-stone-900 border border-white/10 hover:border-amber-500/50 text-stone-300 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('LEDGER')}
                className={`px-2.5 py-1.5 transition-colors ${
                  viewMode === 'LEDGER' ? 'bg-amber-500 text-stone-950 font-semibold' : 'bg-stone-900 text-stone-300 hover:text-white'
                }`}
              >
                Ledger Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('BY_ROOM')}
                className={`px-2.5 py-1.5 transition-colors ${
                  viewMode === 'BY_ROOM' ? 'bg-amber-500 text-stone-950 font-semibold' : 'bg-stone-900 text-stone-300 hover:text-white'
                }`}
              >
                By Room
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-900 hover:bg-stone-800 border border-white/20 text-stone-200 hover:text-white font-medium transition-colors"
              title="Print cleanly to paper or PDF"
            >
              <Printer size={13} className="text-amber-400" />
              Print / PDF
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-900 hover:bg-stone-800 border border-white/20 text-stone-200 hover:text-white font-medium transition-colors disabled:opacity-40"
              title="Download Microsoft Word .doc file"
            >
              <FileText size={13} className="text-blue-400" />
              Word (.doc)
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-900 hover:bg-stone-800 border border-white/20 text-stone-200 hover:text-white font-medium transition-colors disabled:opacity-40"
              title="Download RFC 4180 CSV"
            >
              <Download size={13} className="text-emerald-400" />
              CSV
            </button>

            <button
              type="button"
              onClick={handleSaveSnapshot}
              disabled={savingSnapshot || filteredRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium transition-colors disabled:opacity-40"
              title="Save snapshot to audit ledger"
            >
              <Save size={13} />
              {savingSnapshot ? 'Archiving...' : 'Save Snapshot'}
            </button>
          </div>
        </div>

        {snapshotMsg && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
            <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
            <span>{snapshotMsg}</span>
          </div>
        )}
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-card">
        <div className="bg-stone-950/70 border border-white/10 p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Total Ancillary Revenue</span>
            <DollarSign size={14} className="text-amber-400" />
          </div>
          <div className="font-cinzel text-xl md:text-2xl font-bold text-amber-400">
            {fmt(totals.totalRevenue)}
          </div>
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block mt-1">
            Net Ancillary Folio Total
          </span>
        </div>

        <div className="bg-stone-950/70 border border-white/10 p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Total Orders Placed</span>
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <div className="font-cinzel text-xl md:text-2xl font-bold text-stone-200">
            {totals.totalOrders.toLocaleString()}
          </div>
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block mt-1">
            Avg Order: {fmt(totals.avgOrderValue)}
          </span>
        </div>

        <div className="bg-stone-950/70 border border-white/10 p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Total Units Consumed</span>
            <Layers size={14} className="text-amber-400" />
          </div>
          <div className="font-cinzel text-xl md:text-2xl font-bold text-stone-200">
            {totals.totalQuantity.toLocaleString()}
          </div>
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block mt-1">
            Items & Treatments Delivered
          </span>
        </div>

        <div className="bg-stone-950/70 border border-white/10 p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Serviced Guest Rooms</span>
            <Bed size={14} className="text-amber-400" />
          </div>
          <div className="font-cinzel text-xl md:text-2xl font-bold text-stone-200">
            {totals.roomCount}
          </div>
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block mt-1">
            Distinct Rooms with Folio Activity
          </span>
        </div>
      </div>

      {/* ── Content View ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-stone-400 text-xs flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-amber-400" />
          <span>Calculating granular service consumption across rooms...</span>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-16 text-center text-stone-500 text-xs bg-stone-950/40 border border-white/5">
          <p className="font-cinzel text-base text-stone-400 mb-1">No Service Usage Recorded</p>
          <p>No ancillary folio charges match the specified branch, date range, and category criteria.</p>
        </div>
      ) : viewMode === 'BY_ROOM' ? (
        /* ── Grouped By Room View ────────────────────────────────────────── */
        <div className="space-y-4">
          {rowsByRoom.map((group) => (
            <div key={group.roomNumber} className="bg-stone-950/70 border border-white/10 p-4 print-card">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-sm font-bold">
                    Room {group.roomNumber}
                  </div>
                  <div className="text-xs text-stone-400">
                    {group.branchName} · {group.items.length} service item{group.items.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-cinzel text-base font-bold text-amber-400">
                    {fmt(group.totalRevenue)}
                  </div>
                  <span className="text-[9px] text-stone-500 uppercase tracking-wider">Room Total</span>
                </div>
              </div>

              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900/60 text-[10px] uppercase tracking-wider text-stone-400">
                    <tr>
                      <th className="py-2 px-3">Service Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-center">Orders</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Avg Unit Rate</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {group.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-medium text-stone-200">{item.service_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-stone-900 border border-white/10 rounded text-stone-300">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{item.orders_count}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{item.total_quantity}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{fmt(item.avg_unit_price)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-400">
                          {fmt(item.total_service_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Full Ledger Table View ───────────────────────────────────────── */
        <div className="overflow-x-auto border border-white/10 bg-stone-950/60 print-card">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-900/80 text-[10px] uppercase tracking-wider text-stone-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Service Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Sanctuary Branch</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Avg Price</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Last Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">
                    Rm {row.room_number}
                  </td>
                  <td className="py-3 px-4 font-medium text-stone-200">
                    {row.service_name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-stone-900 border border-white/10 rounded text-stone-300">
                      {row.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-400">
                    {row.branch_name}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {row.orders_count}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {row.total_quantity}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-stone-400">
                    {fmt(row.avg_unit_price)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold text-stone-100">
                    {fmt(row.total_service_revenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-[11px] text-stone-500 tabular-nums">
                    {row.last_used ? new Date(row.last_used).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
