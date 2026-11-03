import { request } from '../services/api';
import type {
  FeedbackListFilters,
  FeedbackThreadFormInput,
  FeedbackThreadListResponse,
  FeedbackThreadRecord,
  FeedbackRecipientRecord,
  FeedbackUnreadCountResponse,
} from '../types/Feedback';

export const FeedbackRepository = {
  list(filters: FeedbackListFilters = {}): Promise<FeedbackThreadListResponse> {
    const params = new URLSearchParams();
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.q) {
      params.set('q', filters.q);
    }
    if (filters.school_id) {
      params.set('school_id', String(filters.school_id));
    }
    if (filters.per_page) {
      params.set('per_page', String(filters.per_page));
    }
    if (filters.page) {
      params.set('page', String(filters.page));
    }
    if (filters.from) {
      params.set('from', filters.from);
    }
    if (filters.to) {
      params.set('to', filters.to);
    }

    const query = params.toString();
    return request<FeedbackThreadListResponse>(`/feedback${query ? `?${query}` : ''}`);
  },

  get(id: number): Promise<FeedbackThreadRecord> {
    return request<FeedbackThreadRecord>(`/feedback/${id}`);
  },

  create(data: FeedbackThreadFormInput): Promise<FeedbackThreadRecord> {
    return request<FeedbackThreadRecord>('/feedback', { method: 'POST', body: JSON.stringify(data) });
  },

  reply(id: number, body: string): Promise<FeedbackThreadRecord> {
    return request<FeedbackThreadRecord>(`/feedback/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
  },

  resolve(id: number): Promise<FeedbackThreadRecord> {
    return request<FeedbackThreadRecord>(`/feedback/${id}/resolve`, { method: 'PATCH' });
  },

  reopen(id: number): Promise<FeedbackThreadRecord> {
    return request<FeedbackThreadRecord>(`/feedback/${id}/reopen`, { method: 'PATCH' });
  },

  markRead(id: number): Promise<void> {
    return request<void>(`/feedback/${id}/read`, { method: 'POST' });
  },

  unreadCount(): Promise<FeedbackUnreadCountResponse> {
    return request<FeedbackUnreadCountResponse>('/feedback/unread-count');
  },

  recipients(): Promise<{ data: FeedbackRecipientRecord[] }> {
    return request<{ data: FeedbackRecipientRecord[] }>('/feedback/recipients');
  },
};
