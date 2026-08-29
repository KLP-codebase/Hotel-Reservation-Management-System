'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch, ApiError } from '../../../lib/api-client';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Invalid email address'),
  username:  z.string().min(3, 'Username must be at least 3 characters'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, role: 'GUEST' }),
      });
      router.push('/login');
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="rounded-3xl border border-white/12 bg-[#0B2540]/80 backdrop-blur-2xl p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] transition-all duration-300">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="font-cinzel text-2xl font-normal text-white tracking-wide mb-1">Create Account</h2>
        <p className="font-jakarta text-xs text-stone-400 tracking-[0.1em] uppercase">
          Register a new SkyNest guest sanctuary account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">First Name</label>
            <input
              type="text"
              placeholder="Amara"
              className="w-full bg-[#071C30]/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
              {...register('firstName')}
            />
            {errors.firstName && <span className="text-xs text-red-400">{errors.firstName.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">Last Name</label>
            <input
              type="text"
              placeholder="Perera"
              className="w-full bg-[#071C30]/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
              {...register('lastName')}
            />
            {errors.lastName && <span className="text-xs text-red-400">{errors.lastName.message}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">Email</label>
          <input
            type="email"
            placeholder="you@skynest.lk"
            className="w-full bg-[#071C30]/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
            {...register('email')}
          />
          {errors.email && <span className="text-xs text-red-400">{errors.email.message}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">Username</label>
          <input
            type="text"
            placeholder="amara.perera"
            className="w-full bg-[#071C30]/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
            {...register('username')}
          />
          {errors.username && <span className="text-xs text-red-400">{errors.username.message}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">Password</label>
          <input
            type="password"
            placeholder="Min. 8 chars"
            className="w-full bg-[#071C30]/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
            {...register('password')}
          />
          {errors.password && <span className="text-xs text-red-400">{errors.password.message}</span>}
        </div>

        {apiError && (
          <div className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 font-jakarta">
            {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-[#071C30] font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#071C30] border-t-transparent rounded-full animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <p className="text-center text-stone-400 text-xs font-jakarta tracking-wide mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
