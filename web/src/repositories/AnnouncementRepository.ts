import { request } from '../services/api';
import type { Announcement, AnnouncementFormInput, AnnouncementListFilters, AnnouncementListResponse } from '../types/Announcement';

export const AnnouncementRepository = {
  listAnnouncements(filters?: AnnouncementListFilters): Promise<AnnouncementListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) {
      params.set('status', filters.status);
    }
    if (filters?.type) {
      params.set('type', filters.type);
    }
    if (filters?.school_id) {
      params.set('school_id', String(filters.school_id));
    }
    if (filters?.q) {
      params.set('q', filters.q);
    }
    if (filters?.all) {
      params.set('all', String(filters.all));
    }
    return request<AnnouncementListResponse>(`/announcements?${params.toString()}`);
  },

  getAnnouncement(id: number): Promise<Announcement> {
    return request<Announcement>(`/announcements/${id}`);
  },

  createAnnouncement(data: AnnouncementFormInput): Promise<void> {
    return request<void>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAnnouncement(id: number, data: Partial<AnnouncementFormInput>): Promise<void> {
    return request<void>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  publishAnnouncement(id: number): Promise<void> {
    return request<void>(`/announcements/${id}/publish`, { method: 'PATCH' });
  },

  unpublishAnnouncement(id: number): Promise<void> {
    return request<void>(`/announcements/${id}/unpublish`, { method: 'PATCH' });
  },

  expireAnnouncement(id: number): Promise<void> {
    return request<void>(`/announcements/${id}/expire`, { method: 'PATCH' });
  },

  archiveAnnouncement(id: number): Promise<void> {
    return request<void>(`/announcements/${id}/archive`, { method: 'PATCH' });
  },

  restoreAnnouncement(id: number): Promise<void> {
    return request<void>(`/announcements/${id}/restore`, { method: 'PATCH' });
  },

  deleteAnnouncement(id: number): Promise<void> {
    return request<void>(`/announcements/${id}`, { method: 'DELETE' });
  },
};
