import { useVirtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'react';

// Matches a single-line row at px-4 py-3 with text-body-md. measureElement
// corrects any row that wraps, so this only needs to be close.
const ESTIMATED_ROW_HEIGHT = 49;
const OVERSCAN = 8;

interface UseVirtualRowsOptions {
  rowCount: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

export function useVirtualRows({ rowCount, scrollRef, enabled }: UseVirtualRowsOptions) {
  const virtualizer = useVirtualizer({
    count: enabled ? rowCount : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  if (!enabled) {
    return { virtualRows: null, paddingTop: 0, paddingBottom: 0, measureElement: undefined };
  }

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return { virtualRows, paddingTop, paddingBottom, measureElement: virtualizer.measureElement };
}
