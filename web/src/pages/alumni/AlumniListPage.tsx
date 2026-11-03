import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, RotateCcw, User, Users } from 'lucide-react';

import type { AlumniRecord, AlumniListItem } from '../../hooks/useAlumni';
import type { SearchFilters } from '../../types/Search';

import { DataTable, createColumnHelper } from '../../components/table';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { HighlightText } from '../../components/shared/HighlightText';
import { Modal } from '../../components/shared/Modal';
import { Button } from '../../components/shared/Button';
import { AlumniDetailView } from '../../components/alumni/AlumniDetailView';
import { AlumniDetailViewSkeleton } from '../../components/alumni/AlumniDetailViewSkeleton';
import { SearchBar } from '../../components/search/SearchBar';
import { FilterChips } from '../../components/search/FilterChips';
import { FilterPanel } from '../../components/search/FilterPanel';
import { SortDropdown } from '../../components/search/SortDropdown';

import { AlumniService } from '../../services/AlumniService';
import { useAlumni } from '../../hooks/useAlumni';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useReturnTo } from '../../hooks/useReturnTo';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { usePressTap } from '../../hooks/usePressTap';
import { useScope } from '../../hooks/useScope';

import { AlumniFormPage } from '../../routes/lazyPages';

import { ADMIN_URL_KEYS, buildSearchParams, getActiveUserFilterCount, parseFilters } from '../../utils/searchUtils';
import { computeAnchoredPosition } from '../../utils/popoverPosition';
import { formatFullName, formatLastFirstName } from '../../utils/formatName';

const preloadForm = () => { void AlumniFormPage.preload(); };

const FILTER_PANEL_ID = 'alumni-filter-panel';
const FILTER_PANEL_WIDTH = 352;
const FILTER_PANEL_ESTIMATED_HEIGHT = 520;
const FILTER_PANEL_GAP = 8;

interface AlumniListPageProps {
  initialStatus?: 'active' | 'archived';
}

