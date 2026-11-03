import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';

import { computeAnchoredPosition } from '../../utils/popoverPosition';

import { Spinner } from './Spinner';

// The calendar pulls in the date-picker library (~20 kB gzip). Splitting it out
// keeps that weight off every route/form that merely *contains* a date field —
// it loads the first time a picker is actually opened.
const Calendar = lazy(() => import('./Calendar').then((m) => ({ default: m.Calendar })));

const CALENDAR_FALLBACK = (
  <div className="flex h-72 w-72 items-center justify-center text-on-surface-variant">
    <Spinner className="h-5 w-5" />
  </div>
);

interface DateFieldProps {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  hideErrorText?: boolean;
  containerClassName?: string;
  className?: string;
  id?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
}

const POPOVER_HEIGHT_ESTIMATE = 380;
const POPOVER_WIDTH = 288;

const displayFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function parseDateOnly(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) {
    return undefined;
  }
  return new Date(y, m - 1, d);
}

function formatDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DateField({ label, hideLabel = false, hint, error, hideErrorText, id, containerClassName, className, value, onChange, min, max, disabled }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpward: boolean; maxHeight: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error && !hideErrorText ? errorId : !error && hint ? hintId : undefined;

  const selectedDate = parseDateOnly(value);

  function emitChange(date: Date | undefined) {
    onChange({ target: { value: date ? formatDateOnly(date) : '' } } as ChangeEvent<HTMLInputElement>);
  }

  function open() {
    if (disabled) {
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPosition(computeAnchoredPosition(rect, {
      estimatedHeight: POPOVER_HEIGHT_ESTIMATE,
      width: POPOVER_WIDTH,
    }));
    setIsOpen(true);
  }

  function close(refocus = true) {
    setIsOpen(false);
    if (refocus) {
      triggerRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      // A click inside any floating panel — including the Month/Year
      // SelectField's own popup, which portals outside this popover's DOM
      // subtree — is a legitimate in-flow interaction, not an "outside" click.
      const insideFloatingPanel = target instanceof Element && target.closest('[data-floating-panel]');
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target) &&
        !insideFloatingPanel
      ) {
        close(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
      }
    }

    function handleScrollOrResize(e: Event) {
      // Only a genuine page scroll (target is the document) should close the
      // popover — a scroll inside a nested scrollable list, including one in
      // a portal that isn't a DOM descendant of ours, must not.
      if (e.target !== document) {
        return;
      }
      close(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className={containerClassName}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'block text-label-md font-label-md text-on-surface'}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onClick={() => (isOpen ? close() : open())}
        className={
          className ??
          `${hideLabel ? '' : 'mt-1 '}flex w-full items-center justify-between gap-2 rounded-DEFAULT border bg-white px-3 py-2 text-left text-body-md text-on-surface transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-outline-variant disabled:bg-surface-container-low disabled:text-on-surface-variant ${error ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant hover:border-outline focus:border-accent focus:ring-accent/20'}`
        }
      >
        <span className={selectedDate ? '' : 'text-on-surface-variant/60'}>
          {selectedDate ? displayFormatter.format(selectedDate) : 'Select a date'}
        </span>
        <CalendarDays size={16} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Choose ${label}`}
          data-floating-panel
          style={{
            position: 'fixed',
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined,
            left: position.left,
            maxHeight: position.maxHeight,
          }}
          className="animate-overlay-in z-50 overflow-y-auto rounded-DEFAULT border border-outline-variant bg-white shadow-md"
        >
          <Suspense fallback={CALENDAR_FALLBACK}>
            <Calendar
              selected={selectedDate}
              onSelect={(date) => {
                emitChange(date);
                close();
              }}
              onClear={() => {
                emitChange(undefined);
                close();
              }}
              minDate={parseDateOnly(min)}
              maxDate={parseDateOnly(max)}
            />
          </Suspense>
        </div>,
        document.body,
      )}

      {error && !hideErrorText && (
        <p id={errorId} className="mt-1 text-label-sm text-error" role="alert">{error}</p>
      )}
      {!error && hint && <p id={hintId} className="mt-1 text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
