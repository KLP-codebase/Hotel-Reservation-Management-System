'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { RefreshCw, Download, Printer } from 'lucide-react';
import { Btn, IconBtn } from '@/components/dashboard/ui';
import { DateFilter, LabeledSelect, Notice, HideForManager } from './report-ui';

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
  /** Extra buttons placed after Export (e.g. Save snapshot). */
  actions?: React.ReactNode;
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
  actions,
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
    <div className="no-print space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <HideForManager>
            <LabeledSelect label="Branch" value={selectedBranch} onChange={onBranchChange}>
              <option value="">All branches</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} · {b.city}
                </option>
              ))}
            </LabeledSelect>
          </HideForManager>

          {/* Start date: capped at today and at endDate */}
          <DateFilter
            label="From"
            value={startDate}
            max={endDate && endDate <= today ? endDate : today}
            onChange={handleStartChange}
            title="Start date (cannot be in the future)"
          />

          {/* End date: min is startDate, max is today */}
          <DateFilter
            label="To"
            value={endDate}
            min={startDate || undefined}
            max={today}
            onChange={handleEndChange}
            title="End date (must be between start date and today)"
          />

          <IconBtn
            label="Refresh"
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading || isInvalidRange || isFutureDate}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </IconBtn>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {onExportCsv && (
            <Btn onClick={onExportCsv} disabled={isInvalidRange || isFutureDate}>
              <Download className="w-4 h-4" />
              Export CSV
            </Btn>
          )}
          {onPrint && (
            <Btn onClick={onPrint} disabled={isInvalidRange || isFutureDate}>
              <Printer className="w-4 h-4" />
              Print
            </Btn>
          )}
          {actions}
        </div>
      </div>

      {/* Validation warning if an illegal range is selected */}
      {(isInvalidRange || isFutureDate) && (
        <Notice tone="warning">
          {isFutureDate
            ? 'Future dates are not permitted. Please select dates up to today.'
            : 'End date cannot be earlier than the start date. Please choose a valid date range.'}
        </Notice>
      )}
    </div>
  );
}
