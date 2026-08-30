'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Building2, RefreshCw, LogOut } from 'lucide-react';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Button }     from '../../../components/ui/Button';
import { Input }      from '../../../components/ui/Input';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Card }       from '../../../components/ui/Card';
import { useAuth }    from '../../../context/auth-context';

interface Branch {
  branch_id:   string;
  branch_name: string;
  city:        string;
  address:     string | null;
  phone:       string | null;
  email:       string | null;
  is_active:   boolean;
}

const schema = z.object({
  branchName: z.string().min(1),
  city:       z.string().min(1),
  address:    z.string().optional(),
  phone:      z.string().optional(),
  email:      z.string().email().optional().or(z.literal('')),
});
type BranchForm = z.infer<typeof schema>;

const canMutate = (role?: string) => role === 'ADMINISTRATOR' || role === 'DBA';

export default function BranchesPage() {
  const { user, logout } = useAuth();
  const [branches,    setBranches]    = useState<Branch[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editing,     setEditing]     = useState<Branch | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BranchForm>({
    resolver: zodResolver(schema),
  });

  const fetchData = async () => {
    setLoading(true);
    const res = await apiFetch<{ data: Branch[] }>('/api/v1/branches').finally(() => setLoading(false));
    setBranches(res.data);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); reset({}); setDrawerOpen(true); };
  const openEdit   = (b: Branch) => {
    setEditing(b);
    reset({ branchName: b.branch_name, city: b.city, address: b.address ?? '', phone: b.phone ?? '', email: b.email ?? '' });
    setDrawerOpen(true);
  };

  const onSubmit = async (data: BranchForm) => {
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/v1/branches/${editing.branch_id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        await apiFetch('/api/v1/branches', { method: 'POST', body: JSON.stringify(data) });
      }
      setDrawerOpen(false);
      fetchData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save');
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this branch?')) return;
    await apiFetch(`/api/v1/branches/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100">Branches</h1>
          <p className="text-stone-500 text-sm mt-0.5">{branches.length} locations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw size={14} /></Button>
          {canMutate(user?.role) && (
            <Button size="sm" onClick={openCreate}><Plus size={14} /> Add branch</Button>
          )}
          <Button variant="danger" size="sm" onClick={logout} className="flex items-center gap-1.5 ml-2">
            <LogOut size={14} /> Log Out
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-none bg-white/3 border border-white/8 animate-pulse" />
          ))
        ) : branches.map(b => (
          <Card key={b.branch_id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-none bg-amber-700/20 flex items-center justify-center text-amber-400">
                  <Building2 size={16} />
                </div>
                <div>
                  <p className="text-stone-100 font-medium">{b.branch_name}</p>
                  <p className="text-stone-500 text-xs">{b.city}</p>
                </div>
              </div>
              <StatusPill active={b.is_active} />
            </div>

            <div className="space-y-1 text-xs text-stone-500">
              {b.address && <p>{b.address}</p>}
              {b.phone   && <p>{b.phone}</p>}
              {b.email   && <p>{b.email}</p>}
            </div>

            {canMutate(user?.role) && (
              <div className="flex gap-2 pt-2 border-t border-white/6">
                <Button variant="ghost"  size="sm" onClick={() => openEdit(b)}      className="flex-1"><Pencil size={13} /> Edit</Button>
                <Button variant="danger" size="sm" onClick={() => deactivate(b.branch_id)} className="flex-1">Deactivate</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-stone-950/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="w-96 bg-stone-950 border-l border-white/8 p-8 overflow-y-auto">
            <h2 className="text-lg font-semibold text-stone-100 mb-6">
              {editing ? 'Edit branch' : 'Add branch'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input label="Branch name" error={errors.branchName?.message} {...register('branchName')} />
              <Input label="City"        error={errors.city?.message}       {...register('city')} />
              <Input label="Address"     error={errors.address?.message}    {...register('address')} />
              <Input label="Phone"       error={errors.phone?.message}      {...register('phone')} />
              <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />

              {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-none px-4 py-3">{error}</p>}
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
