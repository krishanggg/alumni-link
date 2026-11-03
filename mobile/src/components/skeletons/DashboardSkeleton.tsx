import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SkeletonBlock, SkeletonCircle, SkeletonScreen } from '../shared/Skeleton';

import { colors, layout, presets, radius, spacing, typography } from '../../theme';

const DETAIL_WIDTHS = ['70%', '55%', '65%', '45%'] as const;

/**
 * Quick Access is deliberately absent — it's four static tiles that don't depend
 * on the response, so it renders for real on the first frame while only the
 * data-backed cards below are skeletonised.
 */
export function DashboardSkeleton() {
  const { width } = useWindowDimensions();
  const isNarrow = width <= 320;

  return (
    <SkeletonScreen label="Loading dashboard">
      <View style={[styles.card, styles.welcomeCard]}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeText}>
            <SkeletonBlock width={110} height={typography.overline.lineHeight} />
            <SkeletonBlock
              width="75%"
              height={typography.headlineLg.lineHeight * (isNarrow ? 2 : 1)}
              style={styles.name}
            />
            <SkeletonBlock width="50%" height={typography.labelSm.lineHeight} style={styles.meta} />
          </View>
          <SkeletonCircle size={64} />
        </View>

        <View style={styles.profileDetails}>
          {DETAIL_WIDTHS.map((detailWidth, index) => (
            <SkeletonBlock
              key={detailWidth}
              width={detailWidth}
              height={typography.labelSm.lineHeight * (isNarrow && index === 0 ? 2 : 1)}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <SkeletonBlock width={150} height={typography.headlineSm.lineHeight} />
        <SkeletonBlock width={90} height={typography.bodySm.lineHeight} style={styles.subtitle} />
        <View style={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.statTile}>
              <SkeletonBlock width="70%" height={32} borderRadius={radius.base} />
              <SkeletonBlock width="80%" height={14} style={styles.statLabel} />
            </View>
          ))}
        </View>
        <View style={styles.completenessBlock}>
          <SkeletonBlock width="45%" height={typography.labelSm.lineHeight} />
          <SkeletonBlock width="100%" height={spacing.sm} />
        </View>
      </View>
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  // Matches DashboardScreen's own `card` / `welcomeCard` so the box stays the
  // same size before and after the response lands.
  card: {
    ...presets.card,
    borderRadius: radius.md,
    marginHorizontal: layout.cardGap,
    marginTop: layout.cardGap,
    padding: layout.cardGap,
  },
  welcomeCard: {
    marginTop: spacing.xl,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  welcomeText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    marginTop: 2,
  },
  meta: {
    marginTop: spacing.xs,
  },
  profileDetails: {
    marginTop: layout.cardGap,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
    paddingTop: layout.cardGap,
    gap: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: layout.cardGap,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Matches StatTile's box.
  statTile: {
    flexBasis: '45%',
    flexGrow: 1,
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
  completenessBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
