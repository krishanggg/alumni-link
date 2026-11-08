import { ApprovalRepository } from '../repositories/ApprovalRepository';
import type { PaginatedResponse } from '../types/Common';
import type { User } from '../types/Auth';

export const approvalKeys = {
  all: ['approvals'] as const,
  list: (filters: Record<string, unknown>) => [...approvalKeys.all, 'list', filters] as const,
  pendingCount: () => [...approvalKeys.all, 'pending-count'] as const,
};

export const ApprovalService = {
  listApprovals(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<User>> {
    return ApprovalRepository.listApprovals(params);
  },

  fetchApprovalDuplicates(userId: number): Promise<{ duplicates: Array<{ id: number; first_name: string; middle_name: string | null; last_name: string; suffix: string | null; graduation_year: number; section_strand: string | null; student_id: string | null }> }> {
    return ApprovalRepository.fetchApprovalDuplicates(userId);
  },

  approveUser(userId: number, data: Record<string, unknown>): Promise<void> {
    return ApprovalRepository.approveUser(userId, data);
  },

  rejectUser(userId: number, reason: string | null): Promise<void> {
    return ApprovalRepository.rejectUser(userId, reason);
  },
};
