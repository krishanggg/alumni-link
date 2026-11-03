import { useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';

import type { ReportDetail } from '../../types/Report';

import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { Spinner } from '../shared/Spinner';
import { PdfCanvasViewer } from './PdfCanvasViewer';
import { useReportDetail } from '../../hooks/useReports';
import { ReportService } from '../../services/ReportService';
import { formatReportType } from '../../lib/reportMeta';

interface ReportPrintPreviewProps {
  reportId: number;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
}

const FILTER_LABELS: Record<string, string> = {
  graduation_year_from: 'Grad year from',
  graduation_year_to: 'Grad year to',
  section: 'Section / strand',
  gender: 'Gender',
};

function formatFilterValue(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return String(value);
}

function reportFilterEntries(filters: Record<string, unknown> | null): [string, string][] {
  if (!filters) {
    return [];
  }

  return Object.entries(filters)
    .filter(([key, value]) => key in FILTER_LABELS && value !== null && value !== '')
    .map(([key, value]) => [FILTER_LABELS[key], formatFilterValue(value)]);
}

function ReportDetails({ detail }: { detail: ReportDetail }) {
  const { report, school } = detail;
  const filterEntries = reportFilterEntries(report.filters);

  const rows: [string, string][] = [
    ['Type', formatReportType(report.report_type)],
    ['Format', report.format.toUpperCase()],
    ...(school ? [['School', school.name] as [string, string]] : []),
    ['Generated', new Date(report.created_at).toLocaleString()],
    ...filterEntries,
  ];

  return (
    <div className="mb-4 shrink-0 rounded-DEFAULT border border-outline-variant/70 bg-surface-container-low p-4">
      <p className="text-title-md font-title-md text-on-surface" title={report.title}>{report.title}</p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-body-sm">
            <dt className="text-on-surface-variant">{label}</dt>
            <dd className="text-right font-label-sm text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>
      {report.filters !== null && filterEntries.length === 0 && (
        <p className="mt-2 text-body-sm text-on-surface-variant">No filters applied.</p>
      )}
    </div>
  );
}

function ReportPrintPreview({ reportId, onClose, onBack, backLabel }: ReportPrintPreviewProps) {
  const { report: result, hasError } = useReportDetail(reportId);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobError, setBlobError] = useState(false);
  const isPdf = result?.report.format === 'pdf';

  useEffect(() => {
    if (!isPdf) {
      return undefined;
    }

    let cancelled = false;
    setBlob(null);
    setBlobError(false);
    ReportService.previewReportFile(reportId)
      .then((result) => {
        if (!cancelled) {
          setBlob(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBlobError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportId, isPdf]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Report Preview"
      icon={Eye}
      size="2xl"
      scrollableBody={false}
      headerAccessory={
        <>
          {onBack && (
            <Button variant="secondary" size="sm" onClick={onBack}>
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to {backLabel ?? 'Previous Page'}</span>
            </Button>
          )}
          {/* PDF has no in-body download button, so it keeps the header one;
              other formats download from the body button below. */}
          {isPdf && (
            <Button size="sm" icon={Download} onClick={() => ReportService.downloadReport(reportId)}>
              Download
            </Button>
          )}
        </>
      }
    >
      {(hasError || blobError) && (
        <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          Failed to load the report.
        </div>
      )}

      {!hasError && !blobError && !result && (
        <div className="flex h-[70vh] items-center justify-center gap-2 text-body-md text-on-surface-variant" aria-busy="true">
          <Spinner className="h-5 w-5" />
          Loading report
        </div>
      )}

      {result && <ReportDetails detail={result} />}

      {result && isPdf && !blobError && (
        <PdfCanvasViewer blob={blob} isLoading={!blob} className="min-h-0 flex-1 overflow-hidden rounded-DEFAULT border border-outline-variant/70" />
      )}

      {result && !isPdf && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            In-browser preview is available for PDF reports. This is a{' '}
            <span className="uppercase">{result.report.format}</span> file.
          </p>
          <Button size="sm" icon={Download} onClick={() => ReportService.downloadReport(reportId)}>
            Download {result.report.format.toUpperCase()}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default ReportPrintPreview;
