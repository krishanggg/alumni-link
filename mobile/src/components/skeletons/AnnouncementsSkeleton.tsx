import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SkeletonBlock, SkeletonCard, SkeletonScreen, SkeletonTile } from '../shared/Skeleton';

import { colors, radius, spacing, typography } from '../../theme';

/**
 * Matches `AnnouncementCard`'s own metrics. Titles and messages vary in length,
 * so this uses representative multi-line shapes — single-line placeholders leave
 * the card noticeably shorter than real content.
 */
function AnnouncementCardSkeleton({
  titleLines,
  messageLines,
  metaLines = 1,
  hasCountdown = false,
  narrow = false,
}: {
  titleLines: number;
  messageLines: number;
  metaLines?: number;
  hasCountdown?: boolean;
  narrow?: boolean;
}) {
  return (
    <SkeletonCard style={styles.card}>
      <View style={styles.cardContent}>
        <SkeletonTile size={40} />
        <View style={styles.cardBody}>
          <SkeletonBlock width="35%" height={typography.overline.lineHeight} />
          <SkeletonBlock
            width="80%"
            height={typography.titleMd.lineHeight * titleLines}
            style={styles.title}
          />
          <SkeletonBlock
            width="100%"
            height={typography.bodySm.lineHeight * messageLines}
            style={styles.message}
          />
          {hasCountdown ? (
            <SkeletonBlock
              width="60%"
              height={typography.bodySm.lineHeight}
              style={styles.countdown}
            />
          ) : null}
          <SkeletonBlock
            width="45%"
            height={typography.labelSm.lineHeight * metaLines}
            style={styles.meta}
          />
          {narrow ? <View style={styles.narrowBottomSpacer} /> : null}
        </View>
      </View>
    </SkeletonCard>
  );
}

/**
 * The type pills above are static and render for real on the first frame, so the
 * filter is usable before its results exist.
 */
export function AnnouncementsSkeleton() {
  const { width } = useWindowDimensions();
  const isNarrow = width <= 320;

  return (
    <SkeletonScreen label="Loading announcements">
      <SkeletonBlock width={110} height={typography.headlineLg.lineHeight} style={styles.sectionTitle} />
      <View style={styles.list}>
        <AnnouncementCardSkeleton
          titleLines={2}
          messageLines={isNarrow ? 5 : 4}
          metaLines={isNarrow ? 2 : 1}
          hasCountdown
          narrow={isNarrow}
        />
        <AnnouncementCardSkeleton
          titleLines={isNarrow ? 4 : 3}
          messageLines={isNarrow ? 4 : 3}
          metaLines={isNarrow ? 2 : 1}
          narrow={isNarrow}
        />
        <AnnouncementCardSkeleton
          titleLines={isNarrow ? 3 : 2}
          messageLines={isNarrow ? 4 : 3}
          metaLines={isNarrow ? 2 : 1}
          narrow={isNarrow}
        />
      </View>
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderLeftWidth: 5,
    borderLeftColor: colors.outlineVariant,
    borderRadius: radius.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginTop: 2,
  },
  message: {
    marginTop: spacing.xs,
  },
  countdown: {
    marginTop: spacing.sm,
  },
  meta: {
    marginTop: spacing.sm,
  },
  narrowBottomSpacer: {
    height: spacing.sm,
  },
});
