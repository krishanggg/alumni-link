import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ArrowUpDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import type { BulkAction, EmptyStateConfig, RowActionsConfig } from './types';

import { ACTIONS_COLUMN_ID, buildActionsColumn, buildSelectColumn } from './injectedColumns';
import { DataTableToolbar } from './DataTableToolbar';
import { BulkActionBar } from './BulkActionBar';
import { useColumnVisibility } from './useColumnVisibility';
import { useVirtualRows } from './useVirtualRows';
import { Pagination } from '../shared/Pagination';
import { EmptyState } from '../shared/EmptyState';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

import './columnMeta';

function renderSortIcon(direction: false | 'asc' | 'desc') {
  if (direction === 'asc') {
    return <ChevronUp size={14} className="ml-1 inline text-accent" aria-hidden="true" />;
  }

  if (direction === 'desc') {
    return <ChevronDown size={14} className="ml-1 inline text-accent" aria-hidden="true" />;
  }

  return <ArrowUpDown size={14} className="ml-1 inline text-on-surface-variant/60" aria-hidden="true" />;
}

function ariaSortFor(direction: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (direction === 'asc') {
    return 'ascending';
  }

  if (direction === 'desc') {
    return 'descending';
  }

  return 'none';
}

function renderTitle(title: string) {
  return (
    <div className="shrink-0 border-b border-outline-variant px-6 py-4">
      <h2 className="text-headline-sm font-headline-sm text-on-surface">{title}</h2>
    </div>
  );
}

const SKELETON_LINE_WIDTHS = ['w-4/5', 'w-3/5', 'w-2/3'];
const SKELETON_ROW_COUNT = 8;

// Only report a load once it has run long enough to be worth showing a
// placeholder for — a sub-threshold fetch (cached data, a fast connection)
// resolves straight into the row fade with no skeleton flash.
function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (!active) {
      setFlag(false);
      return;
    }

    const id = window.setTimeout(() => setFlag(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);

  return flag;
}

export interface ManualConfig {
  pageCount: number;
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  /** Omit to leave sorting uncontrolled even in manual mode. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

// `TValue` is a second, defaulted type parameter (rather than fixing it to
// `unknown`) so a caller's `createColumnHelper<T>().accessor(...)` columns —
// which TanStack infers with a concrete `TValue` per accessor — stay
// assignable without a cast or `any`; TanStack's own `ColumnDef` compares
// `TValue` contravariantly through `cell`/`footer`, so a fixed `unknown`
// rejects narrower accessor column defs.
export interface DataTableProps<T, TValue = unknown> {
  /** Stable identifier for the test id and column-visibility storage key. */
  id: string;
  columns: ColumnDef<T, TValue>[];
  data: T[];
  getRowId: (row: T) => string;
  /** Full skeleton fallback — use only while there's no data yet to show at all. */
  isLoading?: boolean;
  /**
   * A fetch is running in the background (e.g. a page turn) while existing
   * rows are still shown. Dims the table and disables pagination instead of
   * replacing the rows with a skeleton, so the click gets instant feedback
   * without a jarring flash.
   */
  isFetching?: boolean;
  title?: string;
  emptyState?: EmptyStateConfig;
  /** Per-row action menu or a fully custom actions cell. */
  actions?: RowActionsConfig<T>;
  initialSort?: SortingState;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  /** Extra controls (e.g. filters) rendered next to search in the toolbar row. */
  toolbar?: ReactNode;
  /** Custom content rendered with search in a stacked toolbar's upper row. */
  toolbarTop?: ReactNode;
  /** Controls pinned to the right edge of the toolbar row (e.g. a status filter). */
  toolbarRight?: ReactNode;
  /** Commands pinned to the right edge of a stacked toolbar's second row. */
  toolbarCommandRight?: ReactNode;
  /** When set, a "Refresh" command appears on the stacked command row. */
  onRefresh?: () => void;
  /** Uses a flatter administration-table surface without changing the default table styling. */
  appearance?: 'default' | 'flat';
  /** Places filters and table commands on separate rows. */
  toolbarLayout?: 'inline' | 'stacked';
  /** Renders the pagination footer and pages the rows client-side. */
  paginated?: boolean;
  pageSize?: number;
  /** Enables row checkboxes. Implied when bulkActions is non-empty. */
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  /** Enables the column-visibility toggle menu, persisted to localStorage. */
  columnVisibility?: boolean;
  /** Row id (per getRowId) to visually highlight, e.g. a just-created record. */
  highlightRowId?: string;
  /**
   * Fill the parent's height and scroll the row body internally (sticky
   * header), instead of letting the whole table grow the page. The parent
   * must be a flex column with a constrained height (`min-h-0 flex-1`).
   */
  fillHeight?: boolean;
  /** Escape hatch for server-driven tables: the caller supplies exactly the rows to display. */
  manual?: ManualConfig;
  /** Page-owned column filters (e.g. toolbar dropdowns), applied client-side alongside search. */
  columnFilters?: ColumnFiltersState;
  /** Fires when the search+columnFilters result changes, so the caller can derive filtered-only stats. */
  onFilteredRowsChange?: (rows: T[]) => void;
}

