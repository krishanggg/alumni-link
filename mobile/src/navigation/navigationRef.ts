import { createNavigationContainerRef } from '@react-navigation/native';

import type { MainTabParamList } from './MainTabNavigator';

/**
 * Lets code outside the component tree (the notification tap handler) drive
 * tab navigation. Only attached to the `NavigationContainer` instance that
 * renders `MainTabNavigator` — the other auth-state branches in
 * `AppNavigator` have no tabs to navigate to.
 */
export const navigationRef = createNavigationContainerRef<MainTabParamList>();

const NOTIFICATION_TYPE_TAB: Record<string, keyof MainTabParamList> = {
  announcement: 'Announcements',
  report: 'Reports',
  account: 'Profile',
};

/**
 * Routes a tapped push notification to the tab matching its category. A
 * `type` the map doesn't recognize (or a notification with no `type` at
 * all, e.g. a stray local notification) is left alone rather than guessing.
 */
export function navigateToTabForNotificationType(type: unknown): void {
  if (typeof type !== 'string' || !navigationRef.isReady()) {
    return;
  }

  const tab = NOTIFICATION_TYPE_TAB[type];

  if (tab) {
    navigationRef.navigate(tab);
  }
}
