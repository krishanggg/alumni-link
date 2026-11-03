import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../contexts/AuthContext';

import LoadingScreen from '../screens/LoadingScreen';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { navigationRef } from './navigationRef';
import PendingNavigator from './PendingNavigator';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import NonAlumniScreen from '../screens/auth/NonAlumniScreen';
import ArchivedAccountScreen from '../screens/auth/ArchivedAccountScreen';

// Every screen outside the tab navigator sits on the light #f7f9fb background and
// needs dark status-bar content; only MainTabNavigator has the #2d75b4 header.
// Exception: LoginScreen's blue hero reaches the top of the display, so it mounts
// its own light StatusBar which wins over the dark one set for the auth branch.
function AppNavigator() {
  const { user, isLoading, isAuthenticated, accountStatus } = useAuth();

  if (isLoading) {
    return (
      <>
        <StatusBar style="dark" />
        <LoadingScreen />
      </>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (user.role !== 'alumni') {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <NonAlumniScreen />
      </NavigationContainer>
    );
  }

  if (user.alumni_archived || !user.is_active) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <ArchivedAccountScreen />
      </NavigationContainer>
    );
  }

  if (accountStatus === 'pending' || accountStatus === 'rejected') {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <PendingNavigator />
      </NavigationContainer>
    );
  }

  if (accountStatus === 'approved' && !user.alumni_id) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <CompleteProfileScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <MainTabNavigator />
    </NavigationContainer>
  );
}

export default AppNavigator;
