'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BedDouble, Building2, RefreshCw, Plus, Pencil,
  WrenchIcon, CheckCircle2, ShieldAlert, XCircle,
  X, Sparkles, Users, DollarSign, Loader2,
} from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { Button }  from '@/components/ui/Button';
import { Input }   from '@/components/ui/Input';
import { Card }    from '@/components/ui/Card';
import { useAuth } from '@/context/auth-context';

// ── Types ──────────────────────────────────────────────────────────────────────

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

interface RoomType {
  room_type_id: number;
  type_name:    string;
  base_daily_rate: number;
  capacity:     number;
  description:  string | null;
}

interface Branch {
  branch_id:   number;
  branch_name: string;
  city:        string;
}

interface Room {
  room_id:      number;
  branch_id:    number;
  room_type_id: number;
  room_number:  string;
  floor:        number | null;
  status:       RoomStatus;
  is_active:    boolean;
  branch_name:  string;
  type_name:    string;
  base_daily_rate: number;
  capacity:     number;
}

type Tab = 'categories' | 'inventory';

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_META: Record<RoomStatus, { label: string; className: string; icon: React.ReactNode }> = {
  AVAILABLE:     { label: 'Available',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 size={11} /> },
  OCCUPIED:      { label: 'Occupied',      className: 'text-blue-400   bg-blue-500/10   border-blue-500/30',    icon: <BedDouble   size={11} /> },
  MAINTENANCE:   { label: 'Maintenance',   className: 'text-rose-400   bg-rose-500/10   border-rose-500/30',    icon: <ShieldAlert size={11} /> },
  OUT_OF_SERVICE:{ label: 'Out of Service',className: 'text-stone-400  bg-stone-500/10  border-stone-500/30',   icon: <XCircle     size={11} /> },
};

function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.AVAILABLE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border ${m.className}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ── Modal skeleton ─────────────────────────────────────────────────────────────

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

// ── Label + select helper ──────────────────────────────────────────────────────

