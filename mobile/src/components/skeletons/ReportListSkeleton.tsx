import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonCard, SkeletonScreen, SkeletonTile } from '../shared/Skeleton';

import { layout, radius, spacing, typography } from '../../theme';

/** Matches the real card's box so nothing reflows when the report list loads. */
function ReportCardSkeleton() {
  return (
    <SkeletonCard style={styles.card}>
      <View style={styles.cardBody}>
        <SkeletonTile size={40} />
        <View style={styles.cardContent}>
          <SkeletonBlock width="85%" height={typography.titleMd.lineHeight} />
          <View style={styles.cardMeta}>
            <SkeletonBlock width={90} height={18} borderRadius={radius.sm} />
            <SkeletonBlock width={44} height={18} borderRadius={radius.sm} />
            <SkeletonBlock width={110} height={typography.labelSm.lineHeight} />
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <SkeletonBlock width="48%" height={44} borderRadius={radius.base} />
        <SkeletonBlock width="48%" height={44} borderRadius={radius.base} />
      </View>
    </SkeletonCard>
  );
}

export function ReportListSkeleton() {
  return (
    <SkeletonScreen label="Loading reports" style={styles.container}>
      {Array.from({ length: 3 }).map((_, index) => (
        <ReportCardSkeleton key={index} />
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
    padding: layout.cardGap,
    gap: spacing.md,
  },
  cardBody: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
