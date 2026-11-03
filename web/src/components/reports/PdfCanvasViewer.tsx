import { useEffect, useRef, useState } from 'react';

import { Spinner } from '../shared/Spinner';

// pdfjs is heavy; load it (and its worker) only when a preview is actually shown.
// Keep the promise module-local so multiple viewers share one worker setup.
type PdfjsModule = typeof import('pdfjs-dist');
let pdfjsLoadPromise: Promise<PdfjsModule> | null = null;

function loadPdfjs() {
  if (!pdfjsLoadPromise) {
    pdfjsLoadPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }

  return pdfjsLoadPromise;
}

interface PdfCanvasViewerProps {
  blob: Blob | null;
  /** Shown while there is no blob yet (e.g. the debounced preview is still building). */
  isLoading?: boolean;
  className?: string;
}

/**
 * Renders a PDF to stacked <canvas> pages in a plain scroll container, instead
 * of an <iframe> — the browser's built-in PDF viewer forces its own toolbar and
 * scrollbar chrome that can't be removed for blob URLs.
 */
export function PdfCanvasViewer({ blob, isLoading = false, className = '' }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') {
      setDownloadUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);

    return () => {
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
      }
    };
  }, [blob]);

  useEffect(() => {
    if (!blob) {
      setStatus('idle');
      return undefined;
    }

    let cancelled = false;
    const container = containerRef.current;
    let destroyLoadingTask: (() => Promise<void>) | undefined;
    let loadingTaskDestroyed = false;

    function destroyLoadingTaskSafely() {
      const destroy = destroyLoadingTask;
      if (loadingTaskDestroyed || !destroy) {
        return;
      }

      loadingTaskDestroyed = true;
      try {
        void destroy().catch(() => {});
      } catch {
        // A task may already have completed or been cancelled by pdfjs.
      }
    }

    setStatus('rendering');

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const data = await blob.arrayBuffer();
        if (cancelled) {
          return;
        }

        const loadingTask = pdfjs.getDocument({ data });
        // Keep the loading task itself so cancellation also tears down a PDF
        // that has not resolved to a document yet.
        destroyLoadingTask = () => loadingTask.destroy();
        if (cancelled) {
          destroyLoadingTaskSafely();
          return;
        }

        const doc = await loadingTask.promise;
        if (cancelled || !container) {
          destroyLoadingTaskSafely();
          return;
        }

        container.replaceChildren();
        const width = container.clientWidth || 800;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Keep one page render in flight at a time. This preserves the eager,
        // print-safe page set while bounding concurrent pdfjs CPU and memory use.
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
          const page = await doc.getPage(pageNumber);
          if (cancelled) {
            return;
          }

          const viewport = page.getViewport({ scale: 1 });
          const scale = (width / viewport.width) * dpr;
          const scaled = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            continue;
          }

          // Each page is a distinct sheet: white with a shadow/hairline and a
          // gap, so multi-page reports read as separate pages, not one strip.
          const sheet = document.createElement('div');
          sheet.className = 'bg-surface-container-lowest';
          sheet.style.lineHeight = '0';
          sheet.style.boxShadow = '0 1px 3px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)';
          if (pageNumber < doc.numPages) {
            sheet.style.marginBottom = '20px';
          }
          sheet.appendChild(canvas);
          container.appendChild(sheet);
          await page.render({ canvasContext: ctx, viewport: scaled }).promise;
        }

        if (!cancelled) {
          setStatus('ready');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      destroyLoadingTaskSafely();
    };
  }, [blob]);

  const busy = isLoading || status === 'rendering';

  return (
    <div className={`relative bg-surface-container-low/40 ${className}`}>
      {downloadUrl && (
        <p className="sr-only">
          This PDF preview is rendered as a canvas. <a href={downloadUrl} download="report.pdf">Download PDF</a> to access the report without the canvas.
        </p>
      )}
      <div ref={containerRef} className="absolute inset-0 overflow-y-auto p-4" aria-hidden="true" />

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-body-md text-error" role="alert">
          <p>Could not render the preview.</p>
          {downloadUrl && (
            <a href={downloadUrl} download="report.pdf" className="font-label-md underline underline-offset-2 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
              Download PDF
            </a>
          )}
        </div>
      )}

      {busy && status !== 'error' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-container-low/40 text-body-md text-on-surface-variant" aria-busy="true">
          <Spinner className="h-5 w-5" />
          Loading report preview
        </div>
      )}
    </div>
  );
}
