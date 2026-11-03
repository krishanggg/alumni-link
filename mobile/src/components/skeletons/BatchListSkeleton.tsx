import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonCard, SkeletonScreen, SkeletonTile } from '../shared/Skeleton';

import { colors, layout, radius, spacing, typography } from '../../theme';

/** Matches `BatchCard`'s own metrics so nothing reflows when it loads. */
function BatchCardSkeleton() {
  return (
    <SkeletonCard style={styles.card}>
      <View style={styles.header}>
        <SkeletonTile size={44} />
        <View style={styles.headerText}>
          <SkeletonBlock width={110} height={typography.titleMd.lineHeight} />
          <SkeletonBlock width={130} height={typography.labelSm.lineHeight} style={styles.subtitle} />
        </View>
        <View style={styles.chevron} />
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.statTile}>
            <SkeletonBlock width="60%" height={28} borderRadius={radius.sm} />
            <SkeletonBlock width="85%" height={15} style={styles.statLabel} />
          </View>
        ))}
      </View>
    </SkeletonCard>
  );
}

export function BatchListSkeleton() {
  return (
    <SkeletonScreen label="Loading batches" style={styles.container}>
      {Array.from({ length: 4 }).map((_, index) => (
        <BatchCardSkeleton key={index} />
      ))}
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: layout.cardGap,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  chevron: {
    width: 20,
    height: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Matches StatTile's default `sunken` tone.
  statTile: {
    flex: 1,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    marginTop: spacing.xs,
  },
});
