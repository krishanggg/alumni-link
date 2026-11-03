import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonScreen } from '../shared/Skeleton';
import { AlumniRowSkeleton } from './AlumniRowSkeleton';

import { colors, layout, radius, spacing } from '../../theme';

/**
 * The search field and filter button above don't depend on the response, so they
 * stay mounted and only the stats/list below are skeletonised — lets you start
 * typing while the first page is still in flight.
 */
export function DirectorySkeleton() {
  return (
    <SkeletonScreen label="Loading alumni directory" style={styles.container}>
      <View style={styles.statsRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.statTile}>
            <SkeletonBlock width="60%" height={28} borderRadius={radius.sm} />
            <SkeletonBlock width="80%" height={15} style={styles.statLabel} />
          </View>
        ))}
      </View>

      <View style={styles.list}>
        {Array.from({ length: 6 }).map((_, index) => (
          <AlumniRowSkeleton key={index} lines={2} />
        ))}
      </View>
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.cardGap,
  },
  // Matches StatRow + StatTile(tone="raised") dimensions.
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  statTile: {
    flex: 1,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
});
