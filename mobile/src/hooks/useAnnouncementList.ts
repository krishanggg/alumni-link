import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import type { Announcement } from '../types/announcement';

import * as announcementService from '../services/announcementService';
import { announcementKeys } from '../services/announcementService';

import { toErrorMessage } from './toErrorMessage';

/**
 * The paged, type-filtered announcement list behind `AnnouncementsScreen`.
 *
 * Two guarantees fall out of keying the query on `type`:
 *
 * - **Rapid filter taps settle on the selected filter.** The type is part of
 *   the query key, so a late response for a deselected type lands in that
 *   type's own cache entry and cannot overwrite the rendered one.
 * - **An in-flight page 2 cannot append rows from the previous filter.** Pages
 *   accumulate inside the entry keyed by their own type; there is no shared
 *   array for them to be appended to.
 *
 * `placeholderData: keepPreviousData` keeps the outgoing list rendered while
 * the incoming one loads, avoiding a blank flash on filter switch.
 */
export function useAnnouncementList(type: Announcement['type'] | undefined) {
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
    queryKey: announcementKeys.mine(type),
    queryFn: ({ pageParam }) => announcementService.getMine(pageParam, type),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const current = lastPage.current_page ?? 1;
      const last = lastPage.last_page ?? 1;

      return current < last ? current + 1 : undefined;
    },
    placeholderData: keepPreviousData,
  });

  const announcements = data?.pages.flatMap((page) => page.announcements ?? []) ?? [];

  async function loadMore(): Promise<void> {
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }
    await fetchNextPage();
  }

  async function refetchList(): Promise<void> {
    await refetch();
  }

  const message = isError ? toErrorMessage(error, 'Failed to load announcements.') : null;

  return {
    announcements,
    isLoading: isPending,
    // True while the *next filter's* rows are in flight and the previous ones
    // are still on screen. The screen dims the list on this instead of tearing
    // it down.
    isSwapping: isFetching && !isFetchingNextPage && !isPending,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    // Split so the screen can keep showing page 1 when only page 2 failed.
    error: announcements.length === 0 ? message : null,
    loadMoreError: announcements.length > 0 ? message : null,
    loadMore,
    refetch: refetchList,
  };
}
