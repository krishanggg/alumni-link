import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import * as batchService from '../services/batchService';
import { batchKeys } from '../services/batchService';

import { toErrorMessage } from './toErrorMessage';

export function useBatches() {
  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: batchKeys.list(),
    queryFn: batchService.getBatches,
  });

  async function refetchBatches(): Promise<void> {
    await refetch();
  }

  return {
    batches: data ?? [],
    isLoading: isPending,
    isFetching,
    error: isError ? toErrorMessage(error, 'Could not load batches. Please try again.') : null,
    refetch: refetchBatches,
  };
}

/**
 * One batch's alumni list and its statistics.
 *
 * Two separate queries: the stats are unaffected by the search term, so keying
 * them on the year alone means typing in the search box never re-fetches or
 * re-renders the charts above it.
 */
export function useBatchDetail(year: number, search: string) {
  const listQuery = useInfiniteQuery({
    queryKey: batchKeys.detail(year, search),
    queryFn: ({ pageParam }) => batchService.getBatchDetail(year, pageParam, search || undefined),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: batchKeys.stats(year),
    queryFn: () => batchService.getBatchStats(year),
  });

  const entries = listQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const total = listQuery.data?.pages[0]?.meta.total ?? 0;

  async function loadMore(): Promise<void> {
    if (listQuery.isFetchingNextPage || !listQuery.hasNextPage) {
      return;
    }
    await listQuery.fetchNextPage();
  }

  async function refetch(): Promise<void> {
    await Promise.all([listQuery.refetch(), statsQuery.refetch()]);
  }

  const listMessage = listQuery.isError
    ? toErrorMessage(listQuery.error, 'Could not load batch details. Please try again.')
    : null;

  return {
    entries,
    total,
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isPending,
    isFetching: listQuery.isFetching && !listQuery.isFetchingNextPage && !listQuery.isPending,
    isLoadingMore: listQuery.isFetchingNextPage,
    hasMore: listQuery.hasNextPage,
    error: entries.length === 0 ? listMessage : null,
    loadMoreError: entries.length > 0 ? listMessage : null,
    // The charts fail independently of the roster, and the screen renders a
    // dismissible strip for them rather than replacing the whole page.
    statsError: statsQuery.isError
      ? toErrorMessage(statsQuery.error, 'Could not load batch statistics. Tap to retry.')
      : null,
    isStatsLoading: statsQuery.isPending,
    loadMore,
    refetch,
    refetchStats: statsQuery.refetch,
  };
}
