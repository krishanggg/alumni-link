import { request } from '../services/api';
import type { BatchSummary, BatchDetailResponse, BatchDetailFilters, BatchStats, BatchComparison } from '../types/Batch';

export const BatchRepository = {
  listBatches(schoolId?: number): Promise<BatchSummary[]> {
    return request<BatchSummary[]>(`/batches${schoolId ? `?school_id=${schoolId}` : ''}`);
  },

  fetchBatchDetail(
    year: number,
    schoolId?: number,
    filters: BatchDetailFilters = {},
  ): Promise<BatchDetailResponse> {
    const params = new URLSearchParams();
    if (schoolId) params.set('school_id', String(schoolId));
    if (filters.section) params.set('section', filters.section);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.all) params.set('all', String(filters.all));
    return request<BatchDetailResponse>(`/batches/${year}?${params.toString()}`);
  },

  fetchBatchStats(year: number, schoolId?: number): Promise<BatchStats> {
    return request<BatchStats>(`/batches/${year}/stats${schoolId ? `?school_id=${schoolId}` : ''}`);
  },

  compareBatches(years: number[], schoolId?: number): Promise<BatchComparison> {
    const params = years.map((y) => `years[]=${y}`).join('&');
    return request<BatchComparison>(`/batches/compare?${params}${schoolId ? `&school_id=${schoolId}` : ''}`);
  },

  updateBatchNote(year: number, note: string, schoolId?: number): Promise<void> {
    return request<void>(`/batches/${year}/notes${schoolId ? `?school_id=${schoolId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    });
  },

  fetchBatchNote(year: number, schoolId?: number): Promise<{ note: string | null }> {
    return request<{ note: string | null }>(`/batches/${year}/notes${schoolId ? `?school_id=${schoolId}` : ''}`);
  },

  exportBatch(year: number, schoolId?: number): Promise<{ data: string; filename: string }> {
    return request<{ data: string; filename: string }>(`/batches/${year}/export${schoolId ? `?school_id=${schoolId}` : ''}`);
  },

  fetchAvailableBatches(schoolId?: number): Promise<number[]> {
    return request<number[]>(`/announcements/batches${schoolId ? `?school_id=${schoolId}` : ''}`);
  },
};
