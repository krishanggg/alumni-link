import type { Announcement } from '../../types/announcement';

export interface DashboardAnnouncementCounts {
  events: number;
  news: number;
}

/** Counts only the already-fetched, current-user-scoped active announcement set. */
export function countDashboardAnnouncements(
  announcements: Announcement[],
): DashboardAnnouncementCounts {
  return announcements.reduce<DashboardAnnouncementCounts>((counts, announcement) => {
    if (announcement.type === 'event') {
      return { ...counts, events: counts.events + 1 };
    }
    if (announcement.type === 'general') {
      return { ...counts, news: counts.news + 1 };
    }
    return counts;
  }, { events: 0, news: 0 });
}
