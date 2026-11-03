import { ProfileRepository } from '../repositories/ProfileRepository';
import type { ProfileResponse, ProfileFormInput } from '../types/Profile';

export const ProfileService = {
  getProfileForCurrentUser(): Promise<ProfileResponse> {
    return ProfileRepository.getProfile();
  },

  updateProfileForCurrentUser(payload: ProfileFormInput): Promise<ProfileResponse> {
    return ProfileRepository.updateProfile(payload);
  },

  uploadProfilePhotoForCurrentUser(file: File): Promise<ProfileResponse> {
    return ProfileRepository.uploadProfilePhoto(file);
  },

  deleteProfilePhotoForCurrentUser(): Promise<ProfileResponse> {
    return ProfileRepository.deleteProfilePhoto();
  },

  changePasswordForCurrentUser(current_password: string, new_password: string, new_password_confirmation: string): Promise<{ message: string }> {
    return ProfileRepository.updatePassword(current_password, new_password, new_password_confirmation);
  },
};
