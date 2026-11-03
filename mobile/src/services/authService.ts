import { request } from './api';
import type { AuthResponse, CompleteProfilePayload, User, LoginPayload, RegisterPayload, ResubmitPayload } from '../types';

export const authKeys = {
  all: ['auth'] as const,
  approvalStatus: () => [...authKeys.all, 'approval-status'] as const,
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Registration never returns a session or token — the account is created pending,
// so the caller must show a confirmation rather than treating this as a login.
export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<User> {
  return request<User>('/auth/me');
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function getApprovalStatus(): Promise<{
  status: string;
  submitted_at: string | null;
  rejection_reason: string | null;
}> {
  return request('/auth/approval-status');
}

export async function resubmit(payload: ResubmitPayload): Promise<{ message: string; user: User }> {
  return request('/auth/resubmit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeProfile(payload: CompleteProfilePayload): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/complete-profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
