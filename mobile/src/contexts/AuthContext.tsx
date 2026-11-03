import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { deleteAppStorageItem, getAppStorageItem, setAppStorageItem } from '../services/appStorage';

import type { User, LoginPayload } from '../types';

import { setToken, removeToken, getToken } from '../services/api';
import * as authService from '../services/authService';
import { syncPushTokenForCurrentUser } from '../services/pushTokenService';

const TOKEN_CREATED_AT_KEY = 'auth_token_created_at';
const TOKEN_EXPIRY_DAYS = 30;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accountStatus: 'pending' | 'approved' | 'rejected' | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;
  const accountStatus = user?.account_status ?? null;

  async function isTokenExpired(): Promise<boolean> {
    const createdAt = await getAppStorageItem(TOKEN_CREATED_AT_KEY);
    if (!createdAt) return true;

    const createdTime = parseInt(createdAt, 10);
    if (isNaN(createdTime)) return true;

    const expiryTime = createdTime + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() > expiryTime;
  }

  const refreshUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const expired = await isTokenExpired();
      if (expired) {
        await removeToken();
        await deleteAppStorageItem(TOKEN_CREATED_AT_KEY);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      if (currentUser.account_status === 'approved') {
        void syncPushTokenForCurrentUser();
      }
    } catch {
      await removeToken();
      await deleteAppStorageItem(TOKEN_CREATED_AT_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  async function login(payload: LoginPayload) {
    const response = await authService.login(payload);

    if (response.token) {
      await setToken(response.token);
      await setAppStorageItem(TOKEN_CREATED_AT_KEY, Date.now().toString());
    }

    // Discard anything cached under the previous session before the first
    // authenticated screen mounts, so no other account's rows can be served
    // from cache.
    queryClient.clear();
    setUser(response.user);

    if (response.user.account_status === 'approved') {
      void syncPushTokenForCurrentUser();
    }
  }

  async function logout() {
    try {
      const token = await getToken();
      if (token) {
        await authService.logout();
      }
    } catch {
      // Continue with local cleanup regardless of server response
    }

    await removeToken();
    await deleteAppStorageItem(TOKEN_CREATED_AT_KEY);
    queryClient.clear();
    setUser(null);
  }

  function applyUser(updated: User) {
    setUser(updated);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        accountStatus,
        login,
        logout,
        refreshUser,
        applyUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
