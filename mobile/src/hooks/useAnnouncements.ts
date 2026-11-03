import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ActiveAnnouncementsResponse } from '../types/announcement';

import * as announcementService from '../services/announcementService';
import { announcementKeys } from '../services/announcementService';

import { STALE_TIME_DEFAULT_MS } from '../lib/queryClient';
import { toErrorMessage } from './toErrorMessage';

/**
 * ============================================================================
 * The mobile data-fetching pattern. Every `use*` hook in this directory
 * follows this shape, so a change in feel is one edit, not N rewrites.
 * ============================================================================
 *
 * **Hook shape.** One hook per domain, in `src/hooks/`. It calls a service
 * function — never `request()` — per `docs/REACT_CODING_GUIDELINES.md`, and
 * returns a plain object of already-shaped values:
 *
 *     { <data, defaulted — never undefined>, isLoading, isFetching, error, ...actions }
 *
 * `isLoading` is react-query's `isPending`: true only when there is nothing to
 * show. `isFetching` is the background revalidation, which screens use to dim
 * or disable, never to blank. Screens branch on `isLoading` for the skeleton and
 * on `error` for the alert; they do not receive the raw query object, so the
 * cache library stays behind the hook boundary.
 *
 * **Query keys.** Declared beside the service they call, as `<domain>Keys`, with
 * a single `all` root every other key derives from. Anything that changes which
 * rows come back belongs in the key.
 *
 * **staleTime tiers.** Three, from `src/lib/queryClient.ts`, matching web:
 *   - `STALE_TIME_REFERENCE_MS` (10 min) — reference data that barely moves:
 *     active schools, directory filter options.
 *   - `STALE_TIME_DASHBOARD_MS` (5 min) — the dashboard, whose endpoint is
 *     itself server-cached for 5 minutes.
 *   - `STALE_TIME_DEFAULT_MS` (30 s, the client default) — everything
 *     user-scoped and list-shaped. Omit the option rather than restating it.
 *
 * **Error surfacing.** Never discard rendered content to show an error.
 * react-query keeps the last good `data` alongside the error, so a hook returns
 * both: the screen shows an inline `ErrorAlert` above the stale content when it
 * has data, and the full-screen error state only when it has none.
 *
 * **Skeletons.** Composed from `components/shared/Skeleton.tsx` into a
 * `components/skeletons/<Screen>Skeleton.tsx`, shaped like the real content —
 * same paddings, same row heights, copied from the real component's own
 * `StyleSheet`. A skeleton that differs in height reintroduces the reflow this
 * milestone removes.
 *
 * **Refresh.** There is exactly one automatic mechanism: `useAppStateFocus`
 * bridges app foreground into react-query's focusManager, gated by staleTime.
 * Do not add per-hook `AppState` listeners, focus effects, or intervals.
 */

/** Active announcements for the signed-in alumni: the dashboard card and the show-as-modal queue. */
export function useAnnouncements() {
  const queryClient = useQueryClient();

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: announcementKeys.active(),
    queryFn: announcementService.getActive,
    staleTime: STALE_TIME_DEFAULT_MS,
  });

  const markSeenMutation = useMutation({
    mutationFn: (id: number) => announcementService.markViewed(id),
    // The endpoint returns no body and the change is known locally, so patch
    // the cached list rather than spending a round trip to re-read it.
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ActiveAnnouncementsResponse>(announcementKeys.active(), (previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          announcements: previous.announcements.map((a) => (a.id === id ? { ...a, viewed: true } : a)),
        };
      });
    },
  });

  async function markSeen(id: number): Promise<boolean> {
    try {
      await markSeenMutation.mutateAsync(id);

      return true;
    } catch {
      return false;
    }
  }

  async function refetchActive(): Promise<void> {
    await refetch();
  }

  const announcements = data?.announcements ?? [];

  return {
    announcements,
    modalQueue: announcements.filter((a) => a.show_as_modal && !a.viewed),
    isLoading: isPending,
    isFetching,
    error: isError ? toErrorMessage(error, 'Could not load announcements. Please try again.') : null,
    markSeen,
    refetch: refetchActive,
  };
}
