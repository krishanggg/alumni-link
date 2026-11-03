import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useMenuKeyboard } from '../../hooks/useMenuKeyboard';
import { computeAnchoredPosition } from '../../utils/popoverPosition';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: 'default' | 'danger';
  icon?: LucideIcon;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

const MENU_WIDTH = 160;

export function ActionMenu({ items, label = 'Row actions' }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpward: boolean; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function reposition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    // The trigger scrolled out of view — nothing to anchor to.
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      closeMenu();
      return;
    }

    setPosition(computeAnchoredPosition(rect, {
      estimatedHeight: items.length * 40 + 8,
      width: MENU_WIDTH,
      align: 'end',
    }));
  }

  function open() {
    if (!buttonRef.current) {
      return;
    }
    reposition();
    setIsOpen(true);
  }

  const {
    closeAndRestoreFocus,
    closeMenu,
    handleMenuKeyDown,
    handleTriggerKeyDown,
    setActiveTarget,
  } = useMenuKeyboard({
    isOpen,
    onOpen: open,
    onClose: () => setIsOpen(false),
    targets: [{ menuRef, triggerRef: buttonRef }],
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        closeMenu();
      }
    }

    // Scrolling the page (or the table body) shifts the trigger — follow it
    // instead of closing, unless it scrolls off-screen entirely. Ignore
    // scrolls that originate inside the menu itself.
    function handleScroll(e: Event) {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      reposition();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reposition is stable enough; only re-bind on open/close
  }, [isOpen]);

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (isOpen) {
            closeMenu();
            return;
          }

          setActiveTarget(buttonRef);
          open();
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        className="tap-target rounded-DEFAULT p-1.5 text-on-surface-variant hover:bg-surface-container-high"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: 'fixed',
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined,
            left: position.left,
            width: MENU_WIDTH,
          }}
          className="z-50 rounded-DEFAULT border border-outline-variant bg-white py-1 shadow-md"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                closeAndRestoreFocus();
                item.onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-body-md hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50 ${
                item.variant === 'danger' ? 'text-error' : 'text-on-surface'
              }`}
            >
              {item.icon && (
                <item.icon
                  size={16}
                  aria-hidden="true"
                  className={item.variant === 'danger' ? 'text-error' : 'text-on-surface-variant'}
                />
              )}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
