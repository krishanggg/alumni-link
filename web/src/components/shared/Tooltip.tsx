import { isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { mergeDescribedBy } from '../../utils/aria';

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
}

interface TooltipProps {
  children: ReactNode;
  content: string;
  label: string;
}

// The tooltip normally sits above its trigger; when the trigger is too close to
// the top of the viewport for it to fit, it flips below so it is never clipped.
const TOOLTIP_HEIGHT_ESTIMATE = 88;
const TOOLTIP_GAP = 8;

export function Tooltip({ children, content, label }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = `tooltip-${useId().replace(/:/g, '')}`;
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const childDescribedBy = isValidElement<{ 'aria-describedby'?: string }>(children)
    ? children.props['aria-describedby']
    : undefined;

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const placement = rect.top < TOOLTIP_HEIGHT_ESTIMATE + TOOLTIP_GAP ? 'below' : 'above';
    setPosition({
      top: placement === 'below' ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP,
      left: Math.min(Math.max(rect.left + (rect.width / 2), 160), window.innerWidth - 160),
      placement,
    });
  }

  function openTooltip() {
    setIsOpen(true);
    requestAnimationFrame(updatePosition);
  }

  const tooltipIsVisible = isOpen && position !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-label={label}
        aria-describedby={mergeDescribedBy(childDescribedBy, tooltipIsVisible ? tooltipId : undefined)}
        className="inline-flex"
        onMouseEnter={openTooltip}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={openTooltip}
        onBlur={() => setIsOpen(false)}
      >
        {children}
      </span>
      {isOpen && position && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className={`pointer-events-none fixed z-[1000] w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-DEFAULT bg-inverse-surface px-3 py-2 text-label-sm font-normal leading-relaxed text-inverse-on-surface shadow-card ${position.placement === 'below' ? '' : '-translate-y-full'}`}
        >
          {content}
        </span>,
        document.body,
      )}
    </>
  );
}
