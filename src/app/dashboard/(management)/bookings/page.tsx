'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Search, RefreshCw, Calendar, LogOut } from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';


interface RecentBooking {
  booking_id: string;
  booking_status: string;
  booking_created_at: string;
  branch_name: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  room_number: string | null;
  room_type_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  total_amount: number | null;
  invoice_status: string | null;
}

export default function BookingsManagementPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: RecentBooking[] }>('/api/v1/dashboard/bookings?limit=50');
      setBookings(res.data ?? []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = bookings.filter(b => {
    const matchesSearch = `${b.guest_first_name} ${b.guest_last_name} ${b.booking_id} ${b.guest_email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.booking_status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100 font-cinzel">Bookings Ledger</h1>
          <p className="text-stone-500 text-sm mt-0.5 font-jakarta">
            Active reservations, guest stays, and checkout records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchData} title="Refresh bookings">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="danger" size="sm" onClick={logout} className="flex items-center gap-1.5 ml-2">
            <LogOut size={14} /> Log Out
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative max-w-sm w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by guest, email or booking ID…"
            className="w-full bg-white/4 border border-white/10 rounded-none pl-8 pr-4 py-2 text-sm text-stone-200 placeholder:text-stone-600 outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-none transition-colors ${
                statusFilter === status
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-white/5 text-stone-400 hover:text-stone-200 hover:bg-white/10'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-stone-500 text-sm">Loading bookings ledger…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Ref & Guest</th>
                <th className="text-left px-6 py-3 font-medium">Branch & Suite</th>
                <th className="text-left px-6 py-3 font-medium">Dates</th>
                <th className="text-left px-6 py-3 font-medium">Amount</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(b => (
                <tr
  key={b.booking_id}
  onClick={() => router.push(`/dashboard/bookings/${b.booking_id}`)}
  className="hover:bg-white/3 transition-colors cursor-pointer"
>

                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-200">{b.guest_first_name} {b.guest_last_name}</p>
                      <p className="text-stone-500 text-xs">{b.guest_email}</p>
                      <p className="font-mono text-[10px] text-amber-400/80">#{b.booking_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-stone-300 font-medium">{b.branch_name}</p>
                    <p className="text-stone-500 text-xs">{b.room_type_name ?? '—'} (Room {b.room_number ?? 'TBA'})</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-stone-500" />
                      <span>{b.check_in_date ?? '—'} &rarr; {b.check_out_date ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-cinzel text-amber-300 font-medium">
                    {b.total_amount ? `$${toNum(b.total_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-none border border-white/10 bg-white/5 text-stone-300">
                      {b.booking_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-medium text-stone-400">
                      {b.invoice_status ?? 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                    No reservations matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
