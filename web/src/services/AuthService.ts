import { AuthRepository } from '../repositories/AuthRepository';
import type { User, LoginPayload, AuthResponse } from '../types/Auth';

export const AuthService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return AuthRepository.login(payload);
  },

  logout(): Promise<{ message: string }> {
    return AuthRepository.logout();
  },

  getCurrentUser(): Promise<User> {
    return AuthRepository.getCurrentUser();
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return AuthRepository.forgotPassword(email);
  },

  resetPassword(token: string, email: string, password: string, password_confirmation: string): Promise<{ message: string }> {
    return AuthRepository.resetPassword(token, email, password, password_confirmation);
  },

  changePasswordForCurrentUser(current_password: string, new_password: string, new_password_confirmation: string): Promise<{ message: string }> {
    return AuthRepository.updatePassword(current_password, new_password, new_password_confirmation);
  },

};
