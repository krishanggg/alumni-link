export type FeedbackThreadStatus = 'open' | 'resolved';

export interface FeedbackMessageSender {
  id: number;
  name: string;
  role: 'super_admin' | 'school_admin';
}

export interface FeedbackMessageRecord {
  id: number;
  body: string;
  sender?: FeedbackMessageSender;
  created_at: string | null;
}

export interface FeedbackParticipantRecord {
  id: number;
  name: string;
  role: 'super_admin' | 'school_admin';
}

export interface FeedbackRecipientRecord extends FeedbackParticipantRecord {
  school: { id: number; name: string };
}

export interface FeedbackThreadRecord {
  id: number;
  subject: string;
  status: FeedbackThreadStatus;
  school?: { id: number; name: string };
  created_by?: string | null;
  school_admin?: FeedbackParticipantRecord | null;
  resolved_by?: string | null;
  resolved_at: string | null;
  last_message_at: string | null;
  created_at: string | null;
  unread: boolean;
  messages?: FeedbackMessageRecord[];
}

export interface FeedbackThreadFormInput {
  subject: string;
  body: string;
  school_admin_id?: number;
}

export interface FeedbackListFilters {
  status?: FeedbackThreadStatus | 'all';
  q?: string;
  school_id?: number;
  per_page?: number;
  page?: number;
  from?: string;
  to?: string;
}

export interface FeedbackThreadListResponse {
  data: FeedbackThreadRecord[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; from: number | null; last_page: number; per_page: number; to: number | null; total: number };
}

export interface FeedbackUnreadCountResponse {
  unread_count: number;
}
