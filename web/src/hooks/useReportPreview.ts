import { useEffect, useRef, useState } from 'react';
import type { ReportPreview } from '../types/Report';

const PREVIEW_DEBOUNCE_MS = 500;

export function useReportPreview<F>(
  reportType: string,
  filters: F,
  toPayload: (filters: F) => Record<string, unknown>,
  previewReport: (reportType: string, payload: Record<string, unknown>) => Promise<ReportPreview>,
) {
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!reportType) {
      return;
    }

    const seq = ++requestSeq.current;
    setIsLoading(true);

    const handle = setTimeout(() => {
      previewReport(reportType, toPayload(filters))
        .then((data) => {
          if (requestSeq.current !== seq) {
            return;
          }
          setPreview(data);
          setHasError(false);
        })
        .catch(() => {
          if (requestSeq.current !== seq) {
            return;
          }
          setHasError(true);
        })
        .finally(() => {
          if (requestSeq.current !== seq) {
            return;
          }
          setIsLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [reportType, filters, toPayload, previewReport]);

  return { preview, isLoading, hasError };
}
