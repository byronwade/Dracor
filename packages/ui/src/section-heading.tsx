import React from 'react';

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeading({ title, subtitle, className = '' }: SectionHeadingProps) {
  return (
    <div className={['mb-6', className].join(' ')}>
      <h2 className="text-2xl font-bold text-stone-100">{title}</h2>
      {subtitle && <p className="mt-1 text-stone-400">{subtitle}</p>}
    </div>
  );
}
