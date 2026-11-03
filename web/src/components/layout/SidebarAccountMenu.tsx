import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react';

import { useMenuKeyboard } from '../../hooks/useMenuKeyboard';
import { Avatar } from '../shared/Avatar';
import { MotionLink } from '../shared/MotionLink';
import { usePressTap } from '../../hooks/usePressTap';

interface SidebarAccountMenuProps {
  name?: string | null;
  photoUrl?: string | null;
  meta?: string | null;
  onLogout: () => void;
}

const RAIL_MENU_WIDTH = 208;
const RAIL_MENU_GAP = 10;

export function SidebarAccountMenu({ name, photoUrl, meta, onLogout }: SidebarAccountMenuProps) {
  const pressTap = usePressTap();
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [railPos, setRailPos] = useState<{ bottom: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dockedTriggerRef = useRef<HTMLButtonElement>(null);
  const railTriggerRef = useRef<HTMLButtonElement>(null);
  const dockedMenuRef = useRef<HTMLDivElement>(null);
  const railMenuRef = useRef<HTMLDivElement>(null);

  function openFromDocked() {
    setActiveTarget(dockedTriggerRef);
    setIsOpen(true);
  }

  function openFromRail() {
    setActiveTarget(railTriggerRef);
    const rect = railTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      setRailPos({ bottom: window.innerHeight - rect.bottom, left: rect.right + RAIL_MENU_GAP });
    }
    setIsOpen(true);
  }

  function openFromTrigger(trigger: HTMLElement | null) {
    if (trigger === railTriggerRef.current) {
      openFromRail();
      return;
    }

    openFromDocked();
  }

  const {
    closeMenu,
    handleMenuKeyDown,
    handleTriggerKeyDown,
    setActiveTarget,
  } = useMenuKeyboard({
    isOpen,
    onOpen: openFromTrigger,
    onClose: () => setIsOpen(false),
    targets: [
      { menuRef: dockedMenuRef, triggerRef: dockedTriggerRef },
      { menuRef: railMenuRef, triggerRef: railTriggerRef },
    ],
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideRoot = rootRef.current?.contains(target);
      const insidePortal = target instanceof Element && target.closest('[data-account-flyout]');
      if (!insideRoot && !insidePortal) {
        closeMenu();
      }
    }

    function onScrollOrResize() {
      closeMenu();
    }

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [closeMenu, isOpen]);

  function handleLogout() {
    closeMenu();
    onLogout();
  }

  const avatar = (
    <Avatar
      name={name}
      photoUrl={photoUrl}
      sizeClassName="h-8 w-8"
      toneClassName="bg-sidebar-active text-on-primary"
      textClassName="text-label-sm font-label-sm"
      ringClassName="ring-2 ring-white/25"
    />
  );

  const menuItems = (
    <>
      <MotionLink
        to="/settings/profile"
        role="menuitem"
        onClick={() => closeMenu()}
        {...pressTap}
        className="flex items-center gap-2.5 rounded-DEFAULT px-2.5 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        View profile
      </MotionLink>
      <div className="my-1 h-px bg-outline-variant/60" aria-hidden="true" />
      <button
        type="button"
        role="menuitem"
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-DEFAULT px-2.5 py-2 text-label-md text-error transition-colors hover:bg-error-container"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        Log out
      </button>
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      {/* Docked panel (>=1200px and mobile drawer): full-width identity card. */}
      <button
        ref={dockedTriggerRef}
        type="button"
        onClick={() => (isOpen ? closeMenu() : openFromDocked())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className="flex w-full items-center gap-2.5 rounded-DEFAULT bg-white/10 px-2 py-2 text-left transition-colors hover:bg-white/20 rail:hidden"
      >
        {avatar}
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-label-md font-label-md text-on-primary">{name}</span>
          {meta && <span className="block truncate text-label-sm text-on-primary/65">{meta}</span>}
        </span>
        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-on-primary/60" aria-hidden="true" />
      </button>

      {/* Rail band (768-1199px): avatar only, menu flies out via a portal. */}
      <button
        ref={railTriggerRef}
        type="button"
        onClick={() => (isOpen ? closeMenu() : openFromRail())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account"
        className="tap-target hidden rail:flex rail:mx-auto rail:items-center rail:justify-center"
      >
        {avatar}
      </button>

      {isOpen && (
        <div
          ref={dockedMenuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={handleMenuKeyDown}
          className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 animate-overlay-in rounded-md border border-outline-variant bg-white p-1.5 shadow-pop rail:hidden"
        >
          {menuItems}
        </div>
      )}

      {isOpen && railPos &&
        createPortal(
          <div
            ref={railMenuRef}
            data-account-flyout
            role="menu"
            aria-label="Account"
            onKeyDown={handleMenuKeyDown}
            style={{ position: 'fixed', bottom: railPos.bottom, left: railPos.left, width: RAIL_MENU_WIDTH }}
            className="hidden rail:block z-50 animate-overlay-in rounded-md border border-outline-variant bg-white p-1.5 shadow-pop"
          >
            <div className="flex items-center gap-2.5 border-b border-outline-variant/60 px-2 pb-2 pt-1">
              <Avatar
                name={name}
                photoUrl={photoUrl}
                sizeClassName="h-7 w-7"
                toneClassName="bg-sidebar-active text-on-primary"
                textClassName="text-label-sm font-label-sm"
              />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-label-md font-label-md text-on-surface">{name}</span>
                {meta && <span className="block truncate text-label-sm text-on-surface-variant">{meta}</span>}
              </span>
            </div>
            <div className="pt-1">{menuItems}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
