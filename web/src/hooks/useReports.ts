import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { FilterOptions } from '../types/Search';
import type { ReportDetail, ReportListStatus } from '../types/Report';

import { ReportService, reportKeys } from '../services/ReportService';

import { STALE_TIME_REFERENCE_MS } from '../lib/queryClient';

interface GenerateReportInput {
  reportType: string;
  format: string;
  filters: Record<string, unknown>;
  /** Omitted or blank means the backend names the report for us. */
  title?: string;
}

export function useReportTypes(): { types: Record<string, string> } {
  const { data } = useQuery({
    queryKey: reportKeys.types(),
    queryFn: () => ReportService.fetchReportTypes(),
    staleTime: STALE_TIME_REFERENCE_MS,
  });

  return { types: data ?? {} };
}

export function useReportFilterOptions(schoolId?: number): { filterOptions: FilterOptions | null } {
  const { data } = useQuery({
    queryKey: reportKeys.filterOptions(schoolId),
    queryFn: () => ReportService.fetchReportFilterOptions(schoolId),
  });

  return { filterOptions: data ?? null };
}

export function useReportHistory(status: ReportListStatus | null, schoolId?: number) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: reportKeys.history(status ?? 'admin_only', schoolId),
    queryFn: () => ReportService.fetchReportHistory(status ?? 'admin_only', schoolId),
    enabled: status !== null,
  });

  return {
    rows: data?.data ?? [],
    isLoading: status !== null && isPending,
    isFetching: status !== null && isFetching,
    error: status !== null ? error : null,
    refetch,
  };
}

export function usePublishedReports() {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: reportKeys.published(),
    queryFn: () => ReportService.fetchPublishedReports(),
  });

  return {
    reports: data?.data ?? [],
    isLoading: isPending,
    isFetching,
    error,
    refetch,
  };
}

export function useReportDetail(id: number): { report: ReportDetail | null; hasError: boolean } {
  const { data, isError } = useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => ReportService.getReport(id),
  });

  return { report: data ?? null, hasError: isError };
}

export function useReportMutations() {
  const queryClient = useQueryClient();

  // Lifecycle actions move a report between the History/Published/Archived
  // lists (and generate adds a row), so pagination/row sets change shape —
  // per spec 14 Phase 3, invalidation is the correct fix here, not
  // setQueryData patching.
  function invalidateReportData() {
    queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    queryClient.invalidateQueries({ queryKey: reportKeys.details() });
  }

  const generateMutation = useMutation({
    mutationFn: ({ reportType, format, filters, title }: GenerateReportInput) => ReportService.generateReport(reportType, format, filters, title),
    onSuccess: invalidateReportData,
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => ReportService.publishReport(id),
    onSuccess: invalidateReportData,
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => ReportService.unpublishReport(id),
    onSuccess: invalidateReportData,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => ReportService.archiveReport(id),
    onSuccess: invalidateReportData,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => ReportService.restoreReport(id),
    onSuccess: invalidateReportData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ReportService.deleteReport(id),
    onSuccess: invalidateReportData,
  });

  async function generateReport(reportType: string, format: string, filters: Record<string, unknown> = {}, title?: string) {
    return generateMutation.mutateAsync({ reportType, format, filters, title });
  }

  async function publish(id: number) {
    await publishMutation.mutateAsync(id);
  }

  async function unpublish(id: number) {
    await unpublishMutation.mutateAsync(id);
  }

  async function archive(id: number) {
    await archiveMutation.mutateAsync(id);
  }

  async function restore(id: number) {
    await restoreMutation.mutateAsync(id);
  }

  async function deleteReport(id: number) {
    await deleteMutation.mutateAsync(id);
  }

  return { generateReport, isGenerating: generateMutation.isPending, publish, unpublish, archive, restore, deleteReport };
}
