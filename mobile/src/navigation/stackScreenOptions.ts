import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { colors } from '../theme';

export const stackScreenOptions = {
  animation: 'fade',
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.surfaceContainerLowest,
  headerTitleStyle: { fontWeight: '600', fontSize: 16 },
} satisfies NativeStackNavigationOptions;
