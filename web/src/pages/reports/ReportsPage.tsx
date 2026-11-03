import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import ReportCreateView from '../../components/reports/ReportCreateView';
import ReportsListView from '../../components/reports/ReportsListView';
import ReportPrintPreview from '../../components/reports/ReportPrintPreview';

import { useAuth } from '../../hooks/useAuth';
import { useReturnTo } from '../../hooks/useReturnTo';

type View = 'create' | 'reports';
const REPORT_VIEWS: View[] = ['create', 'reports'];
const REPORTS_VIEW_PANEL_ID = 'reports-view-panel';

function AdminReportsHub() {
  const { user } = useAuth();
  const { returnLabel, goBack } = useReturnTo();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = user?.role === 'super_admin';

  // History is the safer landing context for an existing report hub; the
  // explicit Create tab remains available for the generation workflow.
  const view: View = searchParams.get('view') === 'create' ? 'create' : 'reports';
  const [justGenerated, setJustGenerated] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(() => {
    const previewParam = searchParams.get('preview');
    return previewParam ? Number(previewParam) : null;
  });
  const tabRefs = useRef<Record<View, HTMLButtonElement | null>>({ create: null, reports: null });

  useEffect(() => {
    const previewParam = searchParams.get('preview');
    setPreviewId(previewParam ? Number(previewParam) : null);
  }, [searchParams]);

  function setView(next: View, replace = false) {
    if (next === 'create') {
      setJustGenerated(false);
    }
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('view', next);
        return params;
      },
      { replace },
    );
  }

  function handleViewKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentView: View) {
    const currentIndex = REPORT_VIEWS.indexOf(currentView);
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % REPORT_VIEWS.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + REPORT_VIEWS.length) % REPORT_VIEWS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = REPORT_VIEWS.length - 1;
        break;
      default:
        return;
    }

    const nextView = REPORT_VIEWS[nextIndex];
    if (!nextView) {
      return;
    }

    event.preventDefault();
    setView(nextView);
    tabRefs.current[nextView]?.focus();
  }

  function handleGenerated(reportId?: number) {
    setJustGenerated(true);
    setGeneratedReportId(reportId ?? null);
    setView('reports', true);
  }

  function openPreview(reportId: number) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('preview', String(reportId));
        return params;
      },
      { replace: true },
    );
  }

  function closePreview() {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete('preview');
        return params;
      },
      { replace: true },
    );
  }

  const isReportsView = view === 'reports';

  return (
    // The Reports list fills the shell height and scrolls its own row body;
    // the Create form keeps the normal page scroll like other forms.
    <div className={isReportsView ? 'flex min-h-0 flex-1 flex-col p-6' : 'p-6'}>
      <div
        className="inline-flex shrink-0 self-start gap-1 rounded-DEFAULT border border-outline-variant/70 bg-surface-container-low p-1"
        role="tablist"
        aria-label="Report views"
      >
        {REPORT_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            id={`reports-view-tab-${v}`}
            role="tab"
            aria-selected={view === v}
            aria-controls={REPORTS_VIEW_PANEL_ID}
            tabIndex={view === v ? 0 : -1}
            ref={(element) => { tabRefs.current[v] = element; }}
            onKeyDown={(event) => handleViewKeyDown(event, v)}
            onClick={() => setView(v)}
            className={`rounded-[calc(var(--radius-DEFAULT)-2px)] px-4 py-1.5 text-label-md font-label-md capitalize transition-all ${view === v ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {v === 'create' ? 'Create' : 'Reports'}
          </button>
        ))}
      </div>

      {isReportsView ? (
        <div
          id={REPORTS_VIEW_PANEL_ID}
          role="tabpanel"
          aria-labelledby="reports-view-tab-reports"
          className="mt-6 flex min-h-0 flex-1 flex-col"
        >
          <ReportsListView
            isSuperAdmin={isSuperAdmin}
            justGenerated={justGenerated}
            generatedReportId={generatedReportId}
            onNewReport={() => setView('create')}
            onPreview={openPreview}
          />
        </div>
      ) : (
        <div
          id={REPORTS_VIEW_PANEL_ID}
          role="tabpanel"
          aria-labelledby="reports-view-tab-create"
          className="mt-6"
        >
          <ReportCreateView isSuperAdmin={isSuperAdmin} onGenerated={handleGenerated} />
        </div>
      )}

      {previewId !== null && (
        <ReportPrintPreview
          reportId={previewId}
          onClose={closePreview}
          onBack={goBack}
          backLabel={returnLabel}
        />
      )}
    </div>
  );
}

function ReportsPage() {
  return <AdminReportsHub />;
}

export default ReportsPage;
