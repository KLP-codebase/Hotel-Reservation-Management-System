'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Save, RefreshCw, FileText } from 'lucide-react';
import {
  Btn, Empty, IconBtn, Loading, SearchField, Segmented, fmtDay, tbl,
} from '@/components/dashboard/ui';
import { DateFilter, LabeledSelect, Notice, ReportPanel, StatStrip, Tag } from './report-ui';
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
    <div className="space-y-8">
      {/* Filters and actions (hidden on print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <LabeledSelect label="Branch" value={branchId} onChange={setBranchId}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name}
                </option>
              ))}
            </LabeledSelect>

            <LabeledSelect label="Category" value={category} onChange={setCategory}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All categories' : cat}
                </option>
              ))}
            </LabeledSelect>

            <DateFilter label="From" value={startDate} onChange={setStartDate} max={endDate || undefined} />
            <DateFilter label="To" value={endDate} onChange={setEndDate} min={startDate || undefined} />

            <IconBtn label="Refresh" variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </IconBtn>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Btn onClick={handleExportWord} disabled={filteredRows.length === 0} title="Download a Word (.doc) file">
              <FileText className="w-4 h-4" />
              Word
            </Btn>
            <Btn onClick={handleExportCsv} disabled={filteredRows.length === 0} title="Download a CSV file">
              <Download className="w-4 h-4" />
              CSV
            </Btn>
            <Btn onClick={handleSaveSnapshot} disabled={savingSnapshot || filteredRows.length === 0} loading={savingSnapshot}>
              {!savingSnapshot && <Save className="w-4 h-4" />}
              Save snapshot
            </Btn>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'LEDGER', label: 'Ledger' },
              { value: 'BY_ROOM', label: 'By room' },
            ]}
          />
          <SearchField value={roomFilter} onChange={setRoomFilter} placeholder="Search room or service" />
        </div>

        {snapshotMsg && (
          <Notice tone={snapshotMsg.startsWith('Failed') ? 'error' : 'success'} onDismiss={() => setSnapshotMsg(null)}>
            {snapshotMsg}
          </Notice>
        )}
      </div>

      <div>
        <StatStrip
          stats={[
            { label: 'Service revenue', value: fmt(totals.totalRevenue), sub: 'Ancillary folio total' },
            { label: 'Orders', value: totals.totalOrders.toLocaleString(), sub: `Average ${fmt(totals.avgOrderValue)}` },
            { label: 'Units delivered', value: totals.totalQuantity.toLocaleString(), sub: 'Items and treatments' },
            { label: 'Rooms served', value: String(totals.roomCount), sub: 'Rooms with folio activity' },
          ]}
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <Loading label="Calculating service usage" />
      ) : filteredRows.length === 0 ? (
        <Empty>No service charges match this branch, date range and category.</Empty>
      ) : viewMode === 'BY_ROOM' ? (
        /* Grouped by room */
        <div className="space-y-12">
          {rowsByRoom.map((group) => (
            <ReportPanel
              key={group.roomNumber}
              title={`Room ${group.roomNumber}`}
              sub={`${group.branchName} · ${group.items.length} service item${group.items.length === 1 ? '' : 's'}`}
              aside={
                <p className="font-jakarta text-[13px] text-ink/70 tabular-nums">
                  Room total <span className="font-cinzel text-[20px] text-ink">{fmt(group.totalRevenue)}</span>
                </p>
              }
            >
              <div className={tbl.wrap}>
                <table className={`${tbl.table} min-w-[640px]`}>
                  <thead>
                    <tr className={tbl.headRow}>
                      <th className={tbl.th}>Service</th>
                      <th className={tbl.th}>Category</th>
                      <th className={`${tbl.th} text-right`}>Orders</th>
                      <th className={`${tbl.th} text-right`}>Qty</th>
                      <th className={`${tbl.th} text-right`}>Avg rate</th>
                      <th className={`${tbl.th} text-right`}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className={tbl.body}>
                    {group.items.map((item, idx) => (
                      <tr key={idx} className={tbl.row}>
                        <td className={`${tbl.td} font-medium`}>{item.service_name}</td>
                        <td className={tbl.td}><Tag>{item.category}</Tag></td>
                        <td className={`${tbl.td} text-right tabular-nums`}>{item.orders_count}</td>
                        <td className={`${tbl.td} text-right tabular-nums`}>{item.total_quantity}</td>
                        <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{fmt(item.avg_unit_price)}</td>
                        <td className={`${tbl.td} text-right tabular-nums font-medium`}>{fmt(item.total_service_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportPanel>
          ))}
        </div>
      ) : (
        /* Full ledger */
        <div className={tbl.wrap}>
          <table className={`${tbl.table} min-w-[960px]`}>
            <thead>
              <tr className={tbl.headRow}>
                <th className={tbl.th}>Room</th>
                <th className={tbl.th}>Service</th>
                <th className={tbl.th}>Category</th>
                <th className={tbl.th}>Branch</th>
                <th className={`${tbl.th} text-right`}>Orders</th>
                <th className={`${tbl.th} text-right`}>Qty</th>
                <th className={`${tbl.th} text-right`}>Avg price</th>
                <th className={`${tbl.th} text-right`}>Revenue</th>
                <th className={`${tbl.th} text-right`}>Last used</th>
              </tr>
            </thead>
            <tbody className={tbl.body}>
              {filteredRows.map((row, idx) => (
                <tr key={idx} className={tbl.row}>
                  <td className={`${tbl.td} font-cinzel text-[18px] tabular-nums whitespace-nowrap`}>{row.room_number}</td>
                  <td className={`${tbl.td} font-medium`}>{row.service_name}</td>
                  <td className={tbl.td}><Tag>{row.category}</Tag></td>
                  <td className={`${tbl.td} text-ink/70`}>{row.branch_name}</td>
                  <td className={`${tbl.td} text-right tabular-nums`}>{row.orders_count}</td>
                  <td className={`${tbl.td} text-right tabular-nums`}>{row.total_quantity}</td>
                  <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{fmt(row.avg_unit_price)}</td>
                  <td className={`${tbl.td} text-right tabular-nums font-medium`}>{fmt(row.total_service_revenue)}</td>
                  <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap text-ink/70`}>
                    {row.last_used ? fmtDay(String(row.last_used)) : '—'}
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
