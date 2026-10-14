'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Pencil, UserX, Mail, Phone, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import {
  DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, SearchField,
  Toolbar, Btn, IconBtn, Field, SelectField, Modal, Loading, Empty, StatusDot,
  tbl, titleCase, initials, useFlash,
} from '@/components/dashboard/ui';

interface Staff {
  staff_id:    string;
  first_name:  string;
  last_name:   string;
  email:       string;
  phone:       string | null;
  role:        string;
  is_active:   boolean;
  branch_name: string | null;
  branch_city: string | null;
  user_account_id?: string | null;
  invite_token?: string | null;
  branch_id?:  string | null;
}

interface Branch {
  branch_id:   string;
  branch_name: string;
  city?:       string;
}

const ROLES = ['GUEST', 'RECEPTIONIST', 'SERVICE_STAFF', 'MANAGER', 'ADMINISTRATOR', 'DBA'] as const;

type RoleFilter = 'ALL' | 'RECEPTIONIST' | 'SERVICE_STAFF' | 'MANAGER' | 'ADMINISTRATOR';

const staffSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName:  z.string().trim().min(1, 'Last name is required'),
  email:     z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  phone:     z.string().trim().min(1, 'Phone number is required'),
  role:      z.enum(ROLES, { errorMap: () => ({ message: 'Please select a valid role' }) }),
  branchId:  z.string().optional(),
});
type StaffForm = z.infer<typeof staffSchema>;

const canMutate = (role?: string) => role === 'ADMINISTRATOR' || role === 'DBA';
// Roles a manager may add to their own branch (matches backend/src/routes/staff.routes.ts).
const MANAGER_HIRABLE_ROLES: readonly string[] = ['RECEPTIONIST', 'SERVICE_STAFF'];

const ROLE_BADGE: Record<string, { label: string; style: string }> = {
  ADMINISTRATOR: { label: 'Administrator', style: 'text-amber-800 bg-amber-500/10 border-amber-500/30' },
  DBA:           { label: 'Database Admin', style: 'text-purple-800 bg-purple-500/10 border-purple-500/30' },
  MANAGER:       { label: 'General Manager', style: 'text-skynest-accent bg-skynest-accent/10 border-skynest-accent/30' },
  RECEPTIONIST:  { label: 'Front Desk', style: 'text-sky-800 bg-sky-500/10 border-sky-500/30' },
  SERVICE_STAFF: { label: 'Service Staff', style: 'text-emerald-800 bg-emerald-500/10 border-emerald-500/30' },
  GUEST:         { label: 'Guest Account', style: 'text-ink/60 bg-ink/5 border-skynest-hairline' },
};

