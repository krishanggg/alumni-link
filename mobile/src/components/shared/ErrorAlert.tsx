import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import Icon from './Icon';

import { colors, presets, radius, ripple, spacing, typography } from '../../theme';

type ErrorAlertProps = {
  message: string;
  /** Omit for an alert with nothing to retry. */
  onRetry?: () => void;
  /** Names what is being retried, since "Retry" alone is ambiguous out of context. */
  retryAccessibilityLabel?: string;
  /** Adds a trailing dismiss control. Mutually useful with `onRetry`, not exclusive. */
  onDismiss?: () => void;
  style?: ViewStyle;
};

/**
 * The inline soft-fill error bar: message on the left, a Retry pill on the right.
 * The single shared implementation for this pattern — full-screen error states
 * use `presets.primaryButton` instead, the app's one primary treatment.
 */
export function ErrorAlert({
  message,
  onRetry,
  retryAccessibilityLabel,
  onDismiss,
  style,
}: ErrorAlertProps) {
  return (
    <View style={[styles.alert, style]}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable
          style={styles.action}
          onPress={onRetry}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel={retryAccessibilityLabel ?? 'Retry'}
        >
          <Text style={styles.actionText}>Retry</Text>
        </Pressable>
      )}
      {/* Label belongs on the touchable — with only a decorative icon inside,
          an unlabeled Pressable announces as an unnamed button. */}
      {onDismiss && (
        <Pressable
          style={styles.dismiss}
          onPress={onDismiss}
          android_ripple={ripple.onLight}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <Icon name="close" size={16} color={colors.onErrorContainer} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    ...presets.errorAlert,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  message: {
    ...presets.errorAlertText,
    flex: 1,
  },
  action: {
    backgroundColor: colors.onErrorContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  actionText: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  dismiss: {
    paddingLeft: spacing.xs,
  },
});

export default ErrorAlert;
