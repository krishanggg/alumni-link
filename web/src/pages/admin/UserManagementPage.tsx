import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Users2, UserCheck, ShieldCheck, User as UserIcon, UserPlus, Link2, UserX, Pencil, Trash2, Shield, CircleDot } from 'lucide-react';

import type { UserListItem, UserFormInput } from '../../types/Auth';
import type { BulkAction, ColumnFiltersState } from '../../components/table';

import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { DataTable, createColumnHelper } from '../../components/table';
import { UserStatusBadge } from '../../components/users/UserStatusBadge';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Modal } from '../../components/shared/Modal';
import { SelectField } from '../../components/shared/SelectField';
import { Spinner } from '../../components/shared/Spinner';
import { Button } from '../../components/shared/Button';

// Interaction-only surfaces (behind closed modals) and the shared stat-card
// chunk are split out so they don't sit in this route's critical download path —
// it's the heaviest admin route otherwise.
const StatCard = lazy(() => import('../../components/shared/StatCard').then((m) => ({ default: m.StatCard })));
const UserForm = lazy(() => import('../../components/users/UserForm').then((m) => ({ default: m.UserForm })));
const UserAlumniLinker = lazy(() => import('../../components/users/UserAlumniLinker').then((m) => ({ default: m.UserAlumniLinker })));

const MODAL_FALLBACK = (
  <div className="flex justify-center py-12 text-on-surface-variant">
    <Spinner className="h-6 w-6" />
  </div>
);

