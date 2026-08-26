'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-stone-400 uppercase tracking-widest">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full bg-transparent border-b border-white/20 pb-2 pt-1',
            'text-stone-100 placeholder:text-stone-600 text-sm',
            'outline-none transition-colors duration-150',
            'focus:border-amber-500',
            error ? 'border-red-500 focus:border-red-400' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
        {hint  && !error && <span className="text-xs text-stone-500">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
