import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, CheckCircle2, Download, Eye, FileBarChart, RotateCcw, Send, Trash2, Undo2, X } from 'lucide-react';

import type { ReportRecord } from '../../types/Report';
import type { ActionMenuItem } from '../shared/ActionMenu';

import { DataTable, createColumnHelper } from '../table';
import { Button } from '../shared/Button';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { HighlightedName } from '../shared/HighlightedName';
import { StatusBadge } from '../shared/StatusBadge';

import { useReportHistory, useReportMutations } from '../../hooks/useReports';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../hooks/useToast';
import { ReportService } from '../../services/ReportService';
import { formatReportType } from '../../lib/reportMeta';

interface ReportsListViewProps {
  isSuperAdmin: boolean;
  /** True when the user landed here straight after generating a report. */
  justGenerated: boolean;
  /** Id of the report just generated, to highlight in the list. */
  generatedReportId: number | null;
  onNewReport: () => void;
  onPreview: (reportId: number) => void;
}

type ListStatus = 'active' | 'archived';
type LifecycleAction = 'unpublish' | 'archive' | 'restore' | 'delete';

interface LifecycleRequest {
  action: LifecycleAction;
  report: ReportRecord;
}

const LIFECYCLE_COPY: Record<LifecycleAction, { label: string; successMessage: string }> = {
  unpublish: { label: 'Unpublish', successMessage: 'Report unpublished.' },
  archive: { label: 'Archive', successMessage: 'Report archived.' },
  restore: { label: 'Restore', successMessage: 'Report restored.' },
  delete: { label: 'Delete', successMessage: 'Report deleted.' },
};

function rowStatus(report: ReportRecord): string {
  if (report.lifecycle_status === 'archived') {
    return 'archived';
  }
  return report.visibility === 'published' ? 'published' : 'unpublished';
}

