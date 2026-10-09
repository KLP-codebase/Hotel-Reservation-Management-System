import React from 'react';
import { BarChart } from 'lucide-react';

const navigation = [
  {
    name: 'Service Usage Breakdown',
    href: '/reports/service-usage',
    icon: BarChart,
  },
];

export function ManagementShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default ManagementShell;