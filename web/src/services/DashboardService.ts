import { DashboardRepository } from '../repositories/DashboardRepository';
import type { AdminDashboardData } from '../types/Dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  admin: (schoolId?: number) => [...dashboardKeys.all, 'admin', schoolId ?? 'all'] as const,
};

export const DashboardService = {
  fetchAdminDashboardForCurrentUser(schoolId?: number): Promise<AdminDashboardData> {
    return DashboardRepository.fetchAdminDashboard(schoolId);
  },
};
