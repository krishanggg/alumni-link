import { useContext } from 'react';
import { ScopeContext, type ScopeState } from '../contexts/scopeContextInstance';

export function useScope(): ScopeState {
  const context = useContext(ScopeContext);

  if (!context) {
    throw new Error('useScope must be used within a ScopeProvider');
  }

  return context;
}
