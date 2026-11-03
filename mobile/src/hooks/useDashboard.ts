import { useQuery } from '@tanstack/react-query';

import * as dashboardService from '../services/dashboardService';
import { dashboardKeys } from '../services/dashboardService';

import { STALE_TIME_DASHBOARD_MS } from '../lib/queryClient';
import { toErrorMessage } from './toErrorMessage';

/**
 * The alumni dashboard payload.
 *
 * `STALE_TIME_DASHBOARD_MS` because `GET /api/dashboard/alumni` is itself
 * server-cached for five minutes — a shorter client window would only
 * re-fetch the same cached response.
 */
export function useDashboard() {
  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: dashboardKeys.alumni(),
    queryFn: dashboardService.fetchAlumniDashboard,
    staleTime: STALE_TIME_DASHBOARD_MS,
  });

  async function refetchDashboard(): Promise<void> {
    await refetch();
  }

  return {
    dashboard: data ?? null,
    isLoading: isPending,
    isFetching,
    error: isError ? toErrorMessage(error, 'Could not load dashboard. Please try again.') : null,
    refetch: refetchDashboard,
  };
}
