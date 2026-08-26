'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'default' | 'ghost' | 'danger' | 'outline';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-700 shadow-sm shadow-amber-900/30',
  ghost:   'bg-transparent text-stone-300 hover:bg-white/8 hover:text-white',
  danger:  'bg-red-700/80 text-white hover:bg-red-600 active:bg-red-800',
  outline: 'border border-white/20 text-stone-200 hover:bg-white/8 hover:border-white/40',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2   text-sm rounded-xl',
  lg: 'px-6 py-3   text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading, disabled, children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
