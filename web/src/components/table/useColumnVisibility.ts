import { useState, useEffect } from 'react';
import type { OnChangeFn, VisibilityState } from '@tanstack/react-table';

const STORAGE_PREFIX = 'alumnilink.datatable';

/**
 * Stores the hidden column ids rather than the full visibility map so the
 * persisted value stays compatible with what earlier versions of the table
 * wrote, and so a newly added column defaults to visible.
 */
export function useColumnVisibility(id: string, enabled: boolean) {
  const storageKey = `${STORAGE_PREFIX}.${id}.hiddenColumns`;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (!enabled) {
      return {};
    }

    try {
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        return {};
      }

      const stored: string[] = JSON.parse(raw);

      return Object.fromEntries(stored.map((columnId) => [columnId, false]));
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const hidden = Object.entries(columnVisibility)
      .filter(([, isVisible]) => !isVisible)
      .map(([columnId]) => columnId);

    localStorage.setItem(storageKey, JSON.stringify(hidden));
  }, [columnVisibility, storageKey, enabled]);

  const resetAll = () => {
    setColumnVisibility({});
  };

  return {
    columnVisibility,
    setColumnVisibility: setColumnVisibility as OnChangeFn<VisibilityState>,
    resetAll,
  };
}
