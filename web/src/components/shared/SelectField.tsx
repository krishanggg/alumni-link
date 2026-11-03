import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { mergeDescribedBy } from '../../utils/aria';
import { computeAnchoredPosition } from '../../utils/popoverPosition';

interface SelectFieldProps {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  hideErrorText?: boolean;
  containerClassName?: string;
  className?: string;
  appearance?: 'default' | 'command';
  /**
   * Horizontal anchoring of the listbox: 'start' aligns its left edge to the
   * trigger's left (default); 'end' aligns its right edge to the trigger's
   * right — use it for a trigger that sits near the right edge of its row.
   */
  align?: 'start' | 'end';
  /** Leading icon shown inside the trigger, before the selected label. */
  icon?: LucideIcon;
  id?: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}

interface SelectOption {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
}

const OPTION_HEIGHT_ESTIMATE = 36;
const MAX_VISIBLE_OPTIONS = 8;
const TYPEAHEAD_RESET_MS = 500;
// The listbox can grow wider than a narrow trigger to fit long option text
// (see computePosition's left clamp, which reserves room for this width).
const MAX_LISTBOX_WIDTH = 460;

function nodeToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeToText).join('');
  }
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function extractOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') {
      return;
    }
    const optionProps = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    options.push({
      value: String(optionProps.value ?? ''),
      label: optionProps.children,
      text: nodeToText(optionProps.children),
      disabled: Boolean(optionProps.disabled),
    });
  });
  return options;
}

/**
 * Custom listbox rather than a native <select> — a native option popup can't
 * be restyled to match the app's shadows/hover states/animations across
 * browsers, so the trigger and popup are both rendered by us instead.
 */
