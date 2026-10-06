'use client';

import React, { useState } from 'react';
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
    services:  { index: 'Report 3 · Departmental Volume',   title: 'Service Usage Breakdown' },
    snapshots: { index: 'Rule B17 · Audit Ledger',          title: 'Historical Report Snapshots' },
  };

  return (
    <>
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

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-12">
        <section className="space-y-8">
          <SectionHeader
            index={tabTitles[activeTab].index}
            title={tabTitles[activeTab].title}
          >
            <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
              <Segmented
                value={activeTab}
                onChange={setActiveTab}
                options={REPORT_TABS}
              />
            </div>
          </SectionHeader>

          {/* Report Tab Container */}
          <div className="bg-ink p-6 md:p-8 border border-white/10 text-stone-100 shadow-xl space-y-6">
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
