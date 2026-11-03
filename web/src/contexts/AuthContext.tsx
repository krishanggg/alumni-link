import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { User, LoginPayload } from '../types/Auth';
import { AuthService } from '../services/AuthService';
import { AuthContext } from './authContextInstance';
import { trackGlobalLoading } from '../lib/globalLoadingSignal';
import { markAuthenticated, markSignedOut } from '../lib/sessionExpiredSignal';

const ANNOUNCEMENT_DISMISSED_KEY = 'announcements:dismissed';

function clearAnnouncementDismissals() {
  try {
    sessionStorage.removeItem(ANNOUNCEMENT_DISMISSED_KEY);
  } catch {
    // ignore unavailable session storage
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await trackGlobalLoading(AuthService.getCurrentUser());
      setUser(userData);
      markAuthenticated();
    } catch {
      setUser(null);
      markSignedOut();
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  async function login(payload: LoginPayload) {
    const response = await trackGlobalLoading(AuthService.login(payload));

    // Discard any cached queries from a previous session so no other
    // user's data can be served to this login (spec 14, Phase 2).
    queryClient.clear();
    clearAnnouncementDismissals();
    setUser(response.user);
    markAuthenticated();
  }

  async function logout() {
    try {
      await trackGlobalLoading(AuthService.logout());
    } catch {
      // continue even if logout API fails
    }

    queryClient.clear();
    clearAnnouncementDismissals();
    setUser(null);
    markSignedOut();
  }

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
