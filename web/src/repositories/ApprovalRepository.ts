import { request } from '../services/api';
import type { PaginatedResponse } from '../types/Common';
import type { User } from '../types/Auth';

export const ApprovalRepository = {
  listApprovals(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return request<PaginatedResponse<User>>(`/approvals/alumni${query ? `?${query}` : ''}`);
  },

  fetchApprovalDuplicates(userId: number): Promise<{ duplicates: Array<{ id: number; first_name: string; middle_name: string | null; last_name: string; suffix: string | null; graduation_year: number; section_strand: string | null; student_id: string | null }> }> {
    return request(`/approvals/alumni/${userId}`);
  },

  approveUser(userId: number, data: Record<string, unknown>): Promise<void> {
    return request<void>(`/approvals/alumni/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  rejectUser(userId: number, reason: string | null): Promise<void> {
    return request<void>(`/approvals/alumni/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
