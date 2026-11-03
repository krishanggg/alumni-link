import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';

import { EmptyState } from '../shared/EmptyState';
import { PdfCanvasViewer } from './PdfCanvasViewer';

import { DEFAULT_ICON_TONE } from '../../lib/toneClasses';

interface ReportLivePreviewPanelProps {
  selectedType: string;
  format: string;
  previewBlob: Blob | null;
  isLoading: boolean;
  hasError: boolean;
  /** Set when the backend reported the report has no matching alumni. */
  emptyReason?: string | null;
}

function centered(children: ReactNode) {
  return <div className="flex h-full items-center justify-center p-6">{children}</div>;
}

function ReportLivePreviewPanel({ selectedType, format, previewBlob, isLoading, hasError, emptyReason }: ReportLivePreviewPanelProps) {
  const showEmpty = Boolean(selectedType) && format === 'pdf' && Boolean(emptyReason);

  return (
    <div className="flex max-h-[calc(100vh-13.5rem)] min-h-[20rem] flex-col overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
      <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/70 bg-surface-container-low/60 px-6 py-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${DEFAULT_ICON_TONE}`}>
          <Eye size={18} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-headline-sm font-headline-sm text-on-surface">Live preview</h2>
          <p className="text-label-sm text-on-surface-variant">The exact PDF this report will produce</p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {!selectedType &&
          centered(
            <EmptyState
              title="Select a report type"
              description="Choose a report type on the left to see a live preview here."
            />,
          )}

        {selectedType &&
          format !== 'pdf' &&
          centered(
            <EmptyState
              title={`No preview for ${format.toUpperCase()}`}
              description="Excel and CSV exports aren't previewed here. They hold the same data in spreadsheet form. Set Format to PDF to preview the layout."
            />,
          )}

        {showEmpty &&
          centered(
            <EmptyState
              title="Nothing to preview yet"
              description={emptyReason ?? undefined}
            />,
          )}

        {!showEmpty && selectedType && format === 'pdf' && hasError && !previewBlob &&
          centered(<p className="text-body-md text-error">Failed to build the preview. Adjust your selections or try again.</p>)}

        {!showEmpty && selectedType && format === 'pdf' && !(hasError && !previewBlob) && (
          <PdfCanvasViewer blob={previewBlob} isLoading={isLoading} className="h-full" />
        )}
      </div>
    </div>
  );
}

export default ReportLivePreviewPanel;
