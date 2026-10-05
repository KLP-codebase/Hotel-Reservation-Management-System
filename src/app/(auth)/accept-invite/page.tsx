'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch, ApiError } from '../../../lib/api-client';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

interface InviteInfo {
  staffId:    string;
  firstName:  string;
  lastName:   string;
  email:      string;
  role:       string;
  branchName: string | null;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in link. Please verify the URL.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadInfo() {
      try {
        const res = await apiFetch<{ data: InviteInfo }>(`/api/v1/auth/invite-info?token=${encodeURIComponent(token!)}`);
        if (isMounted) {
          setInviteInfo(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof ApiError ? err.message : 'Invalid or expired invitation link.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInfo();
    return () => { isMounted = false; };
  }, [token]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await apiFetch('/api/v1/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({
          token,
          username: data.username,
          password: data.password,
        }),
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to activate account.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-center lg:justify-end items-center min-h-[calc(100vh-120px)] relative">
      <div className="relative z-10 w-full max-w-[460px]">
        <div className="rounded-none border border-skynest-hairline bg-paper/95 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(11,37,64,0.08)]">
          
          <div className="text-center mb-6">
            <MountainGlyph className="w-6 h-auto text-skynest-accent mx-auto mb-3" />
            <h1 className="font-cinzel text-2xl font-bold tracking-[0.1em] text-ink uppercase">
              Staff Activation
            </h1>
            <p className="text-xs font-jakarta text-ink/60 mt-1">
              Sky Nest Hotel Management System
            </p>
          </div>

          {loading && (
            <div className="py-12 text-center space-y-4">
              <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-jakarta text-xs text-ink/70 tracking-wider uppercase">
                Loading invitation details...
              </p>
            </div>
          )}

          {!loading && isSuccess && (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="font-cinzel text-lg font-semibold text-ink">
                  Account Activated!
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  Your credentials have been set. Redirecting you to the Sky Nest sign-in portal...
                </p>
              </div>
            </div>
          )}

          {!loading && !isSuccess && error && !inviteInfo && (
            <div className="space-y-6 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="font-cinzel text-base font-semibold text-ink">
                  Invitation Unavailable
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  {error}
                </p>
              </div>
              <Link
                href="/login"
                className="w-full inline-block rounded-none border border-skynest-hairline bg-paper hover:bg-white text-ink font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3 transition-colors text-center"
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {!loading && !isSuccess && inviteInfo && (
            <div className="space-y-5">
              <div className="p-4 bg-ink/5 border border-skynest-hairline rounded-none">
                <p className="text-xs font-jakarta text-ink">
                  Welcome, <strong className="font-semibold">{inviteInfo.firstName} {inviteInfo.lastName}</strong>!
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] font-jakarta uppercase tracking-wider px-2 py-0.5 border border-skynest-hairline bg-paper text-skynest-accent font-semibold">
                    {inviteInfo.role.replace('_', ' ')}
                  </span>
                  {inviteInfo.branchName && (
                    <span className="text-[10px] font-jakarta uppercase tracking-wider px-2 py-0.5 border border-skynest-hairline bg-paper text-ink/70">
                      {inviteInfo.branchName}
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-none px-4 py-3 font-jakarta">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                    CHOOSE USERNAME <span className="text-skynest-accent">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. j.perera"
                    className="w-full rounded-none border border-skynest-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors duration-200 focus:border-skynest-accent"
                    {...register('username')}
                  />
                  {errors.username && (
                    <span className="text-xs text-rose-600 font-jakarta mt-0.5">
                      {errors.username.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                    CREATE PASSWORD <span className="text-skynest-accent">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      className="w-full rounded-none border border-skynest-hairline bg-paper px-4 py-3 pr-10 text-sm text-ink outline-none transition-colors duration-200 focus:border-skynest-accent"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-ink transition-colors"
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
                    <span className="text-xs text-rose-600 font-jakarta mt-0.5">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                    CONFIRM PASSWORD <span className="text-skynest-accent">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    className="w-full rounded-none border border-skynest-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors duration-200 focus:border-skynest-accent"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <span className="text-xs text-rose-600 font-jakarta mt-0.5">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <span>Activate Staff Account</span>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
