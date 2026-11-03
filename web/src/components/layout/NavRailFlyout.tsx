import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { NavItem } from '../../config/navigation';

import { useMenuKeyboard } from '../../hooks/useMenuKeyboard';
import { MotionLink } from '../shared/MotionLink';
import { usePressTap } from '../../hooks/usePressTap';
import { preloadNavRoute } from '../../routes/lazyPages';

interface NavRailFlyoutProps {
  item: NavItem;
  active: boolean;
  activeChildPath: string | null;
}

const FLYOUT_GAP = 6;
const FLYOUT_WIDTH = 192;
const CLOSE_DELAY_MS = 150;

/**
 * The collapsed tablet rail hides item labels and the inline children list to fit
 * `--spacing-sidebar-rail-width`, which would strand non-primary children (e.g. Alumni's
 * "Archived") — this renders a hover/focus flyout so they stay reachable. Outside the rail
 * breakpoint the portaled panel is `hidden` via CSS, so it's a no-op there.
 */
export function NavRailFlyout({ item, active, activeChildPath }: NavRailFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const flyoutId = useId();
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressTap = usePressTap();
  const Icon = item.icon;

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => closeFromExternalInteraction(), CLOSE_DELAY_MS);
  }

  function openNow() {
    if (consumeRestoredTriggerFocus()) {
      return;
    }

    cancelClose();
    preloadNavRoute(item.path);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPosition({ top: rect.top, left: rect.right + FLYOUT_GAP });
    setIsOpen(true);
  }

  const {
    closeAndRestoreFocus,
    closeMenu,
    consumeRestoredTriggerFocus,
    handleMenuKeyDown,
    handleTriggerKeyDown,
  } = useMenuKeyboard({
    isOpen,
    onOpen: openNow,
    onClose: () => {
      cancelClose();
      setIsOpen(false);
    },
    targets: [{ menuRef, triggerRef }],
    focusOnOpen: false,
    openOnArrowRight: true,
    closeOnArrowLeft: true,
  });

  const closeFromExternalInteraction = useCallback(() => {
    cancelClose();
    const focusIsInsideMenu = menuRef.current?.contains(document.activeElement) ?? false;
    if (focusIsInsideMenu) {
      closeAndRestoreFocus();
      return;
    }
    closeMenu();
  }, [cancelClose, closeAndRestoreFocus, closeMenu]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideFlyout = target instanceof Element && target.closest('[data-nav-flyout]');
      if (!insideFlyout) {
        closeFromExternalInteraction();
      }
    }

    function handleScrollOrResize() {
      closeFromExternalInteraction();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [closeFromExternalInteraction, isOpen]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <>
      <MotionLink
        ref={triggerRef}
        to={item.path}
        title={item.label}
        aria-label={item.label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={flyoutId}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        onFocus={openNow}
        onKeyDown={handleTriggerKeyDown}
        {...pressTap}
        className={`hidden rail:flex rail:items-center rail:justify-center rounded-DEFAULT px-3 py-2 text-body-md transition-all duration-[var(--duration-fast)] ${
          active
            ? 'bg-sidebar-active font-label-md text-on-primary'
            : 'text-on-primary/80 hover:bg-sidebar-hover hover:text-on-primary'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      </MotionLink>

      {createPortal(
        <div
          id={flyoutId}
          ref={menuRef}
          data-nav-flyout
          role="menu"
          aria-label={item.label}
          aria-hidden={!isOpen}
          hidden={!isOpen || !position}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onKeyDown={handleMenuKeyDown}
          style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0, width: FLYOUT_WIDTH }}
          className="hidden rail:block z-50 rounded-lg border border-outline-variant bg-sidebar-gradient p-1.5 shadow-lg"
        >
          <p className="px-2.5 py-1.5 text-label-sm font-label-sm text-on-primary/60">{item.label}</p>
          {item.children!.map((child) => {
            const childActive = child.path === activeChildPath;
            return (
              <MotionLink
                key={child.path}
                to={child.path}
                role="menuitem"
                onPointerEnter={() => preloadNavRoute(child.path)}
                onFocus={() => preloadNavRoute(child.path)}
                onClick={() => {
                  closeMenu();
                }}
                {...pressTap}
                className={`block rounded-DEFAULT px-2.5 py-2 text-label-md transition-all duration-[var(--duration-fast)] ${
                  childActive
                    ? 'bg-sidebar-active font-label-md text-on-primary'
                    : 'text-on-primary/80 hover:bg-sidebar-hover hover:text-on-primary'
                }`}
              >
                {child.label}
              </MotionLink>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
