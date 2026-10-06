'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Building2, Calendar, RefreshCw, Download, Printer } from 'lucide-react';

export interface BranchOption {
  branch_id: string;
  branch_name: string;
  city: string;
}

interface ReportFilterBarProps {
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onRefresh: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  isLoading?: boolean;
}

export function ReportFilterBar({
  selectedBranch,
  onBranchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onRefresh,
  onExportCsv,
  onPrint,
  isLoading = false,
}: ReportFilterBarProps) {
  const [branches, setBranches] = useState<BranchOption[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiFetch<{ data?: BranchOption[] }>('/api/v1/branches')
      .then(res => {
        if (!isMounted) return;
        if (Array.isArray(res)) {
          setBranches(res);
        } else if (res && Array.isArray(res.data)) {
          setBranches(res.data);
        }
      })
      .catch(() => {
        // Fallback: try full /api/v1/branches
        apiFetch<{ data?: BranchOption[] }>('/api/v1/branches')
          .then(res => {
            if (isMounted && res?.data) setBranches(res.data);
          })
          .catch(() => {});
      });

    return () => { isMounted = false; };
  }, []);

  return (
    <div className="bg-stone-950/70 border border-white/10 p-4 rounded-none backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Branch Filter */}
        <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
          <Building2 size={14} className="text-amber-400 shrink-0" />
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
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

        {/* Start Date */}
        <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
          <Calendar size={14} className="text-amber-400 shrink-0" />
          <span className="text-stone-500 text-[11px] font-mono">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent text-stone-200 focus:outline-none cursor-pointer text-xs font-mono"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
          <Calendar size={14} className="text-amber-400 shrink-0" />
          <span className="text-stone-500 text-[11px] font-mono">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-transparent text-stone-200 focus:outline-none cursor-pointer text-xs font-mono"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800 border border-white/10 text-stone-300 hover:text-white text-xs transition duration-150 disabled:opacity-50"
          title="Reload Report Data"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-amber-400' : 'text-stone-400'} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Export & Print actions */}
      <div className="flex items-center gap-2 ml-auto">
        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-medium transition"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        )}

        {onPrint && (
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white text-xs transition"
          >
            <Printer size={13} />
            <span>Print Report</span>
          </button>
        )}
      </div>
    </div>
  );
}
