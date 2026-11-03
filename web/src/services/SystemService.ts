import { SystemRepository } from '../repositories/SystemRepository';
import type { SystemInfo, PaginatedResponse, ActivityLogEntry } from '../types/Profile';

export const SystemService = {
  fetchSystemInfo(): Promise<SystemInfo> {
    return SystemRepository.fetchSystemInfo();
  },

  fetchActivityLogs(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    user_id?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<ActivityLogEntry>> {
    return SystemRepository.fetchActivityLogs(params);
  },

  fetchActivityLogActions(): Promise<{ actions: string[] }> {
    return SystemRepository.fetchActivityLogActions();
  },

  fetchActivityLogUsers(): Promise<{ users: { id: number; name: string }[] }> {
    return SystemRepository.fetchActivityLogUsers();
  },
};
