import { request, resolveStorageUrl } from './api';
import type {
  DirectoryEntry,
  PaginatedDirectoryResponse,
  DirectoryStats,
  DirectoryFilterOptions,
  DirectorySearchParams,
  SuggestResponse,
} from '../types/directory';

export const directoryKeys = {
  all: ['directory'] as const,
  list: (filters: DirectorySearchParams) => [...directoryKeys.all, 'list', filters] as const,
  entry: (id: number) => [...directoryKeys.all, 'entry', id] as const,
  stats: () => [...directoryKeys.all, 'stats'] as const,
  filterOptions: () => [...directoryKeys.all, 'filter-options'] as const,
  suggest: (query: string) => [...directoryKeys.all, 'suggest', query] as const,
};

export async function getDirectory(params: DirectorySearchParams): Promise<PaginatedDirectoryResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  const response = await request<PaginatedDirectoryResponse>(`/directory${qs ? `?${qs}` : ''}`);
  response.data = response.data.map((entry) => ({
    ...entry,
    profile_photo_url: resolveStorageUrl(entry.profile_photo_url),
  }));
  return response;
}

export async function getDirectoryEntry(id: number): Promise<DirectoryEntry> {
  const entry = await request<DirectoryEntry>(`/directory/${id}`);
  if (entry.profile_photo_url) {
    entry.profile_photo_url = resolveStorageUrl(entry.profile_photo_url) ?? '';
  }
  return entry;
}

export async function fetchDirectoryStats(): Promise<DirectoryStats> {
  return request<DirectoryStats>('/directory/stats');
}

export async function fetchDirectoryFilterOptions(): Promise<DirectoryFilterOptions> {
  return request<DirectoryFilterOptions>('/directory/filters');
}

export async function getDirectorySuggestions(query: string): Promise<SuggestResponse> {
  const response = await request<SuggestResponse>(`/directory/suggest?q=${encodeURIComponent(query)}`);
  response.data = (response.data ?? []).map((suggestion) => ({
    ...suggestion,
    profile_photo_url: resolveStorageUrl(suggestion.profile_photo_url),
  }));
  return response;
}
