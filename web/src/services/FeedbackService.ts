import { FeedbackRepository } from '../repositories/FeedbackRepository';
import type {
  FeedbackListFilters,
  FeedbackThreadFormInput,
  FeedbackThreadListResponse,
  FeedbackThreadRecord,
  FeedbackRecipientRecord,
  FeedbackUnreadCountResponse,
} from '../types/Feedback';

export const feedbackKeys = {
  all: ['feedback'] as const,
  list: (filters: FeedbackListFilters) => [...feedbackKeys.all, 'list', filters] as const,
  detail: (id: number) => [...feedbackKeys.all, 'detail', id] as const,
  unreadCount: () => [...feedbackKeys.all, 'unread-count'] as const,
  recipients: () => [...feedbackKeys.all, 'recipients'] as const,
};

export const FeedbackService = {
  list(filters: FeedbackListFilters): Promise<FeedbackThreadListResponse> {
    return FeedbackRepository.list(filters);
  },
  get(id: number): Promise<FeedbackThreadRecord> {
    return FeedbackRepository.get(id);
  },
  create(data: FeedbackThreadFormInput): Promise<FeedbackThreadRecord> {
    return FeedbackRepository.create(data);
  },
  reply(id: number, body: string): Promise<FeedbackThreadRecord> {
    return FeedbackRepository.reply(id, body);
  },
  resolve(id: number): Promise<FeedbackThreadRecord> {
    return FeedbackRepository.resolve(id);
  },
  reopen(id: number): Promise<FeedbackThreadRecord> {
    return FeedbackRepository.reopen(id);
  },
  markRead(id: number): Promise<void> {
    return FeedbackRepository.markRead(id);
  },
  unreadCount(): Promise<FeedbackUnreadCountResponse> {
    return FeedbackRepository.unreadCount();
  },
  recipients(): Promise<{ data: FeedbackRecipientRecord[] }> {
    return FeedbackRepository.recipients();
  },
};
