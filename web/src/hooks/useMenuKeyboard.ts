import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';

export type MenuFocusRequest = 'first' | 'last';

export interface MenuKeyboardTarget {
  menuRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
}

interface UseMenuKeyboardOptions {
  isOpen: boolean;
  onOpen?: (trigger: HTMLElement | null) => void;
  onClose: () => void;
  targets: MenuKeyboardTarget[];
  focusOnOpen?: boolean;
  openOnArrowRight?: boolean;
  closeOnArrowLeft?: boolean;
}

const MENU_ITEM_SELECTOR = [
  '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])',
  '[role="menuitemcheckbox"]:not([disabled]):not([aria-disabled="true"])',
  '[role="menuitemradio"]:not([disabled]):not([aria-disabled="true"])',
  'a[href]:not([aria-disabled="true"])',
  'button:not([disabled]):not([aria-disabled="true"])',
  'input:not([disabled]):not([aria-disabled="true"])',
  'select:not([disabled]):not([aria-disabled="true"])',
  'textarea:not([disabled]):not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-disabled="true"])',
].join(',');

function getMenuItems(container: HTMLElement | null): HTMLElement[] {
  return container
    ? Array.from(container.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
    : [];
}

export function useMenuKeyboard({
  isOpen,
  onOpen,
  onClose,
  targets,
  focusOnOpen = true,
  openOnArrowRight = false,
  closeOnArrowLeft = false,
}: UseMenuKeyboardOptions) {
  const [focusRequest, setFocusRequest] = useState<MenuFocusRequest | null>(null);
  const targetsRef = useRef(targets);
  const activeTargetRef = useRef<MenuKeyboardTarget | null>(targets[0] ?? null);
  const suppressTriggerFocusRef = useRef(false);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    targetsRef.current = targets;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onClose, onOpen, targets]);

  const getTargetForTrigger = useCallback((trigger: HTMLElement | null) => {
    if (!trigger) {
      return null;
    }

    return targetsRef.current.find((target) => target.triggerRef.current === trigger) ?? null;
  }, []);

  const getTargetForMenu = useCallback((menu: HTMLElement | null) => {
    if (!menu) {
      return null;
    }

    return targetsRef.current.find((target) => target.menuRef.current === menu) ?? null;
  }, []);

  const getActiveTarget = useCallback(() => activeTargetRef.current ?? targetsRef.current[0] ?? null, []);

  const setActiveTarget = useCallback((triggerRef: RefObject<HTMLElement | null>) => {
    const target = targetsRef.current.find((candidate) => candidate.triggerRef === triggerRef);
    if (target) {
      activeTargetRef.current = target;
    }
  }, []);

  const restoreFocusToTrigger = useCallback(() => {
    const trigger = getActiveTarget()?.triggerRef.current;
    if (!trigger || document.activeElement === trigger) {
      suppressTriggerFocusRef.current = false;
      return;
    }

    suppressTriggerFocusRef.current = true;
    trigger.focus();
    if (document.activeElement !== trigger) {
      suppressTriggerFocusRef.current = false;
    }
  }, [getActiveTarget]);

  const consumeRestoredTriggerFocus = useCallback(() => {
    if (!suppressTriggerFocusRef.current) {
      return false;
    }

    suppressTriggerFocusRef.current = false;
    return true;
  }, []);

  const closeMenu = useCallback(() => {
    setFocusRequest(null);
    onCloseRef.current();
  }, []);

  const closeAndRestoreFocus = useCallback(() => {
    setFocusRequest(null);
    onCloseRef.current();
    restoreFocusToTrigger();
  }, [restoreFocusToTrigger]);

  const openWithFocus = useCallback((request: MenuFocusRequest) => {
    setFocusRequest(request);
    onOpenRef.current?.(getActiveTarget()?.triggerRef.current ?? null);
  }, [getActiveTarget]);

  const handleTriggerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    const target = getTargetForTrigger(event.currentTarget);
    if (target) {
      activeTargetRef.current = target;
    }

    if (event.key === 'ArrowDown' || (openOnArrowRight && event.key === 'ArrowRight')) {
      event.preventDefault();
      openWithFocus('first');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openWithFocus('last');
      return;
    }

    if (closeOnArrowLeft && (event.key === 'ArrowLeft' || event.key === 'Escape') && isOpen) {
      event.preventDefault();
      closeAndRestoreFocus();
    }
  }, [closeAndRestoreFocus, closeOnArrowLeft, getTargetForTrigger, isOpen, openOnArrowRight, openWithFocus]);

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    const target = getTargetForMenu(event.currentTarget);
    if (target) {
      activeTargetRef.current = target;
    }

    const menuItems = getMenuItems(event.currentTarget);

    if (event.key === 'Escape' || (closeOnArrowLeft && event.key === 'ArrowLeft')) {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }

    if (menuItems.length === 0) {
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const item = event.key === 'Home' ? menuItems[0] : menuItems[menuItems.length - 1];
      item?.focus();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? (direction === 1 ? 0 : menuItems.length - 1)
      : (currentIndex + direction + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  }, [closeAndRestoreFocus, closeOnArrowLeft, getTargetForMenu]);

  useEffect(() => {
    if (!isOpen || (!focusOnOpen && !focusRequest)) {
      return;
    }

    const menuItems = getMenuItems(getActiveTarget()?.menuRef.current ?? null);
    const request = focusRequest ?? 'first';
    const item = request === 'first' ? menuItems[0] : menuItems[menuItems.length - 1];
    item?.focus();
    setFocusRequest(null);
  }, [focusOnOpen, focusRequest, getActiveTarget, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeAndRestoreFocus, isOpen]);

  return {
    closeAndRestoreFocus,
    closeMenu,
    consumeRestoredTriggerFocus,
    handleMenuKeyDown,
    handleTriggerKeyDown,
    openWithFocus,
    setActiveTarget,
  };
}
