import { QueryClient } from '@tanstack/react-query';

export const STALE_TIME_DEFAULT_MS = 30_000;
export const STALE_TIME_DASHBOARD_MS = 5 * 60_000;
export const STALE_TIME_REFERENCE_MS = 10 * 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_DEFAULT_MS,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
