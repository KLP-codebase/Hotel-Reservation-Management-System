'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../context/auth-context';
import { ApiError } from '../../../lib/api-client';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login }  = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      const user = await login(data);
      if (user?.role?.toUpperCase() === 'GUEST') {
        window.location.replace('/');
      } else {
        window.location.replace('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="rounded-none border border-white/12 bg-[#0B2540]/80 backdrop-blur-2xl p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] transition-all duration-300">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="font-cinzel text-2xl font-normal text-white tracking-wide mb-1">Welcome Back</h2>
        <p className="font-jakarta text-xs text-stone-400 tracking-[0.1em] uppercase">
          Sign in to access your SkyNest portal
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">
            Username
          </label>
          <input
            type="text"
            placeholder="e.g. admin"
            autoComplete="username"
            className="w-full bg-[#071C30]/90 border border-white/15 rounded-none px-4 py-3 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
            {...register('username')}
          />
          {errors.username && <span className="text-xs text-red-400 mt-0.5">{errors.username.message}</span>}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-jakarta font-semibold text-stone-300 uppercase tracking-[0.15em]">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-[#071C30]/90 border border-white/15 rounded-none px-4 py-3 pr-12 text-sm text-white placeholder:text-stone-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all duration-200"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs font-jakarta transition-colors"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <span className="text-xs text-red-400 mt-0.5">{errors.password.message}</span>}
        </div>

        {apiError && (
          <div className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 rounded-none px-4 py-3 font-jakarta">
            {apiError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-[#071C30] font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 rounded-none transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#071C30] border-t-transparent rounded-full animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      <p className="text-center text-stone-400 text-xs font-jakarta tracking-wide mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Register Guest Account
        </Link>
      </p>
    </div>
  );
}
