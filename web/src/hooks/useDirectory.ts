import { useQuery } from '@tanstack/react-query';

import type { DirectoryPreviewEntry } from '../types/Report';
import type { SearchFilters } from '../types/Search';

import { useEntitySearch } from './useSearchHook';

import { DirectoryService, directoryKeys } from '../services/DirectoryService';

export function useDirectory(initialFilters: Partial<SearchFilters> = {}) {
  const {
    data,
    currentPage,
    lastPage,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    filterOptions,
    suggestions,
    applyFilters,
    setPage,
    loadSuggestions,
    clearSuggestions,
  } = useEntitySearch<DirectoryPreviewEntry>('directory', initialFilters, 20);

  const statsQuery = useQuery({
    queryKey: directoryKeys.stats(filters.school_id),
    queryFn: () => DirectoryService.fetchDirectoryStats(filters.school_id),
  });

  return {
    entries: data,
    stats: statsQuery.data ?? null,
    isLoading,
    isFetching,
    total,
    currentPage,
    lastPage,
    error,
    filters,
    filterOptions,
    suggestions,
    applyFilters,
    setPage,
    loadSuggestions,
    clearSuggestions,
  };
}
