'use client';

import React from 'react';
import { ServiceUsageReportRow } from '../../../lib/api/reports/service-report.api';
import { toNum } from '../../../lib/api-client';

interface ServiceReportTableProps {
  data: ServiceUsageReportRow[];
  loading: boolean;
}

export const ServiceReportTable: React.FC<ServiceReportTableProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
        <p className="text-slate-400 text-sm">Loading service usage data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-slate-400 text-sm">No service usage data found for the selected criteria.</p>
      </div>
    );
  }

  const grandTotalOrders = data.reduce((sum, row) => sum + toNum(row.orders_count), 0);
  const grandTotalQty = data.reduce((sum, row) => sum + toNum(row.total_quantity), 0);
  const grandTotalRevenue = data.reduce(
    (sum, row) => sum + toNum(row.total_service_revenue),
    0
  );

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Category</th>
              <th scope="col" className="px-6 py-3 font-semibold">Service Name</th>
              <th scope="col" className="px-6 py-3 font-semibold">Branch</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Orders</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Total Qty</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Avg Unit Price</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((row, idx) => (
              <tr key={`${row.category}-${row.service_name}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {row.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-100">{row.service_name}</td>
                <td className="px-6 py-4 text-slate-400">{row.branch_name || 'N/A'}</td>
                <td className="px-6 py-4 text-right">{toNum(row.orders_count).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">{toNum(row.total_quantity).toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono text-slate-300">
                  ${toNum(row.avg_unit_price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-mono font-semibold text-amber-400">
                  ${toNum(row.total_service_revenue).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-800/60 font-semibold text-slate-200 border-t border-slate-700">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-slate-100">Grand Total</td>
              <td className="px-6 py-4 text-right text-slate-100">{grandTotalOrders.toLocaleString()}</td>
              <td className="px-6 py-4 text-right text-slate-100">{grandTotalQty.toLocaleString()}</td>
              <td className="px-6 py-4 text-right text-slate-400">—</td>
              <td className="px-6 py-4 text-right font-mono text-amber-400 text-base">
                ${grandTotalRevenue.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};