export interface Announcement {
  id: number;
  type: 'event' | 'general' | 'closure';
  title: string;
  message: string;
  target_date: string | null;
  school_id: number | null;
  school?: { id: number; name: string } | null;
  target_all_batches: boolean;
  show_as_modal: boolean;
  status: 'draft' | 'published' | 'expired' | 'archived';
  published_at: string | null;
  archived_at: string | null;
  batches: number[];
  created_at: string;
  viewed?: boolean;
}

export interface AnnouncementListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AnnouncementListResponse {
  data: Announcement[];
  meta: AnnouncementListMeta;
}

export interface AnnouncementListFilters {
  status?: string;
  type?: string;
  school_id?: number;
  q?: string;
  all?: 1;
}

export interface AnnouncementFormInput {
  type: 'event' | 'general' | 'closure';
  title: string;
  message: string;
  target_date: string | null;
  school_id: number | null;
  target_all_batches: boolean;
  target_batches: number[];
  show_as_modal: boolean;
  status: 'draft' | 'published';
}
