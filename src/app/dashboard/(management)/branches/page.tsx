'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, RefreshCw, Plus, Pencil, CheckCircle2,
  XCircle, X, MapPin, Phone, Mail, Loader2,
  Table as TableIcon, LayoutGrid, Power,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Button }     from '@/components/ui/Button';
import { Input }      from '@/components/ui/Input';
import { Card }       from '@/components/ui/Card';
import { useAuth }    from '@/context/auth-context';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  branch_id:   number | string;
  branch_name: string;
  city:        string;
  address:     string | null;
  phone:       string | null;
  email:       string | null;
  is_active:   boolean;
}

// ── Modal Container ────────────────────────────────────────────────────────────

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

// ── Main Page Component ────────────────────────────────────────────────────────

export default function BranchesPage() {
  const { user } = useAuth();
  const canMutate = user && ['ADMINISTRATOR', 'DBA', 'MANAGER'].includes(user.role);

  // Core Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Flash Feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3500); }
    else                    { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   4000); }
  }

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
      setBranches(res.data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

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

  // ── Form Validation ──────────────────────────────────────────────────────────
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

  // ── Form Submit ──────────────────────────────────────────────────────────────
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

  // ── Toggle Active State ──────────────────────────────────────────────────────
  async function toggleActiveState(b: Branch) {
    const nextState = !b.is_active;
    setTogglingId(b.branch_id);
    try {
      await apiFetch(`/api/v1/branches/${b.branch_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState }),
      });
      flash('success', `Branch "${b.branch_name}" ${nextState ? 'activated' : 'deactivated'}.`);
      await fetchBranches();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to update operating status');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-8 max-w-7xl">

      {/* ── Toast Notifications ── */}
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

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-cinzel italic text-2xl text-stone-100">Branch Properties</h1>
          <p className="text-stone-500 text-sm mt-1 font-jakarta">
            Oversee branch operations, addresses, contact lines, and property status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-white/10 bg-stone-900">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-500 hover:text-stone-300'}`}
              title="Table View"
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-500 hover:text-stone-300'}`}
              title="Card View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchBranches} title="Refresh branches" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>

          {canMutate && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={13} /> Register New Branch
            </Button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-500 gap-3">
          <Loader2 size={18} className="animate-spin" />
          <span className="font-jakarta text-sm">Loading branch records…</span>
        </div>
      ) : branches.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={32} className="text-stone-600 mb-3" />
          <p className="font-cinzel text-stone-400 text-sm mb-1">No branches registered</p>
          <p className="text-xs text-stone-600 font-jakarta">Register your first hotel branch to establish operational presence.</p>
        </Card>
      ) : viewMode === 'table' ? (
        /* ══════════════════════════════════════════════════════════════════════
            TABLE VIEW (Per Page 10 Specification)
        ══════════════════════════════════════════════════════════════════════ */
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Branch ID</th>
                <th className="text-left px-6 py-3 font-medium">Property Name</th>
                <th className="text-left px-6 py-3 font-medium">City</th>
                <th className="text-left px-6 py-3 font-medium">Address</th>
                <th className="text-left px-6 py-3 font-medium">Contact Phone</th>
                <th className="text-left px-6 py-3 font-medium">Operating Status</th>
                {canMutate && <th className="px-6 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {branches.map(b => (
                <tr key={b.branch_id} className="hover:bg-white/3 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-amber-400/90 font-medium">
                    #{b.branch_id}
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-200">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-amber-500/70 shrink-0" />
                      <span className="font-cinzel text-sm">{b.branch_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-300">
                    {b.city}
                  </td>
                  <td className="px-6 py-4 text-stone-400 text-xs max-w-xs truncate">
                    {b.address || '—'}
                  </td>
                  <td className="px-6 py-4 text-stone-400 text-xs font-mono">
                    {b.phone || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold border ${
                      b.is_active
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-stone-400 bg-stone-500/10 border-stone-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-none ${b.is_active ? 'bg-emerald-400' : 'bg-stone-500'}`} />
                      {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  {canMutate && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={b.is_active ? 'Deactivate Branch' : 'Activate Branch'}
                          onClick={() => toggleActiveState(b)}
                          loading={togglingId === b.branch_id}
                        >
                          <Power size={12} className={b.is_active ? 'text-emerald-400' : 'text-stone-500'} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)} title="Edit Details">
                          <Pencil size={12} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
            CARD VIEW
        ══════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map(b => (
            <Card key={b.branch_id} className="flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-none bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <p className="text-stone-100 font-cinzel font-medium text-base">{b.branch_name}</p>
                      <p className="text-amber-400/80 text-xs font-jakarta flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {b.city}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold border ${
                    b.is_active
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-stone-400 bg-stone-500/10 border-stone-500/30'
                  }`}>
                    {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-stone-400 border-t border-white/5 pt-3">
                  <div className="flex items-start gap-2">
                    <span className="text-stone-600 uppercase text-[10px] tracking-wider min-w-[50px]">Address</span>
                    <span className="text-stone-300">{b.address || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-600 uppercase text-[10px] tracking-wider min-w-[50px]">Phone</span>
                    <span className="text-stone-300 font-mono flex items-center gap-1">
                      <Phone size={11} className="text-stone-500" /> {b.phone || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-600 uppercase text-[10px] tracking-wider min-w-[50px]">Email</span>
                    <span className="text-stone-300 flex items-center gap-1">
                      <Mail size={11} className="text-stone-500" /> {b.email || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {canMutate && (
                <div className="flex gap-2 pt-3 border-t border-white/6">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(b)} className="flex-1">
                    <Pencil size={12} /> Edit Details
                  </Button>
                  <Button
                    variant={b.is_active ? 'danger' : 'outline'}
                    size="sm"
                    onClick={() => toggleActiveState(b)}
                    loading={togglingId === b.branch_id}
                    className="flex-1"
                  >
                    <Power size={12} /> {b.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Register New Branch / Edit Details
      ══════════════════════════════════════════════════════════════════════ */}
      {modalType && (
        <Modal
          title={modalType === 'create' ? 'Register New Branch' : `Edit Property — ${editing?.branch_name}`}
          onClose={() => setModalType(null)}
        >
          <Input
            label="Property Name"
            placeholder="e.g. Sky Nest Galle Fort"
            value={form.branchName}
            onChange={e => setForm(p => ({ ...p, branchName: e.target.value }))}
            error={errors.branchName}
          />
          <Input
            label="City"
            placeholder="e.g. Galle"
            value={form.city}
            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
            error={errors.city}
          />
          <Input
            label="Address"
            placeholder="e.g. 42 Light House Street, Fort"
            value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              placeholder="e.g. +94 91 223 4567"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            />
            <Input
              label="Contact Email"
              type="email"
              placeholder="e.g. galle@skynest.lk"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              error={errors.email}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="branch-active"
              checked={form.isActive}
              onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
              className="rounded-none border-white/20 text-amber-500 focus:ring-0"
            />
            <label htmlFor="branch-active" className="text-xs text-stone-300 font-jakarta">
              Active operating status (available for bookings and staff assignment)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button onClick={submitForm} loading={saving}>
              <Building2 size={13} />
              {modalType === 'create' ? 'Register Branch' : 'Save Changes'}
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
}
