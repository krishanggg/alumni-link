import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import { RefreshCw } from 'lucide-react';

import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';
import { DataTableSearch } from './DataTableSearch';

interface DataTableToolbarProps<T> {
  id: string;
  table: Table<T>;
  toolbar?: ReactNode;
  /** Custom content rendered with search in a stacked toolbar's upper row. */
  toolbarTop?: ReactNode;
  /** Rendered at the right edge of the toolbar row (e.g. a status filter). */
  toolbarRight?: ReactNode;
  /** Renders commands below the filters for dense administration tables. */
  toolbarCommandRight?: ReactNode;
  /** When set, a "Refresh" command is shown on the stacked command row. */
  onRefresh?: () => void;
  /** Filtered row count shown on the stacked command row (omit for server-paged tables). */
  resultCount?: number;
  search?: { placeholder?: string; ariaLabel?: string };
  /** A search-driven refetch is in flight (server-backed tables). */
  isFetching?: boolean;
  showColumnVisibility?: boolean;
  layout?: 'inline' | 'stacked';
  appearance?: 'default' | 'flat';
  resetAll: () => void;
}

export function DataTableToolbar<T>({
  id,
  table,
  toolbar,
  toolbarTop,
  toolbarRight,
  toolbarCommandRight,
  search,
  isFetching = false,
  showColumnVisibility,
  onRefresh,
  resultCount,
  layout = 'inline',
  appearance = 'default',
  resetAll,
}: DataTableToolbarProps<T>) {
  const isFlat = appearance === 'flat';
  const filterControls = (
    <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
      {search && (
        <DataTableSearch
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(value) => table.setGlobalFilter(value)}
          placeholder={search.placeholder}
          ariaLabel={search.ariaLabel}
          appearance={appearance}
          isFetching={isFetching}
        />
      )}
      {toolbar}
    </div>
  );

  if (layout === 'stacked') {
    return (
      <>
        {(search || toolbarTop || toolbarRight) && (
          <div
            data-testid={`${id}-filter-toolbar`}
            className="flex shrink-0 flex-wrap items-center gap-3 border-b border-outline-variant px-4 py-3"
          >
            {search && (
              <DataTableSearch
                value={(table.getState().globalFilter as string) ?? ''}
                onChange={(value) => table.setGlobalFilter(value)}
                placeholder={search.placeholder}
                ariaLabel={search.ariaLabel}
                appearance={appearance}
                isFetching={isFetching}
              />
            )}
            {toolbarTop}
            {toolbarRight && <div className="ml-auto flex flex-wrap items-center justify-end gap-3">{toolbarRight}</div>}
          </div>
        )}
        <div
          data-testid={`${id}-command-toolbar`}
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-2"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {showColumnVisibility && (
              <ColumnVisibilityMenu
                table={table}
                resetAll={resetAll}
                triggerLabel={isFlat ? 'Columns' : undefined}
              />
            )}
            {toolbar}
          </div>
          {(onRefresh || resultCount !== undefined || toolbarCommandRight) && (
            <div className="flex items-center gap-5">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-2 rounded-sm px-2 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </button>
              )}
              {resultCount !== undefined && (
                <span className="text-label-md text-on-surface-variant">
                  {resultCount.toLocaleString()} {resultCount === 1 ? 'result' : 'results'}
                </span>
              )}
              {toolbarCommandRight}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 xl:flex-nowrap">
      {(search || toolbar) && (
        filterControls
      )}
      {(showColumnVisibility || toolbarRight) && (
        <div className="flex items-center gap-3">
          {showColumnVisibility && <ColumnVisibilityMenu table={table} resetAll={resetAll} />}
          {toolbarRight}
        </div>
      )}
    </div>
  );
}
