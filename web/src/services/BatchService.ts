import { BatchRepository } from '../repositories/BatchRepository';
import type { BatchSummary, BatchDetailResponse, BatchDetailFilters, BatchStats, BatchComparison } from '../types/Batch';

export const batchKeys = {
  all: ['batches'] as const,
  list: (schoolId?: number) => [...batchKeys.all, 'list', schoolId ?? 'all'] as const,
  detail: (year: number, schoolId?: number, filters?: BatchDetailFilters) =>
    [...batchKeys.all, 'detail', year, schoolId ?? 'all', filters ?? {}] as const,
  stats: (year: number, schoolId?: number) => [...batchKeys.all, 'stats', year, schoolId ?? 'all'] as const,
  note: (year: number, schoolId?: number) => [...batchKeys.all, 'note', year, schoolId ?? 'all'] as const,
  availableBatches: (schoolId?: number) => [...batchKeys.all, 'available', schoolId ?? 'all'] as const,
};

export const BatchService = {
  listBatches(schoolId?: number): Promise<BatchSummary[]> {
    return BatchRepository.listBatches(schoolId);
  },
  fetchBatchDetail(
    year: number,
    schoolId?: number,
    filters?: BatchDetailFilters,
  ): Promise<BatchDetailResponse> {
    return BatchRepository.fetchBatchDetail(year, schoolId, filters);
  },
  fetchBatchStats(year: number, schoolId?: number): Promise<BatchStats> {
    return BatchRepository.fetchBatchStats(year, schoolId);
  },
  compareBatches(years: number[], schoolId?: number): Promise<BatchComparison> {
    return BatchRepository.compareBatches(years, schoolId);
  },
  updateBatchNote(year: number, note: string, schoolId?: number): Promise<void> {
    return BatchRepository.updateBatchNote(year, note, schoolId);
  },
  fetchBatchNote(year: number, schoolId?: number): Promise<{ note: string | null }> {
    return BatchRepository.fetchBatchNote(year, schoolId);
  },
  exportBatch(year: number, schoolId?: number): Promise<{ data: string; filename: string }> {
    return BatchRepository.exportBatch(year, schoolId);
  },
  fetchAvailableBatches(schoolId?: number): Promise<number[]> {
    return BatchRepository.fetchAvailableBatches(schoolId);
  },
};
