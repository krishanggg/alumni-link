import { useEffect, useState } from 'react';
import { CheckCircle2, FileWarning, ListFilter, Sparkles } from 'lucide-react';

import ReportLivePreviewPanel from './ReportLivePreviewPanel';
import { SchoolScopeSelect } from '../shared/SchoolScopeSelect';
import { SelectField } from '../shared/SelectField';
import { TextField } from '../shared/TextField';
import { Button } from '../shared/Button';

import { useReportPreview } from '../../hooks/useReportPreview';
import { useReportPdfPreview } from '../../hooks/useReportPdfPreview';
import { useReportTypes, useReportFilterOptions, useReportMutations } from '../../hooks/useReports';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../hooks/useToast';
import { ReportService } from '../../services/ReportService';
import { ApiError } from '../../services/api';

interface ReportCreateViewProps {
  isSuperAdmin: boolean;
  /** Called after a report is successfully generated, with its id. */
  onGenerated: (reportId?: number) => void;
}

interface Filters {
  graduation_year_from: string;
  graduation_year_to: string;
  section: string;
  gender: string;
  school_id: string;
}

const EMPTY_FILTERS: Filters = {
  graduation_year_from: '',
  graduation_year_to: '',
  section: '',
  gender: '',
  school_id: '',
};

function filtersToPayload(filters: Filters): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (filters.graduation_year_from) {
    payload.graduation_year_from = Number(filters.graduation_year_from);
  }
  if (filters.graduation_year_to) {
    payload.graduation_year_to = Number(filters.graduation_year_to);
  }
  if (filters.section) {
    payload.section = filters.section;
  }
  if (filters.gender) {
    payload.gender = filters.gender;
  }
  if (filters.school_id) {
    payload.school_id = Number(filters.school_id);
  }
  return payload;
}

