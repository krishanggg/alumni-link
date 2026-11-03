import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { request } from './api';
import type {
  ProfileResponse,
  UpdateProfilePayload,
  ChangePasswordPayload,
  NotificationPreferences,
  NotificationPreferencesResponse,
} from '../types/settings';

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
};

export async function getProfile(): Promise<ProfileResponse> {
  return request<ProfileResponse>('/profile');
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  return request<ProfileResponse>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Uploads the picked image as multipart form data.
 *
 * The part must be an `expo-file-system` `File`, not React Native's
 * `{ uri, name, type }` convention. Expo's `fetch` serialises `FormData` via
 * `expo/src/winter/fetch/convertFormData.ts`, which only accepts strings,
 * `Blob`s, and objects exposing `bytes()` — `uri` parts throw
 * `Unsupported FormDataPart implementation`. `File` implements `Blob` and
 * carries the `name`/`type` the converter reads for the part headers, which
 * the backend's `image|mimes:jpeg,png` rule validates against.
 */
export async function uploadProfilePhoto(uri: string): Promise<ProfileResponse> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const imageResponse = await fetch(uri);
    const imageBlob = await imageResponse.blob();
    const extension = imageBlob.type === 'image/png' ? 'png' : 'jpg';
    formData.append('photo', imageBlob, `profile-photo.${extension}`);
  } else {
    formData.append('photo', new File(uri) as unknown as Blob);
  }

  return request<ProfileResponse>('/profile/photo', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteProfilePhoto(): Promise<ProfileResponse> {
  return request<ProfileResponse>('/profile/photo', {
    method: 'DELETE',
  });
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return request<{ message: string }>('/profile/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  return request<NotificationPreferencesResponse>('/profile/notifications');
}

export async function updateNotificationPreferences(
  payload: Partial<NotificationPreferences>,
): Promise<NotificationPreferencesResponse> {
  return request<NotificationPreferencesResponse>('/profile/notifications', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
