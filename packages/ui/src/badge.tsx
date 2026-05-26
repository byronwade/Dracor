import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'ember' | 'gold' | 'danger';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-stone-700 text-stone-300 border-stone-600',
  ember: 'bg-orange-900/50 text-orange-300 border-orange-700',
  gold: 'bg-amber-900/50 text-amber-300 border-amber-700',
  danger: 'bg-red-900/50 text-red-300 border-red-700',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
