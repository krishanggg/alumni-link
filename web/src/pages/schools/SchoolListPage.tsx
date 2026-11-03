import { useState } from 'react';
import { Plus, ImageUp, School as SchoolIcon, Pencil, Trash2, Ban, CircleCheck } from 'lucide-react';

import type { School } from '../../types/Auth';

import { DataTable, createColumnHelper } from '../../components/table';
import { SchoolStatusBadge } from '../../components/schools/SchoolStatusBadge';
import { SchoolFormModal } from '../../components/schools/SchoolFormModal';
import { SchoolLogoUpload } from '../../components/schools/SchoolLogoUpload';
import { SchoolLogoCell } from '../../components/schools/SchoolLogoCell';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { Button } from '../../components/shared/Button';

import { useSchools } from '../../hooks/useSchools';
import { useToast } from '../../hooks/useToast';

function SchoolListPage() {
  const { schools, isLoading, error, createSchool, updateSchool, toggleStatus, deleteSchool, uploadLogo, fetchSchools } = useSchools();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | undefined>(undefined);
  const [deletingSchool, setDeletingSchool] = useState<School | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deactivatingSchool, setDeactivatingSchool] = useState<School | null>(null);
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivateNeedsReconciliation, setDeactivateNeedsReconciliation] = useState(false);
  const [activatingSchool, setActivatingSchool] = useState<School | null>(null);
  const [activateError, setActivateError] = useState('');
  const [activateNeedsReconciliation, setActivateNeedsReconciliation] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ kind: 'activate' | 'deactivate' | 'delete'; id: number } | null>(null);
  const [logoUploadSchoolId, setLogoUploadSchoolId] = useState<number | null>(null);

  function handleAdd() {
    setEditingSchool(undefined);
    setIsFormOpen(true);
  }

  function handleEdit(school: School) {
    setEditingSchool(school);
    setIsFormOpen(true);
  }

  async function handleSave(data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }) {
    if (editingSchool) {
      await updateSchool(editingSchool.id, data);
      showToast('School updated successfully.');
    } else {
      await createSchool(data);
      showToast('School created successfully.');
    }
  }

  async function handleLogoUpload(file: File) {
    if (logoUploadSchoolId === null) {
      return;
    }

    await uploadLogo(logoUploadSchoolId, file);
    setLogoUploadSchoolId(null);
    showToast('Logo uploaded successfully.');
  }

  async function handleDeactivate() {
    const target = deactivatingSchool;
    if (!target) {
      return;
    }

    const id = target.id;
    setPendingAction({ kind: 'deactivate', id });
    setDeactivateError('');

    try {
      await toggleStatus(id);
      setDeactivatingSchool(null);
      setDeactivateNeedsReconciliation(false);
      showToast('School deactivated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate school';
      setDeactivateNeedsReconciliation(true);

      try {
        const refreshed = await fetchSchools();
        const current = refreshed.data.find((school) => school.id === id);
        if (!current) {
          setDeactivateError(`${message} The school status could not be verified. Retry to check the current status before trying again.`);
        } else if (!current.is_active) {
          setDeactivatingSchool(null);
          setDeactivateNeedsReconciliation(false);
          setDeactivateError('');
          showToast(`School “${target.name}” was already deactivated.`);
          return;
        } else {
          setDeactivateError(`${message} The school list was refreshed. Review the current status before trying again.`);
        }
      } catch {
        setDeactivateError(`${message} The school list could not be refreshed. Retry to check the current status before trying again.`);
      }
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleActivate() {
    const target = activatingSchool;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'activate', id: target.id });
    setActivateError('');

    try {
      await toggleStatus(target.id);
      setActivatingSchool(null);
      setActivateNeedsReconciliation(false);
      showToast('School activated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate school';
      setActivateNeedsReconciliation(true);

      try {
        const refreshed = await fetchSchools();
        const current = refreshed.data.find((candidate) => candidate.id === target.id);
        if (!current) {
          setActivateError(`${message} The school status could not be verified. Retry to check the current status before trying again.`);
        } else if (current.is_active) {
          setActivatingSchool(null);
          setActivateNeedsReconciliation(false);
          setActivateError('');
          showToast(`School “${target.name}” was already active.`);
          return;
        } else {
          setActivateError(`${message} The school list was refreshed. Review the current status before trying again.`);
        }
      } catch {
        setActivateError(`${message} The school list could not be refreshed. Retry to check the current status before trying again.`);
      }
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function reconcileDeactivate() {
    const target = deactivatingSchool;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'deactivate', id: target.id });
    setDeactivateError('');

    try {
      const refreshed = await fetchSchools();
      const current = refreshed.data.find((school) => school.id === target.id);
      if (!current) {
        const message = 'The school status could not be verified.';
        setDeactivateError(message);
        showToast(message, 'error');
        return;
      }

      setDeactivatingSchool(null);
      setDeactivateNeedsReconciliation(false);
      if (current.is_active) {
        showToast(`Status checked. “${target.name}” is still active. Choose Deactivate again to reissue the request.`);
      } else {
        showToast(`School “${target.name}” was already deactivated.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh school status.';
      setDeactivateError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function reconcileActivate() {
    const target = activatingSchool;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'activate', id: target.id });
    setActivateError('');

    try {
      const refreshed = await fetchSchools();
      const current = refreshed.data.find((school) => school.id === target.id);
      if (!current) {
        const message = 'The school status could not be verified.';
        setActivateError(message);
        showToast(message, 'error');
        return;
      }

      setActivatingSchool(null);
      setActivateNeedsReconciliation(false);
      if (current.is_active) {
        showToast(`School “${target.name}” was already active.`);
      } else {
        showToast(`Status checked. “${target.name}” is still inactive. Choose Activate again to reissue the request.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh school status.';
      setActivateError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    if (!deletingSchool) {
      return;
    }

    setDeleteError('');
    setPendingAction({ kind: 'delete', id: deletingSchool.id });

    try {
      await deleteSchool(deletingSchool.id);
      setDeletingSchool(null);
      showToast('School deleted successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete school';
      setDeleteError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  const ch = createColumnHelper<School>();

  const columns = [
    ch.display({
      id: 'logo',
      header: 'Logo',
      meta: { width: '5%' },
      cell: ({ row }) => (
        <SchoolLogoCell
          schoolName={row.original.name}
          logoUrl={row.original.logo_url}
          onClick={() => setLogoUploadSchoolId(row.original.id)}
        />
      ),
    }),
    ch.accessor('name', {
      header: 'Name',
      meta: { width: '22%' },
      cell: ({ getValue }) => (
        <span className="block truncate" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),
    ch.accessor('address', {
      header: 'Address',
      meta: { width: '15%' },
      cell: ({ getValue }) => (
        <span className="block truncate" title={getValue() || undefined}>
          {getValue() || '—'}
        </span>
      ),
    }),
    ch.accessor('contact_number', {
      header: 'Contact Number',
      meta: { width: '10%' },
      cell: ({ getValue }) => (
        <span className="block truncate" title={getValue() || undefined}>
          {getValue() || '—'}
        </span>
      ),
    }),
    ch.accessor('email', {
      header: 'Email',
      meta: { width: '14%' },
      cell: ({ getValue }) => (
        <span className="block truncate" title={getValue() || undefined}>
          {getValue() || '—'}
        </span>
      ),
    }),
    ch.accessor('website', {
      header: 'Website',
      meta: { width: '13%' },
      cell: ({ getValue }) => {
        const website = getValue();
        return website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="block truncate text-accent hover:text-accent-hover" title={website}>
            {website}
          </a>
        ) : (
          '—'
        );
      },
    }),
    ch.display({
      id: 'status',
      header: 'Status',
      meta: { width: '7%' },
      cell: ({ row }) => <SchoolStatusBadge isActive={row.original.is_active} />,
    }),
    ch.display({
      id: 'created',
      header: 'Created',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="block truncate" title={new Date(row.original.created_at).toLocaleDateString()}>
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    }),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      {error && (
        <div className="mb-4 shrink-0 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {error}
        </div>
      )}

      <DataTable
        paginated
        fillHeight
        id="school-list-super-admin-table"
        columns={columns}
        data={schools}
        getRowId={(row) => String(row.id)}
        isLoading={isLoading}
        emptyState={{ icon: SchoolIcon, title: 'No schools registered yet', description: 'Add a school to get started.' }}
        columnVisibility
        appearance="flat"
        toolbarLayout="stacked"
        searchPlaceholder="Search schools"
        searchAriaLabel="Search schools"
        toolbarRight={
          <Button icon={Plus} onClick={handleAdd}>
            Add School
          </Button>
        }
        actions={{
          items: (school) => [
            { label: 'Edit', onClick: () => handleEdit(school), icon: Pencil },
            {
              label: school.is_active ? 'Deactivate' : 'Activate',
              onClick: () => {
                if (school.is_active) {
                  setDeactivateError('');
                  setDeactivateNeedsReconciliation(false);
                  setDeactivatingSchool(school);
                } else {
                  setActivateError('');
                  setActivateNeedsReconciliation(false);
                  setActivatingSchool(school);
                }
              },
              disabled: pendingAction !== null,
              icon: school.is_active ? Ban : CircleCheck,
            },
            { label: 'Delete', onClick: () => { setDeleteError(''); setDeletingSchool(school); }, disabled: pendingAction !== null, variant: 'danger', icon: Trash2 },
          ],
          getLabel: (school) => `Actions for ${school.name}`,
        }}
      />

      <Modal
        isOpen={logoUploadSchoolId !== null}
        onClose={() => setLogoUploadSchoolId(null)}
        title="Upload Logo"
        icon={ImageUp}
        tone="blue"
        size="sm"
      >
        <SchoolLogoUpload
          currentLogoUrl={schools.find((s) => s.id === logoUploadSchoolId)?.logo_url ?? null}
          onUpload={handleLogoUpload}
        />
      </Modal>

      <SchoolFormModal
        school={editingSchool}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={!!deactivatingSchool}
        title={<>Deactivate <HighlightedName>{deactivatingSchool?.name ?? 'school'}</HighlightedName>?</>}
        message={deactivatingSchool
          ? <><HighlightedName>{deactivatingSchool.name}</HighlightedName> will be removed from the registration dropdown. Existing alumni will retain their school affiliation and access.</>
          : ''}
        confirmLabel="Deactivate school"
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => { setDeactivatingSchool(null); setDeactivateError(''); setDeactivateNeedsReconciliation(false); }}
        isLoading={pendingAction?.kind === 'deactivate' && pendingAction.id === deactivatingSchool?.id}
        error={deactivateError}
        onRetry={reconcileDeactivate}
        confirmDisabled={deactivateNeedsReconciliation}
      />

      <ConfirmDialog
        isOpen={!!activatingSchool}
        title={<>Activate <HighlightedName>{activatingSchool?.name ?? 'school'}</HighlightedName>?</>}
        message={activatingSchool
          ? <><HighlightedName>{activatingSchool.name}</HighlightedName> will be returned to the active school list and made available for normal school-scoped use.</>
          : ''}
        confirmLabel="Activate school"
        variant="primary"
        onConfirm={handleActivate}
        onCancel={() => { setActivatingSchool(null); setActivateError(''); setActivateNeedsReconciliation(false); }}
        isLoading={pendingAction?.kind === 'activate' && pendingAction.id === activatingSchool?.id}
        error={activateError}
        onRetry={reconcileActivate}
        confirmDisabled={activateNeedsReconciliation}
      />

      <ConfirmDialog
        isOpen={!!deletingSchool}
        title={<>Delete <HighlightedName>{deletingSchool?.name ?? 'school'}</HighlightedName>?</>}
        message={deletingSchool
          ? <><HighlightedName>{deletingSchool.name}</HighlightedName> will be permanently deleted. Active alumni assignments, batch notes, and feedback conversations block deletion. Archived alumni assignments do not, but archived conversations still count. Deactivate the school instead if linked records remain.</>
          : ''}
        confirmLabel="Delete school"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setDeletingSchool(null); setDeleteError(''); }}
        isLoading={pendingAction?.kind === 'delete' && pendingAction.id === deletingSchool?.id}
        error={deleteError}
        onRetry={handleDelete}
        requireTypedConfirmation="DELETE"
      />
    </div>
  );
}

export default SchoolListPage;