export default function StaffPage() {
  const { user } = useAuth();
  const isAdminOrDba = user?.role === 'ADMINISTRATOR' || user?.role === 'DBA';
  const isManager = user?.role === 'MANAGER';

  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const { flash, toasts } = useFlash();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    mode: 'onChange',
  });

  const selectedRole = watch('role');
  const selectedFormBranch = watch('branchId');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, br] = await Promise.all([
        apiFetch<{ data: Staff[] }>('/api/v1/staff').catch(() => ({ data: [] })),
        // A manager's list is already limited to their branch by the API.
        isAdminOrDba
          ? apiFetch<{ data: Branch[] }>('/api/v1/branches').catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] as Branch[] }),
      ]);
      setStaff(sr.data ?? []);
      setBranches(br.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrDba]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setModalError(null);
    reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'SERVICE_STAFF',
      branchId: isManager && user?.branchId ? user.branchId : (branches[0]?.branch_id ?? ''),
    });
    setModalOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditing(s);
    setModalError(null);
    reset({
      firstName: s.first_name,
      lastName:  s.last_name,
      email:     s.email,
      phone:     s.phone ?? '',
      role:      s.role as typeof ROLES[number],
      branchId:  s.branch_id ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: StaffForm) => {
    setModalError(null);
    try {
      const payload = {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        phone:     data.phone,
        role:      data.role,
        branchId:  data.branchId ? data.branchId : undefined,
      };

      if (editing) {
        await apiFetch(`/api/v1/staff/${editing.staff_id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        flash('success', `Staff member "${data.firstName} ${data.lastName}" updated.`);
      } else {
        await apiFetch('/api/v1/staff', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        flash('success', `Staff member "${data.firstName} ${data.lastName}" registered.`);
      }
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      setModalError(e instanceof ApiError ? e.message : 'Failed to save staff member');
    }
  };

  const inviteStaff = async (id: string, name: string) => {
    try {
      await apiFetch(`/api/v1/staff/${id}/invite`, { method: 'POST' });
      flash('success', `Invitation dispatched to ${name}.`);
      await fetchData();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to send invitation');
    }
  };

  const deactivate = async (s: Staff) => {
    if (!confirm(`Deactivate staff member ${s.first_name} ${s.last_name}?`)) return;
    try {
      await apiFetch(`/api/v1/staff/${s.staff_id}`, { method: 'DELETE' });
      flash('success', `${s.first_name} ${s.last_name} deactivated.`);
      await fetchData();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to deactivate staff');
    }
  };

  // Filter staff by search, role, and branch
  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (selectedBranch !== 'ALL' && s.branch_id !== selectedBranch) return false;
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = `${s.first_name} ${s.last_name}`.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesRole = s.role.toLowerCase().includes(q);
        const matchesBranch = (s.branch_name ?? '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesRole || matchesBranch;
      }
      return true;
    });
  }, [staff, selectedBranch, roleFilter, search]);

  // Counts for KPIs and segmented filters
  const activeCount = staff.filter((s) => s.is_active).length;
  const opsCount = staff.filter((s) => s.role === 'RECEPTIONIST' || s.role === 'SERVICE_STAFF').length;
  const mgmtCount = staff.filter((s) => s.role === 'MANAGER' || s.role === 'ADMINISTRATOR' || s.role === 'DBA').length;

  const countByRole = (r: RoleFilter) =>
    r === 'ALL' ? staff.length : staff.filter((s) => s.role === r).length;

  const selectedBranchRow = branches.find((b) => b.branch_id === selectedBranch);

  return (
    <>
      {toasts}

      <DashboardMasthead
        eyebrow={isManager ? `${user?.branchName ?? 'Sanctuary'} · Team` : 'Human Resources · Directory'}
        title="Staff"
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
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
              </label>
            )}
            <MastheadRefresh onClick={fetchData} loading={loading} />
          </div>
        }
        kpis={[
          { label: 'Total staff', value: String(staff.length), sub: isAdminOrDba ? `Across ${branches.length} locations` : 'At this location' },
          { label: 'Active', value: String(activeCount), sub: 'Ready on schedule', bar: (activeCount / (staff.length || 1)) * 100 },
          { label: 'Front desk & ops', value: String(opsCount), sub: 'Reception & guest services' },
          { label: 'Leadership', value: String(mgmtCount), sub: 'Managers & administrators' },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-12">
        <section className="space-y-8">
          <SectionHeader
            index={`${filtered.length} of ${staff.length} staff`}
            title="Team Members"
          >
            <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
              <Segmented
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'ALL',           label: 'All',           count: staff.length },
                  { value: 'RECEPTIONIST',  label: 'Front Desk',    count: countByRole('RECEPTIONIST') },
                  { value: 'SERVICE_STAFF', label: 'Service Staff', count: countByRole('SERVICE_STAFF') },
                  { value: 'MANAGER',       label: 'Managers',      count: countByRole('MANAGER') },
                  ...(isAdminOrDba ? [{ value: 'ADMINISTRATOR' as const, label: 'Admin', count: countByRole('ADMINISTRATOR') }] : []),
                ]}
              />
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search staff by name, email or role"
              />
            </div>
          </SectionHeader>

          <Toolbar
            action={
              (canMutate(user?.role) || isManager) && (
                <Btn variant="primary" onClick={openCreate}>
                  <Plus className="w-4 h-4" /> Add staff member
                </Btn>
              )
            }
          />

          {loading ? (
            <Loading label="Loading staff directory" />
          ) : filtered.length === 0 ? (
            <Empty>
              {search.trim() ? `No staff match “${search.trim()}”.` : 'No staff members in this view.'}
            </Empty>
          ) : (
            <div className={tbl.wrap}>
              <table className={tbl.table}>
                <thead>
                  <tr className={tbl.headRow}>
                    <th className={tbl.th}>Staff Member</th>
                    <th className={tbl.th}>Role</th>
                    {isAdminOrDba && <th className={tbl.th}>Property</th>}
                    <th className={tbl.th}>Contact</th>
                    <th className={tbl.th}>Status</th>
                    <th className={tbl.th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbl.body}>
                  {filtered.map((s) => {
                    const badge = ROLE_BADGE[s.role] ?? { label: titleCase(s.role), style: 'text-ink/70 bg-ink/5 border-skynest-hairline' };
                    return (
                      <tr key={s.staff_id} className={tbl.row}>
                        <td className={`${tbl.td} max-w-[280px]`}>
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 shrink-0 rounded-full bg-ink text-white flex items-center justify-center font-cinzel text-[13px] tracking-[0.04em]">
                              {initials(s.first_name, s.last_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-ink truncate text-[14px]">
                                {s.first_name} {s.last_name}
                              </p>
                              <p className="text-[12px] text-ink/70 truncate">{s.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className={tbl.td}>
                          <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-jakarta font-semibold uppercase tracking-wider border rounded-[4px] ${badge.style}`}>
                            {badge.label}
                          </span>
                        </td>

                        {isAdminOrDba && (
                          <td className={`${tbl.td} whitespace-nowrap`}>
                            <p className="text-[13px] text-ink">{s.branch_name ?? 'Corporate / Headquarters'}</p>
                            {s.branch_city && <p className={tbl.sub}>{s.branch_city}</p>}
                          </td>
                        )}

                        <td className={`${tbl.td} whitespace-nowrap text-[13px]`}>
                          {s.phone ? (
                            <a
                              href={`tel:${s.phone}`}
                              className="inline-flex items-center gap-1.5 text-ink hover:text-skynest-accent transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-ink/50" />
                              <span>{s.phone}</span>
                            </a>
                          ) : (
                            <span className="text-ink/40">—</span>
                          )}
                        </td>

                        <td className={tbl.td}>
                          <div className="flex flex-col gap-1">
                            <StatusDot
                              status={s.is_active ? 'ACTIVE' : 'INACTIVE'}
                              label={s.is_active ? 'Active' : 'Deactivated'}
                            />
                            {!s.user_account_id && s.is_active && (
                              <span className="text-[10px] font-jakarta text-amber-700 tracking-wider uppercase font-medium">
                                {s.invite_token ? '• Invite Sent' : '• Needs Account'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className={`${tbl.td} pr-0 text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            {!s.user_account_id && s.is_active && (
                              <Btn
                                variant="outline"
                                onClick={() => inviteStaff(s.staff_id, `${s.first_name} ${s.last_name}`)}
                                title={s.invite_token ? 'Resend invitation email' : 'Send staff portal invitation'}
                                className="text-[10px] px-2.5 py-1.5"
                              >
                                <Mail className="w-3.5 h-3.5 text-skynest-accent" />
                                <span>{s.invite_token ? 'Re-invite' : 'Invite'}</span>
                              </Btn>
                            )}

                            {canMutate(user?.role) && (
                              <>
                                <IconBtn
                                  label={`Edit ${s.first_name}`}
                                  variant="ghost"
                                  onClick={() => openEdit(s)}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-ink/70 hover:text-ink" />
                                </IconBtn>

                                {s.is_active && (
                                  <IconBtn
                                    label={`Deactivate ${s.first_name}`}
                                    variant="danger"
                                    onClick={() => deactivate(s)}
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </IconBtn>
                                )}
                              </>
                            )}
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

      {/* ── Add / Edit Staff Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <Modal
          eyebrow="Human Resources"
          title={editing ? 'Edit Staff Member' : 'Register Staff Member'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
              <Btn variant="primary" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>
                {editing ? 'Save Changes' : 'Create Staff'}
              </Btn>
            </>
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="First name"
                placeholder="e.g. Kavindi"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Field
                label="Last name"
                placeholder="e.g. Jayawardena"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Field
              label="Email address"
              type="email"
              disabled={Boolean(editing)}
              placeholder="e.g. kavindi@skynest.lk"
              error={errors.email?.message}
              hint={editing ? 'Email cannot be changed after creation.' : undefined}
              {...register('email')}
            />

            <Field
              label="Phone number"
              placeholder="e.g. +94 77 100 0004"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Staff Role"
                value={selectedRole ?? 'SERVICE_STAFF'}
                error={errors.role?.message}
                onChange={(v) => setValue('role', v as typeof ROLES[number])}
              >
                {ROLES.filter((r) => isManager ? MANAGER_HIRABLE_ROLES.includes(r) : (r !== 'ADMINISTRATOR' || isAdminOrDba)).map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </SelectField>

              {/* A manager always hires into their own branch (the API enforces it). */}
              {!isManager && (
                <SelectField
                  label="Assigned Branch"
                  value={selectedFormBranch ?? ''}
                  error={errors.branchId?.message}
                  onChange={(v) => setValue('branchId', v)}
                >
                  <option value="">— None (Corporate) —</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.branch_name}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>

            {modalError && (
              <p className="text-[12px] text-red-600 border border-red-200 bg-red-50 p-3 rounded-[4px]">
                {modalError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
