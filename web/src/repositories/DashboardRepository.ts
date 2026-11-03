import { request } from '../services/api';
import type { AdminDashboardData } from '../types/Dashboard';

export const DashboardRepository = {
  fetchAdminDashboard(schoolId?: number): Promise<AdminDashboardData> {
    return request<AdminDashboardData>(`/dashboard/admin${schoolId ? `?school_id=${schoolId}` : ''}`);
  },
};
