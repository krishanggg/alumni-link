import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Table } from '@tanstack/react-table';
import { ChevronDown, Columns3, Eye, RotateCcw } from 'lucide-react';

import { useMenuKeyboard } from '../../hooks/useMenuKeyboard';
import { computeAnchoredPosition } from '../../utils/popoverPosition';

import { Checkbox } from '../shared/Checkbox';

const MENU_WIDTH = 200;

interface ColumnVisibilityMenuProps<T> {
  table: Table<T>;
  resetAll: () => void;
  /** Optional visible trigger text for command-style toolbars. */
  triggerLabel?: string;
}

export function ColumnVisibilityMenu<T>({ table, resetAll, triggerLabel }: ColumnVisibilityMenuProps<T>) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpward: boolean; maxHeight: number } | null>(null);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

    function handleScrollOrResize(e: Event) {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }

      closeMenu();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [closeMenu, isOpen]);

  function open() {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setPosition(computeAnchoredPosition(rect, {
      estimatedHeight: columns.length * 36 + 44,
      width: MENU_WIDTH,
      align: 'end',
    }));
    setIsOpen(true);
  }

  if (columns.length <= 1) {
    return null;
  }

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
        aria-controls={isOpen ? menuId : undefined}
        aria-label={triggerLabel ? undefined : 'Toggle column visibility'}
        className={triggerLabel
          ? 'tap-target inline-flex items-center gap-2 rounded-sm px-2 py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
          : 'tap-target rounded-DEFAULT p-1.5 text-on-surface-variant hover:bg-surface-container-high'}
      >
        {triggerLabel ? (
          <>
            <Columns3 size={16} aria-hidden="true" />
            <span>{triggerLabel}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </>
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: 'fixed',
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined,
            left: position.left,
            width: MENU_WIDTH,
            maxHeight: position.maxHeight,
            zIndex: 50,
          }}
          className="z-50 flex flex-col overflow-hidden rounded-DEFAULT border border-outline-variant bg-white py-1 shadow-md"
        >
          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
            {columns.map((column) => (
              <Checkbox
                key={column.id}
                label={String(column.columnDef.header)}
                checked={column.getIsVisible()}
                onChange={() => {
                  const visibleCount = columns.filter((c) => c.getIsVisible()).length;

                  if (column.getIsVisible() && visibleCount <= 1) {
                    return;
                  }

                  column.toggleVisibility();
                }}
                containerClassName="px-3 py-2 hover:bg-surface-container-low"
              />
            ))}
          </div>

          <div className="shrink-0 border-t border-outline-variant px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                resetAll();
                closeAndRestoreFocus();
              }}
              className="flex w-full items-center gap-1.5 rounded-DEFAULT px-2 py-1.5 text-label-sm font-label-sm text-on-surface-variant hover:bg-surface-container-low"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset columns
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
