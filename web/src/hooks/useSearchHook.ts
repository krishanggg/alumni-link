import { useState, useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { SearchFilters, FilterOptions, SearchSuggestion } from '../types/Search';
import type { PaginatedResponse } from '../types/Common';

import { AlumniService, alumniKeys } from '../services/AlumniService';
import { DirectoryService, directoryKeys } from '../services/DirectoryService';

type EntitySearchScope = 'admin' | 'directory';

interface EntityFilters extends SearchFilters {
  per_page?: number;
  all?: number;
}

interface UseEntitySearchResult<T> {
  data: T[];
  currentPage: number;
  lastPage: number;
  total: number;
  /** True only while there is no data yet at all (first load or a brand-new filter combination). */
  isLoading: boolean;
  /** True while a fetch is running in the background, e.g. a page turn — existing rows/placeholderData stay visible. */
  isFetching: boolean;
  error: string | null;
  filters: SearchFilters;
  filterOptions: FilterOptions | null;
  suggestions: SearchSuggestion[];
  applyFilters: (newFilters: Partial<SearchFilters>) => void;
  setPage: (page: number) => void;
  loadSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
}

const MIN_SUGGESTION_QUERY_LENGTH = 2;

export function useEntitySearch<T>(
  scope: EntitySearchScope,
  initialFilters: SearchFilters = {},
  perPage: number = 20,
  all: boolean = false,
): UseEntitySearchResult<T> {
  const [filters, setFilters] = useState<EntityFilters>(() => ({
    ...initialFilters,
    per_page: perPage,
    ...(all ? { all: 1 } : {}),
  }));
  const [suggestionQuery, setSuggestionQuery] = useState('');

  const listQuery = useQuery({
    queryKey: scope === 'admin' ? alumniKeys.list(filters) : directoryKeys.list(filters),
    queryFn: async (): Promise<PaginatedResponse<T>> => {
      const result = scope === 'admin'
        ? await AlumniService.searchAlumni(filters)
        : await DirectoryService.searchDirectory(filters);

      // Scope determines which record type is returned; TS cannot correlate the runtime string to T.
      return result as unknown as PaginatedResponse<T>;
    },
    // Keep showing the previous page/filter's rows while the next set loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });

  const filterOptionsQuery = useQuery({
    queryKey: scope === 'admin' ? alumniKeys.filterOptions() : directoryKeys.filterOptions(),
    queryFn: () => (scope === 'admin'
      ? AlumniService.fetchAlumniFilterOptions()
      : DirectoryService.fetchDirectoryFilterOptions()),
  });

  const isSuggestionQueryLongEnough = suggestionQuery.trim().length >= MIN_SUGGESTION_QUERY_LENGTH;

  const suggestionsQuery = useQuery({
    queryKey: scope === 'admin' ? alumniKeys.suggestions(suggestionQuery) : directoryKeys.suggestions(suggestionQuery),
    queryFn: () => (scope === 'admin'
      ? AlumniService.fetchAlumniSuggestions(suggestionQuery)
      : DirectoryService.fetchDirectorySuggestions(suggestionQuery)),
    enabled: isSuggestionQueryLongEnough,
    // Keep the previous suggestion list visible while a new one loads so the
    // dropdown does not flash empty between keystroke pauses.
    placeholderData: keepPreviousData,
  });

  const applyFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const loadSuggestions = useCallback(async (query: string) => {
    setSuggestionQuery(query);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestionQuery('');
  }, []);

  let error: string | null = null;

  if (listQuery.isError) {
    error = listQuery.error instanceof Error ? listQuery.error.message : 'Search failed';
  }

  const result = listQuery.data;

  return {
    data: result?.data ?? [],
    currentPage: result?.current_page ?? 1,
    lastPage: result?.last_page ?? 1,
    total: result?.total ?? 0,
    isLoading: listQuery.isPending,
    isFetching: listQuery.isFetching,
    error,
    filters,
    filterOptions: filterOptionsQuery.data ?? null,
    suggestions: isSuggestionQueryLongEnough ? (suggestionsQuery.data ?? []) : [],
    applyFilters,
    setPage,
    loadSuggestions,
    clearSuggestions,
  };
}
