import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock } from 'lucide-react';

import { computeAnchoredPosition } from '../../utils/popoverPosition';

import { Spinner } from './Spinner';

// Split out the date-picker library so it only loads when a picker is opened.
const Calendar = lazy(() => import('./Calendar').then((m) => ({ default: m.Calendar })));

const CALENDAR_FALLBACK = (
  <div className="flex h-72 w-72 items-center justify-center text-on-surface-variant">
    <Spinner className="h-5 w-5" />
  </div>
);

interface DateTimeFieldProps {
  label: string;
  value: string | null;
  onChange: (isoValue: string | null) => void;
  hint?: string;
  error?: string;
  hideErrorText?: boolean;
  id?: string;
  containerClassName?: string;
  disabled?: boolean;
}

// Calendar (w-72) + two time columns + the AM/PM toggle. Both estimates only
// steer the open-direction choice and viewport clamp in open(); the calendar's
// fixedWeeks makes the height estimate stable rather than varying with the
// month's row count.
const POPOVER_HEIGHT_ESTIMATE = 400;
const POPOVER_WIDTH_ESTIMATE = 470;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const PERIODS = ['AM', 'PM'] as const;

// Event times land on 5-minute boundaries in practice, and a 60-item list is a
// long scroll for no gain. buildMinutes keeps any off-step value already on the
// record so editing an existing announcement never silently rounds its time.
const MINUTE_STEP = 5;
const STEPPED_MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'));

function buildMinutes(current: string): string[] {
  if (STEPPED_MINUTES.includes(current)) {
    return STEPPED_MINUTES;
  }
  return [...STEPPED_MINUTES, current].sort();
}

const columnHeadingClass = 'pb-1 text-center text-overline font-overline uppercase text-on-surface-variant';

const displayFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function to12Hour(hour24: number): { hour: string; period: 'AM' | 'PM' } {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return { hour: String(hour12).padStart(2, '0'), period };
}

function to24Hour(hour12: string, period: 'AM' | 'PM'): number {
  const hour = Number(hour12) % 12;
  return period === 'PM' ? hour + 12 : hour;
}

function TimeColumn({ items, selected, onSelect, label, heading }: { items: readonly string[]; selected: string; onSelect: (value: string) => void; label: string; heading: string }) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'center' });
  }, []);

  return (
    <div className="flex min-h-0 flex-col pt-2">
      <div aria-hidden="true" className={columnHeadingClass}>{heading}</div>
      <div role="listbox" aria-label={label} className="thin-scrollbar flex min-h-0 w-14 flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-2">
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <button
              key={item}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(item)}
              className={`shrink-0 rounded-DEFAULT px-2 py-1.5 text-center text-body-sm transition-colors ${
                isSelected ? 'bg-accent font-label-md text-on-primary' : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateTimeField({ label, value, onChange, hint, error, hideErrorText, id, containerClassName, disabled }: DateTimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpward: boolean; maxHeight: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState<number>();

  const selectedDate = value ? new Date(value) : undefined;
  const { hour, period } = selectedDate ? to12Hour(selectedDate.getHours()) : { hour: '12', period: 'PM' as const };
  const minute = selectedDate ? String(selectedDate.getMinutes()).padStart(2, '0') : '00';

  function commit(date: Date) {
    onChange(date.toISOString());
  }

  function updateDatePart(date: Date) {
    const base = selectedDate ?? new Date();
    commit(new Date(date.getFullYear(), date.getMonth(), date.getDate(), base.getHours(), base.getMinutes()));
  }

  function updateTimePart(nextHour: string, nextMinute: string, nextPeriod: 'AM' | 'PM') {
    const base = selectedDate ?? new Date();
    commit(new Date(base.getFullYear(), base.getMonth(), base.getDate(), to24Hour(nextHour, nextPeriod), Number(nextMinute)));
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
      width: POPOVER_WIDTH_ESTIMATE,
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
      // popover — a scroll inside a nested scrollable list, including the
      // Month/Year SelectField's own listbox portal, must not.
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

  // Mirror the calendar's rendered height onto the time columns via JS
  // rather than CSS percentage/stretch — the calendar's height varies (5 vs
  // 6 week rows) and a scrollable 60-item minute column's intrinsic content
  // height fights both flex stretch and grid track sizing, blowing up the
  // popover instead of clipping to the container.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const el = calendarWrapperRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setCalendarHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-label-md font-label-md text-on-surface">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
        className={`mt-1 flex w-full items-center justify-between gap-2 rounded-DEFAULT border bg-white px-3 py-2 text-left text-body-md text-on-surface transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-outline-variant disabled:bg-surface-container-low disabled:text-on-surface-variant ${error ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant hover:border-outline focus:border-accent focus:ring-accent/20'}`}
      >
        <span className={selectedDate ? '' : 'text-on-surface-variant/60'}>
          {selectedDate ? displayFormatter.format(selectedDate) : 'Select date & time'}
        </span>
        <CalendarClock size={16} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
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
          className="animate-overlay-in z-50 flex flex-col overflow-y-auto rounded-DEFAULT border border-outline-variant bg-white shadow-md"
        >
          <div className="flex items-start">
            <div ref={calendarWrapperRef} className="shrink-0">
              <Suspense fallback={CALENDAR_FALLBACK}>
                <Calendar selected={selectedDate} onSelect={updateDatePart} />
              </Suspense>
            </div>
            <div
              className="flex divide-x divide-outline-variant/60 border-l border-outline-variant/60"
              style={{ height: calendarHeight }}
            >
              <TimeColumn heading="Hr" label="Hour" items={HOURS} selected={hour} onSelect={(h) => updateTimePart(h, minute, period)} />
              <TimeColumn heading="Min" label="Minute" items={buildMinutes(minute)} selected={minute} onSelect={(m) => updateTimePart(hour, m, period)} />
              <div className="flex flex-col px-2 pt-2">
                <div aria-hidden="true" className={columnHeadingClass}>&nbsp;</div>
                <div role="group" aria-label="AM/PM" className="flex flex-col overflow-hidden rounded-DEFAULT border border-outline-variant">
                  {PERIODS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={item === period}
                      onClick={() => updateTimePart(hour, minute, item)}
                      className={`px-3 py-1.5 text-label-sm font-label-sm transition-colors ${
                        item === period ? 'bg-accent text-on-primary' : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant/60 p-2">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                close();
              }}
              className="rounded-DEFAULT px-2 py-1 text-label-sm font-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => close()}
              className="rounded-DEFAULT bg-accent px-3 py-1.5 text-label-sm font-label-sm text-on-primary transition-colors hover:bg-accent-hover"
            >
              Done
            </button>
          </div>
        </div>,
        document.body,
      )}

      {error && !hideErrorText && (
        <p className="mt-1 text-label-sm text-error" role="alert">{error}</p>
      )}
      {!error && hint && <p className="mt-1 text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
