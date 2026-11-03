import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

import type { ReactNode } from 'react';

import { SETTINGS_ROUTE } from '../config/navigation';
import { NavigationFocusHandoffContext, type NavigationFocusRequest } from './navigationFocusHandoffContext';

const NAVIGATION_TOGGLE_SELECTOR = '[data-navigation-toggle]';

interface PendingNavigationFocusRequest extends NavigationFocusRequest {
  resolvedDestinationPathname: string;
  resolvedLocationKey?: string;
  redirectEntryLocationKey?: string;
}

function resolveDestination(pathname: string) {
  return pathname === SETTINGS_ROUTE.path ? SETTINGS_ROUTE.defaultPath : pathname;
}

export function NavigationFocusHandoffProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const pendingRequestRef = useRef<PendingNavigationFocusRequest | null>(null);

  const requestNavigationFocusRestore = useCallback((request: NavigationFocusRequest) => {
    const rawDestinationPathname = request.destinationPathname;

    // Classify self-links from the raw click target; a redirect may resolve back to the source
    // while still performing a real navigation and remounting the shell.
    if (!request.drawerWasOpen || rawDestinationPathname === request.sourcePathname) {
      pendingRequestRef.current = null;
      return;
    }

    pendingRequestRef.current = {
      ...request,
      resolvedDestinationPathname: resolveDestination(rawDestinationPathname),
    };
  }, []);

  const clearNavigationFocusRestore = useCallback(() => {
    pendingRequestRef.current = null;
  }, []);

  useEffect(() => {
    const pendingRequest = pendingRequestRef.current;
    if (!pendingRequest || !pendingRequest.drawerWasOpen) {
      return undefined;
    }

    const isExpectedSettingsRedirectCycle = pendingRequest.destinationPathname === SETTINGS_ROUTE.path
      && pendingRequest.sourcePathname === SETTINGS_ROUTE.defaultPath
      && pendingRequest.resolvedDestinationPathname === pendingRequest.sourcePathname;

    const isSettingsRedirectEntry = location.pathname === SETTINGS_ROUTE.path
      && pendingRequest.resolvedDestinationPathname === SETTINGS_ROUTE.defaultPath;
    if (isSettingsRedirectEntry) {
      // Remember the actual redirect entry so a later same-path POP cannot be mistaken for its landing.
      pendingRequest.redirectEntryLocationKey = location.key;
      return undefined;
    }

    if (location.pathname === pendingRequest.sourcePathname && !isExpectedSettingsRedirectCycle) {
      // Returning to the source is an abandoned transition; consume the request so a later
      // visit to the original destination cannot steal focus.
      pendingRequestRef.current = null;
      return undefined;
    }

    if (location.pathname === pendingRequest.sourcePathname && isExpectedSettingsRedirectCycle) {
      const isExpectedLanding = pendingRequest.redirectEntryLocationKey !== undefined
        || navigationType === 'REPLACE';
      const isDifferentLocationEntry = pendingRequest.resolvedLocationKey !== undefined
        && pendingRequest.resolvedLocationKey !== location.key;
      if (!isExpectedLanding || navigationType === 'POP' || isDifferentLocationEntry) {
        pendingRequestRef.current = null;
        return undefined;
      }
    }

    if (location.pathname !== pendingRequest.resolvedDestinationPathname) {
      pendingRequestRef.current = null;
      return undefined;
    }

    if (pendingRequest.resolvedLocationKey !== undefined
      && pendingRequest.resolvedLocationKey !== location.key) {
      pendingRequestRef.current = null;
      return undefined;
    }

    if (pendingRequest.resolvedLocationKey === undefined) {
      if (navigationType === 'POP') {
        pendingRequestRef.current = null;
        return undefined;
      }
      pendingRequest.resolvedLocationKey = location.key;
    }

    const frame = requestAnimationFrame(() => {
      if (pendingRequestRef.current !== pendingRequest) {
        return;
      }

      // Consume before focusing so a missing or temporarily unavailable toggle cannot be retried by a later route.
      pendingRequestRef.current = null;
      document.querySelector<HTMLElement>(NAVIGATION_TOGGLE_SELECTOR)?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [location.key, location.pathname, navigationType]);

  return (
    <NavigationFocusHandoffContext.Provider
      value={{ requestNavigationFocusRestore, clearNavigationFocusRestore }}
    >
      {children}
    </NavigationFocusHandoffContext.Provider>
  );
}
