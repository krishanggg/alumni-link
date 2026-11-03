import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Users, BookOpen, UsersRound } from 'lucide-react';

import type { BatchAlumniItem, BatchAlumniAdminItem } from '../../hooks/useBatches';
import type { ColumnDef, ColumnFiltersState } from '../../components/table';

import { BatchStatsBar } from '../../components/batches/BatchStatsBar';
import { BatchStatisticsChart } from '../../components/batches/BatchStatisticsChart';
import { BatchNotesEditor } from '../../components/batches/BatchNotesEditor';
import { DataTable, createColumnHelper } from '../../components/table';
import { Button } from '../../components/shared/Button';
import { SelectField } from '../../components/shared/SelectField';

import { BatchService } from '../../services/BatchService';

import { useBatchDetail } from '../../hooks/useBatches';
import { useAuth } from '../../hooks/useAuth';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../hooks/useToast';
import { useReturnTo, useReturnState } from '../../hooks/useReturnTo';
import { formatLastFirstName } from '../../utils/formatName';

function BatchDetailPage() {
  const { year } = useParams<{ year: string }>();
  const { user } = useAuth();
  const { schoolId } = useScope();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { returnTo, returnLabel } = useReturnTo();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [section, setSection] = useState('');
  const [gender, setGender] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'school_admin';
  const returnState = useReturnState('Batch Detail');
  const batchYear = parseInt(year ?? '0', 10);

  const { detail: alumniData, stats, isLoading, isFetching, error } = useBatchDetail(batchYear, schoolId);
  const sectionOptions = Object.keys(stats?.sections ?? {});

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const next: ColumnFiltersState = [];
    if (section) {
      next.push({ id: 'section_strand', value: section });
    }
    if (gender) {
      next.push({ id: 'gender', value: gender });
    }
    return next;
  }, [section, gender]);

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      const result = await BatchService.exportBatch(batchYear, schoolId);
      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : 'Could not export this batch. Please try again.';
      setExportError(message);
      showToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  }

  const chBatch = createColumnHelper<BatchAlumniItem>();

  const columns: ColumnDef<BatchAlumniItem>[] = [
    chBatch.accessor((row) => formatLastFirstName(row), {
      id: 'name',
      header: 'Name',
      cell: ({ row, getValue }) => (isAdmin ? (
        <Link to={`/alumni?view=${row.original.id}`} state={returnState} className="text-accent hover:text-accent-hover">
          {getValue()}
        </Link>
      ) : getValue()),
    }),
    chBatch.accessor('section_strand', {
      header: 'Section',
      filterFn: 'equals',
      cell: ({ getValue }) => getValue() ?? '\u2014',
    }),
  ];

  if (isAdmin) {
    columns.push(
      chBatch.accessor((row) => (row as BatchAlumniAdminItem).gender, {
        id: 'gender',
        header: 'Gender',
        filterFn: 'equals',
        cell: ({ getValue }) => {
          const g = getValue();

          return g ? g.charAt(0).toUpperCase() + g.slice(1) : '\u2014';
        },
      }),
      chBatch.display({
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => (row.original as BatchAlumniAdminItem).contact_number ?? '\u2014',
      }),
    );

    if (isSuperAdmin && !schoolId) {
      columns.push(
        chBatch.display({
          id: 'school',
          header: 'School',
          cell: ({ row }) => (row.original as BatchAlumniAdminItem).school?.name ?? '\u2014',
        }),
      );
    }
  }


  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(returnTo ?? '/batches')}
          className="group flex w-fit items-center gap-1.5 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-label-md text-secondary transition-colors hover:border-outline hover:bg-surface-container hover:text-accent-hover"
        >
          <ArrowLeft
            size={15}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Back to {returnTo ? (returnLabel ?? 'Previous Page') : 'Batches'}
        </button>

        {isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={() => { void handleExport(); }}
            isLoading={isExporting}
            loadingText="Exporting"
          >
            Export Batch Report
          </Button>
        )}
      </div>

      {exportError && (
        <div className="mb-4 flex shrink-0 items-center gap-3 rounded-DEFAULT border border-error-container bg-error-container/50 px-4 py-3 text-body-md text-on-error-container" role="alert">
          <span className="flex-1">{exportError}</span>
          <Button size="sm" variant="danger" onClick={() => { void handleExport(); }} disabled={isExporting}>
            Retry
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {error}
        </div>
      )}

      {stats && (
        <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <BatchStatsBar total={stats.total} registrationProgress={stats.registration_progress} profileCompleteness={stats.profile_completeness} />
          <BatchStatisticsChart gender={stats.gender} sections={stats.sections} />
        </div>
      )}

      {isSuperAdmin && (
        <div className="mt-6">
          {schoolId ? (
            <BatchNotesEditor year={batchYear} schoolId={schoolId} />
          ) : (
            <p className="rounded-DEFAULT border border-outline-variant bg-surface-container-low p-4 text-body-md text-on-surface-variant">
              Batch notes are kept per school. Pick a school in the scope selector to view or edit its notes for the class of {batchYear}.
            </p>
          )}
        </div>
      )}
      {isAdmin && !isSuperAdmin && (
        <div className="mt-6">
          <BatchNotesEditor year={batchYear} schoolId={schoolId} />
        </div>
      )}

      <div className="mt-6">
        <DataTable
          paginated
          id={isSuperAdmin ? 'batch-detail-super-admin-table' : isAdmin ? 'batch-detail-school-admin-table' : 'batch-detail-table'}
          columns={columns}
          data={alumniData?.data ?? []}
          getRowId={(row) => String(row.id)}
          isLoading={isLoading}
          isFetching={isFetching}
          columnFilters={columnFilters}
          columnVisibility
          appearance="flat"
          toolbarLayout="stacked"
          emptyState={{ icon: Users, title: section || gender ? 'No alumni match those filters' : 'No alumni in this batch', description: section || gender ? 'Adjust or clear the filters to see more.' : 'Alumni in this batch will appear here.' }}
          searchPlaceholder="Search by name"
          searchAriaLabel="Search this batch by name"
          toolbar={
            <>
              <SelectField label="Section" hideLabel icon={BookOpen} value={section} onChange={(e) => setSection(e.target.value)} containerClassName="w-44 shrink-0" appearance="command">
                <option value="">All sections</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </SelectField>
              {isAdmin && (
                <SelectField label="Gender" hideLabel icon={UsersRound} value={gender} onChange={(e) => setGender(e.target.value)} containerClassName="w-40 shrink-0" appearance="command">
                  <option value="">All genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </SelectField>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}

export default BatchDetailPage;
