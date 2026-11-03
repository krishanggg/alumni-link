import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * Bridges React Native's AppState into react-query's focus tracking.
 *
 * react-query's default focus listener watches `document.visibilitychange`,
 * which doesn't exist in React Native — without this bridge the client stays
 * permanently "focused" and `refetchOnWindowFocus` never fires. Mounted once
 * at the app root.
 *
 * One listener for the whole app, not one per hook: every query that wants
 * foreground revalidation gets it from its own `staleTime`, so a second
 * mechanism would only make refresh behaviour depend on which screen you
 * happened to be on.
 */
export function useAppStateFocus(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
