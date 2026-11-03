import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';

import { useActiveSchools } from '../../hooks/useActiveSchools';

import { SelectField } from './SelectField';

interface SchoolScopeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
  className?: string;
  showLabel?: boolean;
  /** Overrides the default bordered-white trigger styling (e.g. a ghost variant for the app header). */
  triggerClassName?: string;
  appearance?: 'default' | 'flat' | 'command';
  /** Listbox anchoring — pass 'end' when the trigger sits at the right of its row. */
  align?: 'start' | 'end';
  /** Optional leading icon shown inside the trigger. */
  icon?: LucideIcon;
}

/**
 * A Super Admin-only page scope selector. An empty value deliberately means
 * that the page is showing the combined, cross-school view.
 */
export function SchoolScopeSelect({
  value,
  onChange,
  label = 'School',
  allLabel = 'All Schools',
  className = '',
  showLabel = true,
  triggerClassName,
  appearance = 'default',
  align = 'start',
  icon,
}: SchoolScopeSelectProps) {
  const { schools } = useActiveSchools();
  const id = useId();

  const selectedLabel = value
    ? schools.find((s) => String(s.id) === value)?.name ?? allLabel
    : allLabel;
  const isCommand = appearance === 'command';
  const appearanceClasses = isCommand
    ? 'inline-flex items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant'
    : `${showLabel ? 'mt-1.5 ' : ''}inline-flex w-full items-center justify-between gap-2 ${appearance === 'flat' ? 'rounded-sm' : 'rounded-DEFAULT'} border border-outline-variant bg-white py-2 pl-3 pr-3 text-left text-body-md text-on-surface transition-colors hover:border-outline focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant`;
  const triggerClasses = triggerClassName ?? appearanceClasses;

  return (
    <SelectField
      id={id}
      label={label}
      hideLabel={!showLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      title={selectedLabel}
      align={align}
      icon={icon}
      containerClassName={`block shrink-0 ${isCommand ? '' : className}`}
      className={triggerClasses}
    >
      <option value="">{allLabel}</option>
      {schools.map((school) => (
        <option key={school.id} value={school.id}>{school.name}</option>
      ))}
    </SelectField>
  );
}
