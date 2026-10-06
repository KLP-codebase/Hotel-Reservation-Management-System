"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { DashboardHeader } from "./DashboardHeader";

/**
 * Staff and Branches still use the legacy dark styling, so they keep the old
 * sidebar shell until they are restyled. Every other management page uses the
 * light Sky Nest shell shared with the overview.
 */
const LEGACY_ROUTES = ["/dashboard/staff", "/dashboard/branches"];

export function ManagementShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const legacy = LEGACY_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (legacy) {
    return (
      <div className="min-h-screen bg-stone-950 flex">
        <Nav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-jakarta">
      <DashboardHeader />
      {children}
    </div>
  );
}