function FieldSelect({
  label, value, onChange, children, error,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-white/20 pb-2 pt-1 text-stone-100 text-sm outline-none focus:border-amber-500"
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const { user } = useAuth();
  const canMutate = user && ['ADMINISTRATOR', 'DBA', 'MANAGER'].includes(user.role);
  const canToggleStatus = user && ['ADMINISTRATOR', 'DBA', 'MANAGER', 'RECEPTIONIST'].includes(user.role);

  // ── Core data state ──────────────────────────────────────────────────────────
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [branches,  setBranches]  = useState<Branch[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<number, number>>({});
  const [loading,   setLoading]   = useState(true);

  // ── Tab & filter state ───────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<Tab>('categories');
  const [filterBranch,   setFilterBranch]   = useState('ALL');
  const [filterStatus,   setFilterStatus]   = useState('ALL');
  const [filterRoomType, setFilterRoomType] = useState('ALL');

  // ── Success / error banners ──────────────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3500); }
    else                    { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   4000); }
  }

  // ── Room-type modal state ────────────────────────────────────────────────────
  const [rtModal,   setRtModal]   = useState<'create' | 'edit' | null>(null);
  const [rtEditing, setRtEditing] = useState<RoomType | null>(null);
  const [rtForm,    setRtForm]    = useState({ typeName: '', baseDailyRate: '', capacity: '', description: '' });
  const [rtErrors,  setRtErrors]  = useState<Record<string, string>>({});
  const [rtSaving,  setRtSaving]  = useState(false);

  // ── Physical room modal state ────────────────────────────────────────────────
  const [rmModal,   setRmModal]   = useState<'create' | 'edit' | null>(null);
  const [rmEditing, setRmEditing] = useState<Room | null>(null);
  const [rmForm,    setRmForm]    = useState({ roomNumber: '', floor: '', branchId: '', roomTypeId: '', status: 'AVAILABLE' as RoomStatus });
  const [rmErrors,  setRmErrors]  = useState<Record<string, string>>({});
  const [rmSaving,  setRmSaving]  = useState(false);
  const [statusSaving, setStatusSaving] = useState<number | null>(null);

  // ── Fetch functions ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rtRes, bRes, rRes, cRes] = await Promise.all([
        apiFetch<{ data: RoomType[] }>('/api/v1/room-types').catch(() => ({ data: [] })),
        apiFetch<{ data: Branch[] }>('/api/v1/branches').catch(() => ({ data: [] })),
        apiFetch<{ data: Room[] }>('/api/v1/rooms?is_active=true').catch(() => ({ data: [] })),
        apiFetch<{ data: Record<number, number> }>('/api/v1/rooms/stats/counts-by-type').catch(() => ({ data: {} })),
      ]);
      setRoomTypes(rtRes.data);
      setBranches(bRes.data);
      setRooms(rRes.data);
      setRoomCounts(cRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered physical rooms ──────────────────────────────────────────────────
  const filteredRooms = rooms.filter(r => {
    if (filterBranch   !== 'ALL' && String(r.branch_id)    !== filterBranch)   return false;
    if (filterStatus   !== 'ALL' && r.status               !== filterStatus)   return false;
    if (filterRoomType !== 'ALL' && String(r.room_type_id) !== filterRoomType) return false;
    return true;
  });

  // ── Room-type CRUD ───────────────────────────────────────────────────────────
  function openCreateRt() {
    setRtEditing(null);
    setRtForm({ typeName: '', baseDailyRate: '', capacity: '', description: '' });
    setRtErrors({});
    setRtModal('create');
  }

  function openEditRt(rt: RoomType) {
    setRtEditing(rt);
    setRtForm({
      typeName:     rt.type_name,
      baseDailyRate: String(rt.base_daily_rate),
      capacity:     String(rt.capacity),
      description:  rt.description ?? '',
    });
    setRtErrors({});
    setRtModal('edit');
  }

  function validateRtForm() {
    const errs: Record<string, string> = {};
    if (!rtForm.typeName.trim())                          errs.typeName     = 'Type name is required';
    if (!rtForm.baseDailyRate || isNaN(Number(rtForm.baseDailyRate)) || Number(rtForm.baseDailyRate) <= 0)
                                                          errs.baseDailyRate = 'Enter a valid positive rate';
    if (!rtForm.capacity || !Number.isInteger(Number(rtForm.capacity)) || Number(rtForm.capacity) <= 0)
                                                          errs.capacity     = 'Enter a valid capacity';
    setRtErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitRtForm() {
    if (!validateRtForm()) return;
    setRtSaving(true);
    try {
      const body = {
        typeName:     rtForm.typeName.trim(),
        baseDailyRate: Number(rtForm.baseDailyRate),
        capacity:     Number(rtForm.capacity),
        description:  rtForm.description.trim() || undefined,
      };
      if (rtModal === 'create') {
        await apiFetch('/api/v1/room-types', { method: 'POST', body: JSON.stringify(body) });
        flash('success', `Suite category "${rtForm.typeName}" created.`);
      } else if (rtEditing) {
        await apiFetch(`/api/v1/room-types/${rtEditing.room_type_id}`, { method: 'PATCH', body: JSON.stringify(body) });
        flash('success', `Suite category "${rtForm.typeName}" updated.`);
      }
      setRtModal(null);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to save suite category');
    } finally {
      setRtSaving(false);
    }
  }

  async function deleteRt(rt: RoomType) {
    if (!confirm(`Remove suite category "${rt.type_name}"? This will deactivate it.`)) return;
    try {
      await apiFetch(`/api/v1/room-types/${rt.room_type_id}`, { method: 'DELETE' });
      flash('success', `Suite category "${rt.type_name}" removed.`);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to remove suite category');
    }
  }

  // ── Physical room CRUD ───────────────────────────────────────────────────────
  function openCreateRm() {
    setRmEditing(null);
    setRmForm({ roomNumber: '', floor: '', branchId: branches[0] ? String(branches[0].branch_id) : '', roomTypeId: roomTypes[0] ? String(roomTypes[0].room_type_id) : '', status: 'AVAILABLE' });
    setRmErrors({});
    setRmModal('create');
  }

  function openEditRm(r: Room) {
    setRmEditing(r);
    setRmForm({
      roomNumber: r.room_number,
      floor:      r.floor !== null ? String(r.floor) : '',
      branchId:   String(r.branch_id),
      roomTypeId: String(r.room_type_id),
      status:     r.status,
    });
    setRmErrors({});
    setRmModal('edit');
  }

  function validateRmForm() {
    const errs: Record<string, string> = {};
    if (!rmForm.roomNumber.trim()) errs.roomNumber = 'Room number is required';
    if (!rmForm.branchId)          errs.branchId   = 'Branch is required';
    if (!rmForm.roomTypeId)        errs.roomTypeId  = 'Suite category is required';
    if (rmForm.floor && isNaN(Number(rmForm.floor))) errs.floor = 'Floor must be a number';
    setRmErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitRmForm() {
    if (!validateRmForm()) return;
    setRmSaving(true);
    try {
      const body: Record<string, unknown> = {
        roomNumber: rmForm.roomNumber.trim(),
        branchId:   Number(rmForm.branchId),
        roomTypeId: Number(rmForm.roomTypeId),
        status:     rmForm.status,
      };
      if (rmForm.floor.trim()) body.floor = Number(rmForm.floor);
      if (rmModal === 'create') {
        await apiFetch('/api/v1/rooms', { method: 'POST', body: JSON.stringify(body) });
        flash('success', `Room ${rmForm.roomNumber} added.`);
      } else if (rmEditing) {
        await apiFetch(`/api/v1/rooms/${rmEditing.room_id}`, { method: 'PATCH', body: JSON.stringify(body) });
        flash('success', `Room ${rmForm.roomNumber} updated.`);
      }
      setRmModal(null);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to save room');
    } finally {
      setRmSaving(false);
    }
  }

  async function toggleMaintenance(r: Room) {
    const next: RoomStatus = r.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    setStatusSaving(r.room_id);
    try {
      await apiFetch(`/api/v1/rooms/${r.room_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      flash('success', `Room ${r.room_number} set to ${next.toLowerCase()}.`);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to update status');
    } finally {
      setStatusSaving(null);
    }
  }

  async function deactivateRoom(r: Room) {
    if (!confirm(`Deactivate Room ${r.room_number}? It will be hidden from inventory.`)) return;
    try {
      await apiFetch(`/api/v1/rooms/${r.room_id}`, { method: 'DELETE' });
      flash('success', `Room ${r.room_number} deactivated.`);
      await fetchAll();
    } catch (e) {
      flash('error', e instanceof ApiError ? e.message : 'Failed to deactivate room');
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
          <h1 className="font-cinzel italic text-2xl text-stone-100">Rooms &amp; Suite Categories</h1>
          <p className="text-stone-500 text-sm mt-1 font-jakarta">
            Configure luxury suite definitions, base tariffs, and physical room maintenance states.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAll} title="Refresh" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-0 mb-8 border-b border-white/8">
        {(['categories', 'inventory'] as Tab[]).map(tab => (
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
            {tab === 'categories' ? 'Suite Categories (Room Types)' : 'Physical Room Inventory'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-500 gap-3">
          <Loader2 size={18} className="animate-spin" />
          <span className="font-jakarta text-sm">Loading room data…</span>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1 — Suite Categories (Room Types)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 font-jakarta">
                  {roomTypes.length} Suite {roomTypes.length === 1 ? 'Category' : 'Categories'}
                </p>
                {canMutate && (
                  <Button size="sm" onClick={openCreateRt}>
                    <Plus size={13} /> Add Room Type
                  </Button>
                )}
              </div>

              {roomTypes.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles size={32} className="text-stone-600 mb-3" />
                  <p className="font-cinzel text-stone-400 text-sm mb-1">No suite categories yet</p>
                  <p className="text-xs text-stone-600 font-jakarta">Add the first room type to define your suite portfolio.</p>
                </Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-6 py-3 font-medium">Category Name</th>
                        <th className="text-left px-6 py-3 font-medium">Base Daily Tariff (LKR)</th>
                        <th className="text-left px-6 py-3 font-medium">Max Capacity</th>
                        <th className="text-left px-6 py-3 font-medium">Room Count</th>
                        <th className="text-left px-6 py-3 font-medium">Description</th>
                        {canMutate && <th className="px-6 py-3 font-medium text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {roomTypes.map(rt => (
                        <tr key={rt.room_type_id} className="hover:bg-white/3 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Sparkles size={13} className="text-amber-500/70 shrink-0" />
                              <span className="font-medium text-stone-200 font-cinzel">{rt.type_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-amber-400 font-semibold font-cinzel">
                            {toNum(rt.base_daily_rate).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            <span className="text-[10px] font-jakarta font-normal text-stone-500 ml-1">/ night</span>
                          </td>
                          <td className="px-6 py-4 text-stone-300">
                            <span className="inline-flex items-center gap-1.5">
                              <Users size={12} className="text-stone-500" />
                              {rt.capacity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-stone-400">
                            {roomCounts[rt.room_type_id] ?? 0} room{(roomCounts[rt.room_type_id] ?? 0) !== 1 ? 's' : ''}
                          </td>
                          <td className="px-6 py-4 text-stone-500 text-xs max-w-xs truncate">
                            {rt.description ?? '—'}
                          </td>
                          {canMutate && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditRt(rt)}>
                                  <Pencil size={12} />
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => deleteRt(rt)}>
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
              TAB 2 — Physical Room Inventory
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
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

                {/* Room type filter */}
                <select
                  value={filterRoomType}
                  onChange={e => setFilterRoomType(e.target.value)}
                  className="bg-stone-900 border border-white/10 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500 rounded-none"
                >
                  <option value="ALL">All Categories</option>
                  {roomTypes.map(rt => (
                    <option key={rt.room_type_id} value={String(rt.room_type_id)}>{rt.type_name}</option>
                  ))}
                </select>

                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-stone-900 border border-white/10 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500 rounded-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                </select>

                <span className="ml-auto text-xs text-stone-500 font-jakarta">
                  {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
                </span>

                {canMutate && (
                  <Button size="sm" onClick={openCreateRm}>
                    <Plus size={13} /> Add Physical Room
                  </Button>
                )}
              </div>

              {filteredRooms.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center">
                  <BedDouble size={32} className="text-stone-600 mb-3" />
                  <p className="font-cinzel text-stone-400 text-sm mb-1">No rooms found</p>
                  <p className="text-xs text-stone-600 font-jakarta">
                    {rooms.length === 0 ? 'Add the first physical room to begin.' : 'Try adjusting your filters.'}
                  </p>
                </Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-6 py-3 font-medium">Room Number</th>
                        <th className="text-left px-6 py-3 font-medium">Branch</th>
                        <th className="text-left px-6 py-3 font-medium">Category</th>
                        <th className="text-left px-6 py-3 font-medium">Floor</th>
                        <th className="text-left px-6 py-3 font-medium">Current Status</th>
                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRooms.map(room => (
                        <tr key={room.room_id} className="hover:bg-white/3 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <BedDouble size={13} className="text-amber-500/70 shrink-0" />
                              <span className="font-semibold text-stone-200">Room {room.room_number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-stone-400">{room.branch_name ?? '—'}</td>
                          <td className="px-6 py-4 text-stone-300">{room.type_name ?? '—'}</td>
                          <td className="px-6 py-4 text-stone-500">
                            {room.floor !== null ? `Floor ${room.floor}` : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <RoomStatusBadge status={room.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle Maintenance */}
                              {canToggleStatus && room.status !== 'OCCUPIED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={room.status === 'MAINTENANCE' ? 'Mark Available' : 'Toggle Maintenance'}
                                  onClick={() => toggleMaintenance(room)}
                                  loading={statusSaving === room.room_id}
                                >
                                  <WrenchIcon size={12} className={room.status === 'MAINTENANCE' ? 'text-rose-400' : ''} />
                                </Button>
                              )}
                              {/* Edit */}
                              {canMutate && (
                                <Button variant="ghost" size="sm" onClick={() => openEditRm(room)}>
                                  <Pencil size={12} />
                                </Button>
                              )}
                              {/* Deactivate */}
                              {canMutate && (
                                <Button variant="danger" size="sm" onClick={() => deactivateRoom(room)}>
                                  <XCircle size={12} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Room Type Create / Edit
      ══════════════════════════════════════════════════════════════════════ */}
      {rtModal && (
        <Modal
          title={rtModal === 'create' ? 'Add Suite Category' : 'Edit Suite Category'}
          onClose={() => setRtModal(null)}
        >
          <Input
            label="Type Name"
            placeholder="e.g. Deluxe Ocean Suite"
            value={rtForm.typeName}
            onChange={e => setRtForm(p => ({ ...p, typeName: e.target.value }))}
            error={rtErrors.typeName}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Rate (LKR / night)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 25000"
              value={rtForm.baseDailyRate}
              onChange={e => setRtForm(p => ({ ...p, baseDailyRate: e.target.value }))}
              error={rtErrors.baseDailyRate}
            />
            <Input
              label="Max Capacity"
              type="number"
              min="1"
              placeholder="e.g. 2"
              value={rtForm.capacity}
              onChange={e => setRtForm(p => ({ ...p, capacity: e.target.value }))}
              error={rtErrors.capacity}
            />
          </div>
          <Input
            label="Description (optional)"
            placeholder="Brief description of this suite category"
            value={rtForm.description}
            onChange={e => setRtForm(p => ({ ...p, description: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRtModal(null)}>Cancel</Button>
            <Button onClick={submitRtForm} loading={rtSaving}>
              <DollarSign size={13} />
              {rtModal === 'create' ? 'Create Category' : 'Save Changes'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Physical Room Create / Edit
      ══════════════════════════════════════════════════════════════════════ */}
      {rmModal && (
        <Modal
          title={rmModal === 'create' ? 'Add Physical Room' : `Edit Room ${rmEditing?.room_number}`}
          onClose={() => setRmModal(null)}
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room Number"
              placeholder="e.g. 101"
              value={rmForm.roomNumber}
              onChange={e => setRmForm(p => ({ ...p, roomNumber: e.target.value }))}
              error={rmErrors.roomNumber}
            />
            <Input
              label="Floor (optional)"
              type="number"
              min="1"
              placeholder="e.g. 3"
              value={rmForm.floor}
              onChange={e => setRmForm(p => ({ ...p, floor: e.target.value }))}
              error={rmErrors.floor}
            />
          </div>
          <FieldSelect
            label="Branch"
            value={rmForm.branchId}
            onChange={v => setRmForm(p => ({ ...p, branchId: v }))}
            error={rmErrors.branchId}
          >
            <option value="">Select branch…</option>
            {branches.map(b => (
              <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name} — {b.city}</option>
            ))}
          </FieldSelect>
          <FieldSelect
            label="Suite Category"
            value={rmForm.roomTypeId}
            onChange={v => setRmForm(p => ({ ...p, roomTypeId: v }))}
            error={rmErrors.roomTypeId}
          >
            <option value="">Select category…</option>
            {roomTypes.map(rt => (
              <option key={rt.room_type_id} value={String(rt.room_type_id)}>{rt.type_name}</option>
            ))}
          </FieldSelect>
          <FieldSelect
            label="Initial Status"
            value={rmForm.status}
            onChange={v => setRmForm(p => ({ ...p, status: v as RoomStatus }))}
          >
            <option value="AVAILABLE">Available</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </FieldSelect>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRmModal(null)}>Cancel</Button>
            <Button onClick={submitRmForm} loading={rmSaving}>
              <BedDouble size={13} />
              {rmModal === 'create' ? 'Add Room' : 'Save Changes'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
