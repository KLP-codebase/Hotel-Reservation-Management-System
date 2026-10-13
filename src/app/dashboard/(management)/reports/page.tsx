'use client';

import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { OccupancyReport } from '@/components/reports/OccupancyReport';
import { ServiceTrendsReport } from '@/components/reports/ServiceTrendsReport';
import { MonthlyRevenueReport } from '@/components/reports/MonthlyRevenueReport';
import { BillingSummaryReport } from '@/components/reports/BillingSummaryReport';
import { ServiceUsageReport } from '@/components/reports/ServiceUsageReport';
import { SnapshotHistoryTab } from '@/components/reports/SnapshotHistoryTab';
import {
  DashboardMasthead,
  SectionHeader,
  Segmented,
} from '@/components/dashboard/ui';

type TabType = 'occupancy' | 'trends' | 'revenue' | 'billing' | 'services' | 'snapshots';

const REPORT_TABS: { value: TabType; label: string }[] = [
  { value: 'occupancy', label: 'Room Occupancy' },
  { value: 'trends',    label: 'Customer Trends' },
  { value: 'revenue',   label: 'Monthly Revenue' },
  { value: 'billing',   label: 'Guest Billing' },
  { value: 'services',  label: 'Service Breakdown' },
  { value: 'snapshots', label: 'Audit Snapshots' },
];

export default function ReportsManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('occupancy');

  const tabTitles: Record<TabType, { index: string; title: string }> = {
    occupancy: { index: 'Report 1 · Operations & Capacity', title: 'Room Occupancy Analytics' },
    trends:    { index: 'Report 5 · Guest Behavior',        title: 'Customer Stay & Service Trends' },
    revenue:   { index: 'Report 4 · Financial Ledger',       title: 'Monthly Revenue Intelligence' },
    billing:   { index: 'Report 2 · Debtor Aging',          title: 'Guest Billing & Folio Balances' },
    services:  { index: 'Report 3 · Departmental Volume',   title: 'Service Usage Breakdown per Room' },
    snapshots: { index: 'Rule B17 · Audit Ledger',          title: 'Historical Report Snapshots' },
  };

  return (
    <>
      <div className="no-print">
        <DashboardMasthead
          eyebrow="Executive Intelligence · Operations & Analytics"
          title="Reports & Analytics"
          imageKey="Colombo"
          kpis={[
            { label: 'Module Focus', value: 'Person 3', sub: 'Occupancy & Trends' },
            { label: 'Snapshot Ledger', value: 'Rule B17', sub: 'Audited Datasets' },
            { label: 'Multi-Branch', value: 'Live', sub: 'Railway PostgreSQL' },
            { label: 'Statutory Taxes', value: '4 Tiers', sub: 'SC, TDL, SSCL, VAT' },
          ]}
        />
      </div>

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-12 space-y-8">
        {/* ── Official Print Header (Visible ONLY on Print / PDF Export) ──── */}
        <div className="hidden print:block mb-8 pb-4 border-b-2 border-stone-800 text-stone-900 font-jakarta">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-cinzel text-2xl font-bold tracking-wider text-ink uppercase">
                Sky Nest Hotels & Resorts
              </h1>
              <p className="text-xs uppercase tracking-widest text-ink/70 font-semibold mt-0.5">
                Executive Operations & Financial Intelligence Ledger
              </p>
            </div>
            <div className="text-right text-[11px] text-ink/70">
              <p className="font-semibold text-ink">CONFIDENTIAL</p>
              <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p className="font-mono text-[10px]">Rule B17 Audited</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-300 flex justify-between items-center text-xs font-semibold">
            <span className="font-cinzel text-sm uppercase text-skynest-accent">
              {tabTitles[activeTab].title}
            </span>
            <span className="text-[11px] text-ink/60 font-mono">
              Category: {tabTitles[activeTab].index}
            </span>
          </div>
        </div>

        <section className="space-y-6">
          <div className="no-print">
            <SectionHeader
              index={tabTitles[activeTab].index}
              title={tabTitles[activeTab].title}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-jakarta font-semibold uppercase tracking-wider border border-skynest-hairline bg-white text-ink hover:bg-skynest-accent hover:text-white hover:border-skynest-accent transition-colors shadow-xs cursor-pointer"
                  title="Print currently viewed report category directly to PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <Segmented
                  value={activeTab}
                  onChange={setActiveTab}
                  options={REPORT_TABS}
                />
              </div>
            </SectionHeader>
          </div>

          {/* Report Tab Container (Prints only the active tab) */}
          <div className="bg-ink p-6 md:p-8 border border-white/10 text-stone-100 shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:bg-white">
            {activeTab === 'occupancy' && <OccupancyReport />}
            {activeTab === 'trends'    && <ServiceTrendsReport />}
            {activeTab === 'revenue'   && <MonthlyRevenueReport />}
            {activeTab === 'billing'   && <BillingSummaryReport />}
            {activeTab === 'services'  && <ServiceUsageReport />}
            {activeTab === 'snapshots' && <SnapshotHistoryTab />}
          </div>
        </section>
      </main>
    </>
  );
}
