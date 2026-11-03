import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseBackup, History, Download, Trash2 } from 'lucide-react';

import type { BackupItem } from '../../types/Profile';

import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { SelectField } from '../../components/shared/SelectField';
import { Button } from '../../components/shared/Button';
import { DataTable, createColumnHelper } from '../../components/table';

import { BackupService } from '../../services/BackupService';
import { useToast } from '../../hooks/useToast';

const RESTORE_FAILURE_MESSAGE = 'Restore failed. Stop using the system and contact support before retrying.';

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  return (bytes / 1048576).toFixed(1) + ' MB';
}

const chBackup = createColumnHelper<BackupItem>();

const backupColumns = [
  chBackup.accessor('filename', { header: 'File Name' }),
  chBackup.accessor('created_at', {
    header: 'Date Created',
    cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
  }),
  chBackup.accessor('file_size', {
    header: 'Size',
    cell: ({ getValue }) => formatSize(getValue()),
  }),
];

export default function BackupRestorePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);
  const [restoringBackup, setRestoringBackup] = useState<BackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await BackupService.listBackups();
      setBackups(data.backups);
      setSelectedBackupId((current) => current ?? data.backups[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const result = await BackupService.createBackup();
      setBackups((prev) => [result.backup, ...prev]);
      setSelectedBackupId((current) => current ?? result.backup.id);
      setSuccess('Backup created successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setIsCreating(false);
    }
  }

  function openDeleteModal(backup: BackupItem) {
    setDeleteTarget(backup);
    setDeleteError('');
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    const id = deleteTarget.id;
    setDeletingId(id);
    setDeleteError('');

    try {
      await BackupService.deleteBackup(id);
      setBackups((prev) => prev.filter((b) => b.id !== id));
      setDeleteTarget(null);
      setSuccess('Backup deleted.');
      showToast('Backup deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete backup';
      setDeleteError(message);
      showToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function handleDownload(id: number) {
    BackupService.downloadBackup(id);
  }

  function openRestoreModal() {
    const backup = backups.find((b) => b.id === selectedBackupId);
    if (!backup) {
      return;
    }
    setRestoringBackup(backup);
    setRestoreError('');
  }

  async function handleRestore() {
    if (!restoringBackup) {
      return;
    }

    setIsRestoring(true);
    setRestoreError('');

    try {
      const result = await BackupService.restoreBackup(restoringBackup.id);

      if (result.redirect) {
        showToast(result.message);
        navigate(result.redirect, { replace: true });
      } else {
        setRestoringBackup(null);
        setSuccess(result.message);
        showToast(result.message);
      }
    } catch {
      setRestoreError(RESTORE_FAILURE_MESSAGE);
      showToast(RESTORE_FAILURE_MESSAGE, 'error');
    } finally {
      setIsRestoring(false);
    }
  }

  const lastBackup = backups[0];

  return (
    <SettingsLayout disableNav={isRestoring}>
      {isRestoring && (
        <div className="fixed inset-0 z-40 bg-black/10" aria-hidden="true" />
      )}

      <div className="space-y-6">
        {error && (
          <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-DEFAULT bg-success-container p-3 text-body-md text-on-success-container" role="status">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-6">
            <div className="flex items-center gap-2">
              <DatabaseBackup size={18} className="text-on-surface-variant" aria-hidden="true" />
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Database Backup</h2>
            </div>

            <div className="mt-4">
              <p className="text-label-md font-label-md text-on-surface">Last Backup</p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {lastBackup ? new Date(lastBackup.created_at).toLocaleString() : 'No backups yet'}
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating}
              icon={DatabaseBackup}
              isLoading={isCreating}
              loadingText="Creating"
              className="mt-4"
            >
              Create Backup
            </Button>
          </section>

          <section className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-6">
            <div className="flex items-center gap-2">
              <History size={18} className="text-on-surface-variant" aria-hidden="true" />
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Restore Database</h2>
            </div>

            {backups.length === 0 ? (
              <p className="mt-4 text-body-md text-on-surface-variant">Create a backup first to enable restore.</p>
            ) : (
              <>
                <SelectField
                  id="restoreSelect"
                  label="Select Backup"
                  containerClassName="mt-4"
                  value={selectedBackupId ?? ''}
                  onChange={(e) => setSelectedBackupId(Number(e.target.value))}
                  hint="Only backups generated by this system can be restored."
                >
                  {backups.map((backup) => (
                    <option key={backup.id} value={backup.id}>
                      {backup.filename} &middot; {new Date(backup.created_at).toLocaleString()}
                    </option>
                  ))}
                </SelectField>

                <Button variant="ghost" onClick={openRestoreModal} disabled={!selectedBackupId} className="mt-4 border border-accent">
                  Restore Backup
                </Button>
              </>
            )}
          </section>
        </div>

        <DataTable
          id="backup-list-super-admin"
          title="Recent Backups"
          columns={backupColumns}
          data={backups}
          getRowId={(row) => String(row.id)}
          isLoading={isLoading}
          emptyState={{ icon: DatabaseBackup, title: 'No backups created yet', description: 'Create your first backup above.' }}
          columnVisibility
          appearance="flat"
          toolbarLayout="stacked"
          actions={{
            render: (backup) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(backup.id)}
                  aria-label={`Download ${backup.filename}`}
                  className="tap-target rounded-DEFAULT border border-accent/40 p-1.5 text-accent transition-colors hover:bg-accent/10"
                >
                  <Download size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteModal(backup)}
                  disabled={deletingId === backup.id}
                  aria-label={`Delete ${backup.filename}`}
                  className="tap-target rounded-DEFAULT border border-error/40 p-1.5 text-error transition-colors hover:bg-error-container disabled:opacity-50"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ),
          }}
        />

      </div>

      <ConfirmDialog
        isOpen={restoringBackup !== null}
        title={<>Restore <HighlightedName>{restoringBackup?.filename ?? 'backup'}</HighlightedName>?</>}
        message={restoringBackup
          ? <>Restoring <HighlightedName>{restoringBackup.filename}</HighlightedName> will overwrite the current database and cannot be undone. All sessions, remembered devices, and password-reset tokens will be invalidated, so you will need to sign in again.</>
          : ''}
        confirmLabel="Restore backup"
        variant="danger"
        onConfirm={handleRestore}
        onCancel={() => {
          if (!isRestoring) {
            setRestoringBackup(null);
            setRestoreError('');
          }
        }}
        isLoading={isRestoring}
        error={restoreError}
        onRetry={handleRestore}
        requireTypedConfirmation="RESTORE"
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={<>Delete <HighlightedName>{deleteTarget?.filename ?? 'backup'}</HighlightedName>?</>}
        message={deleteTarget
          ? <>Deleting <HighlightedName>{deleteTarget.filename}</HighlightedName> permanently removes the backup file and its database record. It cannot be restored.</>
          : ''}
        confirmLabel="Delete backup"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          if (deletingId === null) {
            setDeleteTarget(null);
            setDeleteError('');
          }
        }}
        isLoading={deletingId === deleteTarget?.id}
        error={deleteError}
        onRetry={handleDelete}
        requireTypedConfirmation="DELETE"
      />
    </SettingsLayout>
  );
}
