'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { exportToCsv } from '@/lib/export-csv';
import { ReportFilterBar } from './ReportFilterBar';
import { Sparkles, UtensilsCrossed, Bed, Award, AlertCircle, Save } from 'lucide-react';

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

      const res = await apiFetch<{ success: boolean; data: CustomerTrendsData }>(`/reports/trends?${q.toString()}`);
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
        { header: 'Revenue (LKR)', accessor: s => s.total_revenue.toFixed(2) },
      ]
    );
  };

  const handleSaveSnapshot = async () => {
    if (!data) return;
    setSavingSnapshot(true);
    setSnapshotMsg(null);
    try {
      await apiFetch('/reports/snapshots', {
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
    <div className="space-y-6">
      {/* Filter Bar */}
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

      {/* Snapshot Action Bar */}
      <div className="flex items-center justify-between bg-stone-950/70 border border-white/10 p-4">
        <div>
          <h2 className="font-cinzel text-lg font-bold text-stone-100">Customer Preference & Consumption Trends</h2>
          <p className="text-xs text-stone-400">Cross-sectional intelligence on guest amenity utilization and booking preferences</p>
        </div>
        <button
          onClick={handleSaveSnapshot}
          disabled={savingSnapshot || loading || !data}
          className="flex items-center gap-2 py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
        >
          <Save size={14} />
          <span>{savingSnapshot ? 'Archiving...' : 'Save Audit Snapshot'}</span>
        </button>
      </div>

      {/* Grid: Top Services Leaderboard */}
      <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-amber-400" size={18} />
          <h3 className="font-cinzel text-base font-semibold text-stone-200">Top-Used Services Leaderboard</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-900/90 text-stone-400 border-b border-white/10 uppercase tracking-wider font-jakarta text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Rank</th>
                <th className="py-2.5 px-4">Service</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-center">Orders</th>
                <th className="py-2.5 px-4 text-center">Units Consumed</th>
                <th className="py-2.5 px-4 text-right">Revenue (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-jakarta">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">Loading service rankings...</td>
                </tr>
              ) : topServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">No service usage transactions recorded.</td>
                </tr>
              ) : (
                topServices.map((svc, idx) => (
                  <tr key={svc.service_id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono">
                      <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        idx === 1 ? 'bg-stone-400/20 text-stone-200 border border-stone-400/40' :
                        idx === 2 ? 'bg-amber-800/20 text-amber-500 border border-amber-800/40' :
                        'text-stone-500'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-200">{svc.service_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-stone-900 border border-white/10 text-stone-300">
                        {svc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-stone-300 font-mono">{svc.total_orders}</td>
                    <td className="py-3 px-4 text-center text-stone-300 font-mono">{svc.units_consumed}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-amber-300">
                      LKR {svc.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: 2 Columns (Meal Plans & Room Categories) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meal Plan Preferences */}
        <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="text-amber-400" size={18} />
            <h3 className="font-cinzel text-base font-semibold text-stone-200">Meal Plan Preferences</h3>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-xs text-stone-500 py-4 text-center">Loading meal plan distributions...</p>
            ) : mealPlans.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No meal plan booking records found.</p>
            ) : (
              mealPlans.map((mp) => (
                <div key={mp.plan_name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-medium">{mp.plan_name}</span>
                    <span className="text-stone-400 font-mono">
                      {mp.bookings_count} bookings ({mp.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-900 h-2 border border-white/5">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, mp.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Room Category Preferences & Stay Duration */}
        <div className="bg-stone-950/70 border border-white/10 p-5 rounded-none">
          <div className="flex items-center gap-2 mb-4">
            <Bed className="text-amber-400" size={18} />
            <h3 className="font-cinzel text-base font-semibold text-stone-200">Room Categories & Stay Duration</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900/90 text-stone-400 border-b border-white/10 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Room Type</th>
                  <th className="py-2.5 px-3 text-center">Bookings</th>
                  <th className="py-2.5 px-3 text-center">Avg Nights</th>
                  <th className="py-2.5 px-3 text-right">Tariff Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-jakarta">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-stone-500">Loading room preferences...</td>
                  </tr>
                ) : roomPrefs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-stone-500">No reservations recorded.</td>
                  </tr>
                ) : (
                  roomPrefs.map((rp) => (
                    <tr key={rp.room_type_name} className="hover:bg-white/[0.02] transition">
                      <td className="py-2.5 px-3 font-medium text-stone-300">{rp.room_type_name}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-stone-400">{rp.bookings_count}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-300">{rp.avg_nights} nights</td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-200">
                        LKR {rp.total_tariff_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
