import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { request } from './api';

/**
 * Requests notification permission and obtains an Expo push token.
 *
 * Push notifications are supported in installed EAS builds.
 * Registration runs silently without displaying diagnostic popups.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');

    // Configure the Android notification channel.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alumni-alerts', {
        name: 'AlumniLink alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    // Check existing notification permissions.
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Request permission if it has not been granted.
    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Retrieve the Expo EAS project ID.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      return null;
    }

    // Generate the Expo push token.
    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const token = tokenResponse.data;

    if (!token) {
      return null;
    }

    return token;
  } catch {
    // Push token generation must not interrupt normal app usage.
    return null;
  }
}

/**
 * Registers the device's Expo push token with Laravel.
 */
export async function registerPushToken(
  expoPushToken: string
): Promise<void> {
  await request('/profile/push-tokens', {
    method: 'POST',
    body: JSON.stringify({
      expo_push_token: expoPushToken,
    }),
  });
}

/**
 * Removes the device's Expo push token from Laravel.
 */
export async function unregisterPushToken(
  expoPushToken: string
): Promise<void> {
  await request('/profile/push-tokens', {
    method: 'DELETE',
    body: JSON.stringify({
      expo_push_token: expoPushToken,
    }),
  });
}

/**
 * Generates and registers the current device's push token.
 *
 * Registration is performed silently in the background.
 * Any registration failure must not block authentication
 * or prevent the user from using AlumniLink.
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
    // Registration failures are non-blocking.
    // The app continues operating normally.
  }
}