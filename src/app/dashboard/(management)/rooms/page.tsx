'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Wrench, Trash2, ChevronDown } from 'lucide-react';
import { apiFetch, ApiError, toNum } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import {
  DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, Toolbar, FilterSelect,
  Btn, IconBtn, Field, SelectField, Modal, Loading, Empty, StatusDot, tbl, fmtLKR, useFlash,
} from '@/components/dashboard/ui';

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
  branch_id:   string;
  branch_name: string;
  city:        string;
}

interface Room {
  room_id:      number;
  branch_id:    string;
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

const STATUS_LABEL: Record<RoomStatus, string> = {
  AVAILABLE:      'Available',
  OCCUPIED:       'Occupied',
  MAINTENANCE:    'Maintenance',
  OUT_OF_SERVICE: 'Out of service',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const { user } = useAuth();
  const isAdminOrDba = user?.role === 'ADMINISTRATOR' || user?.role === 'DBA';
  const isManager = user?.role === 'MANAGER';
  const canMutate = user && ['ADMINISTRATOR', 'DBA', 'MANAGER'].includes(user.role);
  // Room types and their rates apply to every branch, so a manager only views them.
  const canEditRoomTypes = isAdminOrDba;
  const canToggleStatus = user && ['ADMINISTRATOR', 'DBA', 'MANAGER', 'RECEPTIONIST'].includes(user.role);

  // ── Core data state ──────────────────────────────────────────────────────────
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [branches,  setBranches]  = useState<Branch[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<number, number>>({});
  const [loading,   setLoading]   = useState(true);

  // ── Tab & filter state ───────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<Tab>('categories');
  // The Inventory tab is hidden for managers, receptionists and administrators.
  const showInventory = !['MANAGER', 'RECEPTIONIST', 'ADMINISTRATOR'].includes(user?.role ?? '');
  const [filterBranch,   setFilterBranch]   = useState('ALL');
  const [filterStatus,   setFilterStatus]   = useState('ALL');
  const [filterRoomType, setFilterRoomType] = useState('ALL');

  // Flash notifications
  const { flash, toasts } = useFlash();

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
        // Managers only see their own branch (the API scopes /rooms), so they need no property list.
        isAdminOrDba
          ? apiFetch<{ data: Branch[] }>('/api/v1/branches').catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] as Branch[] }),
        apiFetch<{ data: Room[] }>('/api/v1/rooms?is_active=true').catch(() => ({ data: [] })),
        apiFetch<{ data: Record<number, number> }>('/api/v1/rooms/stats/counts-by-type').catch(() => ({ data: {} })),
      ]);
      setRoomTypes(rtRes?.data ?? []);
      setBranches(bRes?.data ?? []);
      setRooms(rRes?.data ?? []);
      setRoomCounts(cRes?.data ?? {});
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
    const defaultBranch = (isManager && user?.branchId)
      ? String(user.branchId)
      : (filterBranch !== 'ALL' ? filterBranch : (branches[0] ? String(branches[0].branch_id) : ''));
    setRmForm({
      roomNumber: '',
      floor: '',
      branchId: defaultBranch,
      roomTypeId: roomTypes[0] ? String(roomTypes[0].room_type_id) : '',
      status: 'AVAILABLE',
    });
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
        branchId:   rmForm.branchId,
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


  // ── Headline figures ─────────────────────────────────────────────────────────
  const displayedRooms   = filterBranch === 'ALL' ? rooms : rooms.filter(r => String(r.branch_id) === filterBranch);
  const availableCount   = displayedRooms.filter(r => r.status === 'AVAILABLE').length;
  const maintenanceCount = displayedRooms.filter(r => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE').length;

  const selectedBranchRow = branches.find((b) => String(b.branch_id) === filterBranch);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {toasts}

      <DashboardMasthead
        eyebrow={isManager ? `${user?.branchName ?? 'Sanctuary'} · Rooms` : 'Physical Inventory · Categories'}
        title="Rooms"
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
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
              </label>
            )}
            <MastheadRefresh onClick={fetchAll} loading={loading} />
          </div>
        }
        kpis={[
          { label: 'Room types',  value: String(roomTypes.length), sub: 'Categories on sale' },
          { label: 'Rooms',       value: String(displayedRooms.length), sub: isAdminOrDba && filterBranch === 'ALL' ? `Across ${branches.length} locations` : 'At this location' },
          { label: 'Available',   value: String(availableCount),   sub: 'Ready to sell', bar: (availableCount / (displayedRooms.length || 1)) * 100 },
          { label: 'Maintenance', value: String(maintenanceCount), sub: 'Out of action' },
        ]}
      />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <section className="space-y-8">
          <SectionHeader
            index={activeTab === 'categories' ? `${roomTypes.length} categories` : `${filteredRooms.length} of ${rooms.length} rooms`}
            title={activeTab === 'categories' ? 'Room Types' : 'Room Inventory'}
          >
            {showInventory && (
              <Segmented
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'categories', label: 'Room types', count: roomTypes.length },
                  { value: 'inventory',  label: 'Inventory',  count: rooms.length },
                ]}
              />
            )}
          </SectionHeader>

          {loading ? (
            <Loading label="Loading rooms" />
          ) : activeTab === 'categories' ? (
            /* ── Room types ─────────────────────────────────────────────────── */
            <div className="space-y-6">
              {canEditRoomTypes && (
                <Toolbar action={<Btn variant="primary" onClick={openCreateRt}><Plus className="w-4 h-4" /> Add room type</Btn>} />
              )}

              {roomTypes.length === 0 ? (
                <Empty>No room types yet.</Empty>
              ) : (
                <div className={tbl.wrap}>
                  <table className={`${tbl.table} min-w-[720px]`}>
                    <thead>
                      <tr className={tbl.headRow}>
                        <th className={tbl.th}>Room type</th>
                        <th className={tbl.th}>Rate / night</th>
                        <th className={tbl.th}>Capacity</th>
                        <th className={tbl.th}>Rooms</th>
                        {canEditRoomTypes && <th className={`${tbl.th} text-right`}><span className="sr-only">Actions</span></th>}
                      </tr>
                    </thead>
                    <tbody className={tbl.body}>
                      {roomTypes.map(rt => {
                        const countFromStats = roomCounts[rt.room_type_id] ?? (roomCounts as Record<string, number>)[String(rt.room_type_id)];
                        const countFromRooms = rooms.filter(
                          (rm) => String(rm.room_type_id) === String(rt.room_type_id) && rm.is_active !== false
                        ).length;
                        const count = countFromStats !== undefined ? countFromStats : countFromRooms;
                        return (
                          <tr key={rt.room_type_id} className={tbl.row}>
                            <td className={`${tbl.td} max-w-[360px]`}>
                              <p className="font-cinzel text-[17px] text-ink">{rt.type_name}</p>
                              {rt.description && <p className={`${tbl.sub} truncate`}>{rt.description}</p>}
                            </td>
                            <td className={`${tbl.td} tabular-nums whitespace-nowrap`}>{fmtLKR(toNum(rt.base_daily_rate))}</td>
                            <td className={`${tbl.td} whitespace-nowrap`}>{rt.capacity} guest{rt.capacity === 1 ? '' : 's'}</td>
                            <td className={`${tbl.td} tabular-nums`}>{count}</td>
                            {canEditRoomTypes && (
                              <td className={`${tbl.td} pr-0`}>
                                <div className="flex items-center justify-end gap-2">
                                  <IconBtn label={`Edit ${rt.type_name}`} onClick={() => openEditRt(rt)}><Pencil className="w-4 h-4" /></IconBtn>
                                  <IconBtn label={`Remove ${rt.type_name}`} variant="danger" onClick={() => deleteRt(rt)}><Trash2 className="w-4 h-4" /></IconBtn>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ── Inventory ──────────────────────────────────────────────────── */
            <div className="space-y-6">
              <Toolbar
                action={canMutate && <Btn variant="primary" onClick={openCreateRm}><Plus className="w-4 h-4" /> Add room</Btn>}
              >
                {isAdminOrDba && (
                  <FilterSelect label="Property" value={filterBranch} onChange={setFilterBranch}>
                    <option value="ALL">All properties</option>
                    {branches.map(b => (
                      <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name}</option>
                    ))}
                  </FilterSelect>
                )}
                <FilterSelect label="Room type" value={filterRoomType} onChange={setFilterRoomType}>
                  <option value="ALL">All room types</option>
                  {roomTypes.map(rt => (
                    <option key={rt.room_type_id} value={String(rt.room_type_id)}>{rt.type_name}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}>
                  <option value="ALL">All statuses</option>
                  {(Object.keys(STATUS_LABEL) as RoomStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </FilterSelect>
              </Toolbar>

              {filteredRooms.length === 0 ? (
                <Empty>{rooms.length === 0 ? 'No rooms yet.' : 'No rooms match these filters.'}</Empty>
              ) : (
                <div className={tbl.wrap}>
                  <table className={`${tbl.table} min-w-[720px]`}>
                    <thead>
                      <tr className={tbl.headRow}>
                        <th className={tbl.th}>Room</th>
                        {isAdminOrDba && <th className={tbl.th}>Property</th>}
                        <th className={tbl.th}>Room type</th>
                        <th className={tbl.th}>Floor</th>
                        <th className={tbl.th}>Status</th>
                        <th className={`${tbl.th} text-right`}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className={tbl.body}>
                      {filteredRooms.map(room => (
                        <tr key={room.room_id} className={tbl.row}>
                          <td className={tbl.td}><span className="font-cinzel text-[20px] text-ink">{room.room_number}</span></td>
                          {isAdminOrDba && <td className={tbl.td}>{room.branch_name ?? '—'}</td>}
                          <td className={tbl.td}>{room.type_name ?? '—'}</td>
                          <td className={`${tbl.td} tabular-nums`}>{room.floor ?? '—'}</td>
                          <td className={tbl.td}><StatusDot status={room.status} label={STATUS_LABEL[room.status] ?? room.status} /></td>
                          <td className={`${tbl.td} pr-0`}>
                            <div className="flex items-center justify-end gap-2">
                              {canToggleStatus && room.status !== 'OCCUPIED' && (
                                <IconBtn
                                  label={room.status === 'MAINTENANCE' ? `Mark room ${room.room_number} available` : `Set room ${room.room_number} to maintenance`}
                                  onClick={() => toggleMaintenance(room)}
                                  loading={statusSaving === room.room_id}
                                  className={room.status === 'MAINTENANCE' ? 'text-amber-700' : ''}
                                >
                                  <Wrench className="w-4 h-4" />
                                </IconBtn>
                              )}
                              {canMutate && (
                                <IconBtn label={`Edit room ${room.room_number}`} onClick={() => openEditRm(room)}><Pencil className="w-4 h-4" /></IconBtn>
                              )}
                              {canMutate && (
                                <IconBtn label={`Deactivate room ${room.room_number}`} variant="danger" onClick={() => deactivateRoom(room)}><Trash2 className="w-4 h-4" /></IconBtn>
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
          )}
        </section>
      </main>

      {/* ── Modal — room type ─────────────────────────────────────────────────── */}
      {rtModal && (
        <Modal
          eyebrow="Room type"
          title={rtModal === 'create' ? 'Add room type' : `Edit ${rtEditing?.type_name ?? 'room type'}`}
          onClose={() => setRtModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setRtModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={submitRtForm} loading={rtSaving}>
                {rtModal === 'create' ? 'Create' : 'Save changes'}
              </Btn>
            </>
          }
        >
          <Field
            label="Name"
            placeholder="e.g. Deluxe Ocean Suite"
            value={rtForm.typeName}
            onChange={e => setRtForm(p => ({ ...p, typeName: e.target.value }))}
            error={rtErrors.typeName}
          />
          <div className="grid grid-cols-2 gap-6">
            <Field
              label="Rate ($ / night)"
              type="number"
              min="0"
              step="0.01"
              placeholder="25000"
              value={rtForm.baseDailyRate}
              onChange={e => setRtForm(p => ({ ...p, baseDailyRate: e.target.value }))}
              error={rtErrors.baseDailyRate}
            />
            <Field
              label="Capacity"
              type="number"
              min="1"
              placeholder="2"
              value={rtForm.capacity}
              onChange={e => setRtForm(p => ({ ...p, capacity: e.target.value }))}
              error={rtErrors.capacity}
            />
          </div>
          <Field
            label="Description (optional)"
            placeholder="A short line guests will see"
            value={rtForm.description}
            onChange={e => setRtForm(p => ({ ...p, description: e.target.value }))}
          />
        </Modal>
      )}

      {/* ── Modal — physical room ─────────────────────────────────────────────── */}
      {rmModal && (
        <Modal
          eyebrow="Room"
          title={rmModal === 'create' ? 'Add room' : `Edit room ${rmEditing?.room_number}`}
          onClose={() => setRmModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setRmModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={submitRmForm} loading={rmSaving}>
                {rmModal === 'create' ? 'Add room' : 'Save changes'}
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-6">
            <Field
              label="Room number"
              placeholder="101"
              value={rmForm.roomNumber}
              onChange={e => setRmForm(p => ({ ...p, roomNumber: e.target.value }))}
              error={rmErrors.roomNumber}
            />
            <Field
              label="Floor (optional)"
              type="number"
              min="1"
              placeholder="3"
              value={rmForm.floor}
              onChange={e => setRmForm(p => ({ ...p, floor: e.target.value }))}
              error={rmErrors.floor}
            />
          </div>
          {isAdminOrDba && (
            <SelectField
              label="Property"
              value={rmForm.branchId}
              onChange={v => setRmForm(p => ({ ...p, branchId: v }))}
              error={rmErrors.branchId}
            >
              <option value="">Select property…</option>
              {branches.map(b => (
                <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name} — {b.city}</option>
              ))}
            </SelectField>
          )}
          <SelectField
            label="Room type"
            value={rmForm.roomTypeId}
            onChange={v => setRmForm(p => ({ ...p, roomTypeId: v }))}
            error={rmErrors.roomTypeId}
          >
            <option value="">Select room type…</option>
            {roomTypes.map(rt => (
              <option key={rt.room_type_id} value={String(rt.room_type_id)}>{rt.type_name}</option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={rmForm.status}
            onChange={v => setRmForm(p => ({ ...p, status: v as RoomStatus }))}
          >
            <option value="AVAILABLE">Available</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </SelectField>
        </Modal>
      )}
    </>
  );
}
