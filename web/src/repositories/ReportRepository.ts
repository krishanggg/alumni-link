import { request } from '../services/api';
import type { ReportRecord, ReportDetail, ReportPreview, ReportListStatus } from '../types/Report';

function base64ToPdfBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

export const ReportRepository = {
  fetchReportTypes(): Promise<Record<string, string>> {
    return request<Record<string, string>>('/reports/types');
  },

  fetchReportFilterOptions(schoolId?: number): Promise<{ graduation_years: number[]; sections: string[]; genders: string[] } | null> {
    return request(`/alumni/filters${schoolId ? `?school_id=${schoolId}` : ''}`);
  },

  generateReport(reportType: string, format: string, filters: Record<string, unknown>, title?: string): Promise<unknown> {
    return request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ report_type: reportType, format, filters, title }),
    });
  },

  previewReport(reportType: string, filters: Record<string, unknown>): Promise<ReportPreview> {
    return request<ReportPreview>('/reports/preview', {
      method: 'POST',
      body: JSON.stringify({ report_type: reportType, filters }),
    });
  },

  // The PDF comes back base64-encoded inside JSON (not as an application/pdf
  // response) so download-manager extensions can't intercept it before the
  // SPA reads it. Decoded to a Blob here so callers get a uniform type.
  async previewReportPdf(reportType: string, filters: Record<string, unknown>): Promise<Blob> {
    const { pdf } = await request<{ pdf: string }>('/reports/preview/pdf', {
      method: 'POST',
      body: JSON.stringify({ report_type: reportType, filters }),
    });

    return base64ToPdfBlob(pdf);
  },

  async previewReportFile(id: number): Promise<Blob> {
    const { pdf } = await request<{ pdf: string }>(`/reports/${id}/preview?_preview=${Date.now()}`);

    return base64ToPdfBlob(pdf);
  },

  fetchReportHistory(status: ReportListStatus, schoolId?: number): Promise<{ data: ReportRecord[] }> {
    return request<{ data: ReportRecord[] }>(`/reports/history?status=${status}&all=1${schoolId ? `&school_id=${schoolId}` : ''}`);
  },

  fetchPublishedReports(): Promise<{ data: ReportRecord[] }> {
    return request<{ data: ReportRecord[] }>('/reports/published');
  },

  getReport(id: number): Promise<ReportDetail> {
    return request<ReportDetail>(`/reports/${id}`);
  },

  publishReport(id: number): Promise<void> {
    return request<void>(`/reports/${id}/publish`, { method: 'PATCH' });
  },

  unpublishReport(id: number): Promise<void> {
    return request<void>(`/reports/${id}/unpublish`, { method: 'PATCH' });
  },

  archiveReport(id: number): Promise<void> {
    return request<void>(`/reports/${id}/archive`, { method: 'PATCH' });
  },

  restoreReport(id: number): Promise<void> {
    return request<void>(`/reports/${id}/restore`, { method: 'PATCH' });
  },

  deleteReport(id: number): Promise<void> {
    return request<void>(`/reports/${id}`, { method: 'DELETE' });
  },
};
