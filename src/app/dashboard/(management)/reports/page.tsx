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
  Btn,
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
        />
      </div>

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Letterhead, shown only when printing / saving as PDF */}
        <div className="hidden print:block mb-8 pb-4 border-b border-ink font-jakarta text-ink">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-cinzel text-[24px] tracking-[0.08em] uppercase">Sky Nest Hotels &amp; Resorts</h1>
              <p className="mt-1 text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70">
                Operations &amp; Financial Reports
              </p>
            </div>
            <div className="text-right text-[11px] text-ink/70">
              <p className="font-medium text-ink">Confidential</p>
              <p>Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-skynest-hairline flex justify-between items-center">
            <span className="font-cinzel text-[16px]">{tabTitles[activeTab].title}</span>
            <span className="text-[11px] text-ink/70">{tabTitles[activeTab].index}</span>
          </div>
        </div>

        <section className="space-y-8">
          <div className="no-print space-y-6">
            <SectionHeader index={tabTitles[activeTab].index} title={tabTitles[activeTab].title}>
              <Btn onClick={() => window.print()} title="Print this report or save it as a PDF">
                <Printer className="w-4 h-4" />
                Print / PDF
              </Btn>
            </SectionHeader>
            <Segmented value={activeTab} onChange={setActiveTab} options={REPORT_TABS} />
          </div>

          {/* Active report (prints only this tab) */}
          <div>
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
