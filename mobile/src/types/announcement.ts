export interface Announcement {
  id: number;
  type: 'event' | 'general' | 'closure';
  title: string;
  message: string;
  target_date: string | null;
  school_id: number | null;
  target_all_batches: boolean;
  show_as_modal: boolean;
  status: 'draft' | 'published' | 'expired' | 'archived';
  published_at: string | null;
  created_at: string;
  viewed?: boolean;
  batches: number[];
}

export interface ActiveAnnouncementsResponse {
  announcements: Announcement[];
  unviewed_count: number;
}

export interface PaginatedAnnouncementsResponse {
  announcements: Announcement[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}