function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { schoolId: schoolFilter } = useScope();
  const { showToast } = useToast();
  const {
    users, isLoading, isFetching, error,
    createUser, updateUser, toggleStatus, toggleStatusSilent, deleteUser, linkAlumni, unlinkAlumni,
    resetPassword, isResettingPassword, setPassword, isSettingPassword, fetchUsers,
  } = useUsers();

  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [linkedFilter, setLinkedFilter] = useState('');

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const next: ColumnFiltersState = [];
    if (roleFilter) {
      next.push({ id: 'role', value: roleFilter });
    }
    if (statusFilter) {
      next.push({ id: 'is_active', value: statusFilter });
    }
    if (accountStatusFilter) {
      next.push({ id: 'account_status', value: accountStatusFilter });
    }
    if (linkedFilter) {
      next.push({ id: 'alumni_link', value: linkedFilter });
    }
    if (schoolFilter) {
      next.push({ id: 'school', value: schoolFilter });
    }
    return next;
  }, [roleFilter, statusFilter, accountStatusFilter, linkedFilter, schoolFilter]);

  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const onFilteredRowsChange = useCallback((rows: UserListItem[]) => setFilteredUsers(rows), []);

  const stats = useMemo(() => ({
    total: filteredUsers.length,
    active: filteredUsers.filter((u) => u.is_active).length,
    admins: filteredUsers.filter((u) => u.role === 'super_admin' || u.role === 'school_admin').length,
    alumni: filteredUsers.filter((u) => u.role === 'alumni').length,
  }), [filteredUsers]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [formError, setFormError] = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [linkingUserId, setLinkingUserId] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: number; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<UserListItem | null>(null);
  const [bulkDeactivateTarget, setBulkDeactivateTarget] = useState<UserListItem[] | null>(null);
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivateNeedsReconciliation, setDeactivateNeedsReconciliation] = useState(false);
  const [activateTarget, setActivateTarget] = useState<UserListItem | null>(null);
  const [activateError, setActivateError] = useState('');
  const [activateNeedsReconciliation, setActivateNeedsReconciliation] = useState(false);
  const [bulkDeactivateError, setBulkDeactivateError] = useState('');
  const [bulkDeactivateRefreshOnly, setBulkDeactivateRefreshOnly] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ kind: 'activate' | 'deactivate' | 'bulk-deactivate' | 'delete'; id?: number } | null>(null);

  function openCreate() {
    setEditingUser(null);
    setIsFormOpen(true);
    setFormError('');
    setFormFieldErrors({});
  }

  function openEdit(u: UserListItem) {
    setEditingUser(u);
    setIsFormOpen(true);
    setFormError('');
    setFormFieldErrors({});
  }

  async function handleSave(data: UserFormInput) {
    setIsSubmitting(true);
    setFormError('');
    setFormFieldErrors({});

    try {
      if (editingUser) {
        await updateUser(editingUser.id, data);
        showToast('User updated successfully.');
      } else {
        const newUser = await createUser(data);
        if (data.alumni_id) {
          try {
            await linkAlumni(newUser.id, data.alumni_id);
          } catch {
            showToast('User created, but linking the alumni record failed. Link it from the Users list.');
            setIsFormOpen(false);
            return;
          }
        }
        showToast('User created successfully.');
      }
      setIsFormOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const errors = (err.data as { errors?: Record<string, string[]> })?.errors;
        setFormFieldErrors(errors || {});
        setFormError('Please correct the errors below.');
      } else {
        setFormError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLink(alumniId: number) {
    if (!linkingUserId) {
      return;
    }

    await linkAlumni(linkingUserId, alumniId);
    showToast('Alumni record linked successfully.');
  }

  async function handleDelete() {
    if (!deletingUser) {
      return;
    }

    const target = deletingUser;
    setPendingAction({ kind: 'delete', id: target.id });
    setDeleteError('');

    try {
      await deleteUser(target.id);
      setDeletingUser(null);
      showToast(`User “${target.name}” deleted. The linked alumni record was preserved.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setDeleteError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function refreshUserStatus(id: number) {
    const refreshed = await fetchUsers();
    const current = refreshed?.data?.find((user) => user.id === id);
    if (!current) {
      throw new Error('The user status could not be verified.');
    }

    return current;
  }

  function handleToggleStatus(u: UserListItem) {
    if (u.is_active) {
      setDeactivateTarget(u);
      setDeactivateError('');
      setDeactivateNeedsReconciliation(false);
      return;
    }

    setActivateTarget(u);
    setActivateError('');
    setActivateNeedsReconciliation(false);
  }

  async function handleDeactivate() {
    const target = deactivateTarget;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'deactivate', id: target.id });
    setDeactivateError('');

    try {
      await toggleStatus(target.id);
      setDeactivateTarget(null);
      setDeactivateNeedsReconciliation(false);
      showToast(`User “${target.name}” deactivated.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate user.';
      setDeactivateNeedsReconciliation(true);

      try {
        const current = await refreshUserStatus(target.id);
        if (!current.is_active) {
          setDeactivateTarget(null);
          setDeactivateNeedsReconciliation(false);
          setDeactivateError('');
          showToast(`User “${target.name}” was already deactivated.`);
          return;
        }

        setDeactivateError(`${message} The user list was refreshed. Review the current status before trying again.`);
      } catch {
        setDeactivateError(`${message} The user list could not be refreshed. Retry to check the current status before trying again.`);
      }
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleActivate() {
    const target = activateTarget;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'activate', id: target.id });
    setActivateError('');

    try {
      await toggleStatus(target.id);
      setActivateTarget(null);
      setActivateNeedsReconciliation(false);
      showToast(`User “${target.name}” activated.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate user.';
      setActivateNeedsReconciliation(true);

      try {
        const current = await refreshUserStatus(target.id);
        if (current.is_active) {
          setActivateTarget(null);
          setActivateNeedsReconciliation(false);
          setActivateError('');
          showToast(`User “${target.name}” was already active.`);
          return;
        }

        setActivateError(`${message} The user list was refreshed. Review the current status before trying again.`);
      } catch {
        setActivateError(`${message} The user list could not be refreshed. Retry to check the current status before trying again.`);
      }
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function reconcileDeactivate() {
    const target = deactivateTarget;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'deactivate', id: target.id });
    setDeactivateError('');

    try {
      const current = await refreshUserStatus(target.id);
      setDeactivateTarget(null);
      setDeactivateNeedsReconciliation(false);
      if (current.is_active) {
        showToast(`Status checked. “${target.name}” is still active. Choose Deactivate again to reissue the request.`);
      } else {
        showToast(`User “${target.name}” was already deactivated.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh user status.';
      setDeactivateError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function reconcileActivate() {
    const target = activateTarget;
    if (!target) {
      return;
    }

    setPendingAction({ kind: 'activate', id: target.id });
    setActivateError('');

    try {
      const current = await refreshUserStatus(target.id);
      setActivateTarget(null);
      setActivateNeedsReconciliation(false);
      if (current.is_active) {
        showToast(`User “${target.name}” was already active.`);
      } else {
        showToast(`Status checked. “${target.name}” is still inactive. Choose Activate again to reissue the request.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh user status.';
      setActivateError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function openBulkDeactivate(selectedRows: UserListItem[]) {
    const skippedSelf = selectedRows.filter((u) => u.id === currentUser?.id).length;
    const alreadyInactive = selectedRows.filter((u) => !u.is_active && u.id !== currentUser?.id).length;
    const activeRows = selectedRows.filter((u) => u.is_active && u.id !== currentUser?.id);

    if (activeRows.length === 0) {
      showToast(skippedSelf > 0 || alreadyInactive > 0 ? 'No active users selected. No changes made.' : 'No changes made.');
      return;
    }

    setBulkDeactivateTarget(activeRows);
    setBulkDeactivateRefreshOnly(false);
    setBulkDeactivateError('');
  }

  async function retryBulkDeactivateRefresh() {
    setPendingAction({ kind: 'bulk-deactivate' });
    setBulkDeactivateError('');

    try {
      const refreshed = await fetchUsers();
      const targets = bulkDeactivateTarget ?? [];
      const stillActive = targets.filter((target) => refreshed?.data?.find((user) => user.id === target.id)?.is_active ?? true).length;
      setBulkDeactivateTarget(null);
      setBulkDeactivateRefreshOnly(false);
      if (stillActive > 0) {
        showToast(`User list refreshed. ${stillActive} account${stillActive === 1 ? '' : 's'} remain active. Select them and choose Bulk Deactivate again.`);
      } else {
        showToast('User list refreshed. The selected accounts are inactive.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh the user list.';
      setBulkDeactivateError(message);
      showToast(message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBulkDeactivate() {
    if (!bulkDeactivateTarget) {
      return;
    }

    const targets = bulkDeactivateTarget;
    setPendingAction({ kind: 'bulk-deactivate' });
    setBulkDeactivateError('');
    let deactivated = 0;
    const failedRows: UserListItem[] = [];

    for (const u of targets) {
      try {
        await toggleStatusSilent(u.id);
        deactivated++;
      } catch {
        failedRows.push(u);
      }
    }

    let refreshError = '';
    let refreshed: Awaited<ReturnType<typeof fetchUsers>> | undefined;
    try {
      refreshed = await fetchUsers();
    } catch (err) {
      refreshError = err instanceof Error ? err.message : 'Failed to refresh the user list.';
    }

    const unresolvedFailedRows = refreshError || !refreshed
      ? failedRows
      : failedRows.filter((row) => refreshed?.data?.find((user) => user.id === row.id)?.is_active ?? true);
    const reconciledDeactivations = failedRows.length - unresolvedFailedRows.length;
    const totalDeactivated = deactivated + reconciledDeactivations;

    if (unresolvedFailedRows.length > 0) {
      const progress = totalDeactivated > 0 ? `${totalDeactivated} deactivated. ` : '';
      const message = refreshError
        ? `${progress}${unresolvedFailedRows.length} account${unresolvedFailedRows.length === 1 ? '' : 's'} could not be confirmed because the user list could not be refreshed. Retry the refresh before issuing another request.`
        : `${progress}${unresolvedFailedRows.length} account${unresolvedFailedRows.length === 1 ? '' : 's'} still require review. The user list was refreshed. Retry the refresh to verify them, then choose Bulk Deactivate again for accounts that remain active.`;
      setBulkDeactivateTarget(unresolvedFailedRows);
      setBulkDeactivateRefreshOnly(true);
      setBulkDeactivateError(message);
      showToast(message, 'error');
    } else if (refreshError) {
      const message = `${refreshError} Retry the refresh to verify the user statuses before issuing another request.`;
      setBulkDeactivateTarget(targets);
      setBulkDeactivateRefreshOnly(true);
      setBulkDeactivateError(message);
      showToast(message, 'error');
    } else {
      setBulkDeactivateTarget(null);
      setBulkDeactivateRefreshOnly(false);
      showToast(totalDeactivated > 0 ? `${totalDeactivated} deactivated` : 'No changes made.');
    }

    setPendingAction(null);
  }

  const linkingUser = users?.data?.find((u) => u.id === linkingUserId);

  const chUser = createColumnHelper<UserListItem>();

  const columns = [
    chUser.accessor((row) => `${row.name} ${row.username}`, {
      id: 'name',
      header: 'Name',
      enableSorting: true,
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
      cell: ({ row }) => row.original.name,
    }),
    chUser.accessor('email', {
      header: 'Email',
      enableSorting: true,
      cell: ({ getValue }) => <span className="text-on-surface-variant">{getValue()}</span>,
    }),
    chUser.accessor('role', {
      header: 'Role',
      enableSorting: true,
      filterFn: 'equals',
      cell: ({ getValue }) => (getValue() ? <StatusBadge status={getValue()!} /> : <span className="text-on-surface-variant">—</span>),
    }),
    chUser.accessor((row) => row.school?.id ?? null, {
      id: 'school',
      header: 'School',
      filterFn: 'equals',
      cell: ({ row }) => row.original.school?.name ?? '—',
    }),
    chUser.accessor('account_status', {
      header: 'Account Status',
      filterFn: 'equals',
      cell: ({ getValue }) => <StatusBadge status={getValue()} withIcon />,
    }),
    chUser.accessor('is_active', {
      header: 'Status',
      filterFn: (row, columnId, filterValue: string) => {
        const isActive = row.getValue<boolean>(columnId);
        return filterValue === 'active' ? isActive : !isActive;
      },
      cell: ({ getValue }) => <UserStatusBadge isActive={getValue()} />,
    }),
    chUser.accessor((row) => (row.alumni_id ? 'linked' : 'unlinked'), {
      id: 'alumni_link',
      header: 'Alumni Link',
      filterFn: 'equals',
      cell: ({ row }) => <span className="text-on-surface-variant">{row.original.alumni_id ? 'Linked' : '—'}</span>,
    }),
    chUser.accessor('last_login_at', {
      header: 'Last Login',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-on-surface-variant">
          {getValue() ? new Date(getValue()!).toLocaleDateString() : '—'}
        </span>
      ),
    }),
  ];

  const bulkActions: BulkAction<UserListItem>[] = [
    { label: 'Bulk Deactivate', variant: 'danger', icon: UserX, action: openBulkDeactivate },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
      {error && (
        <div className="mb-4 shrink-0 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {error}
        </div>
      )}

      <Suspense fallback={<div className="mb-4 grid min-h-[5.5rem] shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true" />}>
        <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/*
            These counts cover the whole filtered set, so the descriptions must not
            claim system-wide scope — only the first card states the scope, and the
            rest describe which users are being counted.
          */}
          <StatCard appearance="flat" label="Total Users" value={stats.total} description="Matching current filters" icon={Users2} tone="blue" isLoading={isLoading} />
          <StatCard appearance="flat" label="Active Users" value={stats.active} description="Currently active" icon={UserCheck} tone="green" isLoading={isLoading} />
          <StatCard appearance="flat" label="Admins" value={stats.admins} description="Super and school admins" icon={ShieldCheck} tone="amber" isLoading={isLoading} />
          <StatCard appearance="flat" label="Alumni Users" value={stats.alumni} description="Standard users" icon={UserIcon} tone="purple" isLoading={isLoading} />
        </div>
      </Suspense>

      <div className="flex min-h-0 flex-1 flex-col">
        <DataTable
          paginated
          fillHeight
          id="user-management-super-admin-table"
          columns={columns}
          data={users?.data ?? []}
          getRowId={(row) => String(row.id)}
          isLoading={isLoading}
          isFetching={isFetching}
          columnFilters={columnFilters}
          onFilteredRowsChange={onFilteredRowsChange}
          emptyState={{ icon: Users2, title: 'No users found', description: 'Try adjusting your search or filters.' }}
          columnVisibility
          initialSort={[{ id: 'name', desc: false }]}
          searchPlaceholder="Search by name, email, or username"
          searchAriaLabel="Search users"
          appearance="flat"
          toolbarLayout="stacked"
          onRefresh={() => { void fetchUsers(); }}
          toolbar={
            <>
              <SelectField
                label="Filter by role"
                hideLabel
                icon={Shield}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                appearance="command"
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="school_admin">School Admin</option>
                <option value="alumni">Alumni</option>
              </SelectField>
              <SelectField
                label="Filter by status"
                hideLabel
                icon={CircleDot}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                appearance="command"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>
              <SelectField
                label="Filter by account status"
                hideLabel
                icon={UserCheck}
                value={accountStatusFilter}
                onChange={(e) => setAccountStatusFilter(e.target.value)}
                appearance="command"
              >
                <option value="">Account Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </SelectField>
              <SelectField
                label="Filter by link status"
                hideLabel
                icon={Link2}
                value={linkedFilter}
                onChange={(e) => setLinkedFilter(e.target.value)}
                appearance="command"
              >
                <option value="">All Link Statuses</option>
                <option value="linked">Linked</option>
                <option value="unlinked">Not Linked</option>
              </SelectField>
            </>
          }
          toolbarRight={
            <>
              <Button icon={UserPlus} onClick={openCreate}>
                Add New User
              </Button>
            </>
          }
          bulkActions={bulkActions}
          actions={{
            items: (u) => [
              { label: 'Edit', onClick: () => openEdit(u), icon: Pencil },
              { label: u.alumni_id ? 'Manage Alumni Link' : 'Link Alumni', onClick: () => setLinkingUserId(u.id), icon: Link2 },
              {
                label: u.is_active ? 'Deactivate' : 'Activate',
                onClick: () => handleToggleStatus(u),
                disabled: u.id === currentUser?.id,
                title: u.id === currentUser?.id ? 'You cannot deactivate your own account.' : undefined,
                icon: u.is_active ? UserX : UserCheck,
              },
              {
                label: 'Delete',
                onClick: () => { setDeleteError(''); setDeletingUser({ id: u.id, name: u.name }); },
                disabled: u.id === currentUser?.id,
                title: u.id === currentUser?.id ? 'You cannot delete your own account.' : undefined,
                variant: 'danger' as const,
                icon: Trash2,
              },
            ],
            getLabel: (u) => `Actions for ${u.name}`,
          }}
        />
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
        icon={editingUser ? UserIcon : UserPlus}
        tone={editingUser ? 'blue' : 'green'}
        size="xl"
      >
        <Suspense fallback={MODAL_FALLBACK}>
          <UserForm
            initialData={editingUser ?? {}}
            onSubmit={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isSubmitting}
            error={formError}
            fieldErrors={formFieldErrors}
            onResetPassword={editingUser ? () => resetPassword(editingUser.id) : undefined}
            isResettingPassword={isResettingPassword}
            onSetPassword={editingUser && editingUser.id !== currentUser?.id ? (pw, notify) => setPassword(editingUser.id, pw, notify) : undefined}
            isSettingPassword={isSettingPassword}
          />
        </Suspense>
      </Modal>

      <Modal
        isOpen={linkingUserId !== null}
        onClose={() => setLinkingUserId(null)}
        title={linkingUser?.alumni_id ? 'Manage Alumni Link' : 'Link Alumni Record'}
        icon={Link2}
        tone="purple"
        size="lg"
      >
        {linkingUserId !== null && linkingUser && (
          <Suspense fallback={MODAL_FALLBACK}>
            <UserAlumniLinker
              targetUserName={linkingUser.name}
              targetUserEmail={linkingUser.email}
              targetUserRole={linkingUser.role}
              targetAccountStatus={linkingUser.account_status}
              currentAlumni={linkingUser.alumni}
              onLink={handleLink}
              onUnlink={async () => { await unlinkAlumni(linkingUserId); }}
            />
          </Suspense>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingUser}
        title={<>Delete <HighlightedName>{deletingUser?.name ?? 'user'}</HighlightedName>?</>}
        message={deletingUser
          ? <>Deleting <HighlightedName>{deletingUser.name}</HighlightedName> permanently removes the user account from active user management and unlinks it from the alumni record. The alumni record itself will be preserved.</>
          : ''}
        confirmLabel="Delete user"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setDeletingUser(null); setDeleteError(''); }}
        error={deleteError}
        onRetry={handleDelete}
        isLoading={pendingAction?.kind === 'delete' && pendingAction.id === deletingUser?.id}
        requireTypedConfirmation="DELETE"
      />

      <ConfirmDialog
        isOpen={deactivateTarget !== null}
        title={<>Deactivate <HighlightedName>{deactivateTarget?.name ?? 'user'}</HighlightedName>?</>}
        message={deactivateTarget
          ? <><HighlightedName>{deactivateTarget.name}</HighlightedName> will become inactive and cannot log in. The user account and any linked alumni record will be preserved.</>
          : ''}
        confirmLabel="Deactivate user"
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => {
          if (pendingAction?.kind !== 'deactivate') {
            setDeactivateTarget(null);
            setDeactivateError('');
            setDeactivateNeedsReconciliation(false);
          }
        }}
        isLoading={pendingAction?.kind === 'deactivate' && pendingAction.id === deactivateTarget?.id}
        error={deactivateError}
        onRetry={reconcileDeactivate}
        confirmDisabled={deactivateNeedsReconciliation}
      />

      <ConfirmDialog
        isOpen={activateTarget !== null}
        title={<>Activate <HighlightedName>{activateTarget?.name ?? 'user'}</HighlightedName>?</>}
        message={activateTarget
          ? <><HighlightedName>{activateTarget.name}</HighlightedName> will become active and can sign in again. The user account and any linked alumni record will be preserved.</>
          : ''}
        confirmLabel="Activate user"
        variant="primary"
        onConfirm={handleActivate}
        onCancel={() => {
          if (pendingAction?.kind !== 'activate') {
            setActivateTarget(null);
            setActivateError('');
            setActivateNeedsReconciliation(false);
          }
        }}
        isLoading={pendingAction?.kind === 'activate' && pendingAction.id === activateTarget?.id}
        error={activateError}
        onRetry={reconcileActivate}
        confirmDisabled={activateNeedsReconciliation}
      />

      <ConfirmDialog
        isOpen={bulkDeactivateTarget !== null}
        title={bulkDeactivateRefreshOnly
          ? 'Refresh user statuses?'
          : `Deactivate ${bulkDeactivateTarget?.length ?? 0} user account${bulkDeactivateTarget?.length === 1 ? '' : 's'}?`}
        message={bulkDeactivateRefreshOnly
          ? 'The previous status requests may have completed, but the current statuses need to be verified before another request is issued. Refresh the user list to reconcile them.'
          : `These ${bulkDeactivateTarget?.length ?? 0} account${bulkDeactivateTarget?.length === 1 ? '' : 's'} will become inactive and cannot log in. Their user data and any linked alumni records will be preserved.`}
        confirmLabel={bulkDeactivateRefreshOnly ? 'Refresh list' : 'Deactivate accounts'}
        variant="danger"
        onConfirm={bulkDeactivateRefreshOnly ? retryBulkDeactivateRefresh : handleBulkDeactivate}
        onCancel={() => {
          if (pendingAction?.kind !== 'bulk-deactivate') {
            setBulkDeactivateTarget(null);
            setBulkDeactivateRefreshOnly(false);
            setBulkDeactivateError('');
          }
        }}
        isLoading={pendingAction?.kind === 'bulk-deactivate'}
        error={bulkDeactivateError}
        onRetry={bulkDeactivateRefreshOnly ? retryBulkDeactivateRefresh : handleBulkDeactivate}
      />
    </div>
  );
}

export default UserManagementPage;
