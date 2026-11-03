import { useCallback, useEffect, useRef } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { FeedbackService, feedbackKeys } from '../services/FeedbackService';
import type { FeedbackListFilters, FeedbackThreadFormInput } from '../types/Feedback';
import { STALE_TIME_DEFAULT_MS } from '../lib/queryClient';

export function invalidateFeedbackQueries(queryClient: QueryClient, id: number) {
  void queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
  void queryClient.invalidateQueries({ queryKey: feedbackKeys.detail(id) });
}

function useFeedbackLifecycleRefetch(refetch: () => Promise<unknown>, enabled: boolean) {
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refetchRef.current();
      }
    };

    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
    };
  }, [enabled]);
}

export function useFeedbackThreads(filters: FeedbackListFilters) {
  const query = useQuery({
    queryKey: feedbackKeys.list(filters),
    queryFn: () => FeedbackService.list(filters),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: STALE_TIME_DEFAULT_MS,
  });

  useFeedbackLifecycleRefetch(query.refetch, true);

  return query;
}

export function useFeedbackThread(id: number | null) {
  const query = useQuery({
    queryKey: id === null ? [...feedbackKeys.all, 'detail', 'none'] : feedbackKeys.detail(id),
    queryFn: () => {
      if (id === null) {
        throw new Error('A feedback conversation must be selected.');
      }
      return FeedbackService.get(id);
    },
    enabled: id !== null,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: STALE_TIME_DEFAULT_MS,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

  useFeedbackLifecycleRefetch(query.refetch, id !== null);

  return query;
}

export function useFeedbackRecipients(enabled = true) {
  return useQuery({
    queryKey: feedbackKeys.recipients(),
    queryFn: () => FeedbackService.recipients(),
    enabled,
    staleTime: STALE_TIME_DEFAULT_MS,
  });
}

export function useFeedbackUnreadCount(enabled = true) {
  const query = useQuery({
    queryKey: feedbackKeys.unreadCount(),
    queryFn: () => FeedbackService.unreadCount(),
    enabled,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: STALE_TIME_DEFAULT_MS,
  });
  const { refetch } = query;

  useFeedbackLifecycleRefetch(refetch, enabled);

  return query;
}

export function useFeedbackThreadMutations() {
  const queryClient = useQueryClient();

  function invalidate(id: number) {
    invalidateFeedbackQueries(queryClient, id);
  }

  const createMutation = useMutation({
    mutationFn: (data: FeedbackThreadFormInput) => FeedbackService.create(data),
    onSuccess: (thread) => invalidate(thread.id),
  });
  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => FeedbackService.reply(id, body),
    onSuccess: (thread, variables) => {
      queryClient.setQueryData(feedbackKeys.detail(variables.id), thread);
      invalidate(variables.id);
    },
  });
  const resolveMutation = useMutation({
    mutationFn: (id: number) => FeedbackService.resolve(id),
    onSuccess: (_, id) => invalidate(id),
  });
  const reopenMutation = useMutation({
    mutationFn: (id: number) => FeedbackService.reopen(id),
    onSuccess: (_, id) => invalidate(id),
  });
  const markReadMutation = useMutation({
    mutationFn: (id: number) => FeedbackService.markRead(id),
    onSuccess: (_, id) => invalidate(id),
  });

  const createAsync = createMutation.mutateAsync;
  const replyAsync = replyMutation.mutateAsync;
  const resolveAsync = resolveMutation.mutateAsync;
  const reopenAsync = reopenMutation.mutateAsync;
  const markReadAsync = markReadMutation.mutateAsync;
  const create = useCallback((data: FeedbackThreadFormInput) => createAsync(data), [createAsync]);
  const reply = useCallback((id: number, body: string) => replyAsync({ id, body }), [replyAsync]);
  const resolve = useCallback((id: number) => resolveAsync(id), [resolveAsync]);
  const reopen = useCallback((id: number) => reopenAsync(id), [reopenAsync]);
  const markRead = useCallback((id: number) => markReadAsync(id), [markReadAsync]);

  return {
    create,
    reply,
    resolve,
    reopen,
    markRead,
    isCreating: createMutation.isPending,
    isReplying: replyMutation.isPending,
    isChangingStatus: resolveMutation.isPending || reopenMutation.isPending,
  };
}
