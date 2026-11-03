import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import type { DateRange } from '@daypicker/react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';

import { computeAnchoredPosition } from '../../utils/popoverPosition';

import { Spinner } from './Spinner';

const Calendar = lazy(() => import('./Calendar').then((m) => ({ default: m.Calendar })));

const CALENDAR_FALLBACK = (
  <div className="flex h-64 w-full items-center justify-center text-on-surface-variant">
    <Spinner className="h-5 w-5" />
  </div>
);

interface DateRangeFieldProps {
  appearance?: 'default' | 'command';
  label?: string;
  from: string;
  to: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  onChangeRange?: (from: string, to: string) => void;
  fromLabel?: string;
  toLabel?: string;
  minFrom?: string;
  maxTo?: string;
  containerClassName?: string;
  disabled?: boolean;
}

const defaultTriggerClassName =
  'inline-flex w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-DEFAULT border border-outline-variant bg-white px-2.5 py-1.5 text-left text-label-sm text-on-surface transition-colors hover:border-outline focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:border-outline-variant disabled:bg-surface-container-low disabled:text-on-surface-variant';

const commandTriggerClassName =
  'flex min-w-0 max-w-full items-center justify-between gap-2 rounded-sm border-0 bg-transparent px-2 py-1.5 text-left text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-on-surface-variant';

const POPOVER_HEIGHT_ESTIMATE = 460;
const POPOVER_WIDTH_ESTIMATE = 520;
const displayFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function parseDateOnly(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

function formatDateOnly(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toRange(from: string, to: string): DateRange | undefined {
  const start = parseDateOnly(from);
  if (!start) {
    return undefined;
  }
  const end = parseDateOnly(to);
  return end ? { from: start, to: end } : { from: start };
}

function formatSummary(range: DateRange | undefined, fromLabel: string, toLabel: string): string {
  if (!range?.from) {
    return `${fromLabel} – ${toLabel}`;
  }
  const fromText = displayFormatter.format(range.from);
  if (!range.to) {
    return `${fromLabel}: ${fromText} – ${toLabel}`;
  }
  return `${fromLabel}: ${fromText} – ${toLabel}: ${displayFormatter.format(range.to)}`;
}

function formatPeriodSummary(range: DateRange | undefined): string {
  if (!range?.from) {
    return 'Select a date range';
  }
  const fromText = displayFormatter.format(range.from);
  return range.to ? `${fromText} – ${displayFormatter.format(range.to)}` : `${fromText} – Select an end date`;
}

export function DateRangeField({
  appearance = 'default',
  label,
  from,
  to,
  onChangeFrom,
  onChangeTo,
  onChangeRange,
  fromLabel = 'From date',
  toLabel = 'To date',
  minFrom,
  maxTo,
  containerClassName,
  disabled,
}: DateRangeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpward: boolean; maxHeight: number; width: number } | null>(null);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => toRange(from, to));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const fieldId = generatedId;
  const triggerClassName = appearance === 'command' ? commandTriggerClassName : defaultTriggerClassName;
  const committedRange = toRange(from, to);
  const displayedRange = isOpen ? draftRange : committedRange;
  const accessibleLabel = label ?? `${fromLabel} to ${toLabel}`;

  useEffect(() => {
    if (!isOpen) {
      setDraftRange(toRange(from, to));
    }
  }, [from, to, isOpen]);

  function open() {
    if (disabled) {
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setDraftRange(committedRange);
    setPosition(computeAnchoredPosition(rect, {
      estimatedHeight: POPOVER_HEIGHT_ESTIMATE,
      width: POPOVER_WIDTH_ESTIMATE,
    }));
    setIsOpen(true);
  }

  function close(refocus = true) {
    setIsOpen(false);
    setPosition(null);
    if (refocus) {
      triggerRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const insideFloatingPanel = target instanceof Element && target.closest('[data-floating-panel]');
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target) &&
        !insideFloatingPanel
      ) {
        close(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
      }
    }

    function handleScrollOrResize(event: Event) {
      if (event.target !== document) {
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

  function clearRange() {
    setDraftRange(undefined);
    if (onChangeRange) {
      onChangeRange('', '');
    } else {
      onChangeFrom('');
      onChangeTo('');
    }
    close();
  }

  function selectRange(range: DateRange | undefined) {
    if (!range?.from) {
      setDraftRange(undefined);
      return;
    }
    if (!range.to) {
      setDraftRange(range);
      return;
    }

    const start = range.from.getTime() <= range.to.getTime() ? range.from : range.to;
    const end = range.from.getTime() <= range.to.getTime() ? range.to : range.from;
    const minimum = parseDateOnly(minFrom);
    const maximum = parseDateOnly(maxTo);
    if ((minimum && start < minimum) || (maximum && end > maximum)) {
      setDraftRange({ from: start });
      return;
    }

    setDraftRange({ from: start, to: end });
    const nextFrom = formatDateOnly(start);
    const nextTo = formatDateOnly(end);
    if (onChangeRange) {
      onChangeRange(nextFrom, nextTo);
    } else {
      onChangeFrom(nextFrom);
      onChangeTo(nextTo);
    }
    close();
  }

  return (
    <div className={containerClassName}>
      {label && <label htmlFor={fieldId} className="block text-label-md font-label-md text-on-surface">{label}</label>}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-label={accessibleLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${fieldId}-popover` : undefined}
        onClick={() => (isOpen ? close() : open())}
        className={`${label ? 'mt-1 ' : ''}${triggerClassName}`}
      >
        <span className={`min-w-0 truncate ${displayedRange ? '' : 'text-on-surface-variant/60'}`}>{formatSummary(displayedRange, fromLabel, toLabel)}</span>
        <CalendarDays size={16} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={popoverRef}
          id={`${fieldId}-popover`}
          role="dialog"
          aria-label={`Choose ${accessibleLabel}`}
          data-floating-panel
          style={{
            position: 'fixed',
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
          className="animate-overlay-in z-50 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-DEFAULT border border-outline-variant bg-white shadow-md"
        >
          <div className="border-b border-outline-variant/60 px-3 py-2">
            <p className="text-label-sm font-label-sm uppercase tracking-wide text-on-surface-variant">Period</p>
            <p aria-live="polite" aria-atomic="true" className="text-body-sm text-on-surface">
              {formatPeriodSummary(draftRange)}
            </p>
          </div>
          <Suspense fallback={CALENDAR_FALLBACK}>
            <Calendar
              mode="range"
              selectedRange={draftRange}
              onRangeSelect={selectRange}
              onClear={clearRange}
              minDate={parseDateOnly(minFrom)}
              maxDate={parseDateOnly(maxTo)}
            />
          </Suspense>
        </div>,
        document.body,
      )}
    </div>
  );
}
