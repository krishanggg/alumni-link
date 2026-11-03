import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { ScopeContext, SCOPE_STORAGE_KEY } from './scopeContextInstance';

function isPositiveIntString(value: string | null): value is string {
  return value !== null && /^\d+$/.test(value) && Number(value) > 0;
}

function readStoredSchoolId(): number | undefined {
  try {
    const stored = window.localStorage.getItem(SCOPE_STORAGE_KEY);
    if (isPositiveIntString(stored)) {
      return Number(stored);
    }
  } catch {
    // Private-mode / disabled storage — fall through to the combined view.
  }
  return undefined;
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Seed once, on first mount: a `?school_id=` deep link wins (so a shared link
  // lands on the right scope), otherwise the last choice from localStorage,
  // otherwise the combined view.
  const [schoolId, setSchoolIdState] = useState<number | undefined>(() => {
    const fromUrl = searchParams.get('school_id');
    return isPositiveIntString(fromUrl) ? Number(fromUrl) : readStoredSchoolId();
  });

  // The `?school_id=` param is a one-shot bootstrap (already folded into state
  // above, and persisted below once the user makes any choice). Strip it so a
  // later selection — or a reset to All Schools — isn't overridden by a stale
  // URL on the next load. Unrelated query params are preserved.
  const didConsumeUrlParam = useRef(false);
  useEffect(() => {
    if (didConsumeUrlParam.current || !searchParams.has('school_id')) {
      return;
    }
    didConsumeUrlParam.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('school_id');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setSchoolId = useCallback((next: number | undefined) => {
    setSchoolIdState(next);
    try {
      if (next) {
        window.localStorage.setItem(SCOPE_STORAGE_KEY, String(next));
      } else {
        window.localStorage.removeItem(SCOPE_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable — the in-memory value still drives this session.
    }
  }, []);

  const effectiveSchoolId = user?.role === 'super_admin' ? schoolId : undefined;

  return (
    <ScopeContext.Provider value={{ schoolId: effectiveSchoolId, setSchoolId }}>
      {children}
    </ScopeContext.Provider>
  );
}
