import { AnnouncementRepository } from '../repositories/AnnouncementRepository';
import type { Announcement, AnnouncementFormInput, AnnouncementListFilters, AnnouncementListResponse } from '../types/Announcement';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (filters: Record<string, unknown>) => [...announcementKeys.all, 'list', filters] as const,
};

export const AnnouncementService = {
  listAnnouncements(filters?: AnnouncementListFilters): Promise<AnnouncementListResponse> {
    return AnnouncementRepository.listAnnouncements(filters);
  },
  getAnnouncement(id: number): Promise<Announcement> {
    return AnnouncementRepository.getAnnouncement(id);
  },
  createAnnouncement(data: AnnouncementFormInput): Promise<void> {
    return AnnouncementRepository.createAnnouncement(data);
  },
  updateAnnouncement(id: number, data: Partial<AnnouncementFormInput>): Promise<void> {
    return AnnouncementRepository.updateAnnouncement(id, data);
  },
  publishAnnouncement(id: number): Promise<void> {
    return AnnouncementRepository.publishAnnouncement(id);
  },
  unpublishAnnouncement(id: number): Promise<void> {
    return AnnouncementRepository.unpublishAnnouncement(id);
  },
  expireAnnouncement(id: number): Promise<void> {
    return AnnouncementRepository.expireAnnouncement(id);
  },
  archiveAnnouncement(id: number): Promise<void> {
    return AnnouncementRepository.archiveAnnouncement(id);
  },
  restoreAnnouncement(id: number): Promise<void> {
    return AnnouncementRepository.restoreAnnouncement(id);
  },
  deleteAnnouncement(id: number): Promise<void> {
    return AnnouncementRepository.deleteAnnouncement(id);
  },
};