export default function ReportsListView({
  isSuperAdmin,
  justGenerated,
  generatedReportId,
  onNewReport,
  onPreview,
}: ReportsListViewProps) {
  const { showToast } = useToast();
  const { schoolId: scopedSchoolId } = useScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const [publishTarget, setPublishTarget] = useState<ReportRecord | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReportRecord | null>(null);
  const [confirmationTarget, setConfirmationTarget] = useState<LifecycleRequest | null>(null);
  const [pendingAction, setPendingAction] = useState<LifecycleRequest | null>(null);
  const [failedAction, setFailedAction] = useState<LifecycleRequest | null>(null);
  const [lifecycleError, setLifecycleError] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const listStatus: ListStatus = searchParams.get('status') === 'archived' ? 'archived' : 'active';

  const { rows, isLoading, isFetching, error, refetch } = useReportHistory(listStatus, scopedSchoolId);
  const { publish, unpublish, archive, restore, deleteReport } = useReportMutations();

  useEffect(() => {
    if (justGenerated) {
      setBanner("Report generated. It's at the top of the list.");
      setHighlightId(generatedReportId !== null ? String(generatedReportId) : null);
    }
  }, [justGenerated, generatedReportId]);

  function dismissBanner() {
    setBanner(null);
    setHighlightId(null);
  }

  function setListStatus(next: ListStatus) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('status', next);
      return params;
    });
  }

  const lifecycleActions: Record<LifecycleAction, (id: number) => Promise<void>> = {
    unpublish,
    archive,
    restore,
    delete: deleteReport,
  };

  async function runAction(actionName: LifecycleAction, report: ReportRecord): Promise<boolean> {
    const request = { action: actionName, report };
    const copy = LIFECYCLE_COPY[actionName];
    setPendingAction(request);
    setFailedAction(null);
    setLifecycleError('');

    try {
      await lifecycleActions[actionName](report.id);
      showToast(copy.successMessage);
      return true;
    } catch {
      const message = `Could not ${copy.label.toLowerCase()} “${report.title}”. Please try again.`;
      setFailedAction(request);
      setLifecycleError(message);
      showToast(message, 'error');
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  function openDeleteConfirmation(report: ReportRecord) {
    setConfirmationTarget(null);
    setDeleteTarget(report);
    setFailedAction(null);
    setLifecycleError('');
  }

  function openLifecycleConfirmation(action: Exclude<LifecycleAction, 'delete'>, report: ReportRecord) {
    setDeleteTarget(null);
    setConfirmationTarget({ action, report });
    setFailedAction(null);
    setLifecycleError('');
  }

  function openPublishConfirmation(report: ReportRecord) {
    setPublishError('');
    setPublishTarget(report);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const didDelete = await runAction('delete', deleteTarget);
    if (didDelete) {
      setDeleteTarget(null);
    }
  }

  async function confirmLifecycleAction() {
    if (!confirmationTarget) {
      return;
    }

    const target = confirmationTarget;
    const didSucceed = await runAction(target.action, target.report);
    if (didSucceed) {
      setConfirmationTarget(null);
    }
  }

  async function retryFailedAction() {
    const request = failedAction;
    if (request) {
      const didSucceed = await runAction(request.action, request.report);
      if (didSucceed && request.action === 'delete') {
        setDeleteTarget(null);
      }
      if (didSucceed && request.action !== 'delete') {
        setConfirmationTarget(null);
      }
    }
  }

  async function confirmPublish() {
    if (!publishTarget) {
      return;
    }
    setIsPublishing(true);
    setPublishError('');
    try {
      await publish(publishTarget.id);
      setBanner(`"${publishTarget.title}" is now published to alumni.`);
      showToast('Report published to alumni.');
      setPublishTarget(null);
    } catch {
      const message = 'Could not publish the report. Please try again.';
      setPublishError(message);
      showToast(message, 'error');
    } finally {
      setIsPublishing(false);
    }
  }

  const chReport = createColumnHelper<ReportRecord>();

  const columns = [
    chReport.accessor('title', { header: 'Title' }),
    chReport.accessor('report_type', {
      header: 'Type',
      cell: ({ getValue }) => formatReportType(getValue()),
    }),
    ...(isSuperAdmin
      ? [chReport.display({
          id: 'school',
          header: 'School',
          cell: ({ row }) => row.original.school?.name ?? 'All Schools',
        })]
      : []),
    chReport.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={rowStatus(row.original)} withIcon />,
    }),
    chReport.accessor('created_at', {
      header: 'Date',
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
  ];

  function rowActions(report: ReportRecord): ActionMenuItem[] {
    const archived = report.lifecycle_status === 'archived';
    const published = report.visibility === 'published';
    const lifecycleBusy = pendingAction !== null || isPublishing || confirmationTarget !== null;

    return [
      { label: 'Preview', onClick: () => onPreview(report.id), icon: Eye },
      { label: 'Download', onClick: () => ReportService.downloadReport(report.id), icon: Download },
      ...(!archived && !published ? [{ label: 'Publish', onClick: () => openPublishConfirmation(report), icon: Send, disabled: lifecycleBusy }] : []),
      ...(published ? [{ label: 'Unpublish', onClick: () => openLifecycleConfirmation('unpublish', report), icon: Undo2, disabled: lifecycleBusy }] : []),
      ...(archived ? [{ label: 'Restore', onClick: () => openLifecycleConfirmation('restore', report), icon: RotateCcw, disabled: lifecycleBusy }] : []),
      ...(!archived ? [{ label: 'Archive', onClick: () => openLifecycleConfirmation('archive', report), icon: Archive, disabled: lifecycleBusy }] : []),
      { label: 'Delete', onClick: () => openDeleteConfirmation(report), variant: 'danger', icon: Trash2, disabled: lifecycleBusy },
    ];
  }

  const statusToggle = (
    <div className="inline-flex gap-1 rounded-DEFAULT border border-outline-variant/70 bg-surface-container-low p-1">
      {(['active', 'archived'] as ListStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={listStatus === s}
          onClick={() => setListStatus(s)}
          className={`rounded-[calc(var(--radius-DEFAULT)-2px)] px-3 py-1 text-label-md font-label-md capitalize transition-all ${listStatus === s ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          {s}
        </button>
      ))}
    </div>
  );

  const listErrorMessage = error instanceof Error && error.message ? error.message : 'Could not load reports. Please try again.';
  const isDeletePending = pendingAction?.action === 'delete' && pendingAction.report.id === deleteTarget?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {banner && (
        <div className="mb-4 flex shrink-0 items-center gap-2 rounded-lg border border-success-container bg-success-container/40 px-4 py-3 text-body-md text-on-success-container">
          <CheckCircle2 size={18} aria-hidden="true" className="shrink-0" />
          <span className="flex-1">{banner}</span>
          {justGenerated && (
            <button type="button" onClick={onNewReport} className="shrink-0 rounded-DEFAULT px-2 py-1 text-label-md font-label-md underline hover:no-underline">
              Create another
            </button>
          )}
          <button type="button" onClick={dismissBanner} aria-label="Dismiss" className="shrink-0 rounded-DEFAULT p-1 hover:bg-black/5">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {pendingAction && (
        <div className="mb-4 flex shrink-0 items-center rounded-DEFAULT border border-info-container bg-info-container/40 px-4 py-3 text-body-md text-on-info-container" role="status" aria-live="polite">
          {LIFECYCLE_COPY[pendingAction.action].label} “{pendingAction.report.title}”…
        </div>
      )}

      {lifecycleError && failedAction && (
        <div className="mb-4 flex shrink-0 items-center gap-3 rounded-DEFAULT border border-error-container bg-error-container/50 px-4 py-3 text-body-md text-on-error-container" role="alert">
          <span className="flex-1">{lifecycleError}</span>
          <Button size="sm" variant="danger" onClick={() => { void retryFailedAction(); }} disabled={pendingAction !== null}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {error ? (
          <div className="flex min-h-[20rem] flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-outline-variant/70 bg-white p-6 text-center shadow-card">
            <div className="self-end">{statusToggle}</div>
            <div role="alert" className="flex max-w-md flex-col items-center gap-3">
              <FileBarChart className="h-10 w-10 text-error" aria-hidden="true" />
              <h2 className="text-title-md font-title-md text-on-surface">Reports could not be loaded</h2>
              <p className="text-body-md text-on-surface-variant">{listErrorMessage} Refresh to try again.</p>
              <Button size="sm" onClick={() => { void refetch(); }} isLoading={isFetching} loadingText="Refreshing">
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <DataTable
            paginated
            fillHeight
            id={isSuperAdmin ? 'reports-list-super-admin' : 'reports-list-school-admin'}
            columns={columns}
            data={rows}
            getRowId={(r) => String(r.id)}
            isLoading={isLoading}
            isFetching={isFetching}
            highlightRowId={highlightId ?? undefined}
            columnVisibility
            appearance="flat"
            toolbarLayout="stacked"
            searchPlaceholder="Search by title"
            searchAriaLabel="Search reports"
            onRefresh={() => { void refetch(); }}
            emptyState={{
              icon: FileBarChart,
              title: listStatus === 'archived' ? 'No archived reports' : 'No reports yet',
              description: listStatus === 'archived' ? 'Archived reports appear here.' : 'Create a report to get started.',
            }}
            toolbarRight={statusToggle}
            actions={{ items: rowActions }}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmationTarget !== null}
        title={confirmationTarget
          ? <>{confirmationTarget.action === 'unpublish' ? 'Unpublish' : confirmationTarget.action === 'archive' ? 'Archive' : 'Restore'} <HighlightedName>{confirmationTarget.report.title}</HighlightedName>?</>
          : ''}
        message={confirmationTarget?.action === 'unpublish'
          ? <><HighlightedName>{confirmationTarget.report.title}</HighlightedName> will no longer be visible to approved alumni until it is published again.</>
          : confirmationTarget?.action === 'archive'
            ? <><HighlightedName>{confirmationTarget.report.title}</HighlightedName> will be hidden from normal report history and alumni lists. The report and stored file will be retained{confirmationTarget.report.visibility === 'published' ? ', and it will be unpublished' : ''}.</>
            : confirmationTarget
              ? <><HighlightedName>{confirmationTarget.report.title}</HighlightedName> will return to active admin-only report history and remain unpublished until you publish it again.</>
              : ''}
        confirmLabel={confirmationTarget?.action === 'unpublish' ? 'Unpublish' : confirmationTarget?.action === 'archive' ? 'Archive' : 'Restore'}
        variant={confirmationTarget?.action === 'restore' ? 'primary' : 'danger'}
        onConfirm={() => { void confirmLifecycleAction(); }}
        onCancel={() => {
          if (pendingAction === null) {
            setConfirmationTarget(null);
            setFailedAction(null);
            setLifecycleError('');
          }
        }}
        isLoading={pendingAction?.report.id === confirmationTarget?.report.id && pendingAction?.action === confirmationTarget?.action}
        error={failedAction?.report.id === confirmationTarget?.report.id && failedAction?.action === confirmationTarget?.action ? lifecycleError : undefined}
        onRetry={() => { void confirmLifecycleAction(); }}
      />

      <ConfirmDialog
        isOpen={publishTarget !== null}
        title="Publish to alumni?"
        message={publishTarget
          ? <><HighlightedName>{publishTarget.title}</HighlightedName> will be regenerated without contact details and become visible to approved alumni{publishTarget.school ? ` at ${publishTarget.school.name}` : ''}.</>
          : ''}
        confirmLabel="Publish"
        onConfirm={confirmPublish}
        onCancel={() => setPublishTarget(null)}
        isLoading={isPublishing}
        error={publishError}
        onRetry={() => { void confirmPublish(); }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={<>Delete <HighlightedName>{deleteTarget?.title ?? 'report'}</HighlightedName>?</>}
        message={deleteTarget
          ? <><HighlightedName>{deleteTarget.title}</HighlightedName> will be permanently deleted, including its stored report file.</>
          : ''}
        confirmLabel="Delete report"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!isDeletePending) {
            setDeleteTarget(null);
            setFailedAction(null);
            setLifecycleError('');
          }
        }}
        isLoading={isDeletePending}
        error={isDeletePending || (failedAction?.action === 'delete' && failedAction.report.id === deleteTarget?.id) ? lifecycleError : undefined}
        onRetry={() => { void confirmDelete(); }}
      />
    </div>
  );
}
