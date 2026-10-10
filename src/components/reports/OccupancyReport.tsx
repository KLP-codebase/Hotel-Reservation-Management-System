'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';
import { ReportFilterBar } from './ReportFilterBar';
import { BedDouble, CheckCircle2, TrendingUp, AlertCircle, Save, Calendar } from 'lucide-react';

interface DailyRow {
  day: string;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  occupancy_rate: number;
}

interface OccupancySummary {
  period_start: string;
  period_end: string;
  total_days: number;
  total_capacity_room_nights: number;
  total_occupied_room_nights: number;
  avg_occupancy_rate: number;
  peak_occupancy_day: string | null;
  peak_occupancy_rate: number;
}

interface OccupancyApiResponse {
  success: boolean;
  data: {
    summary: OccupancySummary;
    daily: DailyRow[];
  };
}

export function OccupancyReport() {
  // Current local date (YYYY-MM-DD)
  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Default start date: 1st of current month
  const defaultStart = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }, []);

  const [branchId, setBranchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(today);

  const [loading, setLoading] = useState<boolean>(true);
  const [savingSnapshot, setSavingSnapshot] = useState<boolean>(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [data, setData] = useState<OccupancyApiResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    // Validation guards: no inverted ranges, no future dates
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    if (endDate > today) {
      setError('Dates beyond today cannot be selected.');
      return;
    }

    setLoading(true);
    setError(null);
    setSnapshotMsg(null);
    try {
      const q = new URLSearchParams();
      if (branchId) q.set('branchId', branchId);
      q.set('startDate', startDate);
      q.set('endDate', endDate);

      const res = await apiFetch<OccupancyApiResponse>(`/api/v1/reports/occupancy?${q.toString()}`);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load occupancy report');
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate, today]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    if (!data || !data.daily.length) return;
    exportToCsv(
      `SkyNest_Room_Occupancy_${startDate}_to_${endDate}`,
      data.daily,
      [
        { header: 'Date', accessor: d => d.day },
        { header: 'Total Capacity', accessor: d => d.total_rooms },
        { header: 'Occupied Rooms', accessor: d => d.occupied_rooms },
        { header: 'Vacant Rooms', accessor: d => d.vacant_rooms },
        { header: 'Occupancy Rate (%)', accessor: d => `${d.occupancy_rate}%` },
      ]
    );
  };

  const handleSaveSnapshot = async () => {
    if (!data) return;
    setSavingSnapshot(true);
    setSnapshotMsg(null);
    try {
      await apiFetch('/api/v1/reports/snapshots', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'OCCUPANCY',
          reportPeriodStart: startDate,
          reportPeriodEnd: endDate,
          branchId: branchId || null,
          reportData: data,
        }),
      });
      setSnapshotMsg('Snapshot archived successfully into audit ledger (Rule B17).');
    } catch (err: any) {
      setSnapshotMsg(`Failed to save snapshot: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

  const summary = data?.summary;
  const daily = data?.daily || [];

  return (
    <div className="space-y-6">
      {/* Shared Filter Bar with safe Date constraints */}
      <ReportFilterBar
        selectedBranch={branchId}
        onBranchChange={setBranchId}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onRefresh={fetchReport}
        onExportCsv={handleExportCsv}
        onPrint={() => window.print()}
        isLoading={loading}
      />

      {/* Snapshot Alert */}
      {snapshotMsg && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{snapshotMsg}</span>
          <button onClick={() => setSnapshotMsg(null)} className="text-amber-400 hover:text-white ml-2 cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Average Occupancy</span>
            <TrendingUp size={16} className="text-amber-400" />
          </div>
          <p className="font-cinzel text-3xl font-bold text-stone-100 mt-2">
            {summary && summary.avg_occupancy_rate != null ? `${toNum(summary.avg_occupancy_rate).toFixed(1)}%` : "—"}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Calculated over {summary?.total_days || 0} days</p>
        </div>

        <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Peak Occupancy</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="font-cinzel text-3xl font-bold text-stone-100 mt-2">
            {summary && summary.peak_occupancy_rate != null ? `${toNum(summary.peak_occupancy_rate).toFixed(1)}%` : "—"}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Peak Day: {summary?.peak_occupancy_day || "N/A"}</p>
        </div>

        <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Occupied Room Nights</span>
            <BedDouble size={16} className="text-amber-400" />
          </div>
          <p className="font-cinzel text-3xl font-bold text-stone-100 mt-2">
            {summary && summary.total_occupied_room_nights != null ? toNum(summary.total_occupied_room_nights).toLocaleString() : "—"}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Total capacity: {summary && summary.total_capacity_room_nights != null ? toNum(summary.total_capacity_room_nights).toLocaleString() : 0} nights</p>
        </div>

        <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>Rule B17 Snapshot</span>
              <Save size={16} className="text-stone-400" />
            </div>
            <p className="text-xs text-stone-400 mt-2">Freeze dataset into audit archive.</p>
          </div>
          <button
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot || loading || !data}
            className="mt-3 w-full py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
          >
            {savingSnapshot ? 'Archiving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-stone-950/70 border border-white/10 rounded-none overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-cinzel text-base font-semibold text-stone-200">Daily Room Occupancy Breakdown</h3>
            <p className="text-xs text-stone-500">Day-by-day capacity utilization and room vacancy</p>
          </div>
          <div className="text-xs text-stone-400 flex items-center gap-1.5 font-mono">
            <Calendar size={13} className="text-amber-400" />
            <span>{startDate} → {endDate}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-900/90 text-stone-400 border-b border-white/10 uppercase tracking-wider font-jakarta text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Total Rooms</th>
                <th className="py-3 px-4 text-center">Occupied</th>
                <th className="py-3 px-4 text-center">Vacant</th>
                <th className="py-3 px-4">Occupancy Visualizer</th>
                <th className="py-3 px-4 text-right">Occupancy %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-jakarta">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    Calculating daily room capacity...
                  </td>
                </tr>
              ) : daily.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    No room occupancy records found for selected period.
                  </td>
                </tr>
              ) : (
                daily.map((row) => (
                  <tr key={row.day} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono text-stone-300">{row.day}</td>
                    <td className="py-3 px-4 text-center text-stone-400">{toNum(row.total_rooms)}</td>
                    <td className="py-3 px-4 text-center text-amber-300 font-semibold">{toNum(row.occupied_rooms)}</td>
                    <td className="py-3 px-4 text-center text-stone-400">{toNum(row.vacant_rooms)}</td>
                    <td className="py-3 px-4 w-1/3">
                      <div className="w-full bg-stone-900 h-2 rounded-none overflow-hidden border border-white/5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            toNum(row.occupancy_rate) >= 80
                              ? "bg-rose-500"
                              : toNum(row.occupancy_rate) >= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, toNum(row.occupancy_rate)))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-stone-200">
                      {toNum(row.occupancy_rate).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
