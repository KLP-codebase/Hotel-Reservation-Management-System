'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Building2, Calendar, RefreshCw, Download, Printer, AlertTriangle } from 'lucide-react';

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

  // Calculate local "today" string YYYY-MM-DD to disallow future dates
  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

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
      .catch(() => {});

    return () => { isMounted = false; };
  }, []);

  // Safe Start Date Handler:
  // 1. Cannot be in the future (capped at today)
  // 2. If new start date > end date, automatically sync end date to new start date
  const handleStartChange = (val: string) => {
    if (!val) {
      onStartDateChange(val);
      return;
    }
    const safeStart = val > today ? today : val;
    onStartDateChange(safeStart);

    if (endDate && safeStart > endDate) {
      onEndDateChange(safeStart);
    }
  };

  // Safe End Date Handler:
  // 1. Cannot be in the future (capped at today)
  // 2. Cannot be before start date (clamped to start date)
  const handleEndChange = (val: string) => {
    if (!val) {
      onEndDateChange(val);
      return;
    }
    let safeEnd = val > today ? today : val;
    if (startDate && safeEnd < startDate) {
      safeEnd = startDate;
    }
    onEndDateChange(safeEnd);
  };

  const isInvalidRange = Boolean(startDate && endDate && startDate > endDate);
  const isFutureDate = Boolean((startDate && startDate > today) || (endDate && endDate > today));

  return (
    <div className="space-y-2">
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

          {/* Start Date: capped at today and capped at endDate */}
          <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
            <Calendar size={14} className="text-amber-400 shrink-0" />
            <span className="text-stone-500 text-[11px] font-mono">From:</span>
            <input
              type="date"
              value={startDate}
              max={endDate && endDate <= today ? endDate : today}
              onChange={(e) => handleStartChange(e.target.value)}
              className="bg-transparent text-stone-200 focus:outline-none cursor-pointer text-xs font-mono"
              title="Start date (cannot be in the future)"
            />
          </div>

          {/* End Date: min is startDate, max is today */}
          <div className="flex items-center gap-2 bg-stone-900/80 border border-white/10 px-3 py-1.5 text-xs text-stone-300">
            <Calendar size={14} className="text-amber-400 shrink-0" />
            <span className="text-stone-500 text-[11px] font-mono">To:</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={today}
              onChange={(e) => handleEndChange(e.target.value)}
              className="bg-transparent text-stone-200 focus:outline-none cursor-pointer text-xs font-mono"
              title="End date (must be between start date and today)"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading || isInvalidRange || isFutureDate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800 border border-white/10 text-stone-300 hover:text-white text-xs transition duration-150 disabled:opacity-50 cursor-pointer"
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
              disabled={isInvalidRange || isFutureDate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              disabled={isInvalidRange || isFutureDate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white text-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation warning if an illegal range is selected */}
      {(isInvalidRange || isFutureDate) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            {isFutureDate
              ? 'Future dates are not permitted. Please select dates up to today.'
              : 'End date cannot be earlier than the start date. Please choose a valid date range.'}
          </span>
        </div>
      )}
    </div>
  );
}
