import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  NotificationPreferences,
  NotificationPreferencesResponse,
  ProfileResponse,
  UpdateProfilePayload,
} from '../types/settings';

import * as settingsService from '../services/settingsService';
import { settingsKeys } from '../services/settingsService';

import { toErrorMessage } from './toErrorMessage';

/**
 * The signed-in user's profile, plus its three write paths.
 *
 * Every mutation resolves to a fresh `ProfileResponse`, so each one seeds the
 * cache with it directly instead of invalidating and re-reading.
 */
export function useProfile() {
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
  });

  function seed(updated: ProfileResponse): ProfileResponse {
    queryClient.setQueryData(settingsKeys.profile(), updated);

    return updated;
  }

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => settingsService.updateProfile(payload),
    onSuccess: seed,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ uri }: { uri: string }) => settingsService.uploadProfilePhoto(uri),
    onSuccess: seed,
  });

  const deletePhotoMutation = useMutation({
    mutationFn: settingsService.deleteProfilePhoto,
    onSuccess: seed,
  });

  async function refetchProfile(): Promise<void> {
    await refetch();
  }

  return {
    profile: data ?? null,
    isLoading: isPending,
    error: isError ? toErrorMessage(error, 'Could not load profile. Please try again.') : null,
    updateProfile: updateMutation.mutateAsync,
    uploadPhoto: uploadPhotoMutation.mutateAsync,
    deletePhoto: deletePhotoMutation.mutateAsync,
    isSaving:
      updateMutation.isPending || uploadPhotoMutation.isPending || deletePhotoMutation.isPending,
    refetch: refetchProfile,
  };
}

/**
 * Notification toggles.
 *
 * The optimistic write is expressed through the cache: `onMutate` flips the
 * cached preference so the `Switch` moves on the tap frame, `onError` restores
 * the snapshot, `onSuccess` seeds the server's copy.
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: settingsService.getNotificationPreferences,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) =>
      settingsService.updateNotificationPreferences(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.notifications() });
      const previous = queryClient.getQueryData<NotificationPreferencesResponse>(
        settingsKeys.notifications(),
      );

      if (previous) {
        queryClient.setQueryData<NotificationPreferencesResponse>(settingsKeys.notifications(), {
          preferences: { ...previous.preferences, ...payload },
        });
      }

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.notifications(), context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.notifications(), updated);
    },
  });

  // Failure is already handled by the mutation — the optimistic write rolls
  // back and `saveError` turns on — so this deliberately resolves either way
  // rather than making every caller catch.
  async function setPreference(key: keyof NotificationPreferences, value: boolean): Promise<void> {
    try {
      await updateMutation.mutateAsync({ [key]: value });
    } catch {
      // Reported through `saveError`.
    }
  }

  async function refetchPreferences(): Promise<void> {
    await refetch();
  }

  return {
    preferences: data?.preferences ?? null,
    isLoading: isPending,
    error: isError ? toErrorMessage(error, 'Could not load notification preferences. Please try again.') : null,
    isSaving: updateMutation.isPending,
    saveError: updateMutation.isError
      ? 'Could not save notification preferences. Please try again.'
      : null,
    setPreference,
    refetch: refetchPreferences,
  };
}
