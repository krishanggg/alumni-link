import { useQuery } from '@tanstack/react-query';

import * as authService from '../services/authService';
import { authKeys } from '../services/authService';

/**
 * A pending or rejected applicant's submission status.
 *
 * The screen renders from `AuthContext.user` and treats this as an
 * enrichment — it only supplies `rejection_reason` and the submitted-at
 * stamp — so a failure here is not worth surfacing and the hook exposes no
 * `error`.
 */
export function useApprovalStatus() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: authKeys.approvalStatus(),
    queryFn: authService.getApprovalStatus,
  });

  async function refetchStatus(): Promise<void> {
    await refetch();
  }

  return { status: data ?? null, isFetching, refetch: refetchStatus };
}
