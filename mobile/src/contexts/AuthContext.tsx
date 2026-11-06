import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
  deleteAppStorageItem,
  getAppStorageItem,
  setAppStorageItem,
} from '../services/appStorage';

import type { User, LoginPayload } from '../types';

import {
  setToken,
  removeToken,
  getToken,
} from '../services/api';

import * as authService from '../services/authService';

import {
  getExpoPushToken,
  unregisterPushToken,
  syncPushTokenForCurrentUser,
} from '../services/pushTokenService';

import {
  getOrCreateInstallationId,
} from '../services/deviceInstallationService';

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

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track registration so logout can avoid racing with it.
  const pushSyncPromiseRef = useRef<Promise<void> | null>(null);

  const isAuthenticated = user !== null;
  const accountStatus = user?.account_status ?? null;

  async function isTokenExpired(): Promise<boolean> {
    const createdAt = await getAppStorageItem(TOKEN_CREATED_AT_KEY);

    if (!createdAt) {
      return true;
    }

    const createdTime = parseInt(createdAt, 10);

    if (isNaN(createdTime)) {
      return true;
    }

    const expiryTime =
      createdTime + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    return Date.now() > expiryTime;
  }

  /**
   * Registers the current device for push notifications.
   * Registration does not block login.
   */
  const startPushTokenSync = useCallback(() => {
    const task = syncPushTokenForCurrentUser();

    pushSyncPromiseRef.current = task;

    void task.then(
      () => {
        if (pushSyncPromiseRef.current === task) {
          pushSyncPromiseRef.current = null;
        }
      },
      () => {
        if (pushSyncPromiseRef.current === task) {
          pushSyncPromiseRef.current = null;
        }
      },
    );
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = await getToken();

      if (!token) {
        queryClient.clear();
        setUser(null);
        return;
      }

      const expired = await isTokenExpired();

      if (expired) {
        await removeToken();
        await deleteAppStorageItem(TOKEN_CREATED_AT_KEY);

        queryClient.clear();
        setUser(null);
        return;
      }

      const currentUser = await authService.getCurrentUser();

      setUser(currentUser);

      if (currentUser.account_status === 'approved') {
        startPushTokenSync();
      }
    } catch {
      await removeToken();
      await deleteAppStorageItem(TOKEN_CREATED_AT_KEY);

      queryClient.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, startPushTokenSync]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  /**
   * Logs in using the saved installation ID.
   *
   * This allows Laravel to distinguish:
   * - A returning installation
   * - A genuinely new installation
   *
   * The installation ID is not removed during logout.
   */
  async function login(payload: LoginPayload) {
    let loginRequest: LoginPayload & {
      device_id?: string;
    } = payload;

    try {
      // Retrieve the existing ID or generate one on first use.
      const installationId = await getOrCreateInstallationId();

      loginRequest = {
        ...payload,
        device_id: installationId,
      };
    } catch {
      // A storage failure must not prevent the user from logging in.
      // Without an installation ID, Laravel skips mobile device alerts.
    }

    const response = await authService.login(loginRequest);

    if (response.token) {
      await setToken(response.token);

      await setAppStorageItem(
        TOKEN_CREATED_AT_KEY,
        Date.now().toString(),
      );
    }

    // Prevent cached data from a previous account appearing.
    queryClient.clear();

    setUser(response.user);

    if (response.user.account_status === 'approved') {
      startPushTokenSync();
    }
  }

  /**
   * Logs out and unregisters this device's push token.
   *
   * Push-token removal happens before Laravel logout because
   * the push-token endpoint requires authentication.
   *
   * Failure to unregister must not prevent logout.
   *
   * IMPORTANT:
   * The installation ID is intentionally preserved.
   */
  async function logout() {
    try {
      const authToken = await getToken();

      if (authToken) {
        // Wait briefly for any pending registration.
        // Do not let a slow notification service block logout forever.
        const pendingRegistration = pushSyncPromiseRef.current;

        if (pendingRegistration) {
          try {
            await Promise.race([
              pendingRegistration.catch(() => undefined),
              new Promise<void>((resolve) => {
                setTimeout(resolve, 5000);
              }),
            ]);
          } catch {
            // Continue with logout.
          }
        }

        // Unregister the current device while authentication is valid.
        try {
          const expoPushToken = await getExpoPushToken();

          if (expoPushToken) {
            await unregisterPushToken(expoPushToken);
          }
        } catch {
          // Device unregistration is best-effort.
          // Continue with Laravel logout.
        }

        // Revoke the Laravel authentication session.
        try {
          await authService.logout();
        } catch {
          // Local logout must still succeed.
        }
      }
    } catch {
      // Continue with local cleanup.
    } finally {
      await removeToken();

      await deleteAppStorageItem(TOKEN_CREATED_AT_KEY);

      // Do not delete the installation ID.
      // It must survive logout and future logins.

      queryClient.clear();

      setUser(null);
    }
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