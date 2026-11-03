import { request } from '../services/api';
import type { SessionItem } from '../types/Profile';

export const SessionRepository = {
  listSessions(): Promise<{ sessions: SessionItem[] }> {
    return request<{ sessions: SessionItem[] }>('/profile/sessions');
  },

  terminateSession(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/profile/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  terminateAllSessions(): Promise<{ message: string }> {
    return request<{ message: string }>('/profile/sessions', {
      method: 'DELETE',
    });
  },
};
