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

// Eye icon for show/hide password
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="m10.748 13.93 2.523 2.523a10.075 10.075 0 0 1-3.272.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.058 10.058 0 0 1 2.4 8.776l4.152 4.152a4 4 0 0 0 4.196 1.002Z" />
    </svg>
  );
}

const DEMO_ROLES = [
  { label: 'Demo',         user: 'admin',        pass: 'admin2025'    },
  { label: 'Admin',        user: 'admin',        pass: 'admin2025'    },
  { label: 'Manager',      user: 'manager',      pass: 'SkyNest2025!' },
  { label: 'Staff',        user: 'receptionist', pass: 'SkyNest2025!' },
  { label: 'Guest',        user: 'guest',        pass: 'SkyNest2025!' },
];

export default function LoginPage() {
  const { login }       = useAuth();
  const [apiError, setApiError]         = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const fillCredentials = (label: string, user: string, pass: string) => {
    setSelectedRole(label);
    setValue('username', user, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setApiError(null);
  };

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
    <>
      {/* Heading */}
      <div className="mb-8 text-center">
        <h2 className="font-cinzel text-2xl font-normal text-text-ink tracking-[0.08em] uppercase mb-2">
          Welcome Back
        </h2>
        <p className="font-jakarta text-xs text-text-ink-faded tracking-[0.12em] uppercase">
          Sign in to continue your journey.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-username"
            className="text-[11px] font-jakarta font-semibold text-text-ink tracking-[0.15em] uppercase"
          >
            Username <span className="text-skynest-accent">*</span>
          </label>
          <input
            id="login-username"
            type="text"
            placeholder="e.g. admin"
            autoComplete="username"
            className="w-full bg-[#EEF2F7] border border-[#C8D4E3] px-4 py-3 text-sm text-text-ink placeholder:text-text-ink-faded/60 outline-none focus:border-text-ink focus:ring-1 focus:ring-text-ink/20 transition-all duration-200 rounded-none"
            {...register('username')}
          />
          {errors.username && (
            <span className="text-xs text-red-500 mt-0.5">{errors.username.message}</span>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-[11px] font-jakarta font-semibold text-text-ink tracking-[0.15em] uppercase"
            >
              Password <span className="text-skynest-accent">*</span>
            </label>
            <span className="text-[11px] font-jakarta text-skynest-accent hover:underline cursor-pointer">
              Forgot password?
            </span>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••"
              autoComplete="current-password"
              className="w-full bg-[#EEF2F7] border border-[#C8D4E3] px-4 py-3 pr-11 text-sm text-text-ink placeholder:text-text-ink-faded/60 outline-none focus:border-text-ink focus:ring-1 focus:ring-text-ink/20 transition-all duration-200 rounded-none"
              {...register('password')}
            />
            <button
              type="button"
              id="toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-ink-faded hover:text-text-ink transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && (
            <span className="text-xs text-red-500 mt-0.5">{errors.password.message}</span>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="remember-me"
              className="w-3.5 h-3.5 border border-[#C8D4E3] accent-text-ink rounded-none cursor-pointer"
            />
            <span className="text-[11px] font-jakarta text-text-ink-faded tracking-wide">
              Remember me
            </span>
          </label>
        </div>

        {apiError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-3 font-jakarta">
            {apiError}
          </div>
        )}

        {/* Sign In Button */}
        <button
          id="sign-in-btn"
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-1 bg-text-ink hover:bg-text-ink/85 active:scale-[0.99] text-bg-paper font-jakarta font-semibold text-xs tracking-[0.2em] uppercase py-3.5 rounded-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-bg-paper border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-text-ink-faded text-[11px] font-jakarta tracking-wide mt-5">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-text-ink hover:underline transition-colors">
          Sign Up
        </Link>
      </p>

      {/* Quick-fill demo pills — moved below sign-up link */}
      <div className="mt-6 pt-5 border-t border-border-skynest-hairline">
        <div className="flex flex-wrap justify-center gap-2">
          {DEMO_ROLES.map(({ label, user, pass }) => (
            <button
              key={label}
              type="button"
              id={`demo-${label.toLowerCase()}`}
              onClick={() => fillCredentials(label, user, pass)}
              className={`px-3 py-1 text-[10px] font-jakarta font-semibold uppercase tracking-wider border transition-colors rounded-none ${
                selectedRole === label
                  ? 'border-text-ink bg-text-ink text-bg-paper'
                  : 'border-[#C8D4E3] bg-transparent text-text-ink-faded hover:border-text-ink hover:text-text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
