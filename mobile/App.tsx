import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

import { queryClient } from './src/lib/queryClient';
import { useAppStateFocus } from './src/lib/useAppStateFocus';
import { useNotificationResponseListener } from './src/lib/useNotificationResponseListener';

export default function App() {
  // Outside QueryClientProvider on purpose: focusManager is module-level, not
  // context, so the bridge does not need to sit under the provider.
  useAppStateFocus();
  // Outside AuthProvider too: it navigates via navigationRef, not context,
  // and needs to be armed before the user finishes signing in so a cold
  // start from a notification tap is caught by getLastNotificationResponseAsync.
  useNotificationResponseListener();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
