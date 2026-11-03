import { request, resolveStorageUrl } from './api';
import type { AlumniDashboardData } from '../types/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  alumni: () => [...dashboardKeys.all, 'alumni'] as const,
};

export async function fetchAlumniDashboard(): Promise<AlumniDashboardData> {
  const data = await request<AlumniDashboardData>('/dashboard/alumni');

  if (data.profile?.profile_photo_url) {
    data.profile.profile_photo_url = resolveStorageUrl(data.profile.profile_photo_url) ?? '';
  }

  return data;
}
