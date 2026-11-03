import { useEffect, useMemo, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, EyeOff, Megaphone, Pencil, RotateCcw, Trash2, CircleDot, Tag } from 'lucide-react';

import type { Announcement } from '../../types/Announcement';
import type { ActionMenuItem } from '../../components/shared/ActionMenu';

import { StatusBadge } from '../../components/shared/StatusBadge';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { Button } from '../../components/shared/Button';
import { DataTable, createColumnHelper } from '../../components/table';
import type { ColumnFiltersState } from '../../components/table';
import { MotionLink } from '../../components/shared/MotionLink';
import { SelectField } from '../../components/shared/SelectField';
import { Spinner } from '../../components/shared/Spinner';

import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { usePressTap } from '../../hooks/usePressTap';
import { useScope } from '../../hooks/useScope';
import { AnnouncementComposerPage } from '../../routes/lazyPages';

const preloadComposer = () => { void AnnouncementComposerPage.preload(); };

interface AnnouncementListPageProps {
  // 'all' covers every status except archived, which has its own route.
  initialStatus?: 'all' | 'archived';
}

type ListLifecycleAction = 'unpublish' | 'archive' | 'restore' | 'delete';

interface PendingAction {
  id: number;
  action: ListLifecycleAction;
  title: string;
}

const LIFECYCLE_COPY: Record<ListLifecycleAction, { pending: string; success: string; failure: string }> = {
  unpublish: {
    pending: 'Unpublishing announcement...',
    success: 'Announcement unpublished.',
    failure: 'Failed to unpublish announcement.',
  },
  archive: {
    pending: 'Archiving announcement...',
    success: 'Announcement archived.',
    failure: 'Failed to archive announcement.',
  },
  restore: {
    pending: 'Restoring announcement...',
    success: 'Announcement restored as a draft.',
    failure: 'Failed to restore announcement.',
  },
  delete: {
    pending: 'Deleting announcement...',
    success: 'Announcement deleted.',
    failure: 'Failed to delete announcement.',
  },
};

