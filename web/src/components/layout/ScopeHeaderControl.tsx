import { useContext } from 'react';

import { ScopeContext } from '../../contexts/scopeContextInstance';
import { useAuth } from '../../hooks/useAuth';

import { SchoolScopeSelect } from '../shared/SchoolScopeSelect';

/**
 * The app-wide school scope selector. Lives in the AppShell header so every
 * admin surface is filtered from one place. Super Admin only — other roles are
 * locked to their own school server-side and see nothing here.
 */
export function ScopeHeaderControl() {
  const { user } = useAuth();
  // Read the context directly: this control is a no-op leaf outside a
  // ScopeProvider (e.g. isolated AppShell tests), not a bug worth throwing over.
  const scope = useContext(ScopeContext);

  if (user?.role !== 'super_admin' || !scope) {
    return null;
  }

  const { schoolId, setSchoolId } = scope;

  return (
    <div className="flex shrink-0 items-center rounded-full bg-surface-container-low p-1">
      <SchoolScopeSelect
        value={schoolId ? String(schoolId) : ''}
        onChange={(value) => setSchoolId(value ? Number(value) : undefined)}
        label="School scope"
        allLabel="All Schools"
        className="max-w-[min(55vw,20rem)]"
        align="end"
        showLabel={false}
        triggerClassName="inline-flex w-full items-center justify-between gap-2 rounded-full bg-transparent py-1.5 pl-3 pr-2 text-left text-label-sm font-label-md text-on-surface transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
