'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus, Pencil, MapPin, Phone, Mail, Power, Sparkles, Building2,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import {
  DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, SearchField,
  Toolbar, Btn, IconBtn, Field, Modal, Loading, Empty, StatusDot,
  tbl, mastheadImage, useFlash,
} from '@/components/dashboard/ui';

interface Branch {
  branch_id:   number | string;
  branch_name: string;
  city:        string;
  address:     string | null;
  phone:       string | null;
  email:       string | null;
  is_active:   boolean;
}

type ViewMode = 'cards' | 'table';

export default function BranchesPage() {
  const { user } = useAuth();
  const isAdminOrDba = user?.role === 'ADMINISTRATOR' || user?.role === 'DBA';
  const isManager = user?.role === 'MANAGER';
  const canMutate = user && ['ADMINISTRATOR', 'DBA', 'MANAGER'].includes(user.role);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const { flash, toasts } = useFlash();

  // Modal State
  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
  const [editing,   setEditing]   = useState<Branch | null>(null);
  const [form,      setForm]      = useState({
    branchName: '',
    city:       '',
    address:    '',
    phone:      '',
    email:      '',
    isActive:   true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | string | null>(null);

  // ── Fetch Branches ───────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Branch[] }>('/api/v1/branches?include_inactive=true');
      setBranches(res.data ?? []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // ── Modal Openers ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm({
      branchName: '',
      city:       '',
      address:    '',
      phone:      '',
      email:      '',
      isActive:   true,
    });
    setErrors({});
    setModalType('create');
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setForm({
      branchName: b.branch_name,
      city:       b.city,
      address:    b.address ?? '',
      phone:      b.phone ?? '',
      email:      b.email ?? '',
      isActive:   b.is_active,
    });
    setErrors({});
    setModalType('edit');
  }

  function validateForm() {
    const errs: Record<string, string> = {};
    if (!form.branchName.trim()) errs.branchName = 'Property name is required';
    if (!form.city.trim())       errs.city       = 'City location is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitForm() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        branchName: form.branchName.trim(),
        city:       form.city.trim(),
        address:    form.address.trim() || undefined,
        phone:      form.phone.trim() || undefined,
        email:      form.email.trim() || undefined,
        isActive:   form.isActive,
      };

      if (modalType === 'create') {
        await apiFetch('/api/v1/branches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        flash('success', `Branch "${form.branchName}" registered successfully.`);
      } else if (editing) {
        await apiFetch(`/api/v1/branches/${editing.branch_id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        flash('success', `Branch "${form.branchName}" updated successfully.`);
      }
      setModalType(null);
      await fetchBranches();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to save branch property');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActiveState(b: Branch) {
    const nextState = !b.is_active;
    setTogglingId(b.branch_id);
    try {
      await apiFetch(`/api/v1/branches/${b.branch_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState }),
      });
      flash('success', `Branch "${b.branch_name}" marked ${nextState ? 'active' : 'inactive'}.`);
      await fetchBranches();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to change branch status');
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          b.branch_name.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          (b.address ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [branches, search]);

  const activeCount = branches.filter((b) => b.is_active).length;
  const uniqueCities = new Set(branches.map((b) => b.city)).size;

  return (
    <>
      {toasts}

      <DashboardMasthead
        eyebrow={isManager ? `${user?.branchName ?? 'Sanctuary'} · Portfolio` : 'Properties · Portfolio'}
        title="Branches"
        imageKey={user?.branchName || 'Colombo'}
        aside={<MastheadRefresh onClick={fetchBranches} loading={loading} />}
        kpis={[
          { label: 'Properties', value: String(branches.length), sub: 'Across Sri Lanka' },
          { label: 'Active', value: String(activeCount), sub: 'Welcoming guests', bar: (activeCount / (branches.length || 1)) * 100 },
          { label: 'Destinations', value: String(uniqueCities), sub: 'Unique cities' },
          { label: 'Assigned', value: user?.branchName ? 'Your Branch' : 'Corporate', sub: user?.branchName ?? 'Headquarters' },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-12">
        <section className="space-y-8">
          <SectionHeader
            index={`${filtered.length} of ${branches.length} locations`}
            title="Hotel Sanctuaries"
          >
            <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'cards', label: 'Showcase Cards', count: filtered.length },
                  { value: 'table', label: 'Table List' },
                ]}
              />
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search branch name or city"
              />
            </div>
          </SectionHeader>

          <Toolbar
            action={
              canMutate && (
                <Btn variant="primary" onClick={openCreate}>
                  <Plus className="w-4 h-4" /> Add property
                </Btn>
              )
            }
          />

          {loading ? (
            <Loading label="Loading branch sanctuaries" />
          ) : filtered.length === 0 ? (
            <Empty>
              {search.trim() ? `No properties match “${search.trim()}”.` : 'No branches registered yet.'}
            </Empty>
          ) : viewMode === 'cards' ? (
            /* ── Showcase Cards View ─────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((b) => {
                const isUserBranch =
                  (user?.branchId && String(b.branch_id) === String(user.branchId)) ||
                  (user?.branchName && b.branch_name.toLowerCase().includes(user.branchName.toLowerCase()));

                return (
                  <div
                    key={b.branch_id}
                    className={`relative overflow-hidden rounded-[4px] border transition-all duration-300 flex flex-col bg-paper ${
                      isUserBranch
                        ? 'border-skynest-accent ring-1 ring-skynest-accent/30 shadow-md'
                        : 'border-skynest-hairline hover:border-ink/30 shadow-sm'
                    }`}
                  >
                    {/* Photo Header */}
                    <div className="relative h-48 w-full bg-ink overflow-hidden">
                      <Image
                        src={mastheadImage(b.city)}
                        alt={b.branch_name}
                        fill
                        className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-ink/80 backdrop-blur-md border border-white/20 text-white font-jakarta text-[10px] font-semibold uppercase tracking-wider">
                          <MapPin className="w-3 h-3 text-skynest-accent" />
                          {b.city}
                        </span>

                        {isUserBranch && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[4px] bg-skynest-accent text-white font-jakarta text-[10px] font-semibold uppercase tracking-wider shadow">
                            <Sparkles className="w-3 h-3" />
                            Your Sanctuary
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="font-cinzel text-[22px] leading-tight text-white drop-shadow-sm">
                          {b.branch_name}
                        </h3>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="space-y-3 font-jakarta text-[13px] text-ink/70">
                        {b.address && (
                          <p className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-ink/40 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{b.address}</span>
                          </p>
                        )}
                        {b.phone && (
                          <p className="flex items-center gap-2.5">
                            <Phone className="w-4 h-4 text-ink/40 shrink-0" />
                            <a href={`tel:${b.phone}`} className="hover:text-skynest-accent transition-colors">
                              {b.phone}
                            </a>
                          </p>
                        )}
                        {b.email && (
                          <p className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-ink/40 shrink-0" />
                            <a href={`mailto:${b.email}`} className="hover:text-skynest-accent transition-colors truncate">
                              {b.email}
                            </a>
                          </p>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="pt-4 border-t border-skynest-hairline flex items-center justify-between">
                        <StatusDot
                          status={b.is_active ? 'ACTIVE' : 'INACTIVE'}
                          label={b.is_active ? 'Operational' : 'Closed'}
                        />

                        {canMutate && (
                          <div className="flex items-center gap-2">
                            <Btn
                              variant="ghost"
                              onClick={() => openEdit(b)}
                              className="text-[10px] px-2.5 py-1.5"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Btn>

                            <IconBtn
                              label={b.is_active ? 'Deactivate branch' : 'Activate branch'}
                              variant={b.is_active ? 'danger' : 'outline'}
                              loading={togglingId === b.branch_id}
                              onClick={() => toggleActiveState(b)}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </IconBtn>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Table View ──────────────────────────────────────────────────── */
            <div className={tbl.wrap}>
              <table className={tbl.table}>
                <thead>
                  <tr className={tbl.headRow}>
                    <th className={tbl.th}>Property Name</th>
                    <th className={tbl.th}>City</th>
                    <th className={tbl.th}>Address</th>
                    <th className={tbl.th}>Contact</th>
                    <th className={tbl.th}>Status</th>
                    <th className={tbl.th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbl.body}>
                  {filtered.map((b) => (
                    <tr key={b.branch_id} className={tbl.row}>
                      <td className={`${tbl.td} font-medium`}>
                        <div className="flex items-center gap-2">
                          <span className="font-cinzel text-[17px] text-ink">{b.branch_name}</span>
                          {((user?.branchId && String(b.branch_id) === String(user.branchId)) ||
                            (user?.branchName && b.branch_name.includes(user.branchName))) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-skynest-accent/10 border border-skynest-accent/30 text-skynest-accent font-semibold uppercase">
                              Your Sanctuary
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={`${tbl.td} whitespace-nowrap`}>
                        <span className="font-jakarta text-[13px] text-ink">{b.city}</span>
                      </td>

                      <td className={`${tbl.td} max-w-[260px]`}>
                        <p className="truncate text-ink/70 text-[13px]">{b.address ?? '—'}</p>
                      </td>

                      <td className={`${tbl.td} whitespace-nowrap text-[13px]`}>
                        <div className="space-y-0.5">
                          {b.phone && (
                            <p className="text-ink">
                              <a href={`tel:${b.phone}`} className="hover:text-skynest-accent transition-colors">{b.phone}</a>
                            </p>
                          )}
                          {b.email && (
                            <p className="text-ink/60 text-[12px]">
                              <a href={`mailto:${b.email}`} className="hover:text-skynest-accent transition-colors">{b.email}</a>
                            </p>
                          )}
                          {!b.phone && !b.email && <span className="text-ink/40">—</span>}
                        </div>
                      </td>

                      <td className={tbl.td}>
                        <StatusDot
                          status={b.is_active ? 'ACTIVE' : 'INACTIVE'}
                          label={b.is_active ? 'Operational' : 'Closed'}
                        />
                      </td>

                      <td className={`${tbl.td} pr-0 text-right`}>
                        {canMutate && (
                          <div className="flex items-center justify-end gap-2">
                            <IconBtn label="Edit branch" variant="ghost" onClick={() => openEdit(b)}>
                              <Pencil className="w-3.5 h-3.5 text-ink/70 hover:text-ink" />
                            </IconBtn>
                            <IconBtn
                              label={b.is_active ? 'Deactivate branch' : 'Activate branch'}
                              variant={b.is_active ? 'danger' : 'outline'}
                              loading={togglingId === b.branch_id}
                              onClick={() => toggleActiveState(b)}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </IconBtn>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ── Add / Edit Branch Modal ──────────────────────────────────────── */}
      {modalType && (
        <Modal
          eyebrow="Portfolio Management"
          title={modalType === 'create' ? 'Register New Sanctuary' : 'Edit Sanctuary Details'}
          onClose={() => setModalType(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModalType(null)}>Cancel</Btn>
              <Btn variant="primary" loading={saving} onClick={submitForm}>
                {modalType === 'create' ? 'Register Property' : 'Save Changes'}
              </Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Property Name"
                placeholder="e.g. Sky Nest Galle"
                value={form.branchName}
                error={errors.branchName}
                onChange={(e) => setForm({ ...form, branchName: e.target.value })}
              />
              <Field
                label="City Location"
                placeholder="e.g. Galle"
                value={form.city}
                error={errors.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <Field
              label="Physical Address"
              placeholder="e.g. 12 Closenberg Road, Galle"
              value={form.address}
              error={errors.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Phone Number"
                placeholder="e.g. +94 91 223 4567"
                value={form.phone}
                error={errors.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Field
                label="Email Address"
                placeholder="e.g. galle@skynest.lk"
                type="email"
                value={form.email}
                error={errors.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-3 pt-2 cursor-pointer font-jakarta text-[13px] text-ink">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded-[2px] accent-ink cursor-pointer"
              />
              <span>Property is open and accepting guest reservations</span>
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
