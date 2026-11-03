import { ReportRepository } from '../repositories/ReportRepository';
import { requestBlob } from './api';
import type { ReportRecord, ReportDetail, ReportPreview, ReportListStatus } from '../types/Report';

export const reportKeys = {
  all: ['reports'] as const,
  types: () => [...reportKeys.all, 'types'] as const,
  filterOptions: (schoolId?: number) => [...reportKeys.all, 'filter-options', schoolId ?? 'all'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  history: (status: ReportListStatus, schoolId?: number) => [...reportKeys.lists(), status, schoolId ?? 'all'] as const,
  published: () => [...reportKeys.lists(), 'published-alumni'] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: number) => [...reportKeys.details(), id] as const,
};

export const ReportService = {
  fetchReportTypes(): Promise<Record<string, string>> {
    return ReportRepository.fetchReportTypes();
  },
  fetchReportFilterOptions(schoolId?: number): Promise<{ graduation_years: number[]; sections: string[]; genders: string[] } | null> {
    return ReportRepository.fetchReportFilterOptions(schoolId);
  },
  generateReport(reportType: string, format: string, filters: Record<string, unknown>, title?: string): Promise<unknown> {
    return ReportRepository.generateReport(reportType, format, filters, title);
  },
  previewReport(reportType: string, filters: Record<string, unknown>): Promise<ReportPreview> {
    return ReportRepository.previewReport(reportType, filters);
  },
  previewReportPdf(reportType: string, filters: Record<string, unknown>): Promise<Blob> {
    return ReportRepository.previewReportPdf(reportType, filters);
  },
  previewReportFile(id: number): Promise<Blob> {
    return ReportRepository.previewReportFile(id);
  },
  fetchReportHistory(status: ReportListStatus, schoolId?: number): Promise<{ data: ReportRecord[] }> {
    return ReportRepository.fetchReportHistory(status, schoolId);
  },
  fetchPublishedReports(): Promise<{ data: ReportRecord[] }> {
    return ReportRepository.fetchPublishedReports();
  },
  getReport(id: number): Promise<ReportDetail> {
    return ReportRepository.getReport(id);
  },
  publishReport(id: number): Promise<void> {
    return ReportRepository.publishReport(id);
  },
  unpublishReport(id: number): Promise<void> {
    return ReportRepository.unpublishReport(id);
  },
  archiveReport(id: number): Promise<void> {
    return ReportRepository.archiveReport(id);
  },
  restoreReport(id: number): Promise<void> {
    return ReportRepository.restoreReport(id);
  },
  deleteReport(id: number): Promise<void> {
    return ReportRepository.deleteReport(id);
  },
  async downloadReport(id: number): Promise<void> {
    try {
      const nonce = Date.now();
      const { blob, filename } = await requestBlob(`/reports/${id}/download?_download=${nonce}`);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename ?? `report-${id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not download the report. Please try again.');
    }
  },
};
