import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export function TextAreaField({ label, hint, error, id, containerClassName, className, ...textareaProps }: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={fieldId} className="block text-label-md font-label-md text-on-surface">
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={
          className ??
          `mt-1 block w-full rounded-DEFAULT border bg-white px-3 py-2 text-body-md text-on-surface transition-colors placeholder:text-on-surface-variant focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-outline-variant disabled:bg-surface-container-low disabled:text-on-surface-variant ${error ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant hover:border-outline focus:border-accent focus:ring-accent/20'}`
        }
        {...textareaProps}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-label-sm text-error" role="alert">{error}</p>
      ) : (
        hint && <p id={hintId} className="mt-1 text-label-sm text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}
