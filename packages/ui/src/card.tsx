import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-stone-800 bg-stone-900/50 p-6',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
