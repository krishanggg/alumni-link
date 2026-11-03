import { request } from '../services/api';
import type { ProfileResponse, ProfileFormInput } from '../types/Profile';

export const ProfileRepository = {
  getProfile(): Promise<ProfileResponse> {
    return request<ProfileResponse>('/profile');
  },

  updateProfile(payload: ProfileFormInput): Promise<ProfileResponse> {
    return request<ProfileResponse>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadProfilePhoto(file: File): Promise<ProfileResponse> {
    const formData = new FormData();
    formData.append('photo', file);

    return request<ProfileResponse>('/profile/photo', {
      method: 'POST',
      body: formData,
    });
  },

  deleteProfilePhoto(): Promise<ProfileResponse> {
    return request<ProfileResponse>('/profile/photo', {
      method: 'DELETE',
    });
  },

  updatePassword(current_password: string, new_password: string, new_password_confirmation: string): Promise<{ message: string }> {
    return request<{ message: string }>('/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password, new_password_confirmation }),
    });
  },
};