export function SelectField({
  label,
  hideLabel = false,
  hint,
  error,
  hideErrorText,
  id,
  containerClassName,
  className,
  appearance = 'default',
  align = 'start',
  icon: Icon,
  children,
  value,
  onChange,
  disabled,
  title,
}: SelectFieldProps) {
  const options = useMemo(() => extractOptions(children), [children]);
  const stringValue = String(value ?? '');
  const selectedIndex = options.findIndex((option) => option.value === stringValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; openUpward: boolean; maxHeight: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listboxId = useId();
  const generatedFieldId = useId();
  const fieldId = id ?? generatedFieldId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeDescribedBy(hint ? hintId : undefined, error ? errorId : undefined);

  function computePosition(exactContentHeight?: number, exactWidth?: number) {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    // Before the listbox has rendered we estimate; once it's on screen we
    // re-run with its real content height and width (see the layout effect
    // below), so a listbox that fits gets an exact maxHeight — no clipped last
    // row, no needless scrollbar — and an 'end'-aligned panel lands flush with
    // the trigger's right edge instead of guessing from the max width.
    const desiredHeight =
      exactContentHeight ?? Math.min(options.length, MAX_VISIBLE_OPTIONS) * OPTION_HEIGHT_ESTIMATE + 8;
    const anchorWidth = align === 'end' && exactWidth != null
      ? exactWidth
      : Math.max(rect.width, MAX_LISTBOX_WIDTH);
    const anchored = computeAnchoredPosition(rect, {
      estimatedHeight: desiredHeight,
      width: anchorWidth,
      align,
    });
    setPosition({ ...anchored, width: rect.width });
  }

  function openListbox() {
    if (disabled || options.length === 0) {
      return;
    }
    computePosition();
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.disabled));
    setIsOpen(true);
  }

  function closeListbox(refocus = true) {
    setIsOpen(false);
    if (refocus) {
      triggerRef.current?.focus();
    }
  }

  function commitSelection(index: number) {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }
    onChange({ target: { value: option.value } } as ChangeEvent<HTMLSelectElement>);
    closeListbox();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    listboxRef.current?.focus();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      // A click inside any floating panel — including one portaled outside
      // this listbox's DOM subtree, e.g. a nested SelectField's own popup —
      // is a legitimate in-flow interaction, not an "outside" click.
      const insideFloatingPanel = target instanceof Element && target.closest('[data-floating-panel]');
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        listboxRef.current && !listboxRef.current.contains(target) &&
        !insideFloatingPanel
      ) {
        closeListbox(false);
      }
    }

    function handleScrollOrResize(e: Event) {
      // A scroll should only close the popover if it can move the trigger:
      // the document itself, or an ancestor scroll container of the trigger
      // (e.g. a form's inner overflow-y-auto panel). A scroll inside
      // some unrelated scrollable element — including a nested list in a
      // portal that isn't a DOM descendant of ours, e.g. a SelectField
      // nested inside this popover — must not close it.
      const target = e.target;
      const movesTrigger = target === document ||
        (target instanceof Node && triggerRef.current && target.contains(triggerRef.current));
      if (!movesTrigger) {
        return;
      }
      closeListbox(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    const listbox = listboxRef.current;
    if (!isOpen || !listbox) {
      return;
    }
    // Cap at ~8 real rows so a long list still scrolls; round to a whole row
    // so the cap never lands mid-option.
    const rowHeight = listbox.querySelector('li')?.getBoundingClientRect().height ?? OPTION_HEIGHT_ESTIMATE;
    const cap = Math.round(rowHeight) * MAX_VISIBLE_OPTIONS + 8;
    // +1 guards a sub-pixel scrollHeight from tripping overflow on a list that
    // actually fits.
    computePosition(Math.min(listbox.scrollHeight + 1, cap), listbox.getBoundingClientRect().width);
    // computePosition is stable for the values it reads here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    listboxRef.current?.querySelector(`[data-index="${highlightedIndex}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

  function moveHighlight(delta: number) {
    setHighlightedIndex((current) => {
      let next = current;
      for (let step = 0; step < options.length; step++) {
        next = (next + delta + options.length) % options.length;
        if (!options[next].disabled) {
          return next;
        }
      }
      return current;
    });
  }

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      openListbox();
    }
  }

  function handleListboxKeyDown(e: ReactKeyboardEvent<HTMLUListElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(options.findIndex((o) => !o.disabled));
        break;
      case 'End':
        e.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commitSelection(highlightedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeListbox();
        break;
      case 'Tab':
        closeListbox(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          window.clearTimeout(typeaheadTimerRef.current);
          typeaheadRef.current += e.key.toLowerCase();
          const match = options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(typeaheadRef.current));
          if (match >= 0) {
            setHighlightedIndex(match);
          }
          typeaheadTimerRef.current = setTimeout(() => {
            typeaheadRef.current = '';
          }, TYPEAHEAD_RESET_MS);
        }
    }
  }

  const defaultTriggerClasses = `${hideLabel ? '' : 'mt-1 '}inline-flex w-full items-center justify-between gap-2 rounded-DEFAULT border bg-white py-2 pl-3 pr-3 text-left text-body-md text-on-surface transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-outline-variant disabled:bg-surface-container-low disabled:text-on-surface-variant ${
    error ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant hover:border-outline focus:border-accent focus:ring-accent/20'
  }`;
  const commandTriggerClasses = 'inline-flex items-center justify-between gap-2 rounded-sm border-0 bg-transparent px-2 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant';
  const triggerClasses = className ?? (appearance === 'command' ? commandTriggerClasses : defaultTriggerClasses);

  return (
    <div className={containerClassName}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'block text-label-md font-label-md text-on-surface'}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onClick={() => (isOpen ? closeListbox() : openListbox())}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClasses}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon size={14} strokeWidth={2} className="shrink-0 text-on-surface-variant" aria-hidden="true" />}
          <span className="truncate">{selectedOption ? selectedOption.label : ' '}</span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-on-surface-variant transition-transform duration-fast ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && position && createPortal(
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          data-floating-panel
          tabIndex={-1}
          aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined}
          onKeyDown={handleListboxKeyDown}
          style={{
            position: 'fixed',
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined,
            left: position.left,
            minWidth: position.width,
            width: 'max-content',
            maxWidth: Math.min(MAX_LISTBOX_WIDTH, window.innerWidth - 16),
            maxHeight: position.maxHeight,
          }}
          className="thin-scrollbar animate-overlay-in z-50 overflow-y-auto rounded-DEFAULT border border-outline-variant bg-white py-1 shadow-md focus:outline-none"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-opt-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === selectedIndex}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
              onClick={() => commitSelection(index)}
              className={`mx-1 flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-body-md ${
                option.disabled ? 'cursor-not-allowed text-on-surface-variant/50' : index === selectedIndex ? 'font-label-md text-accent' : 'text-on-surface'
              } ${!option.disabled && index === highlightedIndex ? 'bg-surface-container-low' : ''}`}
            >
              <span className="truncate">{option.label}</span>
              {index === selectedIndex && <Check size={15} className="shrink-0 text-accent" aria-hidden="true" />}
            </li>
          ))}
        </ul>,
        document.body,
      )}

      {error && (
        <p id={errorId} className={hideErrorText ? 'sr-only' : 'mt-1 text-label-sm text-error'} role={hideErrorText ? undefined : 'alert'}>{error}</p>
      )}
      {hint && <p id={hintId} className="mt-1 text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
