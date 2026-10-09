'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const [apiError, setApiError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      setRegisteredEmail(data.email);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (registeredEmail) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-center lg:justify-end items-center min-h-[calc(100vh-120px)] relative">
        <div className="relative z-10 w-full max-w-[460px]">
          {/* Overlapping Cloud: Low rolling mist */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -left-20 sm:-left-28 w-64 sm:w-80 h-44 sm:h-56 opacity-65 z-40 select-none"
            style={{ animation: 'cloudDriftPoolMist 13s ease-in-out infinite' }}
          >
            <img
              src="/clouds/cloud_realistic.webp"
              alt=""
              className="w-full h-full object-contain object-bottom-left drop-shadow-[0_12px_28px_rgba(255,255,255,0.8)]"
            />
          </div>

          {/* Sharp Ivory Surface Card */}
          <div className="rounded-none border border-skynest-hairline bg-paper/95 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(11,37,64,0.08)] text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-skynest-accent/10 border border-skynest-accent/30 text-skynest-accent flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="font-cinzel text-2xl font-bold tracking-[0.1em] text-ink uppercase">
                Check Your Inbox
              </h1>
              <p className="font-jakarta text-xs text-ink/70 leading-relaxed max-w-sm mx-auto">
                We have dispatched an activation link to <strong className="text-ink font-semibold">{registeredEmail}</strong>. Please confirm your email address to activate your reservation privileges.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full inline-block rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200 shadow-md text-center"
              >
                Proceed to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-center lg:justify-end items-center min-h-[calc(100vh-120px)] relative">
      {/* Right-aligned Card Wrapper with 3D Overlapping Cloud Wisps */}
      <div className="relative z-10 w-full max-w-[460px]">
        {/* Overlapping Cloud: Low rolling mist */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -left-20 sm:-left-28 w-64 sm:w-80 h-44 sm:h-56 opacity-65 z-40 select-none"
          style={{ animation: 'cloudDriftPoolMist 13s ease-in-out infinite' }}
        >
          <img
            src="/clouds/cloud_realistic.webp"
            alt=""
            className="w-full h-full object-contain object-bottom-left drop-shadow-[0_12px_28px_rgba(255,255,255,0.8)]"
          />
        </div>

        {/* Sharp Ivory Surface Card */}
        <div className="rounded-none border border-skynest-hairline bg-paper/95 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(11,37,64,0.08)]">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-cinzel text-2xl font-bold tracking-[0.1em] text-ink uppercase">
              Create Account
            </h1>
            <p className="text-xs font-jakarta text-ink/60 mt-1">
              Register for your SkyNest guest sanctuary account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                  FIRST NAME <span className="text-skynest-accent">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Amara"
                  className="w-full rounded-none border border-skynest-hairline bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 outline-none transition-colors duration-200 focus:border-skynest-accent"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <span className="text-xs text-rose-600 font-jakarta mt-0.5">{errors.firstName.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                  LAST NAME <span className="text-skynest-accent">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Perera"
                  className="w-full rounded-none border border-skynest-hairline bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 outline-none transition-colors duration-200 focus:border-skynest-accent"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <span className="text-xs text-rose-600 font-jakarta mt-0.5">{errors.lastName.message}</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                EMAIL <span className="text-skynest-accent">*</span>
              </label>
              <input
                type="email"
                placeholder="you@skynest.lk"
                className="w-full rounded-none border border-skynest-hairline bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 outline-none transition-colors duration-200 focus:border-skynest-accent"
                {...register('email')}
              />
              {errors.email && (
                <span className="text-xs text-rose-600 font-jakarta mt-0.5">{errors.email.message}</span>
              )}
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                USERNAME <span className="text-skynest-accent">*</span>
              </label>
              <input
                type="text"
                placeholder="amara.perera"
                className="w-full rounded-none border border-skynest-hairline bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 outline-none transition-colors duration-200 focus:border-skynest-accent"
                {...register('username')}
              />
              {errors.username && (
                <span className="text-xs text-rose-600 font-jakarta mt-0.5">{errors.username.message}</span>
              )}
            </div>

            {/* Password with Show/Hide toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                PASSWORD <span className="text-skynest-accent">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-none border border-skynest-hairline bg-paper px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-stone-400 outline-none transition-colors duration-200 focus:border-skynest-accent"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-ink transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-rose-600 font-jakarta mt-0.5">{errors.password.message}</span>
              )}
            </div>

            {/* Error Message */}
            {apiError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-none px-4 py-3 font-jakarta">
                {apiError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs font-jakarta text-ink/60 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-ink hover:text-skynest-accent hover:underline uppercase tracking-wider text-[11px] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
