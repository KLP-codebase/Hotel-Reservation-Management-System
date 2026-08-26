'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, UserX, Search, RefreshCw, LogOut } from 'lucide-react';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Badge }      from '../../../components/ui/Badge';
import { Button }     from '../../../components/ui/Button';
import { Input }      from '../../../components/ui/Input';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Card }       from '../../../components/ui/Card';
import { useAuth }    from '../../../context/auth-context';

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
}

interface Branch { branch_id: string; branch_name: string; }

const ROLES = ['GUEST','RECEPTIONIST','SERVICE_STAFF','MANAGER','ADMINISTRATOR','DBA'] as const;

const staffSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().optional(),
  role:      z.enum(ROLES),
  branchId:  z.string().uuid().optional(),
});
type StaffForm = z.infer<typeof staffSchema>;

const canMutate = (role?: string) => role === 'ADMINISTRATOR' || role === 'DBA';

export default function StaffPage() {
  const { user, logout }  = useAuth();
  const [staff,   setStaff]   = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,  setEditing]  = useState<Staff | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sr, br] = await Promise.all([
        apiFetch<{ data: Staff[] }>('/api/v1/staff'),
        apiFetch<{ data: Branch[] }>('/api/v1/branches'),
      ]);
      setStaff(sr.data);
      setBranches(br.data);
    } catch { /* handled by error boundary */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); reset({}); setDrawerOpen(true); };
  const openEdit   = (s: Staff) => {
    setEditing(s);
    reset({ firstName: s.first_name, lastName: s.last_name, email: s.email, phone: s.phone ?? '', role: s.role as typeof ROLES[number] });
    setDrawerOpen(true);
  };

  const onSubmit = async (data: StaffForm) => {
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/v1/staff/${editing.staff_id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        await apiFetch('/api/v1/staff', { method: 'POST', body: JSON.stringify(data) });
      }
      setDrawerOpen(false);
      fetchData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save');
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this staff member?')) return;
    await apiFetch(`/api/v1/staff/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const filtered = staff.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100">Staff</h1>
          <p className="text-stone-500 text-sm mt-0.5">{staff.length} total members</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw size={14} /></Button>
          {canMutate(user?.role) && (
            <Button size="sm" onClick={openCreate}><Plus size={14} /> Add staff</Button>
          )}
          <Button variant="danger" size="sm" onClick={logout} className="flex items-center gap-1.5 ml-2">
            <LogOut size={14} /> Log Out
          </Button>
        </div>
      </div>


      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-white/4 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-stone-200 placeholder:text-stone-600 outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-stone-500 text-sm">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Name</th>
                <th className="text-left px-6 py-3 font-medium">Role</th>
                <th className="text-left px-6 py-3 font-medium">Branch</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                {canMutate(user?.role) && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => (
                <tr key={s.staff_id} className="hover:bg-white/3 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-300 uppercase">
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div>
                        <p className="text-stone-200 font-medium">{s.first_name} {s.last_name}</p>
                        <p className="text-stone-500 text-xs">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge role={s.role as Parameters<typeof Badge>[0]['role']} /></td>
                  <td className="px-6 py-4 text-stone-400">{s.branch_name ?? '—'}</td>
                  <td className="px-6 py-4"><StatusPill active={s.is_active} /></td>
                  {canMutate(user?.role) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={13} /></Button>
                        <Button variant="danger"  size="sm" onClick={() => deactivate(s.staff_id)}><UserX size={13} /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-stone-500">No staff found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-stone-950/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="w-96 bg-stone-950 border-l border-white/8 p-8 overflow-y-auto">
            <h2 className="text-lg font-semibold text-stone-100 mb-6">
              {editing ? 'Edit staff member' : 'Add staff member'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First name" error={errors.firstName?.message} {...register('firstName')} />
                <Input label="Last name"  error={errors.lastName?.message}  {...register('lastName')} />
              </div>
              <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
              <Input label="Phone" error={errors.phone?.message} {...register('phone')} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Role</label>
                <select className="bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-500 transition-colors" {...register('role')}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Branch</label>
                <select className="bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-500 transition-colors" {...register('branchId')}>
                  <option value="">— None —</option>
                  {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                </select>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button type="submit" loading={isSubmitting} className="flex-1">{editing ? 'Save' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
