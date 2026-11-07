import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { UserService, userKeys } from '../services/UserService';
import { ApprovalService, approvalKeys } from '../services/ApprovalService';
import type { UserFormInput, UserListResponse } from '../types/Auth';

// The whole set is fetched once and filtered client-side (via DataTable's
// search + columnFilters), so this never varies — no query-key permutation
// per filter change, no refetch on every dropdown click.
const USER_LIST_PARAMS = { all: 1 } as const;

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users, isPending: isLoading, isFetching, error: queryError } = useQuery({
    queryKey: userKeys.list(USER_LIST_PARAMS),
    queryFn: () => UserService.listUsers(USER_LIST_PARAMS),
    // Re-navigating to the page shows the cached roster instantly and
    // revalidates in the background; mutations still invalidate explicitly.
    staleTime: 30_000,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: userKeys.all });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data: UserFormInput) => UserService.createUser(data),
    onSuccess: invalidateUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserFormInput }) => UserService.updateUser(id, data),
    onSuccess: invalidateUsers,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => UserService.toggleUserStatus(id),
    onSuccess: (updatedUser, id) => {
      const queries = queryClient.getQueriesData<UserListResponse>({
        queryKey: userKeys.all,
      });
      for (const [queryKey, oldData] of queries) {
        if (!oldData) {
          continue;
        }

        // The row is patched in place rather than refetched, so the active
        // count has to move with it or the summary card drifts out of sync
        // with the Status column until the next fetch.
        const previous = oldData.data.find((u) => u.id === id);
        const activeDelta = previous && previous.is_active !== updatedUser.is_active
          ? (updatedUser.is_active ? 1 : -1)
          : 0;

        queryClient.setQueryData<UserListResponse>(queryKey, {
          ...oldData,
          data: oldData.data.map((u) => (u.id === id ? { ...u, ...updatedUser } : u)),
          stats: { ...oldData.stats, active: oldData.stats.active + activeDelta },
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => UserService.deleteUser(id),
    onSuccess: invalidateUsers,
  });

  const linkMutation = useMutation({
    mutationFn: ({ userId, alumniId }: { userId: number; alumniId: number }) => UserService.linkAlumni(userId, alumniId),
    onSuccess: invalidateUsers,
  });

  const unlinkMutation = useMutation({
    mutationFn: (userId: number) => UserService.unlinkAlumni(userId),
    onSuccess: invalidateUsers,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => UserService.resetPassword(id),
  });

  const setPasswordMutation = useMutation({
    mutationFn: ({ id, password, notify }: { id: number; password: string; notify?: boolean }) =>
      UserService.setPassword(id, password, password, notify ?? false),
  });

  async function createUser(data: UserFormInput) {
    return createMutation.mutateAsync(data);
  }

  async function updateUser(id: number, data: UserFormInput) {
    await updateMutation.mutateAsync({ id, data });
  }

  async function toggleStatus(id: number) {
    await toggleMutation.mutateAsync(id);
  }

  async function toggleStatusSilent(id: number) {
    return UserService.toggleUserStatus(id);
  }

  async function deleteUser(id: number) {
    await deleteMutation.mutateAsync(id);
  }

  async function linkAlumni(userId: number, alumniId: number) {
    await linkMutation.mutateAsync({ userId, alumniId });
  }

  async function unlinkAlumni(userId: number) {
    await unlinkMutation.mutateAsync(userId);
  }

  async function resetPassword(id: number) {
    return resetPasswordMutation.mutateAsync(id);
  }

  async function setPassword(id: number, password: string, notify = false) {
    return setPasswordMutation.mutateAsync({ id, password, notify });
  }

  async function fetchUsers() {
    return queryClient.fetchQuery({
      queryKey: userKeys.list(USER_LIST_PARAMS),
      queryFn: () => UserService.listUsers(USER_LIST_PARAMS),
      staleTime: 0,
    });
  }

  return {
    users: users ?? null,
    isLoading,
    isFetching,
    error,
    createUser,
    updateUser,
    toggleStatus,
    toggleStatusSilent,
    deleteUser,
    linkAlumni,
    unlinkAlumni,
    resetPassword,
    isResettingPassword: resetPasswordMutation.isPending,
    setPassword,
    isSettingPassword: setPasswordMutation.isPending,
    fetchUsers,
  };
}

const APPROVALS_LIST_PARAMS = { all: 1 } as const;

// school_id narrows an already-fetched roster, so the whole set is fetched
// once and filtered client-side (via DataTable's columnFilters) rather than
// refetched per dropdown change.
export function usePendingApprovals() {
  const queryClient = useQueryClient();

  const { data: pending, isPending: isLoading, isFetching } = useQuery({
    queryKey: approvalKeys.list(APPROVALS_LIST_PARAMS),
    queryFn: () => ApprovalService.listApprovals(APPROVALS_LIST_PARAMS),
    staleTime: 0,
  });

  async function fetchPending() {
    await queryClient.invalidateQueries({ queryKey: approvalKeys.all });
  }

  return { pending: pending ?? null, isLoading, isFetching, fetchPending };
}

/** Fetch only one row to obtain the server's scoped pending total. */
export function usePendingApprovalCount(enabled = true) {
  return useQuery({
    queryKey: approvalKeys.pendingCount(),
    queryFn: async () => (await ApprovalService.listApprovals({ per_page: 1 })).total,
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
