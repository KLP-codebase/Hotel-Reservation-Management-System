'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import {
  LayoutDashboard, Users, Building2, BookOpen,
  BedDouble, LogOut, ChevronRight, Sparkles, Receipt
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={16} />, roles: ['RECEPTIONIST', 'SERVICE_STAFF', 'MANAGER', 'ADMINISTRATOR', 'DBA'] },
  { href: '/dashboard/staff', label: 'Staff', icon: <Users size={16} />, roles: ['MANAGER', 'ADMINISTRATOR', 'DBA'] },
  { href: '/dashboard/branches', label: 'Branches', icon: <Building2 size={16} />, roles: ['ADMINISTRATOR', 'DBA'] },
  { href: '/dashboard/rooms', label: 'Rooms', icon: <BedDouble size={16} />, roles: ['RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'] },
  { href: '/dashboard/catalogue', label: 'Catalogue', icon: <Sparkles size={16} />, roles: ['RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'] },
  { href: '/dashboard/bookings', label: 'Bookings', icon: <BookOpen size={16} />, roles: ['RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'] },
  { href: '/dashboard/billing', label: 'Billing & Invoices', icon: <Receipt size={16} />, roles: ['RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'] },
];


export function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const visible = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/8 bg-stone-950/80 backdrop-blur-md">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/8">
        <span className="text-lg font-semibold text-amber-400 tracking-wide">Sky Nest</span>
        <p className="text-xs text-stone-500 mt-0.5">Management Portal</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-none text-sm transition-all duration-150 group',
                active
                  ? 'bg-amber-600/15 text-amber-400 font-medium'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-white/5',
              ].join(' ')}
            >
              <span className={active ? 'text-amber-400' : 'text-stone-500 group-hover:text-stone-300'}>
                {item.icon}
              </span>
              {item.label}
              {active && <ChevronRight size={12} className="ml-auto text-amber-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-none bg-amber-700/40 flex items-center justify-center text-amber-300 text-xs font-bold uppercase">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-stone-200 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-stone-500 truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-none text-xs text-stone-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
