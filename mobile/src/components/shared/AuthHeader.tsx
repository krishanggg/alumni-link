import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, ripple, spacing } from '../../theme';

type AuthHeaderProps = {
  title: string;
  /** Label for the left-hand action — "Cancel", "Log Out". */
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
};

/**
 * The navy bar at the top of the full-screen auth forms (`RegisterScreen`,
 * `CompleteProfileScreen`, `ResubmitScreen`).
 *
 * Status-bar clearance is measured via `useSafeAreaInsets` rather than a fixed
 * padding — a constant over- or under-pads on any device whose status bar isn't
 * ~26 dp (notches, Dynamic Island, landscape).
 *
 * The header also owns its own status bar style. `AppNavigator` sets
 * `style="dark"` for the whole auth branch, which suits the light-background
 * screens but renders the clock and battery near-black against this navy bar.
 * Setting it here means a dark header can't be added without its light status
 * bar, and mount order lets it win over the branch default. `LoginScreen` makes
 * the same exception for its navy hero.
 */
function AuthHeader({ title, actionLabel, onAction, actionDisabled }: AuthHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <StatusBar style="light" />
      <Pressable
        onPress={onAction}
        android_ripple={ripple.onDark}
        disabled={actionDisabled}
        accessibilityRole="button"
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {/* Balances the action so the title stays optically centred. */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
  },
  actionText: {
    fontSize: 14,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
    flexShrink: 1,
    marginHorizontal: spacing.sm,
  },
  spacer: {
    width: 50,
  },
});

export default AuthHeader;
