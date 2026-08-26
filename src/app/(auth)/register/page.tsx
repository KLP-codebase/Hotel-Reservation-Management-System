'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Input }  from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const ROLES = ['GUEST','RECEPTIONIST','SERVICE_STAFF','MANAGER','ADMINISTRATOR','DBA'] as const;

const schema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  username:  z.string().min(3),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  role:      z.enum(ROLES),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'RECEPTIONIST' },
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await apiFetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) });
      router.push('/login');
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-8">
      <h2 className="text-xl font-semibold text-stone-100 mb-1">Create account</h2>
      <p className="text-stone-500 text-sm mb-8">Register a new Sky Nest staff account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" placeholder="Amara" error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Last name"  placeholder="Perera" error={errors.lastName?.message}  {...register('lastName')} />
        </div>
        <Input label="Email"    type="email"    placeholder="you@skynest.lk"  error={errors.email?.message}    {...register('email')} />
        <Input label="Username" placeholder="amara.perera"                    error={errors.username?.message} {...register('username')} />
        <Input label="Password" type="password" placeholder="Min. 8 chars"   error={errors.password?.message} {...register('password')} />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Role</label>
          <select
            className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-500 transition-colors"
            {...register('role')}
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r.replace('_', ' ')}</option>
            ))}
          </select>
          {errors.role && <span className="text-xs text-red-400">{errors.role.message}</span>}
        </div>

        {apiError && (
          <div className="text-sm text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
            {apiError}
          </div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="text-center text-stone-600 text-xs mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-amber-500 hover:text-amber-400 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
