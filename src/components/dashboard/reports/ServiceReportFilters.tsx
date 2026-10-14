'use client';

import React, { ChangeEvent } from 'react';
import { ServiceReportQueryParams } from '../../../lib/api/reports/service-report.api';
import { HideForManager } from '@/components/reports/report-ui';

interface BranchOption {
  branch_id: string;
  name: string;
}

interface ServiceReportFiltersProps {
  filters: ServiceReportQueryParams;
  branches: BranchOption[];
  onFilterChange: (newFilters: ServiceReportQueryParams) => void;
  onReset: () => void;
}

const SERVICE_CATEGORIES = [
  'ALL',
  'Dining',
  'Spa & Wellness',
  'Transportation',
  'Laundry',
  'Excursions',
  'Other',
];

export const ServiceReportFilters: React.FC<ServiceReportFiltersProps> = ({
  filters,
  branches,
  onFilterChange,
  onReset,
}) => {
  const handleChange = (key: keyof ServiceReportQueryParams, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <HideForManager>
          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Branch
            </label>
            <select
              value={filters.branchId || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('branchId', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </HideForManager>

        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Category
          </label>
          <select
            value={filters.category || 'ALL'}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('category', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
          >
            {SERVICE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('startDate', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('endDate', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};