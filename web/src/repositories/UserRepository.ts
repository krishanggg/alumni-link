import { request } from '../services/api';
import type { User, UserListItem, UserFormInput, UserListResponse } from '../types/Auth';

export const UserRepository = {
  listUsers(params: Record<string, string | number | undefined>): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return request<UserListResponse>(`/users${query ? `?${query}` : ''}`);
  },

  createUser(data: UserFormInput): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser(id: number, data: UserFormInput): Promise<void> {
    return request<void>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggleUserStatus(id: number): Promise<UserListItem> {
    return request<UserListItem>(`/users/${id}/status`, { method: 'PATCH' });
  },

  deleteUser(id: number): Promise<void> {
    return request<void>(`/users/${id}`, { method: 'DELETE' });
  },

  linkAlumni(userId: number, alumniId: number): Promise<void> {
    return request<void>(`/users/${userId}/link-alumni`, {
      method: 'POST',
      body: JSON.stringify({ alumni_id: alumniId }),
    });
  },

  unlinkAlumni(userId: number): Promise<void> {
    return request<void>(`/users/${userId}/unlink-alumni`, { method: 'DELETE' });
  },

  resetPassword(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/users/${id}/reset-password`, { method: 'POST' });
  },

  setPassword(id: number, password: string, passwordConfirmation: string, notify = false): Promise<{ message: string }> {
    return request<{ message: string }>(`/users/${id}/set-password`, {
      method: 'POST',
      body: JSON.stringify({ password, password_confirmation: passwordConfirmation, notify }),
    });
  },
};