export function DataTable<T, TValue = unknown>({
  id,
  columns,
  data,
  getRowId,
  isLoading = false,
  isFetching = false,
  title,
  emptyState,
  actions,
  initialSort,
  searchPlaceholder,
  searchAriaLabel,
  toolbar,
  toolbarTop,
  toolbarRight,
  toolbarCommandRight,
  onRefresh,
  appearance = 'default',
  toolbarLayout = 'inline',
  paginated = false,
  pageSize = 15,
  selectable,
  bulkActions,
  columnVisibility,
  highlightRowId,
  fillHeight = false,
  manual,
  columnFilters,
  onFilteredRowsChange,
}: DataTableProps<T, TValue>) {
  const isFlat = appearance === 'flat';
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const isSortingControlled = !!manual?.onSortingChange;
  const resolvedSorting = isSortingControlled ? (manual!.sorting ?? []) : sorting;

  function handleSortingChange(updater: SortingState | ((old: SortingState) => SortingState)) {
    const next = typeof updater === 'function' ? updater(resolvedSorting) : updater;

    if (isSortingControlled) {
      manual!.onSortingChange!(next);
      return;
    }

    setSorting(next);
  }

  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const hasSelection = selectable || (bulkActions?.length ?? 0) > 0;
  const { columnVisibility: visibilityState, setColumnVisibility, resetAll } = useColumnVisibility(id, columnVisibility ?? false);
  const prefersReducedMotion = useAppReducedMotion();

  const allColumns = useMemo(() => {
    const next = [...columns];

    if (actions) {
      next.push(buildActionsColumn<T>(actions));
    }

    if (hasSelection) {
      next.unshift(buildSelectColumn<T>());
    }

    return next;
  }, [columns, actions, hasSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    state: {
      sorting: resolvedSorting,
      globalFilter,
      rowSelection,
      columnVisibility: visibilityState,
      ...(columnFilters ? { columnFilters } : {}),
    },
    onSortingChange: handleSortingChange,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: hasSelection,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { enableSorting: false },
    manualSorting: isSortingControlled,
    manualFiltering: !!manual,
    manualPagination: !!manual,
    ...(manual ? { pageCount: manual.pageCount } : {}),
    ...(paginated && !manual
      ? { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageIndex: 0, pageSize } } }
      : {}),
  });

  async function handleBulkAction(bulkAction: BulkAction<T>) {
    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

    setIsBulkProcessing(true);

    try {
      await bulkAction.action(selectedRows);
    } finally {
      setIsBulkProcessing(false);
    }
  }

  // Only the caller's own columns decide fixed-width layout — the injected
  // select/actions columns carry a narrow `meta.width` of their own but must
  // not force `table-fixed` (and therefore equal-width columns) onto tables
  // whose real columns have no explicit widths.
  const hasFixedLayout = columns.some((col) => col.meta?.width);
  const showEmpty = !isLoading && table.getFilteredRowModel().rows.length === 0 && !!emptyState;
  const showSkeleton = useDelayedFlag(isLoading, 150);

  const filteredRows = table.getFilteredRowModel().rows;
  const filteredCount = filteredRows.length;

  useEffect(() => {
    onFilteredRowsChange?.(filteredRows.map((row) => row.original));
  }, [filteredRows, onFilteredRowsChange]);

  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const firstRow = filteredCount === 0 ? 0 : pageIndex * currentPageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * currentPageSize, filteredCount);
  const paginationSummary = manual ? null : `Showing ${firstRow} to ${lastRow} of ${filteredCount}`;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const { virtualRows, paddingTop, paddingBottom, measureElement } = useVirtualRows({
    rowCount: rows.length,
    scrollRef,
    enabled: !paginated && !manual && fillHeight,
  });
  const renderedRows = virtualRows ? virtualRows.map((virtualRow) => rows[virtualRow.index]) : rows;

  return (
    <div
      className={`${isFlat ? 'overflow-hidden border border-outline-variant/70 bg-white shadow-card' : 'overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card'} ${
        fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''
      }`}
      data-testid={id}
    >
      {title && renderTitle(title)}
      {(searchPlaceholder || toolbar || toolbarRight || columnVisibility || onRefresh) && (
        <DataTableToolbar
          table={table}
          id={id}
          toolbar={toolbar}
          toolbarTop={toolbarTop}
          toolbarRight={toolbarRight}
          toolbarCommandRight={toolbarCommandRight}
          onRefresh={onRefresh}
          resultCount={manual ? undefined : filteredCount}
          isFetching={isFetching}
          search={searchPlaceholder ? { placeholder: searchPlaceholder, ariaLabel: searchAriaLabel } : undefined}
          showColumnVisibility={columnVisibility}
          appearance={appearance}
          layout={toolbarLayout}
          resetAll={resetAll}
        />
      )}
      {bulkActions && bulkActions.length > 0 && table.getSelectedRowModel().rows.length > 0 && (
        <BulkActionBar
          selectedCount={table.getSelectedRowModel().rows.length}
          onClear={() => setRowSelection({})}
          isProcessing={isBulkProcessing}
          actions={bulkActions.map((ba) => ({
            label: ba.label,
            variant: ba.variant,
            icon: ba.icon,
            onClick: () => handleBulkAction(ba),
          }))}
        />
      )}
      <>
        <div
          ref={scrollRef}
          className={`thin-scrollbar overflow-x-auto transition-opacity duration-150 ${
            fillHeight ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-y-hidden'
          } ${showEmpty ? 'flex flex-col' : ''} ${isFetching && !showSkeleton ? 'opacity-60' : ''}`}
          aria-busy={isFetching ? 'true' : undefined}
        >
          <table className={`${showEmpty ? '' : 'min-w-[48rem] '}${hasFixedLayout ? 'w-full table-fixed' : 'w-full'}`}>
            <thead className={fillHeight ? `sticky top-0 z-10 ${isFlat ? 'bg-primary-fixed' : 'bg-surface-container'}` : undefined}>
              <tr className={isFlat ? 'bg-primary-fixed' : 'bg-surface-container'}>
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <th
                    key={header.id}
                    className={`truncate px-4 py-3 ${
                      isFlat
                        ? 'bg-primary-fixed shadow-[inset_0_-2px_0_var(--color-accent)]'
                        : 'bg-surface-container shadow-[inset_0_-2px_0_var(--color-outline-variant)]'
                    } ${
                      header.column.id === ACTIONS_COLUMN_ID ? 'text-right' : 'text-left'
                    } text-overline font-overline uppercase tracking-wider ${isFlat ? 'text-on-primary-fixed-variant' : 'text-on-surface-variant'}`}
                    style={(() => {
                      const width = header.column.columnDef.meta?.width;
                      return width ? { width } : undefined;
                    })()}
                    aria-sort={ariaSortFor(header.column.getIsSorted())}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={`inline-flex items-center text-overline font-overline uppercase tracking-wider hover:text-accent ${
                          header.column.getIsSorted() ? 'text-accent' : isFlat ? 'text-on-primary-fixed-variant' : 'text-on-surface-variant'
                        }`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {renderSortIcon(header.column.getIsSorted())}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            {showSkeleton ? (
              // Placeholder rows inside the *real* table shell (same header,
              // widths, borders), so when data lands the only change is the
              // cells — the real body then fades in over where the skeleton was.
              <motion.tbody
                aria-label="Loading table rows"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                  <tr key={i} className={`border-b ${isFlat ? 'border-outline-variant/70' : 'border-outline-variant'}`}>
                    {table.getVisibleLeafColumns().map((column, j) => (
                      <td
                        key={column.id}
                        className="px-4 py-3"
                        style={column.columnDef.meta?.width ? { width: column.columnDef.meta.width } : undefined}
                      >
                        <div className={`h-4 animate-pulse rounded-full bg-surface-container ${SKELETON_LINE_WIDTHS[(i + j) % SKELETON_LINE_WIDTHS.length]}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </motion.tbody>
            ) : (isLoading || showEmpty) ? null : (
              // One quiet opacity fade when the body first appears (after the
              // skeleton, or on first load). Filter/search/page updates reconcile
              // in place with no per-row motion — a cascading row stagger on every
              // keystroke reads as jitter on a long list. Feedback for those comes
              // from the search spinner and the isFetching dim instead.
              // `isLoading` here (with no skeleton yet) is the sub-150ms window —
              // render nothing rather than flash real rows that are about to be
              // replaced.
              <motion.tbody
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {paddingTop > 0 && <tr data-spacer="top" style={{ height: paddingTop }} />}
                {renderedRows.map((row) => {
                  const isHighlighted = highlightRowId !== undefined && row.id === highlightRowId;

                  return (
                    <tr
                      key={row.id}
                      ref={measureElement}
                      data-index={row.index}
                      data-highlighted={isHighlighted || undefined}
                      className={`border-b ${isFlat ? 'border-outline-variant/70 hover:bg-primary-fixed/40' : 'border-outline-variant hover:bg-accent/5'} transition-colors duration-fast ${
                        isHighlighted ? 'bg-info-container' : row.getIsSelected() ? 'bg-accent/5' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 text-body-md tabular-nums text-on-surface ${
                            cell.column.id === ACTIONS_COLUMN_ID ? 'text-right' : ''
                          }`}
                          style={(() => {
                            const width = cell.column.columnDef.meta?.width;
                            return width ? { width } : undefined;
                          })()}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && <tr data-spacer="bottom" style={{ height: paddingBottom }} />}
              </motion.tbody>
            )}
          </table>
          {showEmpty && emptyState && (
            <div className="flex min-h-[16rem] flex-1 items-center justify-center">
              <EmptyState
                title={emptyState.title}
                description={emptyState.description}
                icon={emptyState.icon}
              />
            </div>
          )}
        </div>
        {paginated && !isLoading && (
          <div className="flex shrink-0 items-center justify-between border-t border-outline-variant px-4 py-3">
            <div className="flex items-center gap-2">
              {paginationSummary !== null && (
                <p className="text-body-md text-on-surface-variant">{paginationSummary}</p>
              )}
              {isFetching && (
                <Loader2 size={14} className="animate-spin text-on-surface-variant" aria-hidden="true" />
              )}
            </div>
            <Pagination
              currentPage={(manual ? manual.pageIndex : table.getState().pagination.pageIndex) + 1}
              lastPage={manual ? manual.pageCount : table.getPageCount()}
              onPageChange={(page) => {
                if (manual) {
                  manual.onPageChange(page - 1);
                  return;
                }

                table.setPageIndex(page - 1);
              }}
              disabled={isFetching}
              appearance={appearance}
            />
          </div>
        )}
      </>
    </div>
  );
}