function AlumniListPage({ initialStatus = 'active' }: AlumniListPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNavPending, startNavTransition] = useTransition();
  // Explicit flag so the trigger shows its busy state on the very first frame
  // even when the router's own update isn't a transition; it's never cleared
  // because the page unmounts once navigation lands.
  const [navStarted, setNavStarted] = useState(false);
  const navBusy = navStarted || isNavPending;
  const location = useLocation();
  const { returnLabel, goBack } = useReturnTo();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { schoolId: scopedSchoolId } = useScope();
  const pressTap = usePressTap();

  function goToForm(path: string) {
    if (navBusy) {
      return;
    }
    preloadForm();
    setNavStarted(true);
    startNavTransition(() => navigate(path));
  }

  // School scope is owned solely by the app-wide selector (which itself honours
  // a ?school_id= deep link for Super Admins) — never take it from this page's
  // own URL, so a School Admin can't hand-craft a cross-school school_id.
  const urlFilters = { ...parseFilters(searchParams), school_id: scopedSchoolId };

  const {
    alumni, isLoading, isFetching, error, filters, filterOptions, suggestions, applyFilters,
    loadSuggestions, clearSuggestions,
    deleteAlumni, restoreAlumni, forceDeleteAlumni,
  } = useAlumni(initialStatus, urlFilters);

  // Mirror later scope changes into this page's filter state.
  useEffect(() => {
    applyFilters({ school_id: scopedSchoolId });
  }, [scopedSchoolId, applyFilters]);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [forceDeletingId, setForceDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ kind: 'archive' | 'force-delete' | 'restore'; id: number } | null>(null);
  const [viewingAlumni, setViewingAlumni] = useState<AlumniRecord | null>(null);
  const [viewError, setViewError] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRetryKey, setViewRetryKey] = useState(0);
  const viewRequestIdRef = useRef(0);
  // Row to flag after the profile modal closes, so the reader lands back on
  // the record they were just looking at.
  const [recentlyViewedId, setRecentlyViewedId] = useState<string | null>(null);
  const [query, setQuery] = useState(urlFilters.q || '');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [filterPanelPosition, setFilterPanelPosition] = useState<{ top: number; left: number; width: number; openUpward: boolean; maxHeight: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const isArchived = filters.status === 'archived';
  const activeFilterCount = getActiveUserFilterCount(filters);
  const filtersQRef = useRef(filters.q);
  const viewId = searchParams.get('view');

  useEffect(() => {
    filtersQRef.current = filters.q;
  });

  useEffect(() => {
    if (!showFilters) {
      return;
    }

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;

      if (
        filterButtonRef.current && !filterButtonRef.current.contains(target) &&
        filterPanelRef.current && !filterPanelRef.current.contains(target)
      ) {
        setShowFilters(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowFilters(false);
      }
    }

    function handleScrollOrResize(e: Event) {
      if (filterPanelRef.current && e.target instanceof Node && filterPanelRef.current.contains(e.target)) {
        return;
      }

      setShowFilters(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showFilters]);

  function toggleFilters() {
    if (showFilters) {
      setShowFilters(false);
      return;
    }

    const rect = filterButtonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setFilterPanelPosition(computeAnchoredPosition(rect, {
      estimatedHeight: FILTER_PANEL_ESTIMATED_HEIGHT,
      width: FILTER_PANEL_WIDTH,
      align: 'end',
      gap: FILTER_PANEL_GAP,
    }));
    setShowFilters(true);
  }

  function handleRemoveFilter(key: keyof SearchFilters) {
    if (key === 'q') {
      setQuery('');
    }

    applyFilters({ [key]: undefined });
  }

  async function handleDelete() {
    if (!deletingId) {
      return;
    }

    const id = deletingId;
    setPendingAction({ kind: 'archive', id });
    setActionError('');

    try {
      await deleteAlumni(id);
      setDeletingId(null);
      showToast('Alumni record archived.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleForceDelete() {
    if (!forceDeletingId) {
      return;
    }

    const id = forceDeletingId;
    setPendingAction({ kind: 'force-delete', id });
    setActionError('');

    try {
      await forceDeleteAlumni(id);
      setForceDeletingId(null);
      showToast('Alumni record permanently deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRestore() {
    if (!restoringId) {
      return;
    }

    const id = restoringId;
    setPendingAction({ kind: 'restore', id });
    setActionError('');

    try {
      await restoreAlumni(id);
      setRestoringId(null);
      showToast('Alumni record restored.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  function alumniName(id: number) {
    const target = alumni?.data.find((record) => record.id === id);
    return target ? formatFullName(target) : `alumni record #${id}`;
  }

  // The highlight only makes sense against the list the reader left; drop it
  // once they re-sort the deck by searching or open another profile.
  useEffect(() => {
    setRecentlyViewedId(null);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!viewId) {
      viewRequestIdRef.current += 1;
      setViewingAlumni(null);
      setViewError('');
      setViewLoading(false);
      return;
    }

    setRecentlyViewedId(null);
    const requestId = ++viewRequestIdRef.current;
    setViewingAlumni(null);
    setViewError('');
    setViewLoading(true);

    AlumniService.getAlumni(Number(viewId))
      .then((record) => {
        if (requestId !== viewRequestIdRef.current) {
          return;
        }
        if (record) {
          setViewingAlumni(record);
        } else {
          setViewError('Alumni record not found.');
        }
      })
      .catch(() => {
        if (requestId === viewRequestIdRef.current) {
          setViewError('Failed to load alumni profile.');
        }
      })
      .finally(() => {
        if (requestId === viewRequestIdRef.current) {
          setViewLoading(false);
        }
      });

    return () => {
      if (requestId === viewRequestIdRef.current) {
        viewRequestIdRef.current += 1;
      }
    };
  }, [viewId, viewRetryKey]);

  useEffect(() => {
    const currentQ = filtersQRef.current;

    if (debouncedQuery.trim().length >= 2) {
      loadSuggestions(debouncedQuery);

      if (currentQ !== debouncedQuery) {
        applyFilters({ q: debouncedQuery });
      }

      return;
    }

    clearSuggestions();

    if (currentQ) {
      applyFilters({ q: undefined });
    }
  }, [clearSuggestions, applyFilters, loadSuggestions, debouncedQuery]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = buildSearchParams(filters, ADMIN_URL_KEYS);
      const viewId = prev.get('view');
      if (viewId) {
        next.set('view', viewId);
      }
      return next;
    }, { replace: true, state: location.state });
    // location.state is intentionally omitted: history clones it on every
    // replace, so a new object identity would re-trigger this effect forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, setSearchParams]);

  const searchHighlight = filters.q;
  const isSuperAdmin = user?.role === 'super_admin';
  const fullName = formatLastFirstName;

  const chAlumni = createColumnHelper<AlumniListItem>();

  const columns = [
    chAlumni.accessor((a) => fullName(a), {
      id: 'name',
      header: 'Name',
      meta: { width: '22%' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('view', String(row.original.id));
              return next;
            });
          }}
          className="block w-full truncate text-left text-accent hover:text-accent-hover"
          title={fullName(row.original)}
        >
          <HighlightText text={fullName(row.original)} highlight={searchHighlight} />
        </button>
      ),
    }),
    chAlumni.display({
      id: 'school',
      header: 'School',
      meta: { width: '22%' },
      cell: ({ row }) => (
        <span className="block truncate text-on-surface-variant" title={row.original.school?.name || undefined}>
          <HighlightText text={row.original.school?.name || '\u2014'} highlight={searchHighlight} />
        </span>
      ),
    }),
    chAlumni.accessor('graduation_year', {
      header: 'Batch',
      meta: { width: '8%' },
      cell: ({ getValue }) => <span className="text-on-surface-variant">{getValue()}</span>,
    }),
    ...(!isArchived
      ? [
        chAlumni.accessor('contact_number', {
          id: 'contact',
          header: 'Contact',
          meta: { width: '14%' },
          cell: ({ getValue }) => (
            <span className="block truncate text-on-surface-variant" title={getValue() || undefined}>
              {getValue() || '\u2014'}
            </span>
          ),
        }),
        chAlumni.accessor('contact_email', {
          header: 'Email',
          meta: { width: '18%' },
          cell: ({ getValue }) => (
            <span className="block truncate text-on-surface-variant" title={getValue() || undefined}>
              <HighlightText text={getValue() || '\u2014'} highlight={searchHighlight} />
            </span>
          ),
        }),
      ]
      : [
        chAlumni.display({
          id: 'archived',
          header: 'Archived',
          meta: { width: '16%' },
          cell: ({ row }) => (
            <span className="block truncate text-on-surface-variant" title={row.original.deleted_at ? new Date(row.original.deleted_at).toLocaleDateString() : undefined}>
              {row.original.deleted_at ? new Date(row.original.deleted_at).toLocaleDateString() : '\u2014'}
            </span>
          ),
        }),
      ]),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      {error && (
        <div className="mb-4 shrink-0 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <DataTable
          paginated
          fillHeight
          id={isArchived
            ? (isSuperAdmin ? 'alumni-archived-super-admin-table' : 'alumni-archived-school-admin-table')
            : (isSuperAdmin ? 'alumni-list-super-admin-table' : 'alumni-list-school-admin-table')}
          columns={columns}
          data={alumni?.data ?? []}
          getRowId={(row) => String(row.id)}
          highlightRowId={recentlyViewedId ?? undefined}
          isLoading={isLoading}
          isFetching={isFetching}
          columnVisibility
          appearance="flat"
          toolbarLayout="stacked"
          emptyState={{
            icon: Users,
            title: isArchived ? 'No archived records' : 'No alumni records found',
            description: isArchived ? 'Archived alumni will appear here.' : 'Try adjusting your search or filters.',
          }}
          toolbarTop={
            <div className="w-full sm:min-w-[22rem] sm:flex-1 sm:max-w-md">
              <SearchBar
                value={query}
                suggestions={suggestions}
                isLoading={isFetching}
                placeholder="Search by name, student ID, or email"
                ariaLabel="Search alumni"
                onChange={setQuery}
                onSelect={(s) => {
                  clearSuggestions();
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('view', String(s.id));
                    return next;
                  });
                }}
              />
            </div>
          }
          toolbarRight={!isArchived && (
            <Button
              onClick={() => goToForm('/alumni/new')}
              onPointerEnter={preloadForm}
              onFocus={preloadForm}
              icon={Plus}
              isLoading={navBusy}
              loadingText="Add New"
            >
              Add New
            </Button>
          )}
          toolbar={
            <>
              <SortDropdown value={filters.sort_by} onChange={(v) => applyFilters({ sort_by: v })} appearance="command" />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  ref={filterButtonRef}
                  type="button"
                  onClick={toggleFilters}
                  aria-expanded={showFilters ? 'true' : 'false'}
                  aria-controls={FILTER_PANEL_ID}
                  className="inline-flex items-center gap-2 rounded-sm px-2 py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                >
                  {showFilters ? 'Hide Filters' : 'Filters'}
                  {activeFilterCount > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-label-sm font-label-sm text-on-primary">{activeFilterCount}</span>
                  )}
                </button>
                <FilterChips filters={filters} onRemove={handleRemoveFilter} />
              </div>
            </>
          }
          actions={{
            render: (a) => (
              <div className="flex items-center justify-end gap-2">
                {isArchived ? (
                  <>
                    <motion.button
                      type="button"
                      onClick={() => { setActionError(''); setRestoringId(a.id); }}
                      disabled={pendingAction !== null}
                      aria-label={`Restore ${formatFullName(a)}`}
                      title="Restore"
                      {...pressTap}
                      className="tap-target rounded-DEFAULT bg-accent p-1.5 text-on-primary shadow-xs transition-all hover:-translate-y-px hover:bg-accent-hover hover:shadow-sm"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => { setActionError(''); setForceDeletingId(a.id); }}
                      disabled={pendingAction !== null}
                      aria-label={`Permanently delete ${formatFullName(a)}`}
                      title="Permanently Delete"
                      {...pressTap}
                      className="tap-target rounded-DEFAULT bg-error p-1.5 text-on-error shadow-xs transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-sm"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      type="button"
                      onClick={() => goToForm(`/alumni/${a.id}/edit`)}
                      onPointerEnter={preloadForm}
                      onFocus={preloadForm}
                      disabled={navBusy}
                      aria-label={`Edit ${formatFullName(a)}`}
                      title="Edit"
                      {...pressTap}
                      className="tap-target rounded-DEFAULT bg-accent p-1.5 text-on-primary shadow-xs transition-all hover:-translate-y-px hover:bg-accent-hover hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-xs"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => { setActionError(''); setDeletingId(a.id); }}
                      disabled={pendingAction !== null}
                      aria-label={`Archive ${formatFullName(a)}`}
                      title="Archive"
                      {...pressTap}
                      className="tap-target rounded-DEFAULT bg-error p-1.5 text-on-error shadow-xs transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-sm"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </motion.button>
                  </>
                )}
              </div>
            ),
          }}
        />
        {showFilters && filterOptions && filterPanelPosition && createPortal(
          <div
            ref={filterPanelRef}
            id={FILTER_PANEL_ID}
            style={{
              position: 'fixed',
              top: filterPanelPosition.openUpward ? undefined : filterPanelPosition.top,
              bottom: filterPanelPosition.openUpward ? window.innerHeight - filterPanelPosition.top : undefined,
              left: filterPanelPosition.left,
              width: filterPanelPosition.width,
              maxHeight: filterPanelPosition.maxHeight,
              zIndex: 50,
            }}
            className="flex min-w-0 max-w-[calc(100vw-1rem)]"
          >
            <FilterPanel filters={filters} filterOptions={filterOptions} scope="admin" onChange={(partial) => applyFilters(partial)} />
          </div>,
          document.body,
        )}
      </div>

      <Modal
        isOpen={!!viewId}
        onClose={() => {
          setRecentlyViewedId(viewId);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('view');
            return next;
          }, { replace: true });
        }}
        title="Alumni Profile"
        icon={User}
        tone="blue"
        size="xl"
        headerAccessory={
          goBack && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-DEFAULT border border-outline-variant px-2.5 py-1.5 text-label-sm font-label-sm text-accent hover:bg-surface-container sm:px-3"
            >
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to {returnLabel ?? 'Previous Page'}</span>
            </button>
          )
        }
      >
        {viewLoading ? (
          <div role="status" aria-label="Loading alumni profile">
            <AlumniDetailViewSkeleton />
          </div>
        ) : viewingAlumni ? (
          <AlumniDetailView alumni={viewingAlumni} />
        ) : viewError ? (
          <div className="space-y-3">
            <p className="text-body-md text-error" role="alert">{viewError}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewRetryKey((key) => key + 1)}>
              Retry
            </Button>
          </div>
        ) : (
          <AlumniDetailViewSkeleton />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title={<>Archive <HighlightedName>{alumniName(deletingId ?? 0)}</HighlightedName>?</>}
        message={<><HighlightedName>{alumniName(deletingId ?? 0)}</HighlightedName> will be archived, hidden from active listings, and remain restorable from Archived records. If this record is linked to an alumni account, that account will lose access to alumni features until the record is restored.</>}
        confirmLabel="Archive"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setDeletingId(null); setActionError(''); }}
        isLoading={pendingAction?.kind === 'archive' && pendingAction.id === deletingId}
        error={actionError}
        onRetry={handleDelete}
      />

      <ConfirmDialog
        isOpen={!!forceDeletingId}
        title={<>Permanently delete <HighlightedName>{alumniName(forceDeletingId ?? 0)}</HighlightedName>?</>}
        message={<><HighlightedName>{alumniName(forceDeletingId ?? 0)}</HighlightedName> will be permanently deleted from the system. This archived record and its data cannot be restored.</>}
        confirmLabel="Delete Permanently"
        variant="danger"
        onConfirm={handleForceDelete}
        onCancel={() => { setForceDeletingId(null); setActionError(''); }}
        isLoading={pendingAction?.kind === 'force-delete' && pendingAction.id === forceDeletingId}
        error={actionError}
        onRetry={handleForceDelete}
        requireTypedConfirmation="DELETE"
      />

      <ConfirmDialog
        isOpen={!!restoringId}
        title={<>Restore <HighlightedName>{alumniName(restoringId ?? 0)}</HighlightedName>?</>}
        message={<><HighlightedName>{alumniName(restoringId ?? 0)}</HighlightedName> will be restored from Archived records and returned to active alumni listings.</>}
        confirmLabel="Restore"
        variant="primary"
        onConfirm={handleRestore}
        onCancel={() => { setRestoringId(null); setActionError(''); }}
        isLoading={pendingAction?.kind === 'restore' && pendingAction.id === restoringId}
        error={actionError}
        onRetry={handleRestore}
      />
    </div>
  );
}

export default AlumniListPage;