function AnnouncementListPage({ initialStatus = 'all' }: AnnouncementListPageProps) {
  const navigate = useNavigate();
  const [isNavPending, startNavTransition] = useTransition();
  // Explicit flag so the trigger shows its busy state on the first frame; never
  // cleared because the page unmounts once navigation lands.
  const [navStarted, setNavStarted] = useState(false);
  const navBusy = navStarted || isNavPending;
  const { announcements, isLoading, isFetching, fetchList, unpublish, archive, restore, remove } = useAnnouncements();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { schoolId } = useScope();
  const pressTap = usePressTap();
  const isArchivedView = initialStatus === 'archived';
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const isSuperAdmin = user?.role === 'super_admin';
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmationTarget, setConfirmationTarget] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [failedAction, setFailedAction] = useState<PendingAction | null>(null);

  function goToComposer(path: string) {
    if (navBusy) {
      return;
    }
    preloadComposer();
    setNavStarted(true);
    startNavTransition(() => navigate(path));
  }

  // The whole per-scope set is fetched once (`all: 1`); status/type/school and
  // the title search all narrow it client-side. Only the archived route — a
  // genuinely different dataset — changes what's fetched from the server.
  const columnFilters: ColumnFiltersState = useMemo(() => {
    const next: ColumnFiltersState = [];
    if (!isArchivedView && statusFilter) {
      next.push({ id: 'status', value: statusFilter });
    }
    if (typeFilter) {
      next.push({ id: 'type', value: typeFilter });
    }
    if (schoolId) {
      next.push({ id: 'school', value: schoolId });
    }
    return next;
  }, [isArchivedView, statusFilter, typeFilter, schoolId]);

  useEffect(() => {
    // The archived route is a dedicated view, so its status is fixed rather
    // than driven by the toolbar filter (which it does not render).
    fetchList({ status: isArchivedView ? 'archived' : undefined });
  }, [fetchList, isArchivedView]);

  async function runLifecycleAction(action: ListLifecycleAction, id: number, operation: () => Promise<void>, onSuccess?: () => void, title = 'this announcement') {
    if (pendingAction) {
      return;
    }

    setActionError('');
    setFailedAction(null);
    setPendingAction({ action, id, title });

    try {
      await operation();
      onSuccess?.();
      showToast(LIFECYCLE_COPY[action].success);
    } catch (err) {
      const message = err instanceof Error ? err.message : LIFECYCLE_COPY[action].failure;
      setActionError(message);
      setFailedAction({ action, id, title });
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) {
      return;
    }

    const id = deletingId;
    await runLifecycleAction('delete', id, () => remove(id), () => setDeletingId(null), announcementTitle(id));
  }

  function announcementTitle(id: number) {
    return announcements.find((announcement) => announcement.id === id)?.title ?? 'this announcement';
  }

  function openLifecycleConfirmation(action: Exclude<ListLifecycleAction, 'delete'>, announcement: Announcement) {
    setConfirmationTarget({ action, id: announcement.id, title: announcement.title });
    setActionError('');
    setFailedAction(null);
  }

  async function confirmLifecycleAction() {
    if (!confirmationTarget) {
      return;
    }

    const target = confirmationTarget;
    const operation = target.action === 'unpublish'
      ? () => unpublish(target.id)
      : target.action === 'archive'
        ? () => archive(target.id)
        : () => restore(target.id);
    await runLifecycleAction(target.action, target.id, operation, () => setConfirmationTarget(null), target.title);
  }

  async function retryFailedAction() {
    if (!failedAction) {
      return;
    }

    const target = failedAction;
    const operation = target.action === 'unpublish'
      ? () => unpublish(target.id)
      : target.action === 'archive'
        ? () => archive(target.id)
        : target.action === 'restore'
          ? () => restore(target.id)
          : () => remove(target.id);
    await runLifecycleAction(target.action, target.id, operation, () => {
      if (target.action === 'delete') {
        setDeletingId(null);
      } else {
        setConfirmationTarget(null);
      }
    }, target.title);
  }

  const chAnnouncement = createColumnHelper<Announcement>();

  const columns = [
    chAnnouncement.accessor('title', { header: 'Title' }),
    chAnnouncement.accessor('type', {
      header: 'Type',
      filterFn: 'equals',
      cell: ({ getValue }) => <span className="capitalize">{getValue()}</span>,
    }),
    ...(isSuperAdmin
      ? [chAnnouncement.accessor((row) => row.school?.id ?? null, {
          id: 'school',
          header: 'School',
          filterFn: 'equals',
          cell: ({ row }) => row.original.school?.name ?? 'All Schools',
        })]
      : []),
    chAnnouncement.accessor('status', {
      header: 'Status',
      filterFn: 'equals',
      cell: ({ getValue }) => <StatusBadge status={getValue()} withIcon />,
    }),
    chAnnouncement.display({
      id: 'target',
      header: 'Target',
      cell: ({ row }) => (row.original.target_all_batches ? 'All Batches' : row.original.batches?.join(', ') || '\u2014'),
    }),
    chAnnouncement.accessor('published_at', {
      header: 'Published',
      cell: ({ getValue }) => {
        const publishedAt = getValue();
        return publishedAt ? new Date(publishedAt).toLocaleDateString() : '\u2014';
      },
    }),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      {pendingAction && (
        <div className="mb-3 rounded-DEFAULT bg-surface-container p-3 text-body-md text-on-surface-variant" role="status" aria-live="polite">
          {LIFECYCLE_COPY[pendingAction.action].pending}
        </div>
      )}
      {actionError && deletingId === null && confirmationTarget === null && failedAction && (
        <div className="mb-3 flex items-center gap-3 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          <span>{actionError}</span>
          <Button size="sm" variant="danger" onClick={() => { void retryFailedAction(); }} disabled={pendingAction !== null}>
            Retry
          </Button>
        </div>
      )}
      <DataTable
        paginated
        fillHeight
        id={`announcement-list-${isArchivedView ? 'archived-' : ''}${isSuperAdmin ? 'super-admin' : 'school-admin'}`}
        columns={columns}
        data={announcements}
        getRowId={(row) => String(row.id)}
        isLoading={isLoading}
        isFetching={isFetching}
        columnFilters={columnFilters}
        columnVisibility
        appearance="flat"
        toolbarLayout="stacked"
        searchPlaceholder="Search announcements"
        searchAriaLabel="Search announcements"
        emptyState={{
          icon: Megaphone,
          title: isArchivedView ? 'No archived announcements' : 'No announcements found',
          description: isArchivedView
            ? 'Archived announcements appear here.'
            : 'Try adjusting your search or filters.',
        }}
        toolbarRight={!isArchivedView && (
          <MotionLink
            to="/announcements/new"
            {...pressTap}
            onPointerEnter={preloadComposer}
            onFocus={preloadComposer}
            onClick={(e) => {
              e.preventDefault();
              goToComposer('/announcements/new');
            }}
            aria-busy={navBusy || undefined}
            aria-disabled={navBusy || undefined}
            className={`inline-flex items-center gap-2 rounded-DEFAULT bg-accent px-4 py-2 text-body-md font-label-md text-on-primary hover:bg-accent-hover ${navBusy ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {navBusy && <Spinner className="h-4 w-4" />}
            Create Announcement
          </MotionLink>
        )}
        toolbar={
          <>
            {!isArchivedView && (
              <SelectField
                label="Filter by status"
                hideLabel
                icon={CircleDot}
                appearance="command"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="expired">Expired</option>
              </SelectField>
            )}
            <SelectField
              label="Filter by type"
              hideLabel
              icon={Tag}
              appearance="command"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="event">Event</option>
              <option value="closure">School Closure</option>
            </SelectField>
          </>
        }
        actions={{
          items: (announcement: Announcement): ActionMenuItem[] => {
            if (announcement.status === 'archived') {
              return [
                { label: 'Restore', onClick: () => openLifecycleConfirmation('restore', announcement), disabled: pendingAction !== null || confirmationTarget !== null, icon: RotateCcw },
                { label: 'Delete', onClick: () => { setConfirmationTarget(null); setDeletingId(announcement.id); setActionError(''); setFailedAction(null); }, disabled: pendingAction !== null || confirmationTarget !== null, variant: 'danger', icon: Trash2 },
              ];
            }

            const items: ActionMenuItem[] = [
              { label: 'Edit', onClick: () => goToComposer(`/announcements/${announcement.id}/edit`), icon: Pencil },
            ];

            if (announcement.status === 'published') {
              items.push({ label: 'Unpublish', onClick: () => openLifecycleConfirmation('unpublish', announcement), disabled: pendingAction !== null || confirmationTarget !== null, icon: EyeOff });
            }

            items.push({ label: 'Archive', onClick: () => openLifecycleConfirmation('archive', announcement), disabled: pendingAction !== null || confirmationTarget !== null, icon: Archive });
            items.push({ label: 'Delete', onClick: () => { setConfirmationTarget(null); setDeletingId(announcement.id); setActionError(''); setFailedAction(null); }, disabled: pendingAction !== null || confirmationTarget !== null, variant: 'danger', icon: Trash2 });

            return items;
          },
        }}
      />

      <ConfirmDialog
        isOpen={confirmationTarget !== null}
        title={confirmationTarget
          ? <>{confirmationTarget.action === 'unpublish' ? 'Unpublish' : confirmationTarget.action === 'archive' ? 'Archive' : 'Restore'} <HighlightedName>{confirmationTarget.title}</HighlightedName>?</>
          : ''}
        message={confirmationTarget?.action === 'unpublish'
          ? <><HighlightedName>{confirmationTarget.title}</HighlightedName> will become a draft and no longer be visible to alumni until it is published again.</>
          : confirmationTarget?.action === 'archive'
            ? <><HighlightedName>{confirmationTarget.title}</HighlightedName> will be hidden from active announcement lists{announcements.find((announcement) => announcement.id === confirmationTarget.id)?.status === 'published' ? ' and withdrawn from alumni' : ''}. It can be restored as a draft.</>
            : confirmationTarget
              ? <><HighlightedName>{confirmationTarget.title}</HighlightedName> will be restored from Archived as a draft and stay hidden from alumni until you publish it again.</>
              : ''}
        confirmLabel={confirmationTarget?.action === 'unpublish' ? 'Unpublish' : confirmationTarget?.action === 'archive' ? 'Archive' : 'Restore'}
        variant={confirmationTarget?.action === 'restore' ? 'primary' : 'danger'}
        onConfirm={() => { void confirmLifecycleAction(); }}
        onCancel={() => {
          if (pendingAction === null) {
            setConfirmationTarget(null);
            setActionError('');
            setFailedAction(null);
          }
        }}
        isLoading={pendingAction?.id === confirmationTarget?.id && pendingAction?.action === confirmationTarget?.action}
        error={failedAction?.id === confirmationTarget?.id && failedAction?.action === confirmationTarget?.action ? actionError : undefined}
        onRetry={() => { void confirmLifecycleAction(); }}
      />

      <ConfirmDialog
        isOpen={deletingId !== null}
        title={<>Delete <HighlightedName>{announcementTitle(deletingId ?? 0)}</HighlightedName>?</>}
        message={<><HighlightedName>{announcementTitle(deletingId ?? 0)}</HighlightedName> will be soft-deleted and removed from admin lists and alumni feeds. It cannot be restored from this screen.</>}
        confirmLabel="Delete announcement"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setDeletingId(null); setActionError(''); setFailedAction(null); }}
        isLoading={pendingAction?.action === 'delete' && pendingAction.id === deletingId}
        error={failedAction?.action === 'delete' && failedAction.id === deletingId ? actionError : undefined}
        onRetry={() => { void handleDelete(); }}
      />
    </div>
  );
}

export default AnnouncementListPage;
