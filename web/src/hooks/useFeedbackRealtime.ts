import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getFeedbackEcho } from '../lib/feedbackEcho';
import { invalidateFeedbackQueries } from './useFeedback';

function readThreadId(event: unknown): number | null {
  if (typeof event !== 'object' || event === null) {
    return null;
  }

  const threadId = (event as { thread_id?: unknown }).thread_id;

  return typeof threadId === 'number' && Number.isInteger(threadId) && threadId > 0 ? threadId : null;
}

function readEventField(event: unknown, field: 'event_type' | 'status'): string | null {
  if (typeof event !== 'object' || event === null) {
    return null;
  }

  const value = (event as Record<string, unknown>)[field];

  return typeof value === 'string' ? value : null;
}

function useFeedbackChannel(channelName: string | null, onEvent: (event: unknown) => void) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (channelName === null) {
      return undefined;
    }

    const echo = getFeedbackEcho();
    if (!echo) {
      return undefined;
    }

    const channel = echo.private(channelName);
    channel.listen('.feedback.thread.updated', (event: unknown) => onEventRef.current(event));

    return () => {
      echo.leave(channelName);
    };
  }, [channelName]);
}

function invalidateFromEvent(queryClient: ReturnType<typeof useQueryClient>, event: unknown) {
  const updatedThreadId = readThreadId(event);
  if (updatedThreadId !== null) {
    invalidateFeedbackQueries(queryClient, updatedThreadId);
  }
}

export function useFeedbackInboxRealtime(userId: number | null) {
  const queryClient = useQueryClient();
  const channelName = userId === null ? null : `feedback.inbox.${userId}`;

  useFeedbackChannel(channelName, (event) => invalidateFromEvent(queryClient, event));
}

export function useFeedbackThreadRealtime(threadId: number | null, onResolved?: (threadId: number) => void) {
  const queryClient = useQueryClient();
  const onResolvedRef = useRef(onResolved);
  const channelName = threadId === null ? null : `feedback.thread.${threadId}`;

  useEffect(() => {
    onResolvedRef.current = onResolved;
  }, [onResolved]);

  useFeedbackChannel(channelName, (event) => {
    const updatedThreadId = readThreadId(event);
    if (updatedThreadId === null) {
      return;
    }

    invalidateFeedbackQueries(queryClient, updatedThreadId);
    if (readEventField(event, 'event_type') === 'thread.status_changed' && readEventField(event, 'status') === 'resolved') {
      onResolvedRef.current?.(updatedThreadId);
    }
  });
}

export function useFeedbackRealtime(threadId: number | null, userId: number | null, onResolved?: (threadId: number) => void) {
  useFeedbackInboxRealtime(userId);
  useFeedbackThreadRealtime(userId === null ? null : threadId, onResolved);
}
