'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../context/auth-context';
import { apiFetch, ApiError } from '../../../lib/api-client';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const schema = z.object({
  username: z.string().min(1, 'Email address or username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const pendingParam = searchParams.get('pending_verification') || searchParams.get('registered');

  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Email verification state
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    setResendMessage(null);
    try {
      await apiFetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setResendMessage('A fresh verification link has been sent to your email.');
      setResendCooldown(120);
    } catch (err) {
      setResendMessage(err instanceof ApiError ? err.message : 'Failed to resend verification link.');
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    setIsEmailNotVerified(false);
    setResendMessage(null);

    try {
      const res = await login(data);
      if (res.challengeRequired && res.challengeId) {
        window.location.replace(`/authenticate?challengeId=${res.challengeId}&email=${encodeURIComponent(res.emailMasked || '')}`);
        return;
      }

      if (res.user?.role?.toUpperCase() === 'GUEST') {
        window.location.replace('/');
      } else {
        window.location.replace('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setIsEmailNotVerified(true);
          setUnverifiedEmail(data.username);
        } else {
          setApiError(err.message);
        }
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-center lg:justify-end items-center min-h-[calc(100vh-120px)] relative">
      {/* Right-aligned Card Wrapper with 3D Overlapping Cloud Wisps */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Overlapping Cloud 1: Low rolling pool mist drifting over bottom-left corner */}
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

        {/* Sharp Ivory Surface Card — Floating above cloud horizon */}
        <div className="rounded-none border border-skynest-hairline bg-paper/95 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(11,37,64,0.08)]">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-cinzel text-2xl font-bold tracking-[0.1em] text-ink uppercase">
              Welcome Back
            </h1>
            <p className="text-xs font-jakarta text-ink/60 mt-1">
              Sign in to continue your journey.
            </p>
          </div>

          {/* Pending verification info banner */}
          {pendingParam && !isEmailNotVerified && (
            <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-none p-3.5 font-jakarta flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Please check your inbox for the activation link before signing in.</span>
            </div>
          )}

          {/* Unverified Email Warning Banner (Issue 1 fix) */}
          {isEmailNotVerified && (
            <div className="mb-4 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-none p-4 font-jakarta space-y-2.5">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-amber-950">Email Verification Required</p>
                  <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                    Please verify your email before logging in. Check your inbox for the activation link.
                  </p>
                </div>
              </div>
              <div className="pt-1 border-t border-amber-200/70">
                <button
                  type="button"
                  disabled={isResending || resendCooldown > 0}
                  onClick={handleResendVerification}
                  className="text-[11px] font-semibold tracking-wider uppercase text-skynest-accent hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Verification Link →'}
                </button>
                {resendMessage && (
                  <p className="text-[10px] text-amber-800 mt-1">{resendMessage}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                EMAIL ADDRESS <span className="text-skynest-accent">*</span>
              </label>
              <input
                type="text"
                autoComplete="username"
                className="w-full rounded-none border border-skynest-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors duration-200 focus:border-skynest-accent"
                {...register('username')}
              />
              {errors.username && (
                <span className="text-xs text-rose-600 font-jakarta mt-0.5">
                  {errors.username.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase">
                PASSWORD <span className="text-skynest-accent">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full rounded-none border border-skynest-hairline bg-paper px-4 py-3 pr-10 text-sm text-ink outline-none transition-colors duration-200 focus:border-skynest-accent"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-ink transition-colors"
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
                <span className="text-xs text-rose-600 font-jakarta mt-0.5">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Remember me & Forgot password row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-none border border-skynest-hairline text-ink focus:ring-0 focus:ring-offset-0 cursor-pointer accent-ink"
                />
                <span className="text-xs font-jakarta text-ink/70">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-jakarta text-skynest-accent hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {apiError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-none px-4 py-3 font-jakarta">
                {apiError}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs font-jakarta text-ink/60 mt-5">
            Don’t have an account?{' '}
            <Link href="/register" className="font-semibold text-ink hover:text-skynest-accent hover:underline uppercase tracking-wider text-[11px] transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
