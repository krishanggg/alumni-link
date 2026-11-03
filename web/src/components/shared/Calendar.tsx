import { type FocusEvent, type PointerEvent, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import type { DateRange, Matcher } from '@daypicker/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { SelectField } from './SelectField';

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  mode?: 'single' | 'range';
  selectedRange?: DateRange;
  onRangeSelect?: (range: DateRange | undefined) => void;
  onClear?: () => void;
  minDate?: Date;
  maxDate?: Date;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const dayCellClass =
  'flex h-9 w-9 items-center justify-center rounded-full text-body-sm text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

const rangeDayCellClass =
  'flex h-8 w-8 items-center justify-center rounded-full text-body-sm text-on-surface transition-colors motion-reduce:transition-none hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

const rangeStartClass =
  'rounded-l-full bg-accent/15 text-on-surface transition-colors motion-reduce:transition-none [&>button]:bg-accent [&>button]:font-label-md [&>button]:text-on-primary [&>button]:transition-none [&>button]:hover:bg-accent-hover';
const rangeMiddleClass = 'bg-accent/15 text-on-surface transition-colors motion-reduce:transition-none';
const rangeEndClass =
  'rounded-r-full bg-accent/15 text-on-surface transition-colors motion-reduce:transition-none [&>button]:bg-accent [&>button]:font-label-md [&>button]:text-on-primary [&>button]:transition-none [&>button]:hover:bg-accent-hover';
const rangeWeekStartClass = 'rounded-l-full';
const rangeWeekEndClass = 'rounded-r-full';
const rangeOutsideClass =
  '!rounded-none !bg-transparent text-on-surface-variant/40 [&>button]:!bg-transparent [&>button]:!font-normal [&>button]:!text-on-surface-variant/40 [&>button]:hover:!bg-surface-container-low';

// The month/year triggers read as the calendar's caption heading, not as form
// inputs — no border or fill at rest, chrome only on hover/focus.
const captionTriggerClass =
  'inline-flex items-center gap-1 rounded-DEFAULT px-1.5 py-1 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

// Matches the prev/next arrows in Pagination, except for the hover fill, which
// follows the surrounding calendar's day cells instead.
const navButtonClass =
  'rounded-DEFAULT p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

/** Months since year 0 — lets min/max range checks ignore time-of-day. */
function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function dayKey(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function Calendar({ mode = 'single', selected, onSelect, selectedRange, onRangeSelect, onClear, minDate, maxDate }: CalendarProps) {
  const today = new Date();
  const [month, setMonth] = useState((mode === 'range' ? selectedRange?.from : selected) ?? today);
  const [previewDate, setPreviewDate] = useState<Date>();

  const fallbackLowYear = minDate?.getFullYear() ?? today.getFullYear() - 100;
  const fallbackHighYear = maxDate?.getFullYear() ?? today.getFullYear() + 10;
  const lowYear = Math.min(fallbackLowYear, selected?.getFullYear() ?? fallbackLowYear, today.getFullYear());
  const highYear = Math.max(fallbackHighYear, selected?.getFullYear() ?? fallbackHighYear, today.getFullYear());
  const years = Array.from({ length: highYear - lowYear + 1 }, (_, i) => lowYear + i);

  const disabledMatchers: Matcher[] = [];
  if (minDate) {
    disabledMatchers.push({ before: minDate });
  }
  if (maxDate) {
    disabledMatchers.push({ after: maxDate });
  }

  const minKey = minDate ? monthKey(minDate) : -Infinity;
  const maxKey = maxDate ? monthKey(maxDate) : Infinity;
  const currentKey = monthKey(month);

  // Picking a year at the edge of the range can leave the month index out of
  // bounds (e.g. December of the maxDate year) — clamp rather than land the
  // user on a grid where every day is disabled.
  function goToMonth(year: number, monthIndex: number) {
    const clamped = Math.min(Math.max(year * 12 + monthIndex, minKey), maxKey);
    setMonth(new Date(Math.floor(clamped / 12), clamped % 12, 1));
  }

  function shiftMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  const classNames = {
    root: mode === 'range' ? 'w-full' : '',
    month_caption: mode === 'range' ? 'mb-1 flex h-7 items-center justify-center px-7' : 'hidden',
    caption_label: mode === 'range' ? 'text-label-md font-label-md text-on-surface' : '',
    nav: mode === 'range' ? 'absolute inset-x-0 top-0 z-10 h-11' : 'hidden',
    button_previous: mode === 'range' ? `${navButtonClass} absolute left-0 top-0` : '',
    button_next: mode === 'range' ? `${navButtonClass} absolute right-0 top-0` : '',
    chevron: mode === 'range' ? 'h-4 w-4' : '',
    months: mode === 'range' ? 'grid grid-cols-1 gap-x-2 gap-y-2 sm:grid-cols-2' : '',
    month: mode === 'range' ? 'relative min-w-0' : '',
    month_grid: 'w-full border-collapse',
    weekdays: '',
    weekday: `${mode === 'range' ? 'pb-0.5' : 'pb-1'} text-center text-label-sm font-label-sm text-on-surface-variant`,
    week: '',
    day: mode === 'range'
      ? 'p-0 text-center align-middle transition-colors duration-[var(--duration-fast)] motion-reduce:transition-none'
      : 'p-0 text-center align-middle',
    day_button: mode === 'range' ? rangeDayCellClass : dayCellClass,
    today: '[&>button]:font-label-md [&>button]:text-accent',
    selected: mode === 'single' ? '[&>button]:bg-accent [&>button]:font-label-md [&>button]:text-on-primary [&>button]:hover:bg-accent-hover' : '',
    range_start: rangeStartClass,
    range_end: rangeEndClass,
    range_middle: rangeMiddleClass,
    outside: mode === 'range' ? rangeOutsideClass : '[&>button]:text-on-surface-variant/40',
    disabled: '[&>button]:cursor-not-allowed [&>button]:text-on-surface-variant/25 [&>button]:hover:bg-transparent',
  };

  const previewRange = mode === 'range' && selectedRange?.from && !selectedRange.to && previewDate && selectedRange.from.getTime() !== previewDate.getTime()
    ? selectedRange.from.getTime() < previewDate.getTime()
      ? { from: selectedRange.from, to: previewDate }
      : { from: previewDate, to: selectedRange.from }
    : undefined;
  const previewModifiers = previewRange
    ? {
        preview_start: previewRange.from,
        preview_middle: { after: previewRange.from, before: previewRange.to },
        preview_end: previewRange.to,
      }
    : undefined;
  const previewModifierClasses = previewRange
    ? { preview_start: rangeStartClass, preview_middle: rangeMiddleClass, preview_end: rangeEndClass }
    : undefined;
  const activeRange = previewRange ?? (selectedRange?.from && selectedRange.to ? selectedRange : undefined);
  const activeRangeStart = activeRange?.from ? dayKey(activeRange.from) : undefined;
  const activeRangeEnd = activeRange?.to ? dayKey(activeRange.to) : undefined;
  const isInActiveRange = (date: Date) => {
    if (activeRangeStart === undefined || activeRangeEnd === undefined) {
      return false;
    }
    const day = dayKey(date);
    return day >= activeRangeStart && day <= activeRangeEnd;
  };
  const rangeSegmentModifiers = activeRange
    ? {
        range_week_start: (date: Date) => isInActiveRange(date) && (date.getDay() === 0 || dayKey(date) === activeRangeStart),
        range_week_end: (date: Date) => isInActiveRange(date) && (date.getDay() === 6 || dayKey(date) === activeRangeEnd),
      }
    : undefined;
  const rangeModifiers = activeRange ? { ...previewModifiers, ...rangeSegmentModifiers } : undefined;
  const rangeModifierClasses = activeRange
    ? {
        ...previewModifierClasses,
        range_week_start: rangeWeekStartClass,
        range_week_end: rangeWeekEndClass,
      }
    : undefined;

  function handleRangeCalendarBlur(event: FocusEvent<HTMLDivElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setPreviewDate(undefined);
    }
  }

  function handleRangeCalendarPointerLeave(event: PointerEvent<HTMLDivElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setPreviewDate(undefined);
    }
  }

  return (
    <div className={mode === 'range' ? 'w-full p-2' : 'w-72 p-3'}>
      {mode === 'single' && <div className="mb-2 flex items-center gap-1">
        <SelectField
          label="Month"
          hideLabel
          value={month.getMonth()}
          onChange={(e) => goToMonth(month.getFullYear(), Number(e.target.value))}
          className={captionTriggerClass}
        >
          {MONTH_NAMES.map((name, index) => {
            const key = month.getFullYear() * 12 + index;
            return (
              <option key={name} value={index} disabled={key < minKey || key > maxKey}>{name}</option>
            );
          })}
        </SelectField>
        <SelectField
          label="Year"
          hideLabel
          value={month.getFullYear()}
          onChange={(e) => goToMonth(Number(e.target.value), month.getMonth())}
          className={captionTriggerClass}
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </SelectField>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={currentKey - 1 < minKey}
            aria-label="Previous month"
            className={navButtonClass}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={currentKey + 1 > maxKey}
            aria-label="Next month"
            className={navButtonClass}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>}

      {mode === 'range' ? (
        <div
          data-range-preview-surface
          onPointerLeave={handleRangeCalendarPointerLeave}
          onBlurCapture={handleRangeCalendarBlur}
        >
          <DayPicker
            mode="range"
            month={month}
            onMonthChange={setMonth}
            selected={selectedRange}
            onSelect={onRangeSelect}
            min={0}
            resetOnSelect
            numberOfMonths={2}
            navLayout="around"
            startMonth={minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), 1) : undefined}
            endMonth={maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), 1) : undefined}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            showOutsideDays
            // Pad every month to 6 week rows so the popover keeps a constant
            // height when the range calendar is opened or navigated.
            fixedWeeks
            modifiers={rangeModifiers}
            modifiersClassNames={rangeModifierClasses}
            onDayMouseEnter={(date, modifiers) => {
              setPreviewDate(modifiers.disabled ? undefined : date);
            }}
            onDayFocus={(date, modifiers) => {
              setPreviewDate(modifiers.disabled ? undefined : date);
            }}
            classNames={classNames}
          />
        </div>
      ) : (
        <DayPicker
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(date) => date && onSelect?.(date)}
          disabled={disabledMatchers.length ? disabledMatchers : undefined}
          hideNavigation
          showOutsideDays
          // Pad every month to 6 week rows so the popover keeps a constant
          // height — otherwise a 4/5/6-row month resizes the panel (and, in
          // DateTimeField, the time columns mirroring its height) on navigation.
          fixedWeeks
          classNames={classNames}
        />
      )}

      <div className={`${mode === 'range' ? 'mt-1 pt-1' : 'mt-2 pt-2'} flex items-center justify-between border-t border-outline-variant/60`}>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-DEFAULT px-2 py-1 text-label-sm font-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Clear
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={() => {
            if (mode === 'range') {
              onRangeSelect?.({ from: today });
            } else {
              onSelect?.(today);
            }
          }}
          className="rounded-DEFAULT px-2 py-1 text-label-sm font-label-sm text-accent transition-colors hover:bg-accent/10 hover:text-accent-hover"
        >
          Today
        </button>
      </div>
    </div>
  );
}
