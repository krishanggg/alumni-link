import { useEffect } from 'react';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { navigateToTabForNotificationType } from '../navigation/navigationRef';

/**
 * Routes a tapped push notification to its tab. Covers both cases Expo
 * exposes separately: a tap while the app is running (the live listener)
 * and a tap that launched the app from a killed state (the last-response
 * check, since that tap already happened before this listener existed).
 * Mounted once at the app root, same pattern as `useAppStateFocus`.
 */
export function useNotificationResponseListener(): void {
  useEffect(() => {
    if (Platform.OS === 'web' || (Platform.OS === 'android' && isRunningInExpoGo())) {
      return;
    }

    let isMounted = true;
    let removeListener: (() => void) | undefined;

    void import('expo-notifications').then((Notifications) => {
      if (!isMounted) {
        return;
      }

      // Without a handler, Expo drops foreground notifications in development
      // builds. Keep the handler while avoiding the unsupported Expo Go module.
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const lastResponse = Notifications.getLastNotificationResponse();
      if (lastResponse) {
        navigateToTabForNotificationType(lastResponse.notification.request.content.data?.type);
      }

      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        navigateToTabForNotificationType(response.notification.request.content.data?.type);
      });
      removeListener = () => subscription.remove();
    }).catch(() => undefined);

    return () => {
      isMounted = false;
      removeListener?.();
    };
  }, []);
}
