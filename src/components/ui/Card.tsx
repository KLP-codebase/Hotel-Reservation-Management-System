import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm',
        'p-6 transition-all duration-200',
        hover ? 'hover:bg-white/8 hover:border-white/15 cursor-pointer' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
