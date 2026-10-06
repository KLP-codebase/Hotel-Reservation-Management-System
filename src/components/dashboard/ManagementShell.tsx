"use client";

import { DashboardHeader } from "./DashboardHeader";

/**
 * Shared Sky Nest management shell for all management screens.
 * Uses the light editorial theme (bg-paper text-ink font-jakarta) and sticky DashboardHeader.
 */
export function ManagementShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink font-jakarta">
      <DashboardHeader />
      {children}
    </div>
  );
}

