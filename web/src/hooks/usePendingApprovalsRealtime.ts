import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getFeedbackEcho } from '../lib/feedbackEcho';
import { approvalKeys } from '../services/ApprovalService';

/** Refetches the authorized pending count as soon as the server announces a registration. */
export function usePendingApprovalsRealtime(userId: number | null, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || userId === null) {
      return undefined;
    }

    const echo = getFeedbackEcho();
    if (!echo) {
      // The count query retains its periodic refresh when Reverb is not configured.
      return undefined;
    }

    const channelName = `approvals.inbox.${userId}`;
    const channel = echo.private(channelName);
    channel.listen('.approval.pending.created', () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.pendingCount() });
    });

    return () => {
      echo.leave(channelName);
    };
  }, [enabled, queryClient, userId]);
}
