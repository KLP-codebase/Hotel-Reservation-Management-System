'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Receipt, CalendarCheck, Clock, UserCheck } from 'lucide-react';
import { apiFetch, toNum } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import {
  DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, SearchField,
  Loading, Empty, StatusDot, tbl, fmtStayRange, fmtLKR, titleCase, initials, parseStayDate, toLocalYMD,
} from '@/components/dashboard/ui';

interface RecentBooking {
  booking_id: string;
  booking_room_id?: string;
  booking_status: string;
  booking_created_at: string;
  branch_id?: string;
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

interface Branch {
  branch_id:   string;
  branch_name: string;
  city?:       string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT';

export default function BookingsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdminOrDba = user?.role === 'ADMINISTRATOR' || user?.role === 'DBA';
  const isManager = user?.role === 'MANAGER';

  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const todayStr = toLocalYMD(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranch !== 'ALL' ? `&branchId=${selectedBranch}` : '';
      const [res, bRes] = await Promise.all([
        apiFetch<{ data: RecentBooking[] }>(`/api/v1/dashboard/bookings?limit=100${branchParam}`),
        apiFetch<{ data: Branch[] }>('/api/v1/branches').catch(() => ({ data: [] })),
      ]);
      setBookings(res.data ?? []);
      setBranches(bRes.data ?? []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If Manager is logged in, default/lock to their branch
  useEffect(() => {
    if (isManager && user?.branchId) {
      setSelectedBranch(user.branchId);
    }
  }, [isManager, user]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch = `${b.guest_first_name} ${b.guest_last_name} ${b.booking_id} ${b.guest_email} ${b.room_number ?? ''} ${b.branch_name ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || b.booking_status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const countOf = (s: StatusFilter) => bookings.filter((b) => b.booking_status.toUpperCase() === s).length;
  const toggle = (s: StatusFilter) => setStatusFilter((cur) => (cur === s ? 'ALL' : s));

  const selectedBranchRow = branches.find((b) => b.branch_id === selectedBranch);
  const mastheadTitle = isAdminOrDba
    ? (selectedBranch === 'ALL' ? 'All Properties' : selectedBranchRow?.branch_name ?? 'Bookings')
    : (user?.branchName ?? 'Bookings');

  return (
    <>
      <DashboardMasthead
        eyebrow={isManager ? `${user?.branchName ?? 'Sanctuary'} · Reservations` : 'Reservations · Management'}
        title="Bookings"
        imageKey={user?.branchName || selectedBranchRow?.branch_name}
        aside={
          <div className="flex items-center gap-6">
            {isAdminOrDba && branches.length > 0 && (
              <label className="relative flex items-center gap-3 border-b border-white/20 focus-within:border-skynest-accent transition-colors duration-300">
                <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-white/60">Property</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="appearance-none bg-transparent py-1.5 pr-6 font-jakarta text-[13px] text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="text-ink">All Properties</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id} className="text-ink">
                      {b.branch_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-white/60 pointer-events-none" />
              </label>
            )}
            <MastheadRefresh onClick={fetchData} loading={loading} />
          </div>
        }
        kpis={[
          { label: 'Pending',     value: String(countOf('PENDING')),     sub: 'Awaiting confirmation', onClick: () => toggle('PENDING'),     active: statusFilter === 'PENDING' },
          { label: 'Confirmed',   value: String(countOf('CONFIRMED')),   sub: 'Due to arrive',         onClick: () => toggle('CONFIRMED'),   active: statusFilter === 'CONFIRMED' },
          { label: 'In house',    value: String(countOf('CHECKED_IN')),  sub: 'Currently in residence', onClick: () => toggle('CHECKED_IN'), active: statusFilter === 'CHECKED_IN', bar: (countOf('CHECKED_IN') / (bookings.length || 1)) * 100 },
          { label: 'Checked out', value: String(countOf('CHECKED_OUT')), sub: 'Completed stays',       onClick: () => toggle('CHECKED_OUT'), active: statusFilter === 'CHECKED_OUT' },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-12">
        <section className="space-y-8">
          <SectionHeader index={`${filtered.length} of ${bookings.length} reservations`} title="Guest Reservations">
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
              <SearchField value={search} onChange={setSearch} placeholder="Search guest, email, room or booking ID" />
            </div>
          </SectionHeader>

          {loading ? (
            <Loading label="Loading reservations" />
          ) : filtered.length === 0 ? (
            <Empty>{search.trim() ? `No matches for “${search.trim()}”.` : 'No bookings in this view.'}</Empty>
          ) : (
            <div className={tbl.wrap}>
              <table className={`${tbl.table} min-w-[880px]`}>
                <thead>
                  <tr className={tbl.headRow}>
                    <th className={tbl.th}>Guest</th>
                    <th className={tbl.th}>Room</th>
                    {(isAdminOrDba && selectedBranch === 'ALL') && (
                      <th className={tbl.th}>Property</th>
                    )}
                    <th className={tbl.th}>Stay Duration</th>
                    <th className={tbl.th}>Reservation Status</th>
                    <th className={`${tbl.th} text-right`}>Folio Total</th>
                    <th className={tbl.th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbl.body}>
                  {filtered.map((b, idx) => {
                    const range = fmtStayRange(b.check_in_date, b.check_out_date);
                    const href = `/dashboard/bookings/${b.booking_id}`;
                    const isArrivingToday = toLocalYMD(parseStayDate(b.check_in_date)) === todayStr;
                    const isDepartingToday = toLocalYMD(parseStayDate(b.check_out_date)) === todayStr;

                    return (
                      <tr
                        key={b.booking_room_id || `${b.booking_id}-${b.room_number ?? idx}`}
                        onClick={() => router.push(href)}
                        className={`${tbl.row} cursor-pointer group`}
                      >
                        <td className={`${tbl.td} max-w-[280px]`}>
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 shrink-0 rounded-full bg-ink text-white flex items-center justify-center font-cinzel text-[11px] font-medium tracking-[0.04em]">
                              {initials(b.guest_first_name, b.guest_last_name)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={href}
                                onClick={(e) => e.stopPropagation()}
                                className="block font-medium text-[14px] text-ink truncate hover:text-skynest-accent transition-colors"
                              >
                                {b.guest_first_name} {b.guest_last_name}
                              </Link>
                              <p className={`${tbl.sub} truncate text-[12px]`}>{b.guest_email}</p>
                            </div>
                          </div>
                        </td>

                        <td className={tbl.td}>
                          <p className="font-cinzel text-[18px] leading-none text-ink">{b.room_number ?? '—'}</p>
                          <p className={tbl.sub}>{b.room_type_name ? titleCase(b.room_type_name) : 'Unassigned'}</p>
                        </td>

                        {(isAdminOrDba && selectedBranch === 'ALL') && (
                          <td className={`${tbl.td} whitespace-nowrap text-ink font-medium`}>
                            {b.branch_name}
                          </td>
                        )}

                        <td className={`${tbl.td} whitespace-nowrap tabular-nums`}>
                          <div className="flex items-center gap-1.5 text-ink">
                            <span>{range.from}</span>
                            <span className="text-ink/40">→</span>
                            <span>{range.to}</span>
                          </div>
                          {isArrivingToday && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Arriving Today
                            </span>
                          )}
                          {isDepartingToday && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                              Departing Today
                            </span>
                          )}
                        </td>

                        <td className={tbl.td}>
                          <div className="space-y-0.5">
                            <StatusDot status={b.booking_status} />
                            {b.invoice_status && (
                              <p className="text-[11px] font-jakarta text-ink/60 uppercase tracking-wider">
                                Invoice {titleCase(b.invoice_status).toLowerCase()}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap font-medium text-[14px]`}>
                          {b.total_amount ? fmtLKR(toNum(b.total_amount)) : <span className="text-ink/40">—</span>}
                        </td>

                        <td className={`${tbl.td} pr-0 w-12 text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/billing?q=${b.booking_id}`}
                              onClick={(e) => e.stopPropagation()}
                              title="View Folio & Billing"
                              className="w-7 h-7 flex items-center justify-center rounded-[4px] text-ink/50 hover:text-skynest-accent hover:bg-ink/[0.04] transition-colors"
                            >
                              <Receipt className="w-4 h-4" />
                            </Link>
                            <ChevronRight className="w-4 h-4 text-ink/40 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                          </div>
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
