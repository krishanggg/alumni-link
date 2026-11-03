import { request } from '../services/api';
import type { User, LoginPayload, AuthResponse } from '../types/Auth';

export const AuthRepository = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout(): Promise<{ message: string }> {
    return request('/auth/logout', { method: 'POST' });
  },

  getCurrentUser(): Promise<User> {
    return request('/auth/me');
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return request('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, email: string, password: string, password_confirmation: string): Promise<{ message: string }> {
    return request('/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ token, email, password, password_confirmation }),
    });
  },

  updatePassword(current_password: string, new_password: string, new_password_confirmation: string): Promise<{ message: string }> {
    return request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password, new_password_confirmation }),
    });
  },

};
