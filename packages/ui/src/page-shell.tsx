import React from 'react';

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div
      className={[
        'min-h-screen bg-stone-950 text-stone-100',
        className,
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl p-6">{children}</div>
    </div>
  );
}
