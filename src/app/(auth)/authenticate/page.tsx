'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authClient, UserProfile } from '../../../lib/auth-client';
import { ApiError } from '../../../lib/api-client';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AuthenticateContent() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId') || '';
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [otpCode, setOtpCode] = useState('');
  const [status, setStatus] = useState<'waiting' | 'verifying' | 'success' | 'error' | 'expired'>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string>('/');

  // Resend state
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Scenario 1: User arrived via 1-click email authorization link with token
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setStatus('verifying');

    async function authorizeWithToken() {
      try {
        const res = await authClient.verifyChallenge({ token });
        if (isMounted && res.status === 'APPROVED') {
          const target = res.user.role?.toUpperCase() === 'GUEST' ? '/' : '/dashboard';
          setUserProfile(res.user);
          setRedirectTarget(target);
          setStatus('success');

          setTimeout(() => {
            if (isMounted) window.location.replace(target);
          }, 1500);
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err instanceof ApiError ? err.message : 'Failed to authorize sign-in request.');
        }
      }
    }

    authorizeWithToken();
    return () => { isMounted = false; };
  }, [token]);

  // Scenario 2: User is waiting on the browser tab while challenge is PENDING
  useEffect(() => {
    if (token || !challengeId || status === 'success') return;

    let isMounted = true;

    async function poll() {
      try {
        const res = await authClient.checkChallenge(challengeId);
        if (!isMounted) return;

        if (res.status === 'APPROVED' && res.user) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          const target = res.user.role?.toUpperCase() === 'GUEST' ? '/' : '/dashboard';
          setUserProfile(res.user);
          setRedirectTarget(target);
          setStatus('success');

          setTimeout(() => {
            if (isMounted) window.location.replace(target);
          }, 1500);
        } else if (res.status === 'EXPIRED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStatus('expired');
        }
      } catch {
        // network glitch or silent poll error
      }
    }

    pollIntervalRef.current = setInterval(poll, 2200);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [challengeId, token, status]);

  // Handle direct 6-digit OTP code submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit authorization code.');
      return;
    }

    setErrorMessage(null);
    setStatus('verifying');

    try {
      const res = await authClient.verifyChallenge({ challengeId, otpCode: otpCode.trim() });
      if (res.status === 'APPROVED') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        const target = res.user.role?.toUpperCase() === 'GUEST' ? '/' : '/dashboard';
        setUserProfile(res.user);
        setRedirectTarget(target);
        setStatus('success');

        setTimeout(() => {
          window.location.replace(target);
        }, 1500);
      }
    } catch (err) {
      setStatus('waiting');
      setErrorMessage(err instanceof ApiError ? err.message : 'Invalid 6-digit authorization code.');
    }
  };

  const handleResend = async () => {
    if (!challengeId || isResending || cooldown > 0) return;
    setIsResending(true);
    setResendStatus(null);
    setErrorMessage(null);

    try {
      await authClient.resendChallenge(challengeId);
      setResendStatus('A fresh authorization code has been dispatched to your email.');
      setCooldown(60);
    } catch (err) {
      setResendStatus(err instanceof ApiError ? err.message : 'Failed to resend authorization code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-center lg:justify-end items-center min-h-[calc(100vh-120px)] relative">
      <div className="relative z-10 w-full max-w-[440px]">
        
        {/* Floating atmospheric cloud */}
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

        <div className="rounded-none border border-skynest-hairline bg-paper/95 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(11,37,64,0.08)]">

          {/* Header */}
          <div className="text-center mb-6">
            <MountainGlyph className="w-6 h-auto text-skynest-accent mx-auto mb-3" />
            <h1 className="font-cinzel text-2xl font-bold tracking-[0.1em] text-ink uppercase">
              Authorize Sign-In
            </h1>
            <p className="text-xs font-jakarta text-ink/60 mt-1">
              Sky Nest Sanctuary Identity Verification
            </p>
          </div>

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="font-cinzel text-lg font-semibold text-ink">
                  Sign-In Authorized
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  Identity confirmed{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}. You are now securely authenticated.
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

          {/* Verifying Token State */}
          {status === 'verifying' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-jakarta text-xs text-ink/70 tracking-wider uppercase">
                Verifying authorization credentials...
              </p>
            </div>
          )}

          {/* Waiting / Form State */}
          {status === 'waiting' && (
            <div className="space-y-5">
              <div className="bg-[#F8F6F2] border border-skynest-hairline p-4 text-center space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-jakarta font-semibold uppercase tracking-wider text-skynest-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-skynest-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-skynest-accent"></span>
                  </span>
                  <span>Awaiting Email Authorization</span>
                </div>
                <p className="font-jakarta text-xs text-ink/75 leading-relaxed">
                  We sent an authorization link and code to{' '}
                  <strong className="text-ink">{emailParam || 'your registered email'}</strong>. Please authorize from your email to confirm this was indeed you signing in.
                </p>
              </div>

              {/* 6-Digit Code Direct Entry */}
              <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-jakarta font-semibold tracking-[0.16em] text-ink/70 uppercase text-center">
                    OR ENTER 6-DIGIT CODE FROM EMAIL
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.35em] font-mono text-lg rounded-none border border-skynest-hairline bg-paper px-4 py-3 text-ink outline-none transition-colors duration-200 focus:border-skynest-accent placeholder:tracking-[0.2em] placeholder:text-stone-300"
                  />
                </div>

                {errorMessage && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-none px-3.5 py-2.5 font-jakarta text-center">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpCode.length < 6}
                  className="w-full rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Verify Code &amp; Sign In
                </button>
              </form>

              {/* Resend Section */}
              <div className="border-t border-skynest-hairline pt-4 text-center space-y-2">
                {resendStatus && (
                  <p className="text-[11px] font-jakarta text-skynest-accent">
                    {resendStatus}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || cooldown > 0}
                  className="text-xs font-jakarta text-ink/70 hover:text-skynest-accent transition-colors disabled:opacity-50"
                >
                  {isResending ? 'Sending...' : cooldown > 0 ? `Resend authorization email in ${cooldown}s` : 'Resend Authorization Email'}
                </button>
              </div>

              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="text-xs font-jakarta text-ink/50 hover:text-ink transition-colors"
                >
                  &larr; Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* Expired State */}
          {status === 'expired' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="font-cinzel text-base font-semibold text-ink">
                  Authorization Session Expired
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  This sign-in authorization window has timed out for your security. Please sign in again.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full inline-block rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200"
              >
                Sign In Again
              </Link>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="font-cinzel text-base font-semibold text-ink">
                  Authorization Failed
                </h2>
                <p className="font-jakarta text-xs text-ink/70 leading-relaxed">
                  {errorMessage || 'Invalid or expired authorization link.'}
                </p>
              </div>
              <Link
                href="/login"
                className="w-full inline-block rounded-none border border-ink bg-ink hover:bg-skynest-accent hover:border-skynest-accent text-paper hover:text-white font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 transition-all duration-200"
              >
                Return to Sign In
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AuthenticatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthenticateContent />
    </Suspense>
  );
}
