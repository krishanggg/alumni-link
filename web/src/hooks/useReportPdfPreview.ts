import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../services/api';

// Longer than the JSON preview's debounce: each call renders a full PDF
// (dompdf + chart images) server-side, so we wait for typing to settle.
const PREVIEW_DEBOUNCE_MS = 700;

/**
 * Fetches the server-rendered PDF for the current report selections and exposes
 * it as a Blob for the canvas viewer. Ignores out-of-order responses, mirroring
 * `useReportPreview`.
 */
export function useReportPdfPreview<F>(
  reportType: string,
  filters: F,
  toPayload: (filters: F) => Record<string, unknown>,
  previewPdf: (reportType: string, payload: Record<string, unknown>) => Promise<Blob>,
) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!reportType) {
      return undefined;
    }

    const seq = ++requestSeq.current;
    setIsLoading(true);

    const handle = setTimeout(() => {
      previewPdf(reportType, toPayload(filters))
        .then((result) => {
          if (requestSeq.current === seq) {
            setBlob(result);
            setHasError(false);
            setEmptyReason(null);
          }
        })
        .catch((error: unknown) => {
          if (requestSeq.current !== seq) {
            return;
          }
          if (error instanceof ApiError && error.status === 422) {
            setEmptyReason(error.message);
            setHasError(false);
            setBlob(null);
            return;
          }
          setHasError(true);
          setEmptyReason(null);
        })
        .finally(() => {
          if (requestSeq.current === seq) {
            setIsLoading(false);
          }
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [reportType, filters, toPayload, previewPdf]);

  return { blob, isLoading, hasError, emptyReason };
}
