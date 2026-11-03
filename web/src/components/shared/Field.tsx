import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface FieldProps {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  href?: string;
  alignIconWithLabel?: boolean;
}

export function Field({ icon: Icon, label, value, href, alignIconWithLabel = false }: FieldProps) {
  const isEmpty = value === null || value === undefined || value === '';
  const isTextValue = typeof value === 'string' || typeof value === 'number';
  return (
    <div className="grid grid-cols-[0.9375rem_minmax(0,1fr)] items-start gap-x-2.5">
      <Icon size={15} className={`${alignIconWithLabel ? 'mt-px' : 'mt-0.5'} shrink-0 text-on-surface-variant/60`} aria-hidden="true" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-label-sm text-on-surface-variant">{label}</p>
        {isEmpty ? (
          <p className="mt-0.5 text-body-md text-on-surface-variant/50">Not provided</p>
        ) : href && isTextValue ? (
          <a href={href} title={String(value)} className="mt-0.5 block truncate text-body-md font-label-md text-accent hover:text-accent-hover hover:underline">
            {value}
          </a>
        ) : isTextValue ? (
          <p title={String(value)} className="mt-0.5 truncate text-body-md font-label-md text-on-surface">{value}</p>
        ) : (
          <div className="mt-1">{value}</div>
        )}
      </div>
    </div>
  );
}
