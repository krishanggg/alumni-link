import { UserRepository } from '../repositories/UserRepository';
import type { User, UserListItem, UserFormInput, UserListResponse } from '../types/Auth';

export const userKeys = {
  all: ['users'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.all, 'list', filters] as const,
};

export const UserService = {
  listUsers(params: Record<string, string | number | undefined>): Promise<UserListResponse> {
    return UserRepository.listUsers(params);
  },
  createUser(data: UserFormInput): Promise<User> {
    return UserRepository.createUser(data);
  },
  updateUser(id: number, data: UserFormInput): Promise<void> {
    return UserRepository.updateUser(id, data);
  },
  toggleUserStatus(id: number): Promise<UserListItem> {
    return UserRepository.toggleUserStatus(id);
  },
  deleteUser(id: number): Promise<void> {
    return UserRepository.deleteUser(id);
  },
  linkAlumni(userId: number, alumniId: number): Promise<void> {
    return UserRepository.linkAlumni(userId, alumniId);
  },
  unlinkAlumni(userId: number): Promise<void> {
    return UserRepository.unlinkAlumni(userId);
  },
  resetPassword(id: number): Promise<{ message: string }> {
    return UserRepository.resetPassword(id);
  },
  setPassword(id: number, password: string, passwordConfirmation: string, notify = false): Promise<{ message: string }> {
    return UserRepository.setPassword(id, password, passwordConfirmation, notify);
  },
};
