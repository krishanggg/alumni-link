import { useState, useCallback } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AnnouncementService, announcementKeys } from '../services/AnnouncementService';
import type { AnnouncementFormInput, AnnouncementListFilters } from '../types/Announcement';

export function useAnnouncementMutations() {
  const queryClient = useQueryClient();

  // Create/update/delete and lifecycle transitions change which rows the
  // admin list contains and what the alumni-facing active query returns, so
  // per spec 14 Phase 3 both are invalidated (they share the same key root)
  // instead of patched.
  function invalidateAnnouncements() {
    queryClient.invalidateQueries({ queryKey: announcementKeys.all });
  }

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementFormInput) => AnnouncementService.createAnnouncement(data),
    onSuccess: invalidateAnnouncements,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AnnouncementFormInput> }) => AnnouncementService.updateAnnouncement(id, data),
    onSuccess: invalidateAnnouncements,
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => AnnouncementService.publishAnnouncement(id),
    onSuccess: invalidateAnnouncements,
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => AnnouncementService.unpublishAnnouncement(id),
    onSuccess: invalidateAnnouncements,
  });

  const expireMutation = useMutation({
    mutationFn: (id: number) => AnnouncementService.expireAnnouncement(id),
    onSuccess: invalidateAnnouncements,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => AnnouncementService.archiveAnnouncement(id),
    onSuccess: invalidateAnnouncements,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => AnnouncementService.restoreAnnouncement(id),
    onSuccess: invalidateAnnouncements,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => AnnouncementService.deleteAnnouncement(id),
    onSuccess: invalidateAnnouncements,
  });

  async function create(data: AnnouncementFormInput) {
    await createMutation.mutateAsync(data);
  }

  async function update(id: number, data: Partial<AnnouncementFormInput>) {
    await updateMutation.mutateAsync({ id, data });
  }

  async function publish(id: number) {
    await publishMutation.mutateAsync(id);
  }

  async function unpublish(id: number) {
    await unpublishMutation.mutateAsync(id);
  }

  async function expire(id: number) {
    await expireMutation.mutateAsync(id);
  }

  async function archive(id: number) {
    await archiveMutation.mutateAsync(id);
  }

  async function restore(id: number) {
    await restoreMutation.mutateAsync(id);
  }

  async function remove(id: number) {
    await removeMutation.mutateAsync(id);
  }

  return { create, update, publish, unpublish, expire, archive, restore, remove };
}

export function useAnnouncements() {
  const [filters, setFilters] = useState<AnnouncementListFilters>({});

  const { data, isPending: isLoading, isFetching, error: queryError } = useQuery({
    queryKey: announcementKeys.list(filters as Record<string, unknown>),
    queryFn: () => AnnouncementService.listAnnouncements({ ...filters, all: 1 }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const fetchList = useCallback((newFilters?: AnnouncementListFilters) => {
    setFilters(newFilters ?? {});
  }, []);

  const { create, update, publish, unpublish, expire, archive, restore, remove } = useAnnouncementMutations();

  return {
    announcements: data?.data ?? [],
    isLoading,
    isFetching,
    error,
    fetchList,
    create,
    update,
    publish,
    unpublish,
    expire,
    archive,
    restore,
    remove,
  };
}
