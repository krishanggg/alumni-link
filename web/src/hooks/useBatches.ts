import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BatchService, batchKeys } from '../services/BatchService';

export type { BatchAlumniAdminItem, BatchAlumniItem, BatchComparisonEntry, BatchComparison } from '../types/Batch';
import type { BatchComparison } from '../types/Batch';

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useBatches(schoolId?: number) {
  const listQuery = useQuery({
    queryKey: batchKeys.list(schoolId),
    queryFn: () => BatchService.listBatches(schoolId),
  });

  async function fetchComparison(years: number[]): Promise<BatchComparison> {
    return BatchService.compareBatches(years, schoolId);
  }

  let error: string | null = null;

  if (listQuery.isError) {
    error = toErrorMessage(listQuery.error, 'Failed to load');
  }

  return { batches: listQuery.data ?? [], isLoading: listQuery.isPending, error, fetchComparison };
}

// Section/gender narrow an already-fetched batch roster, so the whole set is
// fetched once per year+school and filtered client-side (via DataTable's
// columnFilters) rather than refetched per dropdown change.
export function useBatchDetail(year: number, schoolId?: number) {
  const detailQuery = useQuery({
    queryKey: batchKeys.detail(year, schoolId),
    queryFn: () => BatchService.fetchBatchDetail(year, schoolId, { all: 1 }),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: batchKeys.stats(year, schoolId),
    queryFn: () => BatchService.fetchBatchStats(year, schoolId),
    // Keep the previous scope's figures on screen while a school switch
    // loads, so changing the notes scope dims the page instead of
    // collapsing the whole stats block back to a skeleton.
    placeholderData: keepPreviousData,
  });

  let error: string | null = null;

  if (detailQuery.isError || statsQuery.isError) {
    error = toErrorMessage(detailQuery.error ?? statsQuery.error, 'Failed to load batch data');
  }

  return {
    detail: detailQuery.data ?? null,
    stats: statsQuery.data ?? null,
    // Pending-only (not isFetching): both queries keep the previous
    // scope's data via keepPreviousData, so a year or school switch dims
    // the page rather than collapsing it to a skeleton. The skeleton
    // shows only on the very first load.
    isLoading: detailQuery.isPending || statsQuery.isPending,
    // Background refetch after a scope change — DataTable / stats dim the
    // existing content instead of showing nothing until it resolves.
    isFetching: detailQuery.isFetching || statsQuery.isFetching,
    error,
  };
}

export function useBatchNote(year: number, schoolId?: number) {
  const queryClient = useQueryClient();

  const noteQuery = useQuery({
    queryKey: batchKeys.note(year, schoolId),
    queryFn: () => BatchService.fetchBatchNote(year, schoolId),
  });

  const saveMutation = useMutation({
    mutationFn: (note: string) => BatchService.updateBatchNote(year, note, schoolId),
    // The upsert endpoint returns no body and the saved value is already
    // known, so patch the cached note directly instead of refetching
    // (spec 14 Phase 3 cache patching).
    onSuccess: (_data, note) => {
      queryClient.setQueryData(batchKeys.note(year, schoolId), { note });
    },
  });

  async function saveNote(note: string): Promise<void> {
    await saveMutation.mutateAsync(note);
  }

  return {
    note: noteQuery.data?.note ?? null,
    isLoading: noteQuery.isPending,
    saveNote,
    isSaving: saveMutation.isPending,
  };
}

export function useAvailableBatches(schoolId?: number) {
  const { data } = useQuery({
    queryKey: batchKeys.availableBatches(schoolId),
    queryFn: () => BatchService.fetchAvailableBatches(schoolId),
  });

  return { availableBatches: data ?? [] };
}
