import { DirectoryRepository } from '../repositories/DirectoryRepository';
import type { PaginatedResponse } from '../types/Common';
import type { DirectoryPreviewEntry } from '../types/Report';
import type { SearchFilters, SearchSuggestion } from '../types/Search';

export const directoryKeys = {
  all: ['directory'] as const,
  lists: () => [...directoryKeys.all, 'list'] as const,
  list: (filters: SearchFilters) => [...directoryKeys.lists(), filters] as const,
  stats: (schoolId?: number) => [...directoryKeys.all, 'stats', schoolId ?? 'all'] as const,
  filterOptions: () => [...directoryKeys.all, 'filter-options'] as const,
  suggestions: (query: string) => [...directoryKeys.all, 'suggest', query] as const,
};

export const DirectoryService = {
  listDirectoryEntries(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<DirectoryPreviewEntry>> {
    return DirectoryRepository.listDirectoryEntries(params);
  },
  getDirectoryEntry(id: number): Promise<DirectoryPreviewEntry> {
    return DirectoryRepository.getDirectoryEntry(id);
  },
  fetchDirectoryStats(schoolId?: number): Promise<{ total_alumni: number; batch_count: number; most_recent_batch: number }> {
    return DirectoryRepository.fetchDirectoryStats(schoolId);
  },
  fetchDirectorySections(): Promise<{ data: string[] }> {
    return DirectoryRepository.fetchDirectorySections();
  },
  searchDirectory(filters: SearchFilters): Promise<PaginatedResponse<DirectoryPreviewEntry>> {
    return DirectoryRepository.searchDirectory(filters);
  },
  fetchDirectorySuggestions(query: string): Promise<SearchSuggestion[]> {
    return DirectoryRepository.fetchDirectorySuggestions(query);
  },
  fetchDirectoryFilterOptions(): Promise<{ graduation_years: number[]; sections: string[]; genders: string[] }> {
    return DirectoryRepository.fetchDirectoryFilterOptions();
  },
};
