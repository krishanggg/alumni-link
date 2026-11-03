import { request } from '../services/api';
import type { NotificationPreferences } from '../types/Profile';

export const NotificationRepository = {
  getNotificationPreferences(): Promise<{ preferences: NotificationPreferences }> {
    return request<{ preferences: NotificationPreferences }>('/profile/notifications');
  },

  updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<{ message: string; preferences: NotificationPreferences }> {
    return request<{ message: string; preferences: NotificationPreferences }>('/profile/notifications', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },
};
