import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { AdminDashboardData } from '../types/Dashboard';

import { DashboardService, dashboardKeys } from '../services/DashboardService';

import { STALE_TIME_DASHBOARD_MS } from '../lib/queryClient';

export function useAdminDashboard(schoolId?: number): {
  data: AdminDashboardData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
} {
  const { data, isPending, isFetching, isPlaceholderData } = useQuery({
    queryKey: dashboardKeys.admin(schoolId),
    queryFn: () => DashboardService.fetchAdminDashboardForCurrentUser(schoolId),
    staleTime: STALE_TIME_DASHBOARD_MS,
    // Keep showing the previous scope's data while a new school scope loads, to avoid a skeleton flash.
    placeholderData: keepPreviousData,
  });

  return { data, isLoading: isPending, isFetching, isPlaceholderData };
}
