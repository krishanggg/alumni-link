import { useEffect, useId, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href]:not([aria-disabled="true"]), button:not([disabled]):not([aria-disabled="true"]), input:not([disabled]):not([aria-disabled="true"]), select:not([disabled]):not([aria-disabled="true"]), textarea:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-disabled="true"])';

interface ModalStackEntry {
  id: string;
  containerRef: RefObject<HTMLElement | null>;
  onCloseRef: RefObject<() => void>;
  closeOnEscapeRef: RefObject<boolean>;
  restoreFocusTarget: HTMLElement | null;
}

const modalStack: ModalStackEntry[] = [];

export function isModalTopmost(modalId: string) {
  return modalStack[modalStack.length - 1]?.id === modalId;
}

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  closeOnEscape = true,
  restoreFocusRef?: RefObject<HTMLElement | null>,
) {
  const modalId = `modal-${useId().replace(/:/g, '')}`;

  // Callers routinely pass an inline `onClose`, so its identity changes on
  // every render. Keep the latest values in refs and depend only on `active`
  // below, otherwise the effect re-runs on each parent render and yanks focus
  // back to the first focusable element mid-typing.
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  });

  useEffect(() => {
    if (!active) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const restoreFocusTarget = restoreFocusRef?.current ?? previouslyFocused;
    const container = containerRef.current;
    const stackEntry: ModalStackEntry = {
      id: modalId,
      containerRef,
      onCloseRef,
      closeOnEscapeRef,
      restoreFocusTarget,
    };

    modalStack.push(stackEntry);

    const focusables = container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!isModalTopmost(modalId)) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (closeOnEscapeRef.current) {
          onCloseRef.current();
        }
        return;
      }

      if (e.key !== 'Tab' || !container) {
        return;
      }

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const wasTopmost = isModalTopmost(modalId);
      const stackIndex = modalStack.findIndex((entry) => entry.id === modalId);
      if (stackIndex !== -1) {
        modalStack.splice(stackIndex, 1);
      }
      if (wasTopmost) {
        restoreFocusTarget?.focus();
      }
    };
  }, [active, containerRef, restoreFocusRef, modalId]);

  return modalId;
}
