import { View, Text, StyleSheet } from 'react-native';

import Icon, { type IconName } from './Icon';

import { colors, radius, spacing } from '../../theme';

type FormSectionHeaderProps = {
  icon: IconName;
  label: string;
  /**
   * Soft container fill behind the icon. Defaults to the blue info tint; pass a
   * different one to keep sibling sections on a screen visually distinct.
   */
  tint?: string;
};

/**
 * Heading for a group of related form fields — the mobile counterpart of web's
 * `SectionHeader`: a tinted icon tile beside a small uppercase label.
 *
 * Web separates the groups by indenting the fields under the header and ruling a
 * hairline between sections; neither translates to a 360 dp screen, where the
 * indent would cost a tenth of the field width. The mobile equivalent is to give
 * each group its own card, which this header sits at the top of.
 */
export function FormSectionHeader({ icon, label, tint = colors.infoContainer }: FormSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: tint }]}>
        <Icon name={icon} size={14} color={colors.onSurfaceVariant} />
      </View>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: radius.base,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
});

export default FormSectionHeader;
