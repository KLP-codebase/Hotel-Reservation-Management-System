import React from 'react';
import ManagementShell from '@/components/dashboard/ManagementShell';
import { SkyNestConcierge } from "@/components/ui/SkyNestConcierge";


export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <ManagementShell>{children}</ManagementShell>;
}
