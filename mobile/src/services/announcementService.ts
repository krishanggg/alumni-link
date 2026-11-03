import { request } from './api';
import type {
  ActiveAnnouncementsResponse,
  Announcement,
  PaginatedAnnouncementsResponse,
} from '../types/announcement';

/**
 * Query keys for the announcement domain.
 *
 * Every `*Keys` object in `src/services/` follows the same shape: a single
 * `all` root per domain, with every other key derived from it, so one
 * `invalidateQueries({ queryKey: announcementKeys.all })` reaches the whole
 * domain. Parameters that change *which rows come back* go in the key;
 * anything that only changes presentation does not.
 */
export const announcementKeys = {
  all: ['announcements'] as const,
  active: () => [...announcementKeys.all, 'active'] as const,
  // 'all' rather than `undefined` for the unfiltered case: an undefined segment
  // serialises the same as a missing one, which would collide with the root.
  mine: (type?: Announcement['type']) => [...announcementKeys.all, 'mine', type ?? 'all'] as const,
};

export async function getActive(): Promise<ActiveAnnouncementsResponse> {
  return request<ActiveAnnouncementsResponse>('/announcements/active');
}

/**
 * `type` must filter server-side: filtering an already-fetched page leaves the
 * paginator counting unfiltered rows, so a type whose matches sit on page 2
 * would render as "no announcements match this filter".
 */
export async function getMine(
  page = 1,
  type?: Announcement['type'],
): Promise<PaginatedAnnouncementsResponse> {
  const qs = new URLSearchParams({ page: String(page) });
  if (type) {
    qs.set('type', type);
  }
  return request<PaginatedAnnouncementsResponse>(`/announcements/mine?${qs.toString()}`);
}

export async function markViewed(id: number): Promise<void> {
  return request<void>(`/announcements/${id}/viewed`, { method: 'POST' });
}
