import type { Announcement } from '../../types/announcement';

export type AnnouncementTypeFilter = 'all' | Announcement['type'];

export const ANNOUNCEMENT_FILTERS: ReadonlyArray<{
  value: AnnouncementTypeFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'event', label: 'Events' },
  { value: 'general', label: 'News & Updates' },
  { value: 'closure', label: 'Closures' },
];

/**
 * The `type` query parameter for a filter, or `undefined` for "All".
 *
 * The API omits the filter entirely rather than accepting `type=all`, so "All"
 * has no wire representation and must not be sent.
 */
export function announcementTypeParam(
  filter: AnnouncementTypeFilter,
): Announcement['type'] | undefined {
  return filter === 'all' ? undefined : filter;
}
