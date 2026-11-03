import { request } from '../services/api';
import type { PaginatedResponse } from '../types/Common';
import type { DirectoryPreviewEntry } from '../types/Report';
import type { SearchFilters, SearchSuggestion } from '../types/Search';

export const DirectoryRepository = {
  listDirectoryEntries(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<DirectoryPreviewEntry>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return request(`/directory${query ? `?${query}` : ''}`);
  },

  getDirectoryEntry(id: number): Promise<DirectoryPreviewEntry> {
    return request<DirectoryPreviewEntry>(`/directory/${id}`);
  },

  fetchDirectoryStats(schoolId?: number): Promise<{ total_alumni: number; batch_count: number; most_recent_batch: number }> {
    return request(`/directory/stats${schoolId ? `?school_id=${schoolId}` : ''}`);
  },

  fetchDirectorySections(): Promise<{ data: string[] }> {
    return request<{ data: string[] }>('/directory/sections');
  },

  searchDirectory(filters: SearchFilters): Promise<PaginatedResponse<DirectoryPreviewEntry>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(`${key}[]`, String(v)));
      } else {
        params.set(key, String(value));
      }
    });
    return request(`/directory/search?${params.toString()}`);
  },

  fetchDirectorySuggestions(query: string): Promise<SearchSuggestion[]> {
    const response = request<{ data: SearchSuggestion[] }>(`/directory/suggest?q=${encodeURIComponent(query)}`);
    return response.then((r) => r.data);
  },

  fetchDirectoryFilterOptions(): Promise<{ graduation_years: number[]; sections: string[]; genders: string[] }> {
    return request('/directory/filters');
  },
};
