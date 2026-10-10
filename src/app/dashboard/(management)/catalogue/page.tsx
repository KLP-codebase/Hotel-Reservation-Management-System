'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, CalendarCheck, Check } from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import {
  DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, Toolbar, FilterSelect,
  Btn, IconBtn, Field, SelectField, Modal, Loading, Empty, StatusDot, tbl, fmtLKR, fmtDay, useFlash,
} from '@/components/dashboard/ui';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  branch_id:   number;
  branch_name: string;
  city:        string;
}

interface CatalogueService {
  service_id:   number;
  branch_id:    number;
  branch_name?: string;
  service_name: string;
  category:     string;
  base_price:   number;
  is_active:    boolean;
}

interface TaxConfig {
  tax_id:         number;
  tax_name:       string;
  tax_percentage: number;
  is_active:      boolean;
  effective_from: string;
  effective_to:   string | null;
}

type Tab = 'services' | 'taxes';

const SERVICE_CATEGORIES = ['Dining', 'Wellness', 'Transport', 'Laundry', 'Activities', 'Other'];

// ── Page Component ─────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const { user } = useAuth();
  const isAdminOrDba = user?.role === 'ADMINISTRATOR' || user?.role === 'DBA';
  const isManager = user?.role === 'MANAGER';
  const canMutate = user && ['ADMINISTRATOR', 'DBA', 'MANAGER'].includes(user.role);

  // Data states
  const [services, setServices] = useState<CatalogueService[]>([]);
  const [taxes,    setTaxes]    = useState<TaxConfig[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Tabs & filters
  const [activeTab,        setActiveTab]        = useState<Tab>('services');
  const [filterBranch,     setFilterBranch]     = useState('ALL');
  const [filterCategory,   setFilterCategory]   = useState('ALL');
  const [filterStatus,     setFilterStatus]     = useState('ALL');

  // Flash notifications
  const { flash, toasts } = useFlash();

  // Pre-filter to manager's branch when logged in as Manager
  useEffect(() => {
    if (isManager && user?.branchId && branches.length > 0) {
      const found = branches.find(
        (b) => String(b.branch_id) === String(user.branchId) ||
               (user.branchName && b.branch_name.toLowerCase().includes(user.branchName.toLowerCase()))
      );
      if (found) {
        setFilterBranch(String(found.branch_id));
      }
    }
  }, [isManager, user, branches]);

  // ── Service modal state ──────────────────────────────────────────────────────
  const [svcModal,   setSvcModal]   = useState<'create' | 'edit' | null>(null);
  const [svcEditing, setSvcEditing] = useState<CatalogueService | null>(null);
  const [svcForm,    setSvcForm]    = useState({ serviceName: '', category: 'Dining', basePrice: '', branchId: '', isActive: true });
  const [svcErrors,  setSvcErrors]  = useState<Record<string, string>>({});
  const [svcSaving,  setSvcSaving]  = useState(false);

  // ── Book service for guest state ───────────────────────────────────────────
  const [bookModalOpen,   setBookModalOpen]   = useState(false);
  const [bookTarget,      setBookTarget]      = useState<CatalogueService | null>(null);
  const [activeBookings,  setActiveBookings]  = useState<Array<{ booking_id: string; guest_first_name: string; guest_last_name: string; room_number: string | null; branch_name: string }>>([]);
  const [bookBookingId,   setBookBookingId]   = useState('');
  const [bookQuantity,    setBookQuantity]    = useState(1);
  const [bookDate,        setBookDate]        = useState(new Date().toISOString().split('T')[0]);
  const [bookTime,        setBookTime]        = useState('10:00');
  const [bookNotes,       setBookNotes]       = useState('');
  const [bookSaving,      setBookSaving]      = useState(false);

  // ── Tax modal state ──────────────────────────────────────────────────────────
  const [taxModal,   setTaxModal]   = useState<'create' | 'edit' | null>(null);
  const [taxEditing, setTaxEditing] = useState<TaxConfig | null>(null);
  const [taxForm,    setTaxForm]    = useState({ taxName: '', taxPercentage: '', effectiveFrom: '', effectiveTo: '', isActive: true });
  const [taxErrors,  setTaxErrors]  = useState<Record<string, string>>({});
  const [taxSaving,  setTaxSaving]  = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, taxRes, bRes] = await Promise.all([
        apiFetch<{ data: CatalogueService[] }>('/api/v1/services/catalogue').catch(() => ({ data: [] })),
        apiFetch<{ data: TaxConfig[] }>('/api/v1/taxes').catch(() => ({ data: [] })),
        apiFetch<{ data: Branch[] }>('/api/v1/branches').catch(() => ({ data: [] })),
      ]);
      setServices(svcRes.data);
      setTaxes(taxRes.data);
      setBranches(bRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered services ────────────────────────────────────────────────────────
  const filteredServices = services.filter(s => {
    if (filterBranch   !== 'ALL' && String(s.branch_id) !== filterBranch) return false;
    if (filterCategory !== 'ALL' && s.category          !== filterCategory) return false;
    if (filterStatus   === 'ACTIVE'   && !s.is_active)  return false;
    if (filterStatus   === 'INACTIVE' && s.is_active)   return false;
    return true;
  });

  // ── Service CRUD ─────────────────────────────────────────────────────────────
  function openCreateSvc() {
    setSvcEditing(null);
    const defaultBranch = (isManager && user?.branchId)
      ? String(user.branchId)
      : (filterBranch !== 'ALL' ? filterBranch : (branches[0] ? String(branches[0].branch_id) : ''));
    setSvcForm({
      serviceName: '',
      category: 'Dining',
      basePrice: '',
      branchId: defaultBranch,
      isActive: true,
    });
    setSvcErrors({});
    setSvcModal('create');
  }

  function openEditSvc(s: CatalogueService) {
    setSvcEditing(s);
    setSvcForm({
      serviceName: s.service_name,
      category: s.category,
      basePrice: String(s.base_price),
      branchId: String(s.branch_id),
      isActive: s.is_active,
    });
    setSvcErrors({});
    setSvcModal('edit');
  }

  function validateSvcForm() {
    const errs: Record<string, string> = {};
    if (!svcForm.serviceName.trim()) errs.serviceName = 'Service name is required';
    if (!svcForm.category)          errs.category    = 'Category is required';
    if (!svcForm.branchId)          errs.branchId    = 'Applicable branch is required';
    if (!svcForm.basePrice || isNaN(Number(svcForm.basePrice)) || Number(svcForm.basePrice) < 0) {
      errs.basePrice = 'Enter a valid non-negative price';
    }
    setSvcErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitSvcForm() {
    if (!validateSvcForm()) return;
    setSvcSaving(true);
    try {
      const body = {
        service_name: svcForm.serviceName.trim(),
        category:     svcForm.category,
        branch_id:    Number(svcForm.branchId),
        base_price:   Number(svcForm.basePrice),
        is_active:    svcForm.isActive,
      };

      if (svcModal === 'create') {
        await apiFetch('/api/v1/services/catalogue', { method: 'POST', body: JSON.stringify(body) });
        flash('success', `Service "${svcForm.serviceName}" registered successfully.`);
      } else if (svcEditing) {
        await apiFetch(`/api/v1/services/catalogue/${svcEditing.service_id}`, { method: 'PATCH', body: JSON.stringify(body) });
        flash('success', `Service "${svcForm.serviceName}" updated.`);
      }
      setSvcModal(null);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to save service');
    } finally {
      setSvcSaving(false);
    }
  }

  async function toggleServiceStatus(s: CatalogueService) {
    try {
      await apiFetch(`/api/v1/services/catalogue/${s.service_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      flash('success', `Service "${s.service_name}" ${!s.is_active ? 'activated' : 'deactivated'}.`);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to toggle status');
    }
  }

  async function deleteService(s: CatalogueService) {
    if (!confirm(`Deactivate service "${s.service_name}" from catalogue?`)) return;
    try {
      await apiFetch(`/api/v1/services/catalogue/${s.service_id}`, { method: 'DELETE' });
      flash('success', `Service "${s.service_name}" deactivated.`);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to deactivate service');
    }
  }

  async function openBookModal(s?: CatalogueService) {
    const target = s || services[0] || null;
    setBookTarget(target);
    setBookQuantity(1);
    setBookDate(new Date().toISOString().split('T')[0]);
    setBookTime('10:00');
    setBookNotes('');
    setBookModalOpen(true);
    try {
      const res = await apiFetch<{ data: Array<{ booking_id: string; guest_first_name: string; guest_last_name: string; room_number: string | null; branch_name: string }> }>('/api/v1/dashboard/bookings?limit=50');
      const list = res.data || [];
      setActiveBookings(list);
      if (list.length > 0) {
        setBookBookingId(list[0].booking_id);
      }
    } catch {
      setActiveBookings([]);
    }
  }

  async function submitBookService() {
    if (!bookTarget) {
      flash('error', 'Please select a service.');
      return;
    }
    if (!bookBookingId) {
      flash('error', 'Please select an active guest booking.');
      return;
    }
    setBookSaving(true);
    try {
      const body = {
        service_name: bookTarget.service_name,
        category: bookTarget.category,
        price_at_usage: Number(bookTarget.base_price),
        quantity: Number(bookQuantity),
        notes: bookNotes.trim() ? bookNotes.trim() : undefined,
        date: bookDate,
        appointment_time: bookTarget.category === 'Wellness' ? bookTime : undefined,
        meal_time: bookTarget.category === 'Dining' ? bookTime : undefined,
      };

      await apiFetch(`/api/v1/services/folio/${bookBookingId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      flash('success', `Service "${bookTarget.service_name}" charged to room folio successfully.`);
      setBookModalOpen(false);
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to charge service to booking folio.');
    } finally {
      setBookSaving(false);
    }
  }

  // ── Tax CRUD ─────────────────────────────────────────────────────────────────
  function openCreateTax() {
    setTaxEditing(null);
    setTaxForm({
      taxName: '',
      taxPercentage: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      isActive: true,
    });
    setTaxErrors({});
    setTaxModal('create');
  }

  function openEditTax(t: TaxConfig) {
    setTaxEditing(t);
    setTaxForm({
      taxName: t.tax_name,
      taxPercentage: String(t.tax_percentage),
      effectiveFrom: t.effective_from ? t.effective_from.split('T')[0] : '',
      effectiveTo: t.effective_to ? t.effective_to.split('T')[0] : '',
      isActive: t.is_active,
    });
    setTaxErrors({});
    setTaxModal('edit');
  }

  function validateTaxForm() {
    const errs: Record<string, string> = {};
    if (!taxForm.taxName.trim()) errs.taxName = 'Tax name is required';
    if (!taxForm.taxPercentage || isNaN(Number(taxForm.taxPercentage)) || Number(taxForm.taxPercentage) <= 0) {
      errs.taxPercentage = 'Enter a positive tax percentage';
    }
    if (!taxForm.effectiveFrom) errs.effectiveFrom = 'Effective from date is required';
    setTaxErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitTaxForm() {
    if (!validateTaxForm()) return;
    setTaxSaving(true);
    try {
      if (taxModal === 'create') {
        const body = {
          tax_name:       taxForm.taxName.trim(),
          tax_percentage: Number(taxForm.taxPercentage),
          effective_from: taxForm.effectiveFrom,
          effective_to:   taxForm.effectiveTo.trim() ? taxForm.effectiveTo : null,
          is_active:      taxForm.isActive,
        };
        await apiFetch('/api/v1/taxes', { method: 'POST', body: JSON.stringify(body) });
        flash('success', `Tax rate "${taxForm.taxName}" scheduled.`);
      } else if (taxEditing) {
        const body = {
          tax_percentage: Number(taxForm.taxPercentage),
          effective_to:   taxForm.effectiveTo.trim() ? taxForm.effectiveTo : null,
          is_active:      taxForm.isActive,
        };
        await apiFetch(`/api/v1/taxes/${taxEditing.tax_id}`, { method: 'PATCH', body: JSON.stringify(body) });
        flash('success', `Tax configuration "${taxEditing.tax_name}" updated.`);
      }
      setTaxModal(null);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to save tax rate');
    } finally {
      setTaxSaving(false);
    }
  }


  // ── Headline figures ─────────────────────────────────────────────────────────
  const displayedServices = filterBranch === 'ALL' ? services : services.filter(s => String(s.branch_id) === filterBranch);
  const activeServices = displayedServices.filter(s => s.is_active).length;
  const categoriesUsed = new Set(displayedServices.map(s => s.category)).size;
  const activeTaxes    = taxes.filter(t => t.is_active).length;

  const selectedBranchRow = branches.find((b) => String(b.branch_id) === filterBranch);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {toasts}

      <DashboardMasthead
        eyebrow={isManager ? `${user?.branchName ?? 'Sanctuary'} · Services` : 'Services & Taxes · Catalogue'}
        title="Catalogue"
        imageKey={user?.branchName || (filterBranch !== 'ALL' ? selectedBranchRow?.city : 'Colombo')}
        aside={
          <div className="flex items-center gap-6">
            {isAdminOrDba && branches.length > 0 && (
              <label className="relative flex items-center gap-3 border-b border-white/20 focus-within:border-skynest-accent transition-colors duration-300">
                <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-white/60">Property</span>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="appearance-none bg-transparent py-1.5 pr-6 font-jakarta text-[13px] text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="text-ink">All Properties</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={String(b.branch_id)} className="text-ink">
                      {b.branch_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-white/60 pointer-events-none" />
              </label>
            )}
            <MastheadRefresh onClick={fetchAll} loading={loading} />
          </div>
        }
        kpis={[
          { label: 'Services',   value: String(displayedServices.length), sub: `${activeServices} active`, bar: (activeServices / (displayedServices.length || 1)) * 100 },
          { label: 'Categories', value: String(categoriesUsed),  sub: 'In use' },
          { label: 'Properties', value: String(branches.length), sub: 'Offering services' },
          { label: 'Tax rates',  value: String(activeTaxes),     sub: `of ${taxes.length} configured` },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <section className="space-y-8">
          <SectionHeader
            index={activeTab === 'services' ? `${filteredServices.length} of ${services.length} services` : `${taxes.length} rates`}
            title={activeTab === 'services' ? 'Guest Services' : 'Tax Rates'}
          >
            <Segmented
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: 'services', label: 'Services',  count: services.length },
                { value: 'taxes',    label: 'Tax rates', count: taxes.length },
              ]}
            />
          </SectionHeader>

          {loading ? (
            <Loading label="Loading catalogue" />
          ) : activeTab === 'services' ? (
            /* ── Services ───────────────────────────────────────────────────── */
            <div className="space-y-6">
              <Toolbar
                action={
                  <div className="flex items-center gap-3">
                    <Btn variant="secondary" onClick={() => openBookModal()}>
                      <CalendarCheck className="w-4 h-4 text-skynest-accent" /> Book for guest
                    </Btn>
                    {canMutate && (
                      <Btn variant="primary" onClick={openCreateSvc}>
                        <Plus className="w-4 h-4" /> Add service
                      </Btn>
                    )}
                  </div>
                }
              >
                <FilterSelect label="Property" value={filterBranch} onChange={setFilterBranch}>
                  <option value="ALL">All properties</option>
                  {branches.map(b => (
                    <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory}>
                  <option value="ALL">All categories</option>
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}>
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </FilterSelect>
              </Toolbar>

              {filteredServices.length === 0 ? (
                <Empty>{services.length === 0 ? 'No services yet.' : 'No services match these filters.'}</Empty>
              ) : (
                <div className={tbl.wrap}>
                  <table className={`${tbl.table} min-w-[720px]`}>
                    <thead>
                      <tr className={tbl.headRow}>
                        <th className={tbl.th}>Service</th>
                        <th className={tbl.th}>Category</th>
                        <th className={tbl.th}>Property</th>
                        <th className={tbl.th}>Price</th>
                        <th className={tbl.th}>Status</th>
                        <th className={`${tbl.th} text-right`}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className={tbl.body}>
                      {filteredServices.map(s => (
                        <tr key={s.service_id} className={tbl.row}>
                          <td className={`${tbl.td} text-[15px]`}>{s.service_name}</td>
                          <td className={tbl.td}>{s.category}</td>
                          <td className={tbl.td}>{s.branch_name ?? 'All properties'}</td>
                          <td className={`${tbl.td} tabular-nums whitespace-nowrap`}>{fmtLKR(toNum(s.base_price))}</td>
                          <td className={tbl.td}>
                            {canMutate ? (
                              <button
                                type="button"
                                onClick={() => toggleServiceStatus(s)}
                                title={s.is_active ? 'Click to deactivate' : 'Click to activate'}
                                className="rounded-[4px] transition-opacity duration-300 hover:opacity-70"
                              >
                                <StatusDot status={s.is_active ? 'ACTIVE' : 'INACTIVE'} label={s.is_active ? 'Active' : 'Inactive'} />
                              </button>
                            ) : (
                              <StatusDot status={s.is_active ? 'ACTIVE' : 'INACTIVE'} label={s.is_active ? 'Active' : 'Inactive'} />
                            )}
                          </td>
                          <td className={`${tbl.td} pr-0`}>
                            <div className="flex items-center justify-end gap-2">
                              <IconBtn label={`Book ${s.service_name} for guest`} onClick={() => openBookModal(s)}>
                                <CalendarCheck className="w-4 h-4 text-skynest-accent" />
                              </IconBtn>
                              {canMutate && (
                                <>
                                  <IconBtn label={`Edit ${s.service_name}`} onClick={() => openEditSvc(s)}><Pencil className="w-4 h-4" /></IconBtn>
                                  <IconBtn label={`Deactivate ${s.service_name}`} variant="danger" onClick={() => deleteService(s)}><Trash2 className="w-4 h-4" /></IconBtn>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ── Tax rates ──────────────────────────────────────────────────── */
            <div className="space-y-6">
              <Toolbar
                action={canMutate && <Btn variant="primary" onClick={openCreateTax}><Plus className="w-4 h-4" /> Schedule rate</Btn>}
              >
                <p className="font-jakarta text-[13px] text-ink/70 max-w-xl">
                  Rate changes apply only to invoices issued after the effective date. Existing invoices keep their original amounts.
                </p>
              </Toolbar>

              {taxes.length === 0 ? (
                <Empty>No tax rates configured.</Empty>
              ) : (
                <div className={tbl.wrap}>
                  <table className={`${tbl.table} min-w-[720px]`}>
                    <thead>
                      <tr className={tbl.headRow}>
                        <th className={tbl.th}>Tax</th>
                        <th className={tbl.th}>Rate</th>
                        <th className={tbl.th}>Effective from</th>
                        <th className={tbl.th}>Until</th>
                        <th className={tbl.th}>Status</th>
                        {canMutate && <th className={`${tbl.th} text-right`}><span className="sr-only">Actions</span></th>}
                      </tr>
                    </thead>
                    <tbody className={tbl.body}>
                      {taxes.map(t => (
                        <tr key={t.tax_id} className={tbl.row}>
                          <td className={`${tbl.td} text-[15px]`}>{t.tax_name}</td>
                          <td className={tbl.td}><span className="font-cinzel text-[20px] tabular-nums">{toNum(t.tax_percentage).toFixed(2)}%</span></td>
                          <td className={`${tbl.td} tabular-nums whitespace-nowrap`}>{fmtDay(t.effective_from)}</td>
                          <td className={`${tbl.td} tabular-nums whitespace-nowrap`}>{t.effective_to ? fmtDay(t.effective_to) : <span className="text-ink/70">Ongoing</span>}</td>
                          <td className={tbl.td}>
                            <StatusDot status={t.is_active ? 'ACTIVE' : 'SUPERSEDED'} label={t.is_active ? 'Active' : 'Superseded'} />
                          </td>
                          {canMutate && (
                            <td className={`${tbl.td} pr-0`}>
                              <div className="flex items-center justify-end">
                                <IconBtn label={`Edit ${t.tax_name}`} onClick={() => openEditTax(t)}><Pencil className="w-4 h-4" /></IconBtn>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── Modal — service ───────────────────────────────────────────────────── */}
      {svcModal && (
        <Modal
          eyebrow="Service"
          title={svcModal === 'create' ? 'Add service' : `Edit ${svcEditing?.service_name ?? 'service'}`}
          onClose={() => setSvcModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setSvcModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={submitSvcForm} loading={svcSaving}>
                {svcModal === 'create' ? 'Add service' : 'Save changes'}
              </Btn>
            </>
          }
        >
          <Field
            label="Name"
            placeholder="e.g. Signature Herbal Spa Treatment"
            value={svcForm.serviceName}
            onChange={e => setSvcForm(p => ({ ...p, serviceName: e.target.value }))}
            error={svcErrors.serviceName}
          />
          <div className="grid grid-cols-2 gap-6">
            <SelectField
              label="Category"
              value={svcForm.category}
              onChange={v => setSvcForm(p => ({ ...p, category: v }))}
              error={svcErrors.category}
            >
              {SERVICE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectField>
            <Field
              label="Price (LKR)"
              type="number"
              min="0"
              step="0.01"
              placeholder="4500"
              value={svcForm.basePrice}
              onChange={e => setSvcForm(p => ({ ...p, basePrice: e.target.value }))}
              error={svcErrors.basePrice}
            />
          </div>
          <SelectField
            label="Property"
            value={svcForm.branchId}
            onChange={v => setSvcForm(p => ({ ...p, branchId: v }))}
            error={svcErrors.branchId}
          >
            <option value="">Select property…</option>
            {branches.map(b => (
              <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name} ({b.city})</option>
            ))}
          </SelectField>
          <label className="flex items-center gap-4 font-jakarta text-[13px] text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={svcForm.isActive}
              onChange={e => setSvcForm(p => ({ ...p, isActive: e.target.checked }))}
              className="w-4 h-4 accent-ink"
            />
            Available for guest orders
          </label>
        </Modal>
      )}

      {/* ── Modal — tax rate ──────────────────────────────────────────────────── */}
      {taxModal && (
        <Modal
          eyebrow="Tax rate"
          title={taxModal === 'create' ? 'Schedule tax rate' : `Edit ${taxEditing?.tax_name ?? 'tax rate'}`}
          onClose={() => setTaxModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setTaxModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={submitTaxForm} loading={taxSaving}>
                {taxModal === 'create' ? 'Schedule' : 'Save changes'}
              </Btn>
            </>
          }
        >
          {taxModal === 'create' && (
            <Field
              label="Name"
              placeholder="e.g. VAT"
              value={taxForm.taxName}
              onChange={e => setTaxForm(p => ({ ...p, taxName: e.target.value }))}
              error={taxErrors.taxName}
            />
          )}
          <Field
            label="Rate (%)"
            type="number"
            min="0"
            step="0.01"
            placeholder="18.00"
            value={taxForm.taxPercentage}
            onChange={e => setTaxForm(p => ({ ...p, taxPercentage: e.target.value }))}
            error={taxErrors.taxPercentage}
          />
          <div className="grid grid-cols-2 gap-6">
            <Field
              label="Effective from"
              type="date"
              value={taxForm.effectiveFrom}
              onChange={e => setTaxForm(p => ({ ...p, effectiveFrom: e.target.value }))}
              error={taxErrors.effectiveFrom}
              disabled={taxModal === 'edit'}
            />
            <Field
              label="Until (optional)"
              type="date"
              value={taxForm.effectiveTo}
              onChange={e => setTaxForm(p => ({ ...p, effectiveTo: e.target.value }))}
            />
          </div>
        </Modal>
      )}
      {/* ── Modal — book service for guest ──────────────────────────────────── */}
      {bookModalOpen && (
        <Modal
          eyebrow="Sanctuary Services"
          title={bookTarget ? `Book ${bookTarget.service_name}` : 'Book service for guest'}
          onClose={() => setBookModalOpen(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setBookModalOpen(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={submitBookService} loading={bookSaving}>
                Confirm Service Charge
              </Btn>
            </>
          }
        >
          <SelectField
            label="Select Service"
            value={bookTarget ? String(bookTarget.service_id) : ''}
            onChange={v => {
              const found = services.find(s => String(s.service_id) === v);
              if (found) setBookTarget(found);
            }}
          >
            {services.map(s => (
              <option key={s.service_id} value={String(s.service_id)}>
                {s.service_name} ({s.category}) — LKR {toNum(s.base_price).toLocaleString()}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="In-House Guest / Active Booking"
            value={bookBookingId}
            onChange={v => setBookBookingId(v)}
          >
            {activeBookings.length === 0 ? (
              <option value="">No active bookings retrieved</option>
            ) : (
              activeBookings.map(b => (
                <option key={b.booking_id} value={b.booking_id}>
                  {b.guest_first_name} {b.guest_last_name} &bull; Room {b.room_number ?? 'Assigned'} ({b.branch_name}) &bull; Ref: {b.booking_id.substring(0, 8)}
                </option>
              ))
            )}
          </SelectField>

          <div className="grid grid-cols-2 gap-6">
            <Field
              label="Quantity"
              type="number"
              min="1"
              max="20"
              value={String(bookQuantity)}
              onChange={e => setBookQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <Field
              label="Date"
              type="date"
              value={bookDate}
              onChange={e => setBookDate(e.target.value)}
            />
          </div>

          {(bookTarget?.category === 'Wellness' || bookTarget?.category === 'Dining') && (
            <Field
              label={bookTarget.category === 'Wellness' ? 'Appointment Time (Spa)' : 'Meal Time (Dining)'}
              type="time"
              value={bookTime}
              onChange={e => setBookTime(e.target.value)}
            />
          )}

          <Field
            label="Special Requests / Dietary / Folio Notes"
            placeholder="e.g. In-room setup, allergic to nuts, VIP guest notes..."
            value={bookNotes}
            onChange={e => setBookNotes(e.target.value)}
          />

          {bookTarget && (
            <div className="bg-stone-50 border border-skynest-hairline p-4 flex items-center justify-between">
              <div>
                <span className="font-jakarta text-[11px] uppercase tracking-wider text-ink/60 font-semibold block">Total Estimated Charge</span>
                <span className="font-jakarta text-xs text-ink/80">{bookQuantity} &times; LKR {toNum(bookTarget.base_price).toLocaleString()}</span>
              </div>
              <span className="font-cinzel text-xl font-bold text-skynest-accent">
                LKR {(toNum(bookTarget.base_price) * bookQuantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
