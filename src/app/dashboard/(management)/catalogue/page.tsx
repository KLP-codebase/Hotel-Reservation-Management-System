'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, Building2, RefreshCw, Plus, Pencil,
  CheckCircle2, XCircle, X, DollarSign, Loader2,
  Percent, ShieldAlert, AlertTriangle, Layers,
} from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { Button }  from '@/components/ui/Button';
import { Input }   from '@/components/ui/Input';
import { Card }    from '@/components/ui/Card';
import { useAuth } from '@/context/auth-context';

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

// ── Modal container ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-stone-900 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="font-cinzel text-base text-stone-100">{title}</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

// ── FieldSelect helper ─────────────────────────────────────────────────────────

function FieldSelect({
  label, value, onChange, children, error,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-white/20 pb-2 pt-1 text-stone-100 text-sm outline-none focus:border-amber-500 rounded-none"
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const { user } = useAuth();
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3500); }
    else                    { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   4000); }
  }

  // ── Service modal state ──────────────────────────────────────────────────────
  const [svcModal,   setSvcModal]   = useState<'create' | 'edit' | null>(null);
  const [svcEditing, setSvcEditing] = useState<CatalogueService | null>(null);
  const [svcForm,    setSvcForm]    = useState({ serviceName: '', category: 'Dining', basePrice: '', branchId: '', isActive: true });
  const [svcErrors,  setSvcErrors]  = useState<Record<string, string>>({});
  const [svcSaving,  setSvcSaving]  = useState(false);

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
    setSvcForm({
      serviceName: '',
      category: 'Dining',
      basePrice: '',
      branchId: branches[0] ? String(branches[0].branch_id) : '',
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl">

      {/* ── Toasts ── */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 bg-emerald-900/90 border border-emerald-500/40 text-emerald-300 text-sm shadow-lg">
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 bg-red-900/90 border border-red-500/40 text-red-300 text-sm shadow-lg">
          <XCircle size={15} /> {errorMsg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-cinzel italic text-2xl text-stone-100">Services Catalogue &amp; Statutory Tax Rates</h1>
          <p className="text-stone-500 text-sm mt-1 font-jakarta">
            Manage chargeable guest amenities, dining menus, wellness services, and statutory tax schedules.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAll} title="Refresh" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-0 mb-8 border-b border-white/8">
        {(['services', 'taxes'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-5 py-2.5 text-xs font-medium uppercase tracking-widest font-jakarta transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-300',
            ].join(' ')}
          >
            {tab === 'services' ? 'Chargeable Guest Services' : 'Statutory Tax Rates'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-500 gap-3">
          <Loader2 size={18} className="animate-spin" />
          <span className="font-jakarta text-sm">Loading catalogue data…</span>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1 — Chargeable Guest Services
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'services' && (
            <div>
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {/* Branch filter */}
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-stone-500" />
                  <select
                    value={filterBranch}
                    onChange={e => setFilterBranch(e.target.value)}
                    className="bg-stone-900 border border-white/10 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500 rounded-none"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>

                {/* Category filter */}
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="bg-stone-900 border border-white/10 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500 rounded-none"
                >
                  <option value="ALL">All Categories</option>
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-stone-900 border border-white/10 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500 rounded-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>

                <span className="ml-auto text-xs text-stone-500 font-jakarta">
                  {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
                </span>

                {canMutate && (
                  <Button size="sm" onClick={openCreateSvc}>
                    <Plus size={13} /> Register New Service
                  </Button>
                )}
              </div>

              {filteredServices.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles size={32} className="text-stone-600 mb-3" />
                  <p className="font-cinzel text-stone-400 text-sm mb-1">No services registered</p>
                  <p className="text-xs text-stone-600 font-jakarta">
                    {services.length === 0 ? 'Register the first service in the catalogue.' : 'Try adjusting your filters.'}
                  </p>
                </Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-6 py-3 font-medium">Service Name</th>
                        <th className="text-left px-6 py-3 font-medium">Category</th>
                        <th className="text-left px-6 py-3 font-medium">Applicable Branch</th>
                        <th className="text-left px-6 py-3 font-medium">Base Tariff (LKR)</th>
                        <th className="text-left px-6 py-3 font-medium">Active Status</th>
                        {canMutate && <th className="px-6 py-3 font-medium text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredServices.map(s => (
                        <tr key={s.service_id} className="hover:bg-white/3 transition-colors">
                          <td className="px-6 py-4 font-medium text-stone-200">
                            <div className="flex items-center gap-2">
                              <Sparkles size={13} className="text-amber-500/70 shrink-0" />
                              <span>{s.service_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-white/5 border border-white/10 text-stone-300">
                              {s.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-stone-400">
                            {s.branch_name ?? 'All Branches (Global)'}
                          </td>
                          <td className="px-6 py-4 text-amber-400 font-semibold font-cinzel">
                            {toNum(s.base_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => canMutate && toggleServiceStatus(s)}
                              disabled={!canMutate}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border transition-opacity ${
                                s.is_active
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                  : 'text-stone-400 bg-stone-500/10 border-stone-500/30'
                              } ${canMutate ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                              title={canMutate ? 'Click to toggle status' : undefined}
                            >
                              {s.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              {s.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          {canMutate && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditSvc(s)}>
                                  <Pencil size={12} />
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => deleteService(s)}>
                                  <XCircle size={12} />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2 — Statutory Tax Rates (Versioned Configs)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'taxes' && (
            <div>
              {/* Statutory Warning Banner */}
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                <div className="text-xs leading-relaxed font-jakarta">
                  <p className="font-semibold mb-0.5 text-amber-400">Statutory Compliance Notice (Sri Lanka Tax Cascade)</p>
                  Modifying an active statutory tax percentage will only apply to future invoices generated after the effective date. Historical invoices preserve their locked snapshot amounts to guarantee ACID and financial audit compliance.
                </div>
              </div>

              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 font-jakarta">
                  Statutory Levies ({taxes.length} entries)
                </p>
                {canMutate && (
                  <Button size="sm" onClick={openCreateTax}>
                    <Plus size={13} /> Schedule Future Tax Rate
                  </Button>
                )}
              </div>

              <Card className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-6 py-3 font-medium">Tax Identifier</th>
                      <th className="text-left px-6 py-3 font-medium">Tax Name</th>
                      <th className="text-left px-6 py-3 font-medium">Current Rate (%)</th>
                      <th className="text-left px-6 py-3 font-medium">Effective From</th>
                      <th className="text-left px-6 py-3 font-medium">Effective To</th>
                      <th className="text-left px-6 py-3 font-medium">Status</th>
                      {canMutate && <th className="px-6 py-3 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {taxes.map(t => (
                      <tr key={t.tax_id} className="hover:bg-white/3 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-amber-400/90 font-medium">
                          {t.tax_name.toUpperCase().replace(/\s+/g, '_')}
                        </td>
                        <td className="px-6 py-4 text-stone-200 font-medium">
                          {t.tax_name}
                        </td>
                        <td className="px-6 py-4 text-amber-400 font-semibold font-cinzel text-base">
                          {toNum(t.tax_percentage).toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 text-stone-400 text-xs">
                          {t.effective_from ? t.effective_from.split('T')[0] : '—'}
                        </td>
                        <td className="px-6 py-4 text-stone-500 text-xs">
                          {t.effective_to ? t.effective_to.split('T')[0] : 'Ongoing (No expiry)'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border ${
                            t.is_active
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                              : 'text-stone-400 bg-stone-500/10 border-stone-500/30'
                          }`}>
                            {t.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {t.is_active ? 'Active' : 'Superseded'}
                          </span>
                        </td>
                        {canMutate && (
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditTax(t)}>
                              <Pencil size={12} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Register / Edit Service
      ══════════════════════════════════════════════════════════════════════ */}
      {svcModal && (
        <Modal
          title={svcModal === 'create' ? 'Register New Chargeable Service' : `Edit Service — ${svcEditing?.service_name}`}
          onClose={() => setSvcModal(null)}
        >
          <Input
            label="Service Name"
            placeholder="e.g. Signature Herbal Spa Treatment"
            value={svcForm.serviceName}
            onChange={e => setSvcForm(p => ({ ...p, serviceName: e.target.value }))}
            error={svcErrors.serviceName}
          />
          <div className="grid grid-cols-2 gap-4">
            <FieldSelect
              label="Category"
              value={svcForm.category}
              onChange={v => setSvcForm(p => ({ ...p, category: v }))}
              error={svcErrors.category}
            >
              {SERVICE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </FieldSelect>
            <Input
              label="Base Tariff (LKR)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 4500"
              value={svcForm.basePrice}
              onChange={e => setSvcForm(p => ({ ...p, basePrice: e.target.value }))}
              error={svcErrors.basePrice}
            />
          </div>
          <FieldSelect
            label="Applicable Branch"
            value={svcForm.branchId}
            onChange={v => setSvcForm(p => ({ ...p, branchId: v }))}
            error={svcErrors.branchId}
          >
            <option value="">Select branch…</option>
            {branches.map(b => (
              <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name} ({b.city})</option>
            ))}
          </FieldSelect>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="svc-active"
              checked={svcForm.isActive}
              onChange={e => setSvcForm(p => ({ ...p, isActive: e.target.checked }))}
              className="rounded-none border-white/20 text-amber-500 focus:ring-0"
            />
            <label htmlFor="svc-active" className="text-xs text-stone-300 font-jakarta">
              Active for guest orders &amp; room service folio logging
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setSvcModal(null)}>Cancel</Button>
            <Button onClick={submitSvcForm} loading={svcSaving}>
              <Sparkles size={13} />
              {svcModal === 'create' ? 'Register Service' : 'Save Changes'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Schedule Future / Edit Tax Rate
      ══════════════════════════════════════════════════════════════════════ */}
      {taxModal && (
        <Modal
          title={taxModal === 'create' ? 'Schedule Future Statutory Tax Rate' : `Edit Tax Rate — ${taxEditing?.tax_name}`}
          onClose={() => setTaxModal(null)}
        >
          {taxModal === 'create' && (
            <Input
              label="Tax Name / Identifier"
              placeholder="e.g. VAT or Tourism Development Levy"
              value={taxForm.taxName}
              onChange={e => setTaxForm(p => ({ ...p, taxName: e.target.value }))}
              error={taxErrors.taxName}
            />
          )}
          <Input
            label="Tax Percentage (%)"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 18.00"
            value={taxForm.taxPercentage}
            onChange={e => setTaxForm(p => ({ ...p, taxPercentage: e.target.value }))}
            error={taxErrors.taxPercentage}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Effective From"
              type="date"
              value={taxForm.effectiveFrom}
              onChange={e => setTaxForm(p => ({ ...p, effectiveFrom: e.target.value }))}
              error={taxErrors.effectiveFrom}
              disabled={taxModal === 'edit'}
            />
            <Input
              label="Effective To (Optional)"
              type="date"
              value={taxForm.effectiveTo}
              onChange={e => setTaxForm(p => ({ ...p, effectiveTo: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setTaxModal(null)}>Cancel</Button>
            <Button onClick={submitTaxForm} loading={taxSaving}>
              <Percent size={13} />
              {taxModal === 'create' ? 'Schedule Rate' : 'Save Changes'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
