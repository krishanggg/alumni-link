import { useMemo, useState, useReducer } from 'react';
import {
  UserCheck, AlertTriangle, User as UserIcon,
  GraduationCap, BookOpen, IdCard, Phone, BriefcaseBusiness, Check, X,
} from 'lucide-react';

import type { User } from '../../types/Auth';
import type { BulkAction, ColumnFiltersState } from '../../components/table';
import { EMPLOYMENT_STATUS_OPTIONS, type EmploymentStatus } from '../../types/Alumni';

import { DataTable, createColumnHelper } from '../../components/table';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { TextField } from '../../components/shared/TextField';
import { SelectField } from '../../components/shared/SelectField';
import { TextAreaField } from '../../components/shared/TextAreaField';
import { Button } from '../../components/shared/Button';

import { formatFullName } from '../../utils/formatName';

import { ApprovalService } from '../../services/ApprovalService';
import { toApiFieldErrors } from '../../services/api';

import { usePendingApprovals } from '../../hooks/useUsers';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useScope } from '../../hooks/useScope';

interface Duplicate {
  id: number;
  first_name: string;
  last_name: string;
  graduation_year: number;
  section_strand: string | null;
  student_id: string | null;
}

interface ReviewFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  graduationYear: string;
  sectionStrand: string;
  studentId: string;
  contactNumber: string;
  employmentStatus: EmploymentStatus | '';
  companyName: string;
  positionInCompany: string;
}

type ReviewFormAction =
  | { type: 'SET_FIELD'; field: keyof ReviewFormState; value: string }
  | { type: 'LOAD_FROM_USER'; user: User };

const REVIEW_FORM_API_FIELDS: Record<keyof ReviewFormState, string> = {
  firstName: 'first_name',
  middleName: 'middle_name',
  lastName: 'last_name',
  suffix: 'suffix',
  graduationYear: 'graduation_year',
  sectionStrand: 'section_strand',
  studentId: 'student_id',
  contactNumber: 'contact_number',
  employmentStatus: 'employment_status',
  companyName: 'company_name',
  positionInCompany: 'position_in_company',
};

function reviewFormReducer(state: ReviewFormState, action: ReviewFormAction): ReviewFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'LOAD_FROM_USER': {
      const alumni = action.user.alumni;
      return {
        firstName: alumni?.first_name ?? '',
        middleName: alumni?.middle_name ?? '',
        lastName: alumni?.last_name ?? '',
        suffix: alumni?.suffix ?? '',
        graduationYear: alumni?.graduation_year ? String(alumni.graduation_year) : '',
        sectionStrand: alumni?.section_strand || '',
        studentId: alumni?.student_id || '',
        contactNumber: alumni?.contact_number || '',
        employmentStatus: alumni?.employment_status ?? '',
        companyName: alumni?.company_name || '',
        positionInCompany: alumni?.position_in_company || '',
      };
    }
    default:
      return state;
  }
}

