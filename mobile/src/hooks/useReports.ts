import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import type { ReportType } from '../types/report';

import { REPORT_TYPES } from '../components/reports/reportDisplay';
import * as reportService from '../services/reportService';
import { reportKeys } from '../services/reportService';

import { toErrorMessage } from './toErrorMessage';

/**
 * Warms the cache for every report type as soon as the Reports root is shown.
 *
 * Without this, tapping a type navigates to an empty screen and *then* starts
 * fetching, so the user watches a skeleton resolve on every selection — the
 * type list is the one screen where all four destinations are known ahead of
 * time with nothing to wait for.
 *
 * Cheap enough to do eagerly: four requests for the first page of 15, fired
 * once when the tab opens rather than on each tap. `prefetchInfiniteQuery` is a
 * no-op for a type still inside its staleTime, so returning to the root does
 * not re-fire them, and a failed prefetch resolves silently, leaving the cache
 * empty so the destination screen just falls back to its skeleton.
 *
 * The keys and `initialPageParam` must stay identical to `usePublishedReports`
 * below, or this warms an entry nothing reads.
 */
export function usePrefetchPublishedReports(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    REPORT_TYPES.forEach((reportType) => {
      queryClient.prefetchInfiniteQuery({
        queryKey: reportKeys.published(reportType),
        queryFn: ({ pageParam }) => reportService.fetchPublishedReports(pageParam, reportType),
        initialPageParam: 1,
      });
    });
  }, [queryClient]);
}

export function usePublishedReports(reportType: ReportType) {
  const {
    data,
    isPending,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: reportKeys.published(reportType),
    queryFn: ({ pageParam }) => reportService.fetchPublishedReports(pageParam, reportType),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const reports = data?.pages.flatMap((page) => page.reports) ?? [];

  async function loadMore(): Promise<void> {
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }
    await fetchNextPage();
  }

  async function refetchReports(): Promise<void> {
    await refetch();
  }

  const message = isError ? toErrorMessage(error, 'Could not load reports. Please try again.') : null;

  return {
    reports,
    isLoading: isPending,
    isFetching: isFetching && !isFetchingNextPage && !isPending,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    error: reports.length === 0 ? message : null,
    loadMoreError: reports.length > 0 ? message : null,
    loadMore,
    refetch: refetchReports,
  };
}
