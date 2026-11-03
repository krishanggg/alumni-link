import type { ReactNode } from 'react';

export interface DashboardPanelProps {
  title: string;
  headingId: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function DashboardPanel({ title, headingId, action, className = '', children }: DashboardPanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={`min-w-0 rounded-DEFAULT border border-outline-variant/70 bg-white p-6 shadow-panel ${className}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-surface-container pb-2">
        <h2 id={headingId} className="text-headline-sm font-headline-sm text-on-surface">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
