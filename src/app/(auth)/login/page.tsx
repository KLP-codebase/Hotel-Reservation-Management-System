'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../context/auth-context';
import { Input }  from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ApiError } from '../../../lib/api-client';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await login(data);
      window.location.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  };


  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-8">
      <h2 className="text-xl font-semibold text-stone-100 mb-1">Welcome back</h2>
      <p className="text-stone-500 text-sm mb-8">Sign in to your Sky Nest account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Username"
          placeholder="e.g. admin"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {apiError && (
          <div className="text-sm text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
            {apiError}
          </div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
          Sign in
        </Button>
      </form>

      <p className="text-center text-stone-600 text-xs mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-amber-500 hover:text-amber-400 transition-colors">
          Register
        </Link>
      </p>
    </div>
  );
}
