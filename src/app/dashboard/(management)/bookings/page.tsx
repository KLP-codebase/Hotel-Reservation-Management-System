'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import {
  DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, SearchField,
  Loading, Empty, StatusDot, tbl, fmtStayRange, fmtMoney, titleCase,
} from '@/components/dashboard/ui';


interface RecentBooking {
  booking_id: string;
  booking_room_id?: string;
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

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT';

export default function BookingsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

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

  const countOf = (s: StatusFilter) => bookings.filter(b => b.booking_status.toUpperCase() === s).length;
  // Clicking a KPI filters to it; clicking the active one clears the filter.
  const toggle = (s: StatusFilter) => setStatusFilter(cur => (cur === s ? 'ALL' : s));

  return (
    <>
      <DashboardMasthead
        eyebrow="Reservations"
        title="Bookings"
        imageKey={user?.branchName}
        aside={<MastheadRefresh onClick={fetchData} loading={loading} />}
        kpis={[
          { label: 'Pending',     value: String(countOf('PENDING')),     sub: 'Awaiting confirmation', onClick: () => toggle('PENDING'),     active: statusFilter === 'PENDING' },
          { label: 'Confirmed',   value: String(countOf('CONFIRMED')),   sub: 'Due to arrive',         onClick: () => toggle('CONFIRMED'),   active: statusFilter === 'CONFIRMED' },
          { label: 'In house',    value: String(countOf('CHECKED_IN')),  sub: 'Currently staying',     onClick: () => toggle('CHECKED_IN'),  active: statusFilter === 'CHECKED_IN' },
          { label: 'Checked out', value: String(countOf('CHECKED_OUT')), sub: 'Completed stays',       onClick: () => toggle('CHECKED_OUT'), active: statusFilter === 'CHECKED_OUT' },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <section className="space-y-8">
          <SectionHeader index={`${filtered.length} of ${bookings.length} bookings`} title="Reservations">
            <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
              <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL',         label: 'All',         count: bookings.length },
                  { value: 'PENDING',     label: 'Pending',     count: countOf('PENDING') },
                  { value: 'CONFIRMED',   label: 'Confirmed',   count: countOf('CONFIRMED') },
                  { value: 'CHECKED_IN',  label: 'In house',    count: countOf('CHECKED_IN') },
                  { value: 'CHECKED_OUT', label: 'Checked out', count: countOf('CHECKED_OUT') },
                ]}
              />
              <SearchField value={search} onChange={setSearch} placeholder="Search guest, email or booking ID" />
            </div>
          </SectionHeader>

          {loading ? (
            <Loading label="Loading bookings" />
          ) : filtered.length === 0 ? (
            <Empty>{search.trim() ? `No matches for “${search.trim()}”.` : 'No bookings in this view.'}</Empty>
          ) : (
            <div className={tbl.wrap}>
              <table className={`${tbl.table} min-w-[880px]`}>
                <thead>
                  <tr className={tbl.headRow}>
                    <th className={tbl.th}>Guest</th>
                    <th className={tbl.th}>Room</th>
                    <th className={tbl.th}>Property</th>
                    <th className={tbl.th}>Stay</th>
                    <th className={tbl.th}>Status</th>
                    <th className={`${tbl.th} text-right`}>Total</th>
                    <th className={tbl.th}><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className={tbl.body}>
                  {filtered.map((b, idx) => {
                    const range = fmtStayRange(b.check_in_date, b.check_out_date);
                    const href = `/dashboard/bookings/${b.booking_id}`;
                    return (
                      <tr
                        key={b.booking_room_id || `${b.booking_id}-${b.room_number ?? idx}`}
                        onClick={() => router.push(href)}
                        className={`${tbl.row} cursor-pointer group`}
                      >
                        <td className={`${tbl.td} max-w-[280px]`}>
                          <Link href={href} onClick={e => e.stopPropagation()} className="block text-[15px] text-ink truncate hover:text-skynest-accent transition-colors duration-300">
                            {b.guest_first_name} {b.guest_last_name}
                          </Link>
                          <p className={`${tbl.sub} truncate`}>{b.guest_email}</p>
                        </td>
                        <td className={tbl.td}>
                          <p className="font-cinzel text-[20px] leading-none">{b.room_number ?? '—'}</p>
                          <p className={tbl.sub}>{b.room_type_name ? titleCase(b.room_type_name) : 'Unassigned'}</p>
                        </td>
                        <td className={`${tbl.td} whitespace-nowrap`}>{b.branch_name}</td>
                        <td className={`${tbl.td} whitespace-nowrap tabular-nums`}>
                          {range.from} <span className="text-ink/50" aria-hidden>→</span> {range.to}
                        </td>
                        <td className={tbl.td}>
                          <StatusDot status={b.booking_status} />
                          {b.invoice_status && <p className={tbl.sub}>Invoice {titleCase(b.invoice_status).toLowerCase()}</p>}
                        </td>
                        <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap`}>
                          {b.total_amount ? fmtMoney(toNum(b.total_amount), 2) : '—'}
                        </td>
                        <td className={`${tbl.td} pr-0 w-8`}>
                          <ChevronRight className="w-4 h-4 text-ink/50 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
