'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';
import { ReportFilterBar } from './ReportFilterBar';
import { Save } from 'lucide-react';
import { Btn, Empty, Loading, fmtDay, tbl } from '@/components/dashboard/ui';
import { Meter, Notice, ReportPanel, StatStrip } from './report-ui';

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
    <div className="space-y-8">
      <ReportFilterBar
        selectedBranch={branchId}
        onBranchChange={setBranchId}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onRefresh={fetchReport}
        onExportCsv={handleExportCsv}
        isLoading={loading}
        actions={
          <Btn onClick={handleSaveSnapshot} disabled={savingSnapshot || loading || !data} loading={savingSnapshot}>
            {!savingSnapshot && <Save className="w-4 h-4" />}
            Save snapshot
          </Btn>
        }
      />

      {snapshotMsg && (
        <Notice tone={snapshotMsg.startsWith('Failed') ? 'error' : 'success'} onDismiss={() => setSnapshotMsg(null)}>
          {snapshotMsg}
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <StatStrip
        stats={[
          {
            label: 'Average occupancy',
            value: summary && summary.avg_occupancy_rate != null ? `${toNum(summary.avg_occupancy_rate).toFixed(1)}%` : '—',
            sub: `Across ${summary?.total_days || 0} days`,
          },
          {
            label: 'Peak occupancy',
            value: summary && summary.peak_occupancy_rate != null ? `${toNum(summary.peak_occupancy_rate).toFixed(1)}%` : '—',
            sub: summary?.peak_occupancy_day ? `On ${fmtDay(summary.peak_occupancy_day)}` : 'No peak day yet',
          },
          {
            label: 'Occupied room nights',
            value: summary && summary.total_occupied_room_nights != null ? toNum(summary.total_occupied_room_nights).toLocaleString() : '—',
            sub: `of ${summary && summary.total_capacity_room_nights != null ? toNum(summary.total_capacity_room_nights).toLocaleString() : 0} available`,
          },
          {
            label: 'Vacant room nights',
            value: summary ? Math.max(0, toNum(summary.total_capacity_room_nights) - toNum(summary.total_occupied_room_nights)).toLocaleString() : '—',
            sub: 'Unsold capacity in the period',
          },
        ]}
      />

      <ReportPanel
        title="Daily occupancy"
        sub="Rooms occupied and vacant for each day in the period"
        aside={<span className="font-jakarta text-[12px] text-ink/70 tabular-nums">{fmtDay(startDate)} → {fmtDay(endDate)}</span>}
      >
        {loading ? (
          <Loading label="Calculating daily room capacity" />
        ) : daily.length === 0 ? (
          <Empty>No room occupancy records found for the selected period.</Empty>
        ) : (
          <div className={tbl.wrap}>
            <table className={`${tbl.table} min-w-[720px]`}>
              <thead>
                <tr className={tbl.headRow}>
                  <th className={tbl.th}>Date</th>
                  <th className={`${tbl.th} text-right`}>Rooms</th>
                  <th className={`${tbl.th} text-right`}>Occupied</th>
                  <th className={`${tbl.th} text-right`}>Vacant</th>
                  <th className={`${tbl.th} w-1/3`}>Occupancy</th>
                  <th className={`${tbl.th} text-right`}>Rate</th>
                </tr>
              </thead>
              <tbody className={tbl.body}>
                {daily.map((row) => (
                  <tr key={row.day} className={tbl.row}>
                    <td className={`${tbl.td} whitespace-nowrap tabular-nums`}>{fmtDay(row.day)}</td>
                    <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{toNum(row.total_rooms)}</td>
                    <td className={`${tbl.td} text-right tabular-nums font-medium`}>{toNum(row.occupied_rooms)}</td>
                    <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{toNum(row.vacant_rooms)}</td>
                    <td className={tbl.td}>
                      <Meter value={toNum(row.occupancy_rate)} label={`Occupancy on ${row.day}`} />
                    </td>
                    <td className={`${tbl.td} text-right tabular-nums font-medium`}>{toNum(row.occupancy_rate).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportPanel>
    </div>
  );
}
