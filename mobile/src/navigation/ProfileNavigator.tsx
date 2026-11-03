import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileMenuScreen from '../screens/profile/ProfileMenuScreen';
import ProfileSettingsScreen from '../screens/settings/ProfileSettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';

import { stackScreenOptions } from './stackScreenOptions';

export type ProfileStackParamList = {
  ProfileMenu: undefined;
  ProfileSettings: undefined;
  SecuritySettings: undefined;
  NotificationSettings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileNavigator() {
  return (
    <Stack.Navigator
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen
        name="ProfileMenu"
        component={ProfileMenuScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ title: 'Security' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
}

export default ProfileNavigator;
