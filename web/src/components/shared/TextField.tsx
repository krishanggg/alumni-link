import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { mergeDescribedBy } from '../../utils/aria';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  icon?: LucideIcon;
  hint?: string;
  error?: string;
  hideErrorText?: boolean;
  containerClassName?: string;
  /** Overrides the default placeholder styling, e.g. to signal a pending value. */
  placeholderClassName?: string;
  /** For `type="password"` fields, adds the login page's show/hide toggle. */
  showPasswordToggle?: boolean;
}

export function TextField({ label, hideLabel = false, icon: Icon, hint, error, hideErrorText, id, containerClassName, className, placeholderClassName, showPasswordToggle = false, type, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const inputDescribedBy = inputProps['aria-describedby'];
  const describedBy = mergeDescribedBy(inputDescribedBy, hint ? hintId : undefined, error ? errorId : undefined);
  const hasExternalErrorDescription = inputDescribedBy?.split(/\s+/).includes(errorId) ?? false;
  const [visible, setVisible] = useState(false);
  const isToggleablePassword = type === 'password' && showPasswordToggle;
  const resolvedType = isToggleablePassword ? (visible ? 'text' : 'password') : type;

  return (
    <div className={containerClassName}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'block text-label-md font-label-md text-on-surface'}>
        {label}
      </label>
      <div className="relative mt-1">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
            aria-hidden="true"
          />
        )}
        <input
          id={fieldId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          className={
            className ??
            `block w-full rounded-DEFAULT border bg-white py-2 text-body-md text-on-surface transition-colors ${placeholderClassName ?? 'placeholder:text-on-surface-variant'} focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-outline-variant disabled:bg-surface-container-low disabled:text-on-surface-variant ${Icon ? 'pl-9' : 'pl-3'} ${isToggleablePassword ? 'pr-10' : 'pr-3'} ${error ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant hover:border-outline focus:border-accent focus:ring-accent/20'}`
          }
          {...inputProps}
          aria-describedby={describedBy}
        />
        {isToggleablePassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setVisible((prev) => !prev)}
              className="tap-target rounded-DEFAULT p-1 text-on-surface-variant hover:text-on-surface"
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
      </div>
      {error && !hasExternalErrorDescription && (
        <p id={errorId} className={hideErrorText ? 'sr-only' : 'mt-1 text-label-sm text-error'} role={hideErrorText ? undefined : 'alert'}>{error}</p>
      )}
      {hint && <p id={hintId} className="mt-1 text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
