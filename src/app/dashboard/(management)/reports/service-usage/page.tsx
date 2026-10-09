'use client';

import React, { useState, useEffect } from 'react';
import { useServiceReport } from '../../../../../hooks/useServiceReport';
import { ServiceReportFilters } from '../../../../../components/dashboard/reports/ServiceReportFilters';
import { ServiceReportTable } from '../../../../../components/dashboard/reports/ServiceReportTable';
import { apiFetch } from '../../../../../lib/api-client';

interface BranchOption {
  branch_id: string;
  name: string;
}

export default function ServiceUsageReportPage() {
  const { data, loading, error, filters, setFilters, refetch } = useServiceReport();
  const [branches, setBranches] = useState<BranchOption[]>([]);

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await apiFetch<{ success: boolean; data: BranchOption[] }>('/api/v1/branches');
        if (res?.data) {
          setBranches(res.data);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    }
    loadBranches();
  }, []);

  const handleReset = () => {
    setFilters({});
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Service Usage Breakdown
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor service popularity, consumption metrics, and revenue contribution across hotel branches.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-sm"
        >
          {loading ? 'Refreshing...' : 'Refresh Report'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter Controls */}
      <ServiceReportFilters
        filters={filters}
        branches={branches}
        onFilterChange={setFilters}
        onReset={handleReset}
      />

      {/* Report Data Table */}
      <ServiceReportTable data={data} loading={loading} />
    </div>
  );
}