function PendingApprovalsPage() {
  const { pending, isLoading, isFetching, fetchPending } = usePendingApprovals();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const { schoolId: schoolFilter } = useScope();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const columnFilters: ColumnFiltersState = useMemo(
    () => (schoolFilter ? [{ id: 'school', value: schoolFilter }] : []),
    [schoolFilter],
  );

  const [reviewForm, dispatchReviewForm] = useReducer(reviewFormReducer, {
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    graduationYear: '',
    sectionStrand: '',
    studentId: '',
    contactNumber: '',
    employmentStatus: '',
    companyName: '',
    positionInCompany: '',
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [reviewFieldErrors, setReviewFieldErrors] = useState<Record<string, string[]>>({});
  const [rejectError, setRejectError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [linkToExisting, setLinkToExisting] = useState<number | null>(null);
  const [rejectConfirmationTarget, setRejectConfirmationTarget] = useState<User | null>(null);
  const [bulkRejectTarget, setBulkRejectTarget] = useState<User[] | null>(null);
  const [bulkRejectPending, setBulkRejectPending] = useState(false);
  const [bulkRejectError, setBulkRejectError] = useState('');
  const [bulkRejectRefreshOnly, setBulkRejectRefreshOnly] = useState(false);

  async function openReview(user: User) {
    setSelectedUser(user);
    setDuplicates([]);
    setApproveError('');
    setReviewFieldErrors({});
    setRejectError('');
    setShowReject(false);
    setRejectConfirmationTarget(null);
    setBulkRejectTarget(null);
    setBulkRejectError('');
    setBulkRejectRefreshOnly(false);
    setLinkToExisting(null);

    dispatchReviewForm({ type: 'LOAD_FROM_USER', user });

    setReviewLoading(true);

    try {
      const data = await ApprovalService.fetchApprovalDuplicates(user.id);
      setDuplicates(data.duplicates || []);
    } catch {
      // ignore
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedUser) {
      return;
    }

    setActionLoading(true);
    setApproveError('');
    setReviewFieldErrors({});

    try {
      const body: Record<string, unknown> = {};

      if (linkToExisting) {
        body.alumni_id = linkToExisting;
      } else {
        if (!reviewForm.graduationYear.trim()) {
          throw new Error('Graduation year is required to create the alumni record.');
        }
        if ((reviewForm.employmentStatus === 'employed' || reviewForm.employmentStatus === 'self_employed')
          && (!reviewForm.companyName.trim() || !reviewForm.positionInCompany.trim())) {
          throw new Error('Company name and position are required for this employment status.');
        }

        body.create_new = true;
        body.first_name = reviewForm.firstName.trim();
        body.middle_name = reviewForm.middleName.trim() || null;
        body.last_name = reviewForm.lastName.trim();
        body.suffix = reviewForm.suffix.trim() || null;
        body.graduation_year = Number(reviewForm.graduationYear);
        body.section_strand = reviewForm.sectionStrand.trim() || null;
        body.student_id = reviewForm.studentId.trim() || null;
        body.contact_number = reviewForm.contactNumber.trim() || null;
        body.employment_status = reviewForm.employmentStatus || null;
        body.company_name = reviewForm.companyName.trim() || null;
        body.position_in_company = reviewForm.positionInCompany.trim() || null;
      }

      await ApprovalService.approveUser(selectedUser.id, body);

      setSelectedUser(null);
      showToast('Registration approved successfully.');
      fetchPending();
    } catch (err) {
      setReviewFieldErrors(toApiFieldErrors(err) ?? {});
      setApproveError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedUser) {
      return;
    }

    setActionLoading(true);
    setRejectError('');

    try {
      await ApprovalService.rejectUser(selectedUser.id, rejectReason || null);

      setSelectedUser(null);
      setShowReject(false);
      setRejectConfirmationTarget(null);
      setRejectReason('');
      showToast('Registration rejected.');
      fetchPending();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      setRejectError(message);
      showToast(message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // Bulk-approves only the "clean" case: no possible duplicate match and
  // complete submitted data, approved using that submitted data as-is.
  // Anything with a duplicate match or missing required fields is skipped
  // here — those still need a human decision in the per-row Review modal,
  // since duplicate-matching is a deliberate review gate, not a formality.
  async function handleBulkApprove(selectedRows: User[]) {
    let approved = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of selectedRows) {
      const alumni = row.alumni;
      const firstName = alumni?.first_name ?? '';
      const lastName = alumni?.last_name ?? '';

      if (!alumni?.graduation_year || !firstName.trim() || !lastName.trim()) {
        skipped++;
        continue;
      }

      try {
        const { duplicates } = await ApprovalService.fetchApprovalDuplicates(row.id);
        if (duplicates.length > 0) {
          skipped++;
          continue;
        }

        await ApprovalService.approveUser(row.id, {
          create_new: true,
          first_name: firstName,
          middle_name: alumni.middle_name || null,
          last_name: lastName,
          suffix: alumni.suffix || null,
          graduation_year: alumni.graduation_year,
          section_strand: alumni.section_strand || null,
          student_id: alumni.student_id || null,
          contact_number: alumni.contact_number || null,
        });
        approved++;
      } catch {
        failed++;
      }
    }

    await fetchPending();

    const parts: string[] = [];
    if (approved > 0) {
      parts.push(`${approved} approved`);
    }
    if (skipped > 0) {
      parts.push(`${skipped} need manual review (duplicate match or missing details)`);
    }
    if (failed > 0) {
      parts.push(`${failed} failed`);
    }
    showToast(parts.length > 0 ? parts.join(', ') + '.' : 'No registrations were approved.');
  }

  async function openBulkRejectConfirmation(selectedRows: User[]) {
    if (bulkRejectPending) {
      return;
    }

    setBulkRejectError('');
    setBulkRejectRefreshOnly(false);
    setBulkRejectTarget(selectedRows);
  }

  function updateReviewField(field: keyof ReviewFormState, value: string) {
    dispatchReviewForm({ type: 'SET_FIELD', field, value });
    const apiField = REVIEW_FORM_API_FIELDS[field];
    setReviewFieldErrors((previous) => {
      if (!(apiField in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[apiField];
      return next;
    });
  }

  async function retryBulkRejectRefresh() {
    setBulkRejectPending(true);
    setBulkRejectError('');

    try {
      await fetchPending();
      setBulkRejectTarget(null);
      setBulkRejectRefreshOnly(false);
      showToast('Pending registrations refreshed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh pending registrations.';
      setBulkRejectError(message);
      showToast(message, 'error');
    } finally {
      setBulkRejectPending(false);
    }
  }

  async function confirmBulkReject() {
    if (!bulkRejectTarget) {
      return;
    }

    const targetRows = bulkRejectTarget;
    setBulkRejectPending(true);
    setBulkRejectError('');
    let rejected = 0;
    let failed = 0;
    const failedRows: User[] = [];

    for (const row of targetRows) {
      try {
        await ApprovalService.rejectUser(row.id, null);
        rejected++;
      } catch {
        failed++;
        failedRows.push(row);
      }
    }

    try {
      await fetchPending();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh pending registrations.';
      setBulkRejectError(message);
      setBulkRejectRefreshOnly(true);
      showToast(message, 'error');
      setBulkRejectPending(false);
      return;
    }

    if (failed > 0) {
      const message = `${failed} registration${failed === 1 ? '' : 's'} could not be rejected. Retry to try the failed record${failed === 1 ? '' : 's'} again.`;
      setBulkRejectTarget(failedRows);
      setBulkRejectError(message);
      setBulkRejectRefreshOnly(false);
      showToast(message, 'error');
    } else {
      showToast(`${rejected} registration${rejected === 1 ? '' : 's'} rejected.`);
      setBulkRejectTarget(null);
      setBulkRejectRefreshOnly(false);
    }

    setBulkRejectPending(false);
  }

  const chApproval = createColumnHelper<User>();

  const columns = [
    chApproval.accessor('name', { header: 'Name' }),
    chApproval.accessor('email', { header: 'Email' }),
    ...(isSuperAdmin
      ? [chApproval.accessor((row) => row.school?.id ?? null, {
          id: 'school',
          header: 'School',
          filterFn: 'equals',
          cell: ({ row }) => row.original.school?.name ?? '—',
        })]
      : []),
    chApproval.accessor('created_at', {
      header: 'Submitted',
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
  ];

  const bulkActions: BulkAction<User>[] = [
    { label: 'Approve as Submitted', icon: Check, action: handleBulkApprove },
    { label: 'Bulk Reject', variant: 'danger', icon: X, action: openBulkRejectConfirmation },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
      <DataTable
        paginated
        fillHeight
        id={isSuperAdmin ? 'pending-approvals-super-admin-table' : 'pending-approvals-school-admin-table'}
        columns={columns}
        data={pending?.data ?? []}
        getRowId={(row) => String(row.id)}
        isLoading={isLoading}
        isFetching={isFetching}
        columnFilters={columnFilters}
        bulkActions={bulkActions}
        columnVisibility
        appearance="flat"
        toolbarLayout="stacked"
        emptyState={{ icon: UserCheck, title: 'No pending approvals', description: 'New alumni registrations will appear here for review.' }}
        searchPlaceholder="Search by name or email"
        searchAriaLabel="Search pending approvals"
        actions={{
          render: (user) => (
            <Button variant="ghost" size="sm" onClick={() => openReview(user)}>
              Review
            </Button>
          ),
        }}
      />

      <Modal
        isOpen={!!selectedUser}
        onClose={() => { setSelectedUser(null); setShowReject(false); setRejectConfirmationTarget(null); }}
        title="Review Registration"
        icon={UserCheck}
        tone="blue"
        size="xl"
      >
        {reviewLoading ? (
          <p className="text-body-md text-on-surface-variant">Loading</p>
        ) : selectedUser ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <SectionHeader icon={UserIcon} label="Applicant Details" tone="blue" />
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 pl-9 text-body-md sm:grid-cols-[max-content_1fr] [&_dd]:min-w-0 [&_dd]:break-words">
                <dt className="text-on-surface-variant">Name:</dt>
                <dd className="text-on-surface">
                  {selectedUser.alumni ? formatFullName(selectedUser.alumni) : '—'}
                </dd>
                <dt className="text-on-surface-variant">Email:</dt>
                <dd className="text-on-surface">{selectedUser.email}</dd>
                <dt className="text-on-surface-variant">Username:</dt>
                <dd className="text-on-surface">{selectedUser.username}</dd>
                <dt className="text-on-surface-variant">School:</dt>
                <dd className="text-on-surface">
                  {selectedUser.alumni?.school?.name ?? selectedUser.school?.name ?? '—'}
                </dd>
                <dt className="text-on-surface-variant">School ID:</dt>
                <dd className="text-on-surface">
                  {selectedUser.alumni?.school?.id ?? selectedUser.school?.id ?? selectedUser.school_id ?? '—'}
                </dd>
                <dt className="text-on-surface-variant">Graduation Year:</dt>
                <dd className="text-on-surface">{selectedUser.alumni?.graduation_year ?? '—'}</dd>
                <dt className="text-on-surface-variant">Section/Strand:</dt>
                <dd className="text-on-surface">{selectedUser.alumni?.section_strand || '—'}</dd>
                <dt className="text-on-surface-variant">Student ID:</dt>
                <dd className="text-on-surface">{selectedUser.alumni?.student_id || '—'}</dd>
                <dt className="text-on-surface-variant">Gender:</dt>
                <dd className="text-on-surface capitalize">{selectedUser.alumni?.gender || '—'}</dd>
                <dt className="text-on-surface-variant">Birthdate:</dt>
                <dd className="text-on-surface">
                  {selectedUser.alumni?.birthdate ? new Date(selectedUser.alumni.birthdate).toLocaleDateString() : '—'}
                </dd>
                <dt className="text-on-surface-variant">Address:</dt>
                <dd className="text-on-surface">{selectedUser.alumni?.address || '—'}</dd>
                <dt className="text-on-surface-variant">Contact Number:</dt>
                <dd className="text-on-surface">{selectedUser.alumni?.contact_number || '—'}</dd>
                <dt className="text-on-surface-variant">Employment Status:</dt>
                <dd className="text-on-surface">
                  {EMPLOYMENT_STATUS_OPTIONS.find(({ value }) => value === selectedUser.alumni?.employment_status)?.label ?? '—'}
                </dd>
                {(selectedUser.alumni?.employment_status === 'employed' || selectedUser.alumni?.employment_status === 'self_employed') && (
                  <>
                    <dt className="text-on-surface-variant">Company Name:</dt>
                    <dd className="text-on-surface">{selectedUser.alumni.company_name || '—'}</dd>
                    <dt className="text-on-surface-variant">Position In Company:</dt>
                    <dd className="text-on-surface">{selectedUser.alumni.position_in_company || '—'}</dd>
                  </>
                )}
                <dt className="text-on-surface-variant">Submitted:</dt>
                <dd className="text-on-surface">{new Date(selectedUser.created_at).toLocaleDateString()}</dd>
              </dl>
            </div>

            {duplicates.length > 0 && (
              <div className="space-y-3 border-t border-outline-variant/60 pt-5">
                <SectionHeader icon={AlertTriangle} label="Possible Duplicate Matches" tone="amber" />
                <div className="pl-9">
                  <p className="text-body-md text-on-surface-variant">These existing alumni records may match this applicant:</p>
                  <ul className="mt-2 space-y-2">
                    {duplicates.map((d) => (
                      <li key={d.id} className="flex items-center justify-between rounded-DEFAULT border border-warning-container bg-warning-container/40 p-2.5">
                        <span className="text-body-md text-on-surface">
                          {formatFullName(d)} — Batch {d.graduation_year} {d.section_strand ? `(${d.section_strand})` : ''}
                          {d.student_id ? ` — ID: ${d.student_id}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLinkToExisting(linkToExisting === d.id ? null : d.id)}
                          className={`shrink-0 rounded-DEFAULT px-2.5 py-1 text-label-sm font-label-sm transition-colors ${linkToExisting === d.id ? 'bg-accent text-on-primary' : 'bg-white text-accent hover:bg-accent/10'}`}
                        >
                          {linkToExisting === d.id ? 'Selected' : 'Link to this'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {showReject ? (
              <div className="space-y-3 border-t border-outline-variant/60 pt-5">
                <TextAreaField
                  id="reject-reason"
                  label="Rejection Reason (optional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
                {rejectError && (
                  <p className="text-label-sm text-error" role="alert">{rejectError}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowReject(false)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger-solid"
                    size="sm"
                    onClick={() => setRejectConfirmationTarget(selectedUser)}
                    disabled={actionLoading}
                  >
                    Confirm Reject
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {!linkToExisting && (
                  <div className="space-y-3 border-t border-outline-variant/60 pt-5">
                    <SectionHeader icon={GraduationCap} label="New Alumni Record" tone="purple" />
                    <p className="pl-9 text-body-md text-on-surface-variant">
                      Review and correct the applicant&apos;s submitted details before creating their alumni record.
                    </p>
                    <div className="grid grid-cols-1 gap-3 pl-9 sm:grid-cols-2">
                      <TextField
                        id="review-first-name"
                        label="First Name *"
                        icon={UserIcon}
                        type="text"
                        value={reviewForm.firstName}
                        onChange={(e) => updateReviewField('firstName', e.target.value)}
                        error={reviewFieldErrors.first_name?.[0]}
                      />
                      <TextField
                        id="review-middle-name"
                        label="Middle Name"
                        icon={UserIcon}
                        type="text"
                        value={reviewForm.middleName}
                        onChange={(e) => updateReviewField('middleName', e.target.value)}
                        error={reviewFieldErrors.middle_name?.[0]}
                      />
                      <TextField
                        id="review-last-name"
                        label="Last Name *"
                        icon={UserIcon}
                        type="text"
                        value={reviewForm.lastName}
                        onChange={(e) => updateReviewField('lastName', e.target.value)}
                        error={reviewFieldErrors.last_name?.[0]}
                      />
                      <TextField
                        id="review-suffix"
                        label="Suffix"
                        icon={UserIcon}
                        type="text"
                        value={reviewForm.suffix}
                        onChange={(e) => updateReviewField('suffix', e.target.value)}
                        error={reviewFieldErrors.suffix?.[0]}
                      />
                      <TextField
                        id="review-graduation-year"
                        label="Graduation Year *"
                        icon={GraduationCap}
                        type="number"
                        value={reviewForm.graduationYear}
                        onChange={(e) => updateReviewField('graduationYear', e.target.value)}
                        error={reviewFieldErrors.graduation_year?.[0]}
                      />
                      <TextField
                        id="review-section-strand"
                        label="Section/Strand"
                        icon={BookOpen}
                        type="text"
                        value={reviewForm.sectionStrand}
                        onChange={(e) => updateReviewField('sectionStrand', e.target.value)}
                        error={reviewFieldErrors.section_strand?.[0]}
                      />
                      <TextField
                        id="review-student-id"
                        label="Student ID"
                        icon={IdCard}
                        type="text"
                        value={reviewForm.studentId}
                        onChange={(e) => updateReviewField('studentId', e.target.value)}
                        error={reviewFieldErrors.student_id?.[0]}
                      />
                      <TextField
                        id="review-contact-number"
                        label="Contact Number"
                        icon={Phone}
                        type="text"
                        value={reviewForm.contactNumber}
                        onChange={(e) => updateReviewField('contactNumber', e.target.value)}
                        error={reviewFieldErrors.contact_number?.[0]}
                      />
                      <SelectField
                        id="review-employment-status"
                        label="Employment Status"
                        value={reviewForm.employmentStatus}
                        onChange={(event) => {
                          const nextStatus = EMPLOYMENT_STATUS_OPTIONS.find(({ value }) => value === event.target.value)?.value ?? '';
                          updateReviewField('employmentStatus', nextStatus);
                          if (nextStatus !== 'employed' && nextStatus !== 'self_employed') {
                            updateReviewField('companyName', '');
                            updateReviewField('positionInCompany', '');
                          }
                        }}
                        error={reviewFieldErrors.employment_status?.[0]}
                      >
                        <option value="">Select employment status</option>
                        {EMPLOYMENT_STATUS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </SelectField>
                      {(reviewForm.employmentStatus === 'employed' || reviewForm.employmentStatus === 'self_employed') && (
                        <>
                          <TextField
                            id="review-company-name"
                            label="Company Name *"
                            icon={BriefcaseBusiness}
                            type="text"
                            value={reviewForm.companyName}
                            onChange={(event) => updateReviewField('companyName', event.target.value)}
                            required
                            error={reviewFieldErrors.company_name?.[0]}
                          />
                          <TextField
                            id="review-position-in-company"
                            label="Position In Company *"
                            icon={BriefcaseBusiness}
                            type="text"
                            value={reviewForm.positionInCompany}
                            onChange={(event) => updateReviewField('positionInCompany', event.target.value)}
                            required
                            error={reviewFieldErrors.position_in_company?.[0]}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
                {approveError && (
                  <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
                    {approveError}
                  </div>
                )}
                <div className="flex gap-2 border-t border-outline-variant/60 pt-5">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading || (!linkToExisting && (!reviewForm.firstName.trim() || !reviewForm.lastName.trim() || !reviewForm.graduationYear.trim()))}
                    isLoading={actionLoading}
                    loadingText="Processing"
                  >
                    {linkToExisting ? 'Approve & Link' : 'Approve & Create Record'}
                  </Button>
                  <Button variant="danger" onClick={() => setShowReject(true)} disabled={actionLoading}>
                    Reject
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={rejectConfirmationTarget !== null}
        title={<>Reject <HighlightedName>{rejectConfirmationTarget?.name ?? 'this registration'}</HighlightedName>?</>}
        message="The applicant will be notified that the registration was not approved and can edit and resubmit their registration details."
        confirmLabel="Reject registration"
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => {
          if (!actionLoading) {
            setRejectConfirmationTarget(null);
            setRejectError('');
          }
        }}
        isLoading={actionLoading}
        error={rejectError}
        onRetry={handleReject}
      />

      <ConfirmDialog
        isOpen={bulkRejectTarget !== null}
        title={bulkRejectRefreshOnly
          ? 'Refresh pending registrations?'
          : `Reject ${bulkRejectTarget?.length ?? 0} pending registration${bulkRejectTarget?.length === 1 ? '' : 's'}?`}
        message={bulkRejectRefreshOnly
          ? 'The rejection requests completed, but the pending list could not be refreshed. Retry the refresh to verify the current state.'
          : 'Each selected applicant will be marked rejected and notified. They can edit and resubmit their registration details after reviewing the rejection.'}
        confirmLabel={bulkRejectRefreshOnly ? 'Refresh list' : 'Reject registrations'}
        variant="danger"
        onConfirm={() => { void (bulkRejectRefreshOnly ? retryBulkRejectRefresh() : confirmBulkReject()); }}
        onCancel={() => {
          if (!bulkRejectPending) {
            setBulkRejectTarget(null);
            setBulkRejectError('');
            setBulkRejectRefreshOnly(false);
          }
        }}
        isLoading={bulkRejectPending}
        error={bulkRejectError}
        onRetry={() => { void (bulkRejectRefreshOnly ? retryBulkRejectRefresh() : confirmBulkReject()); }}
      />
    </div>
  );
}

export default PendingApprovalsPage;
