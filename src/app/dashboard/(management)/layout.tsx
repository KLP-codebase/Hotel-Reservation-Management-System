import React from 'react';
import { ManagementShell } from '@/components/dashboard/ManagementShell';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <ManagementShell>{children}</ManagementShell>;
}
