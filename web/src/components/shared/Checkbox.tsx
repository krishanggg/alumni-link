import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  containerClassName?: string;
}

export function Checkbox({ label, hideLabel = false, hint, id, containerClassName, className, checked, disabled, ...inputProps }: CheckboxProps) {
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={`group flex items-start gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className={className ?? 'peer sr-only'}
            {...inputProps}
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-sm border transition-colors duration-fast peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30 peer-focus-visible:ring-offset-1 ${
              checked ? 'border-accent bg-accent' : disabled ? 'border-outline-variant bg-surface-container-low' : 'border-outline-variant bg-white group-hover:border-outline'
            }`}
          >
            <Check size={12} strokeWidth={3} className={`text-on-primary transition-transform duration-fast ${checked ? 'scale-100' : 'scale-0'}`} aria-hidden="true" />
          </span>
        </span>
        <span className={hideLabel ? 'sr-only' : `text-body-md ${disabled ? 'text-on-surface-variant' : 'text-on-surface'}`}>{label}</span>
      </label>
      {hint && <p className="ml-6 mt-1 text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
