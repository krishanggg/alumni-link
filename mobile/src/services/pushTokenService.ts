import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { request } from './api';

/**
 * Requests notification permission and returns an Expo push token, or null
 * when permission is denied or the token can't be obtained (e.g. running in
 * an environment without push capability). Never throws — push registration
 * is a best-effort side effect of auth, not something that should block
 * login.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  // expo-notifications installs a device push-token listener as a module side
  // effect. Android Expo Go throws when that listener is registered, so avoid
  // loading the package at all there. Remote push requires a development build.
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      // Use a dedicated channel so installs that already created Expo's
      // default channel at DEFAULT importance still get heads-up alerts.
      await Notifications.setNotificationChannelAsync('alumni-alerts', {
        name: 'AlumniLink alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

    return tokenResponse.data;
  } catch {
    return null;
  }
}

export async function registerPushToken(expoPushToken: string): Promise<void> {
  await request('/profile/push-tokens', {
    method: 'POST',
    body: JSON.stringify({ expo_push_token: expoPushToken }),
  });
}

export async function unregisterPushToken(expoPushToken: string): Promise<void> {
  await request('/profile/push-tokens', {
    method: 'DELETE',
    body: JSON.stringify({ expo_push_token: expoPushToken }),
  });
}

/**
 * Fire-and-forget: obtains a token and registers it with the backend.
 * Swallows all failures (permission denial, network, server error) since
 * push registration must never block or surface errors on the auth flow.
 */
export async function syncPushTokenForCurrentUser(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const token = await getExpoPushToken();
  if (!token) {
    return;
  }

  try {
    await registerPushToken(token);
  } catch {
    // Best-effort — the user can still use the app without push.
  }
}
