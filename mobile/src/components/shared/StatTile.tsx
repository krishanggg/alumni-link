import { View, Text, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import Icon, { type IconName } from './Icon';

import { colors, radius, spacing } from '../../theme';

type StatTileProps = {
  value: string;
  label: string;
  /**
   * `sunken` tints the tile against a white card (the dashboard and batch-card
   * case); `raised` keeps it white against the page background (batch detail).
   */
  tone?: 'sunken' | 'raised';
  /** Optional reference-style icon tile used by the dashboard's four-tile block. */
  icon?: IconName;
  iconTint?: string;
  style?: ViewStyle;
};

/**
 * One tile of the three-across stat row. The single shared implementation —
 * dashboard, batch card, and batch detail all use this; do not write another.
 *
 * Value and label shrink to fit rather than wrap: long labels break mid-word
 * ("Completeness"), and long values strand a trailing "%" on its own line at
 * narrow widths.
 */
function StatTile({
  value,
  label,
  tone = 'sunken',
  icon,
  iconTint = colors.primaryFixed,
  style,
}: StatTileProps) {
  return (
    <View style={[styles.tile, tone === 'raised' ? styles.tileRaised : styles.tileSunken, style]}>
      <View style={icon ? styles.iconValueRow : undefined}>
        {icon ? (
          <View style={[styles.iconTile, { backgroundColor: iconTint }]}>
            <Icon name={icon} size={17} color={colors.onSurfaceVariant} />
          </View>
        ) : null}
        <Text
          style={[styles.value, icon ? styles.valueBesideIcon : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
      </View>
      <Text
        style={styles.label}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

/** The row the tiles sit in. Equal widths, so all tiles share one height. */
export function StatRow({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: radius.base,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  tileSunken: {
    backgroundColor: colors.surface,
  },
  tileRaised: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  iconValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // Stretched and left-packed rather than centred as a group — centring makes
    // the icon's x position depend on the value text's width, so icons drift out
    // of alignment with each other across tiles holding different-length values.
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radius.base,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    // Keeps percentages and counts from jittering in width as they animate or refresh.
    fontVariant: ['tabular-nums'],
  },
  /**
   * Only when an icon is present: the value takes the rest of the row so its box
   * is identical in every tile regardless of how many digits it holds. Without
   * this the icon is what moves instead.
   */
  valueBesideIcon: {
    flex: 1,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.outline,
    marginTop: spacing.xs,
    textAlign: 'center',
    // Wider letter-spacing breaks "Completeness" mid-word.
    letterSpacing: 0.2,
  },
});

export default StatTile;
