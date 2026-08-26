import React from 'react';

type AccountType = 'GUEST' | 'RECEPTIONIST' | 'SERVICE_STAFF' | 'MANAGER' | 'ADMINISTRATOR' | 'DBA';

const roleStyles: Record<AccountType, string> = {
  GUEST:         'bg-stone-700/60 text-stone-300',
  RECEPTIONIST:  'bg-sky-900/60  text-sky-300',
  SERVICE_STAFF: 'bg-teal-900/60 text-teal-300',
  MANAGER:       'bg-violet-900/60 text-violet-300',
  ADMINISTRATOR: 'bg-amber-900/60  text-amber-300',
  DBA:           'bg-rose-900/60   text-rose-300',
};

const roleLabels: Record<AccountType, string> = {
  GUEST:         'Guest',
  RECEPTIONIST:  'Receptionist',
  SERVICE_STAFF: 'Service Staff',
  MANAGER:       'Manager',
  ADMINISTRATOR: 'Administrator',
  DBA:           'DBA',
};

interface BadgeProps {
  role: AccountType;
  className?: string;
}

export function Badge({ role, className = '' }: BadgeProps) {
  return (
    <span className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      roleStyles[role] ?? 'bg-stone-700/60 text-stone-300',
      className,
    ].join(' ')}>
      {roleLabels[role] ?? role}
    </span>
  );
}
