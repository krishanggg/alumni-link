import { NotificationRepository } from '../repositories/NotificationRepository';
import type { NotificationPreferences } from '../types/Profile';

export const NotificationService = {
  getNotificationPreferencesForCurrentUser(): Promise<{ preferences: NotificationPreferences }> {
    return NotificationRepository.getNotificationPreferences();
  },

  updateNotificationPreferencesForCurrentUser(preferences: Partial<NotificationPreferences>): Promise<{ message: string; preferences: NotificationPreferences }> {
    return NotificationRepository.updateNotificationPreferences(preferences);
  },
};
