import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { DirectorySearchParams } from '../types/directory';

import * as directoryService from '../services/directoryService';
import { directoryKeys } from '../services/directoryService';

import { STALE_TIME_REFERENCE_MS } from '../lib/queryClient';
import { toErrorMessage } from './toErrorMessage';

const PER_PAGE = 20;

export interface DirectoryFilters {
  search: string;
  graduationYear?: number;
  section?: string;
}

/**
 * The paged, searchable alumni directory.
 *
 * The caller passes already-debounced filters (`useDebouncedValue`); they go
 * straight into the query key, so a term the user has typed past resolves into
 * its own cache entry instead of racing the current one. Backspacing to a
 * previous term renders its cached page immediately.
 */
export function useDirectory(filters: DirectoryFilters) {
  const params: DirectorySearchParams = {
    per_page: PER_PAGE,
    search: filters.search || undefined,
    graduation_year: filters.graduationYear,
    section: filters.section || undefined,
    sort_by: 'name_asc',
  };

  const listQuery = useInfiniteQuery({
    queryKey: directoryKeys.list(params),
    queryFn: ({ pageParam }) => directoryService.getDirectory({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page ? lastPage.current_page + 1 : undefined,
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: directoryKeys.stats(),
    queryFn: directoryService.fetchDirectoryStats,
  });

  const entries = listQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const total = listQuery.data?.pages[0]?.total ?? 0;

  async function loadMore(): Promise<void> {
    if (listQuery.isFetchingNextPage || !listQuery.hasNextPage) {
      return;
    }
    await listQuery.fetchNextPage();
  }

  async function refetch(): Promise<void> {
    await Promise.all([listQuery.refetch(), statsQuery.refetch()]);
  }

  const message = listQuery.isError
    ? toErrorMessage(listQuery.error, 'Could not load directory. Please try again.')
    : null;

  return {
    entries,
    total,
    // Stats are decorative here — a failure hides the banner rather than
    // reporting an error over a directory that loaded fine.
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isPending,
    isFetching: listQuery.isFetching && !listQuery.isFetchingNextPage && !listQuery.isPending,
    isLoadingMore: listQuery.isFetchingNextPage,
    hasMore: listQuery.hasNextPage,
    error: entries.length === 0 ? message : null,
    loadMoreError: entries.length > 0 ? message : null,
    loadMore,
    refetch,
  };
}

/** Filter dropdown options — reference data, so the long staleTime tier. */
export function useDirectoryFilterOptions() {
  const { data } = useQuery({
    queryKey: directoryKeys.filterOptions(),
    queryFn: directoryService.fetchDirectoryFilterOptions,
    staleTime: STALE_TIME_REFERENCE_MS,
  });

  return { filterOptions: data ?? null };
}

/**
 * One directory profile, for the bottom sheet.
 *
 * `enabled` keeps a second open instant: with no id the query stays idle, and
 * with an id already fetched the cached entry renders immediately while it
 * revalidates in the background.
 */
export function useDirectoryEntry(alumniId: number | null) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: directoryKeys.entry(alumniId ?? 0),
    queryFn: () => directoryService.getDirectoryEntry(alumniId as number),
    enabled: alumniId !== null,
  });

  return {
    entry: data ?? null,
    isLoading: alumniId !== null && isPending,
    error: isError ? toErrorMessage(error, 'Could not load profile.') : null,
  };
}

/** Search autocomplete. The caller debounces and enforces the 2-char minimum. */
export function useDirectorySuggestions(query: string, minChars: number) {
  const isEnabled = query.length >= minChars;

  const { data, isPending } = useQuery({
    queryKey: directoryKeys.suggest(query),
    queryFn: () => directoryService.getDirectorySuggestions(query),
    enabled: isEnabled,
  });

  return {
    suggestions: data?.data ?? [],
    isLoading: isEnabled && isPending,
  };
}
