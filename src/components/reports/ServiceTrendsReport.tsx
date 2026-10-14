'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, toNum } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';
import { ReportFilterBar } from './ReportFilterBar';
import { Save } from 'lucide-react';
import { Btn, Empty, Loading, fmtLKR, tbl, titleCase } from '@/components/dashboard/ui';
import { Meter, Notice, ReportPanel, Tag } from './report-ui';

interface TopService {
  service_id: string;
  service_name: string;
  category: string;
  total_orders: number;
  units_consumed: number;
  total_revenue: number;
}

interface MealPlanPref {
  plan_name: string;
  bookings_count: number;
  percentage: number;
}

interface RoomPref {
  room_type_name: string;
  bookings_count: number;
  avg_nights: number;
  total_tariff_revenue: number;
}

interface CustomerTrendsData {
  period_start: string | null;
  period_end: string | null;
  top_services: TopService[];
  meal_plan_preferences: MealPlanPref[];
  room_type_preferences: RoomPref[];
}

export function ServiceTrendsReport() {
  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [branchId, setBranchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [savingSnapshot, setSavingSnapshot] = useState<boolean>(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [data, setData] = useState<CustomerTrendsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    if (endDate && endDate > today) {
      setError('Dates beyond today cannot be selected.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (branchId) q.set('branchId', branchId);
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      q.set('limit', '10');

      const res = await apiFetch<{ success: boolean; data: CustomerTrendsData }>(`/api/v1/reports/trends?${q.toString()}`);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer trends report');
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate, today]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    if (!data) return;
    exportToCsv(
      `SkyNest_Customer_Trends_Services`,
      data.top_services,
      [
        { header: 'Service Name', accessor: s => s.service_name },
        { header: 'Category', accessor: s => s.category },
        { header: 'Orders Placed', accessor: s => s.total_orders },
        { header: 'Units Consumed', accessor: s => s.units_consumed },
        { header: 'Revenue ($)', accessor: s => toNum(s.total_revenue).toFixed(2) },
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
          reportType: 'TRENDS',
          reportPeriodStart: startDate || new Date().toISOString().split('T')[0],
          reportPeriodEnd: endDate || new Date().toISOString().split('T')[0],
          branchId: branchId || null,
          reportData: data,
        }),
      });
      setSnapshotMsg('Customer trends snapshot archived into audit ledger (Rule B17).');
    } catch (err: any) {
      setSnapshotMsg(`Failed to save snapshot: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

  const topServices = data?.top_services || [];
  const mealPlans = data?.meal_plan_preferences || [];
  const roomPrefs = data?.room_type_preferences || [];

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

      <ReportPanel title="Most-used services" sub="Ranked by orders placed in the period">
        {loading ? (
          <Loading label="Loading service rankings" />
        ) : topServices.length === 0 ? (
          <Empty>No service usage recorded in this period.</Empty>
        ) : (
          <div className={tbl.wrap}>
            <table className={`${tbl.table} min-w-[720px]`}>
              <thead>
                <tr className={tbl.headRow}>
                  <th className={`${tbl.th} w-12`}>Rank</th>
                  <th className={tbl.th}>Service</th>
                  <th className={tbl.th}>Category</th>
                  <th className={`${tbl.th} text-right`}>Orders</th>
                  <th className={`${tbl.th} text-right`}>Units</th>
                  <th className={`${tbl.th} text-right`}>Revenue</th>
                </tr>
              </thead>
              <tbody className={tbl.body}>
                {topServices.map((svc, idx) => (
                  <tr key={svc.service_id} className={tbl.row}>
                    <td className={`${tbl.td} font-cinzel text-[18px] tabular-nums ${idx < 3 ? 'text-ink' : 'text-ink/50'}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className={`${tbl.td} font-medium`}>{svc.service_name}</td>
                    <td className={tbl.td}><Tag>{svc.category}</Tag></td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{svc.total_orders}</td>
                    <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{svc.units_consumed}</td>
                    <td className={`${tbl.td} text-right tabular-nums font-medium`}>{fmtLKR(svc.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ReportPanel title="Meal plan preferences" sub="Share of bookings by meal plan">
          {loading ? (
            <Loading label="Loading meal plans" />
          ) : mealPlans.length === 0 ? (
            <Empty>No meal plan bookings recorded.</Empty>
          ) : (
            <ul className="divide-y divide-skynest-hairline border-y border-skynest-hairline">
              {mealPlans.map((mp) => (
                <li key={mp.plan_name} className="py-4 space-y-2">
                  <div className="flex items-baseline justify-between gap-4 font-jakarta">
                    <span className="text-[13px] font-medium text-ink">{mp.plan_name}</span>
                    <span className="text-[12px] text-ink/70 tabular-nums">
                      {mp.bookings_count} booking{mp.bookings_count === 1 ? '' : 's'} · {mp.percentage}%
                    </span>
                  </div>
                  <Meter value={mp.percentage} label={`${mp.plan_name} share`} />
                </li>
              ))}
            </ul>
          )}
        </ReportPanel>

        <ReportPanel title="Room categories" sub="Bookings, average stay and tariff by room type">
          {loading ? (
            <Loading label="Loading room preferences" />
          ) : roomPrefs.length === 0 ? (
            <Empty>No reservations recorded.</Empty>
          ) : (
            <div className={tbl.wrap}>
              <table className={tbl.table}>
                <thead>
                  <tr className={tbl.headRow}>
                    <th className={tbl.th}>Room type</th>
                    <th className={`${tbl.th} text-right`}>Bookings</th>
                    <th className={`${tbl.th} text-right`}>Avg stay</th>
                    <th className={`${tbl.th} text-right`}>Tariff</th>
                  </tr>
                </thead>
                <tbody className={tbl.body}>
                  {roomPrefs.map((rp) => (
                    <tr key={rp.room_type_name} className={tbl.row}>
                      <td className={`${tbl.td} font-medium`}>{titleCase(rp.room_type_name)}</td>
                      <td className={`${tbl.td} text-right tabular-nums`}>{rp.bookings_count}</td>
                      <td className={`${tbl.td} text-right tabular-nums text-ink/70`}>{rp.avg_nights} nights</td>
                      <td className={`${tbl.td} text-right tabular-nums font-medium`}>{fmtLKR(rp.total_tariff_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportPanel>
      </div>
    </div>
  );
}