export default function ReportCreateView({ isSuperAdmin, onGenerated }: ReportCreateViewProps) {
  const { showToast } = useToast();
  const { schoolId: scopedSchoolId } = useScope();
  const [selectedType, setSelectedType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [reportName, setReportName] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [message, setMessage] = useState('');

  const selectedSchoolId = filters.school_id ? Number(filters.school_id) : undefined;

  const { types } = useReportTypes();
  const { filterOptions } = useReportFilterOptions(selectedSchoolId);
  const { generateReport, isGenerating } = useReportMutations();

  const graduationYearOptions = [...(filterOptions?.graduation_years ?? [])].sort((a, b) => a - b).map(String);

  const { preview: livePreview, hasError: hasLivePreviewError } = useReportPreview(
    selectedType,
    filters,
    filtersToPayload,
    ReportService.previewReport,
  );

  const {
    blob: livePreviewBlob,
    isLoading: isLivePreviewPdfLoading,
    hasError: hasLivePreviewPdfError,
    emptyReason: livePreviewEmptyReason,
  } = useReportPdfPreview(
    selectedFormat === 'pdf' ? selectedType : '',
    filters,
    filtersToPayload,
    ReportService.previewReportPdf,
  );

  const defaultReportName = livePreview?.report.report_type === selectedType ? livePreview.report.title : '';
  const isBuildingReportName = Boolean(selectedType) && !defaultReportName && !hasLivePreviewError;

  // Follow the app-wide scope selector (including a reset back to All Schools);
  // the picker below still lets the user target a different school, and a school
  // change invalidates any section chosen from the previous school's list.
  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }
    const nextSchoolId = scopedSchoolId ? String(scopedSchoolId) : '';
    setFilters((current) => (
      current.school_id === nextSchoolId
        ? current
        : { ...current, school_id: nextSchoolId, section: '' }
    ));
  }, [isSuperAdmin, scopedSchoolId]);

  function buildReportNamePlaceholder(): string {
    if (!selectedType) {
      return 'Select a report type first';
    }
    if (isBuildingReportName) {
      return 'Building suggested name';
    }
    return defaultReportName || 'Enter a report name';
  }

  async function handleGenerate() {
    if (!selectedType) {
      return;
    }

    setMessage('');

    try {
      const result = (await generateReport(
        selectedType,
        selectedFormat,
        filtersToPayload(filters),
        reportName.trim() || undefined,
      )) as { report_id?: number };
      setReportName('');
      setMessage('Report generated successfully.');
      showToast('Report generated successfully.');
      onGenerated(result?.report_id);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Failed to generate report.');
    }
  }

  const filterInput = (label: string, key: keyof Filters, options: string[]) => (
    <SelectField
      label={label}
      value={filters[key]}
      onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
    >
      <option value="">All</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </SelectField>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="self-start overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
        <div className="flex items-center gap-3 border-b border-outline-variant/70 bg-surface-container-low/60 px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-info-container to-tone-blue-end text-secondary">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Generate a new report</h2>
            <p className="text-label-sm text-on-surface-variant">Choose a type, format, and optional filters</p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <section aria-labelledby="report-required-heading" className="space-y-4">
            <div>
              <h3 id="report-required-heading" className="text-label-md font-label-md text-on-surface">Required report details</h3>
              <p className="mt-1 text-label-sm text-on-surface-variant">Choose the report type and output format. A custom name is optional.</p>
            </div>
            <TextField
              id="report-name"
              label="Report Name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              maxLength={255}
              disabled={isBuildingReportName}
              placeholder={buildReportNamePlaceholder()}
              placeholderClassName={isBuildingReportName ? 'placeholder:animate-pulse placeholder:text-accent' : undefined}
              hint="Leave blank to use the suggested name built from your selections."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Report Type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">Select a type</option>
                {Object.entries(types).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </SelectField>
              <SelectField label="Format" value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="csv">CSV</option>
              </SelectField>
            </div>
          </section>

          <section aria-labelledby="report-scope-heading" className="space-y-3">
            <div>
              <h3 id="report-scope-heading" className="text-label-md font-label-md text-on-surface">Scope</h3>
              <p className="mt-1 text-label-sm text-on-surface-variant">Choose which school population the report covers.</p>
            </div>
            {isSuperAdmin ? (
              <SchoolScopeSelect
                value={filters.school_id}
                onChange={(schoolId) => setFilters((current) => ({ ...current, school_id: schoolId, section: '' }))}
                label="Report Scope"
                allLabel="All Schools"
              />
            ) : (
              <p className="rounded-DEFAULT border border-outline-variant/70 bg-surface-container-low/50 px-3 py-2 text-body-sm text-on-surface-variant">
                Your report is limited to your assigned school.
              </p>
            )}
          </section>

          <section aria-labelledby="report-filters-heading" className="rounded-md border border-outline-variant/70 bg-surface-container-low/50 p-4">
            <div className="flex items-center gap-2">
              <ListFilter size={16} className="text-on-surface-variant" aria-hidden="true" />
              <div>
                <h3 id="report-filters-heading" className="text-label-md font-label-md text-on-surface">Optional filters</h3>
                <p className="text-label-sm text-on-surface-variant">Narrow the report only when needed.</p>
              </div>
            </div>
            <details className="mt-3 rounded-DEFAULT border border-outline-variant/60 bg-white px-3 py-2">
              <summary className="cursor-pointer text-label-md font-label-md text-on-surface marker:text-accent">
                Show optional filters
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterInput('Grad Year From', 'graduation_year_from', graduationYearOptions)}
                {filterInput('Grad Year To', 'graduation_year_to', graduationYearOptions)}
                {filterInput('Section / Strand', 'section', filterOptions?.sections ?? [])}
                {filterInput('Gender', 'gender', ['male', 'female'])}
              </div>
            </details>
          </section>

          <p className="text-label-sm text-on-surface-variant">
            New reports are visible to admins only. Publish one to alumni from the Reports list when it&apos;s ready to share.
          </p>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedType}
              isLoading={isGenerating}
              loadingText="Generating"
            >
              Generate Report
            </Button>
            {message && (
              <div className={`flex items-center gap-1.5 text-label-md ${message.includes('success') ? 'text-on-success-container' : 'text-error'}`}>
                {message.includes('success') ? <CheckCircle2 size={16} aria-hidden="true" /> : <FileWarning size={16} aria-hidden="true" />}
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportLivePreviewPanel
        selectedType={selectedType}
        format={selectedFormat}
        previewBlob={livePreviewBlob}
        isLoading={isLivePreviewPdfLoading}
        hasError={hasLivePreviewPdfError}
        emptyReason={livePreviewEmptyReason}
      />
    </div>
  );
}
