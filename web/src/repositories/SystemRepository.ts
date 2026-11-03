import { request } from '../services/api';
import type { SystemInfo, PaginatedResponse, ActivityLogEntry } from '../types/Profile';

export const SystemRepository = {
  fetchSystemInfo(): Promise<SystemInfo> {
    return request<SystemInfo>('/system/info');
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
    const searchParams = new URLSearchParams();
    if (params?.page) {
      searchParams.set('page', String(params.page));
    }
    if (params?.per_page) {
      searchParams.set('per_page', String(params.per_page));
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.user_id) {
      searchParams.set('user_id', String(params.user_id));
    }
    if (params?.action) {
      searchParams.set('action', params.action);
    }
    if (params?.date_from) {
      searchParams.set('date_from', params.date_from);
    }
    if (params?.date_to) {
      searchParams.set('date_to', params.date_to);
    }

    const query = searchParams.toString();

    return request<PaginatedResponse<ActivityLogEntry>>(`/system/activity-logs${query ? `?${query}` : ''}`);
  },

  fetchActivityLogActions(): Promise<{ actions: string[] }> {
    return request<{ actions: string[] }>('/system/activity-logs/actions');
  },

  fetchActivityLogUsers(): Promise<{ users: { id: number; name: string }[] }> {
    return request<{ users: { id: number; name: string }[] }>('/system/activity-logs/users');
  },
};
