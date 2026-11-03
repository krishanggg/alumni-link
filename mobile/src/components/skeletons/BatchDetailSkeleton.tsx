import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonCard, SkeletonCircle, SkeletonScreen } from '../shared/Skeleton';
import { AlumniRowSkeleton } from './AlumniRowSkeleton';

import { colors, layout, radius, spacing, typography } from '../../theme';

/** Matches the diameter and plot height `BatchStatisticsChart` draws with. */
const DONUT_SIZE = 136;
const PLOT_HEIGHT = 132;

const LEGEND_WIDTHS = ['85%', '70%', '55%'] as const;
const BAR_FRACTIONS = [0.9, 0.65, 0.45, 0.3] as const;

function ChartsSkeleton() {
  return (
    <>
      <SkeletonCard style={styles.chartCard}>
        <SkeletonBlock width={140} height={typography.labelMd.lineHeight} style={styles.chartTitle} />
        <View style={styles.donutContent}>
          <SkeletonCircle size={DONUT_SIZE} />
          <View style={styles.legend}>
            {LEGEND_WIDTHS.map((width) => (
              <SkeletonBlock key={width} width={width} height={typography.labelSm.lineHeight} />
            ))}
          </View>
        </View>
      </SkeletonCard>

      <SkeletonCard style={styles.chartCard}>
        <SkeletonBlock width={120} height={typography.labelMd.lineHeight} style={styles.chartTitle} />
        <View style={styles.barChart}>
          {BAR_FRACTIONS.map((fraction) => (
            <View key={fraction} style={styles.barColumn}>
              <SkeletonBlock width={24} height={typography.labelSm.lineHeight} />
              <View style={styles.barTrack}>
                <SkeletonBlock
                  width="100%"
                  height={PLOT_HEIGHT * fraction}
                  borderRadius={radius.base}
                />
              </View>
              <SkeletonBlock width="85%" height={typography.labelSm.lineHeight} />
            </View>
          ))}
        </View>
      </SkeletonCard>
    </>
  );
}

/** The search field above renders for real — it doesn't depend on the response. */
export function BatchDetailSkeleton() {
  return (
    <SkeletonScreen label="Loading batch details" style={styles.container}>
      <View style={styles.headerSection}>
        <SkeletonBlock width={150} height={typography.headlineLg.lineHeight} />
      </View>

      <View style={styles.statsRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.statTile}>
            <SkeletonBlock width="60%" height={28} borderRadius={radius.sm} />
            <SkeletonBlock width="85%" height={15} style={styles.statLabel} />
          </View>
        ))}
      </View>

      <ChartsSkeleton />

      <View style={styles.list}>
        {Array.from({ length: 4 }).map((_, index) => (
          <AlumniRowSkeleton key={index} lines={1} />
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
  headerSection: {
    paddingTop: layout.cardGap,
    paddingBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  // Matches StatTile(tone="raised").
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
  chartCard: {
    borderRadius: radius.md,
    padding: layout.cardGap,
    marginBottom: spacing.md,
  },
  chartTitle: {
    marginBottom: spacing.md,
  },
  donutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: spacing.lg,
  },
  legend: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    alignSelf: 'stretch',
    height: PLOT_HEIGHT,
    borderRadius: radius.base,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  list: {
    gap: spacing.md,
  },
});
