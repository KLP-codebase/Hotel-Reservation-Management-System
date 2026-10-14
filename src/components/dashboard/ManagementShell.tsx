'use client';

import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export function ManagementShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink font-jakarta flex flex-col print:block print:min-h-0 print:bg-transparent">
      <DashboardHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default ManagementShell;