import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { isModalTopmost, useFocusTrap } from '../../hooks/useFocusTrap';
import { type Tone, TONE_CLASSES } from '../../lib/toneClasses';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: ReactNode;
  footer?: ReactNode;
  headerAccessory?: ReactNode;
  closeOnBackdropClick?: boolean;
  /** Set false when a child content area owns its own scrolling. */
  scrollableBody?: boolean;
  /**
   * Set false for a modal the user must act on rather than dismiss (e.g. a
   * forced session-expiry notice): hides the header close button and
   * disables both backdrop-click and Escape dismissal, regardless of
   * `closeOnBackdropClick`.
   */
  dismissible?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  tone = 'blue',
  size = 'md',
  children,
  footer,
  headerAccessory,
  closeOnBackdropClick = true,
  scrollableBody = true,
  dismissible = true,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropMouseDownRef = useRef(false);
  const modalId = useFocusTrap(isOpen, containerRef, onClose, dismissible);
  const titleId = `modal-title-${useId().replace(/:/g, '')}`;
  const panelHeightClass = scrollableBody ? '' : 'h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-3rem)]';

  if (!isOpen) {
    return null;
  }

  function handleBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    backdropMouseDownRef.current = isModalTopmost(modalId) && e.target === e.currentTarget;
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    const startedOnBackdrop = backdropMouseDownRef.current;
    backdropMouseDownRef.current = false;
    if (isModalTopmost(modalId) && dismissible && closeOnBackdropClick && startedOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  }

  return createPortal(
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary/30 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-modal-id={modalId}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`animate-modal-in flex max-h-[calc(100vh-1.5rem)] ${panelHeightClass} w-full ${SIZE_CLASSES[size]} flex-col rounded-2xl bg-white shadow-panel sm:max-h-[calc(100vh-3rem)]`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/60 px-5 py-4 sm:px-6 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
                <Icon size={18} aria-hidden="true" strokeWidth={2.25} />
              </div>
            )}
            <h2 id={titleId} className="min-w-0 break-words text-headline-sm font-headline-sm text-on-surface">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAccessory}
            {dismissible && (
              <button
                type="button"
                onClick={() => {
                  if (isModalTopmost(modalId)) {
                    onClose();
                  }
                }}
                className="tap-target rounded-DEFAULT p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className={`${scrollableBody ? 'overflow-y-auto' : 'flex min-h-0 flex-1 flex-col overflow-hidden'} px-5 py-5 sm:px-6`}>{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-outline-variant/60 px-5 py-4 sm:px-6 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
