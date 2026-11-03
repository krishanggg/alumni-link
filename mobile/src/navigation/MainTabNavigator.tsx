import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon, { type IconName } from '../components/shared/Icon';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DirectoryScreen from '../screens/directory/DirectoryScreen';
import BatchNavigator from './BatchNavigator';
import AnnouncementsScreen from '../screens/announcements/AnnouncementsScreen';
import ReportsNavigator from './ReportsNavigator';
import ProfileNavigator from './ProfileNavigator';

import { colors } from '../theme';

// Six destinations is a deliberate flat-IA decision — Material's 3-5 tab guidance
// is a default, not a hard cap, and labels hold down to 320dp (see TabLabel
// below). Nesting Reports/Profile under another tab would trade this flatness
// for an extra tap depth.
export type MainTabParamList = {
  Dashboard: { title?: string } | undefined;
  Directory: { title?: string } | undefined;
  Batch: undefined;
  Announcements: { title?: string } | undefined;
  Reports: { title?: string } | undefined;
  Profile: { title?: string } | undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, IconName> = {
  Dashboard: 'home',
  Directory: 'directory',
  Batch: 'batch',
  Announcements: 'announcements',
  Reports: 'reports',
  Profile: 'profile',
};

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'Home',
  Directory: 'Directory',
  Batch: 'Batch',
  Announcements: 'News',
  Reports: 'Reports',
  Profile: 'Profile',
};

// Decorative — the adjacent label already names the tab, and `Icon` hides itself
// from assistive tech unless given a label. Vector icons take a tint, so
// `tabBarActiveTintColor` reaches the active tab's glyph as well as its label.
function TabIcon({ route, focused, color }: { route: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Icon name={TAB_ICONS[route] ?? 'home'} size={18} color={color} />
    </View>
  );
}

// React Navigation's default label truncates rather than shrinks, so at 320 dp with six
// tabs "Directory" — the longest label — rendered as "Direct…". Shrink-to-fit keeps every
// label whole; at 366 dp and above nothing scales, so wider devices are unchanged.
// Deliberate tradeoff: at large system font sizes this compresses toward 80% instead of
// growing with the OS setting like every other text element in the app — the fixed tab
// slot has nowhere to grow into, and truncation is the worse failure of the two.
function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text
      style={[styles.label, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {label}
    </Text>
  );
}

function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.surfaceContainerLowest,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.surfaceContainerHighest,
          height: 56 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon route={route.name} focused={focused} color={color} />
        ),
        tabBarLabel: ({ color }) => (
          <TabLabel label={TAB_LABELS[route.name] ?? route.name} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Directory"
        component={DirectoryScreen}
        options={{
          title: 'Alumni Directory',
        }}
      />
      <Tab.Screen
        name="Batch"
        component={BatchNavigator}
        options={{
          title: 'Batch Tracking',
          headerShown: false,
          popToTopOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{
          // Matches the tab label below ("News") — the header and the tab must
          // name the same destination the same way.
          title: 'News',
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsNavigator}
        options={{
          title: 'Reports',
          headerShown: false,
          popToTopOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          title: 'My Profile',
          headerShown: false,
          popToTopOnBlur: true,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: colors.infoContainer,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MainTabNavigator;
