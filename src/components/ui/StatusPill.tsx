import React from 'react';

interface StatusPillProps {
  active:    boolean;
  className?: string;
}

export function StatusPill({ active, className = '' }: StatusPillProps) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-xs font-medium',
      active
        ? 'bg-emerald-900/50 text-emerald-400'
        : 'bg-stone-800/60   text-stone-500',
      className,
    ].join(' ')}>
      <span className={[
        'w-1.5 h-1.5 rounded-none',
        active ? 'bg-emerald-400' : 'bg-stone-600',
      ].join(' ')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
