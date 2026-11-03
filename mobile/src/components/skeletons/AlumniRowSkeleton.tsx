import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonCard, SkeletonCircle } from '../shared/Skeleton';

import { radius, spacing, typography } from '../../theme';

const META_WIDTHS = ['55%', '70%'] as const;

/**
 * `lines` must match the caller's real secondary-line count (directory shows
 * batch and school, batch roster shows section only) — row height follows it,
 * so a wrong count causes a reflow when data lands.
 */
export function AlumniRowSkeleton({ lines = 2 }: { lines?: 1 | 2 }) {
  return (
    <SkeletonCard style={styles.row}>
      <SkeletonCircle size={48} />
      <View style={styles.info}>
        <SkeletonBlock width="65%" height={typography.labelMd.lineHeight} />
        {META_WIDTHS.slice(0, lines).map((width) => (
          <SkeletonBlock
            key={width}
            width={width}
            height={typography.labelSm.lineHeight}
            style={styles.meta}
          />
        ))}
      </View>
      {/* Reserves the chevron's box so the text column doesn't widen when it lands. */}
      <View style={styles.chevron} />
    </SkeletonCard>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    marginTop: 2,
  },
  chevron: {
    width: 20,
    height: 20,
  },
});
