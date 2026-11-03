import type {
  BatchSummary,
  BatchDetailResponse,
  BatchStats,
} from '../types/batch';

import { request, resolveStorageUrl } from './api';

export const batchKeys = {
  all: ['batches'] as const,
  list: () => [...batchKeys.all, 'list'] as const,
  detail: (year: number, search: string) => [...batchKeys.all, 'detail', year, search] as const,
  stats: (year: number) => [...batchKeys.all, 'stats', year] as const,
};

export async function getBatches(): Promise<BatchSummary[]> {
  return request<BatchSummary[]>('/batches');
}

export async function getBatchDetail(year: number, page: number, search?: string): Promise<BatchDetailResponse> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('per_page', String(20));
  if (search) {
    params.append('search', search);
  }
  const qs = params.toString();
  const response = await request<BatchDetailResponse>(`/batches/${year}?${qs}`);
  response.data = response.data.map((item) => ({
    ...item,
    profile_photo_url: resolveStorageUrl(item.profile_photo_url),
  }));
  return response;
}

export async function getBatchStats(year: number): Promise<BatchStats> {
  return request<BatchStats>(`/batches/${year}/stats`);
}
