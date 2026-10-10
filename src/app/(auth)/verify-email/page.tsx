'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '../../../lib/api-client';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  branchId: string | null;
  branchName: string | null;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string>('/');

  // Resend form state
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found. Please check the link in your email.');
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await apiFetch<{
          data: {
            token: string;
            user: UserProfile;
          };
        }>('/api/v1/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        if (isMounted) {
          const authData = res.data;
          let target = '/';

          if (authData?.token) {
            // Establish session cookie for Next.js middleware & server components
            document.cookie = `sn_token=${encodeURIComponent(authData.token)}; path=/; SameSite=Lax; max-age=${8 * 3600}`;
            try {
              localStorage.setItem('skynest_token', authData.token);
              localStorage.setItem('skynest_user', JSON.stringify(authData.user));
            } catch {}

            setUserProfile(authData.user);
            target = authData.user.role?.toUpperCase() === 'GUEST' ? '/' : '/dashboard';
          }

          setRedirectTarget(target);
          setStatus('success');

          // Seamless auto-login redirect
          setTimeout(() => {
            if (isMounted) {
              window.location.replace(target);
            }
          }, 1800);
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err instanceof ApiError ? err.message : 'Verification failed. The token may be expired or invalid.');
        }
      }
    }

    verify();
    return () => { isMounted = false; };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setIsResending(true);
    setResendStatus(null);

    try {
      await apiFetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail }),
      });
      setResendStatus('Verification link dispatched. Please check your inbox.');
      setCooldown(120);
    } catch (err) {
      setResendStatus(err instanceof ApiError ? err.message : 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-center lg:justify-end items-center min-h-[calc(100vh-120px)] relative">
      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-none border border-skynest-hairline bg-paper/95 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(11,37,64,0.08)]">

          <div className="text-center mb-6">
            <MountainGlyph className="w-6 h-auto text-skynest-accent mx-auto mb-3" />
            <h1 className="font-cinzel text-2xl font-bold tracking-[0.1em] text-ink uppercase">
              Email Verification
            </h1>
            <p className="text-xs font-jakarta text-ink/60 mt-1">
              Sky Nest Luxury Hotel Sanctuary
            </p>
          </div>

          {status === 'verifying' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-jakarta text-xs text-ink/70 tracking-wider uppercase">
                Verifying your credentials &amp; signing in...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="font-cinzel text-lg font-semibold text-ink">
                  Email Verified &amp; Signed In
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  Welcome to Sky Nest{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}. Your account is activated and you are signed in.
                </p>
              </div>

              <div className="pt-2 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-jakarta text-skynest-accent font-medium">
                  <span className="w-3.5 h-3.5 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin" />
                  <span>Entering your sanctuary portal...</span>
                </div>

                <button
                  type="button"
                  onClick={() => window.location.replace(redirectTarget)}
                  className="w-full mt-2 rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200 text-center"
                >
                  Continue to Sanctuary Now &rarr;
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="font-cinzel text-base font-semibold text-ink">
                  Verification Link Invalid or Expired
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              <div className="border-t border-skynest-hairline pt-5">
                <h3 className="font-jakarta text-[11px] font-semibold tracking-[0.15em] text-ink uppercase mb-2">
                  Request New Verification Link
                </h3>
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    className="w-full rounded-none border border-skynest-hairline bg-paper px-4 py-2.5 text-xs text-ink outline-none transition-colors duration-200 focus:border-skynest-accent"
                  />

                  {resendStatus && (
                    <p className="text-[11px] font-jakarta text-skynest-accent">
                      {resendStatus}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isResending || cooldown > 0}
                    className="w-full rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-[10px] tracking-[0.2em] uppercase py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Resend Verification Link'}
                  </button>
                </form>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs font-jakarta text-skynest-accent hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
