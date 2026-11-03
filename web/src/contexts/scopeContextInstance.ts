import { createContext } from 'react';

export interface ScopeState {
  /**
   * The school the Super Admin has scoped the whole admin surface to.
   * `undefined` means the combined, cross-school view. Always `undefined`
   * for non-Super-Admins, who are locked to their own school server-side.
   */
  schoolId: number | undefined;
  setSchoolId: (schoolId: number | undefined) => void;
}

export const ScopeContext = createContext<ScopeState | undefined>(undefined);

export const SCOPE_STORAGE_KEY = 'alumnilink.scope.school';
