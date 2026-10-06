"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { initials, titleCase } from "./ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", roles: ["RECEPTIONIST", "SERVICE_STAFF", "MANAGER", "ADMINISTRATOR", "DBA"] },
  { href: "/dashboard/staff", label: "Staff", roles: ["MANAGER", "ADMINISTRATOR", "DBA"] },
  { href: "/dashboard/branches", label: "Branches", roles: ["ADMINISTRATOR", "DBA"] },
  { href: "/dashboard/rooms", label: "Rooms", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
  { href: "/dashboard/catalogue", label: "Catalogue", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
  { href: "/dashboard/bookings", label: "Bookings", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
  { href: "/dashboard/billing", label: "Billing", roles: ["RECEPTIONIST", "MANAGER", "ADMINISTRATOR", "DBA"] },
];

/** Sticky dark top bar shared by every Sky Nest dashboard page. */
export function DashboardHeader({
  onRefresh, refreshing, lastRefresh,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: Date;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = user ? NAV_ITEMS.filter((item) => item.roles.includes(user.role)) : [];
  const roleLabel =
    user?.role === "MANAGER" ? "General Manager"
      : user?.role === "RECEPTIONIST" ? "Front Desk"
        : titleCase(user?.role ?? "");

  return (
    <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur-[12px] border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-4 shrink-0">
          <span className="font-cinzel text-[17px] tracking-[0.2em] text-white">SKYNEST</span>
          <span className="hidden lg:block w-px h-4 bg-white/20" />
          <span className="hidden lg:block font-jakarta text-[11px] tracking-[0.12em] uppercase text-white/60">
            {roleLabel}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map(({ href, label }) => {
            const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative py-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase transition-colors duration-300 ${
                  active ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {label}
                {active && <span className="absolute left-0 right-0 -bottom-1 h-px bg-skynest-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh data"
              title={lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          {user && (
            <span
              title={`${user.firstName} ${user.lastName}`}
              className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center font-jakarta text-[11px] font-medium tracking-[0.08em] text-white/80"
            >
              {initials(user.firstName, user.lastName)}
            </span>
          )}
          <button
            onClick={logout}
            className="hidden sm:flex items-center px-4 py-2 font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-white/70 border border-white/20 hover:text-white hover:border-skynest-accent transition-colors duration-300"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
