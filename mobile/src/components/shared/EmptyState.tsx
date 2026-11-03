import { View, Text, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import Icon, { type IconName } from './Icon';

import { colors, layout, spacing, typography } from '../../theme';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  /** Decorative — the title beneath it already says what is empty. */
  icon?: IconName;
  style?: ViewStyle;
};

/** The "nothing here" block every list screen shows. The single shared implementation. */
export function EmptyState({ title, subtitle, icon, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <Icon name={icon} size={48} color={colors.outlineVariant} style={styles.icon} />}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: layout.cardGap,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.outline,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default EmptyState;
