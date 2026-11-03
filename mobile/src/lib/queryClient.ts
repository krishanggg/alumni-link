import { QueryClient } from '@tanstack/react-query';

/**
 * StaleTime tiers match `web/src/lib/queryClient.ts` exactly — the two
 * frontends hit the same API, and drifting the freshness windows apart would
 * make "why does mobile show something else" a question with two answers.
 *
 * The dashboard tier (5 min) is longer than the default (30s), not shorter:
 * `GET /api/dashboard/*` is itself server-cached for 5 minutes, so a shorter
 * client window would only re-fetch the same cached payload.
 */
export const STALE_TIME_DEFAULT_MS = 30_000;
export const STALE_TIME_DASHBOARD_MS = 5 * 60_000;
export const STALE_TIME_REFERENCE_MS = 10 * 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_DEFAULT_MS,
        // Web sets this false because a backgrounded browser tab regaining
        // focus is a weak signal. On mobile, returning to foreground is a
        // strong one and the only refresh-on-return mechanism in the app
        // (see `useAppStateFocus`). staleTime gates it, so app-switching
        // can't fire a request on every foreground event.
        refetchOnWindowFocus: true,
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
