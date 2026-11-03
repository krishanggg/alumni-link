import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SkeletonBlock, SkeletonScreen } from '../shared/Skeleton';

import { colors, layout, presets, radius, spacing, typography } from '../../theme';

/** The four toggle rows are known ahead of the response — only their values are not. */
const ROW_COUNT = 4;

export function NotificationSettingsSkeleton() {
  const { width } = useWindowDimensions();
  const isNarrow = width <= 320;

  return (
    <SkeletonScreen label="Loading notification preferences" style={styles.container}>
      <SkeletonBlock width={220} height={typography.headlineSm.lineHeight} style={styles.title} />
      <SkeletonBlock width="90%" height={typography.bodySm.lineHeight} />
      <SkeletonBlock
        width="60%"
        height={typography.bodySm.lineHeight}
        style={isNarrow ? styles.subtitleLine : styles.subtitleFinalLine}
      />
      {isNarrow ? (
        <SkeletonBlock
          width="75%"
          height={typography.bodySm.lineHeight}
          style={styles.subtitleFinalLine}
        />
      ) : null}

      <View style={styles.card}>
        {Array.from({ length: ROW_COUNT }).map((_, index) => (
          <View
            key={index}
            style={[styles.toggleRow, index !== ROW_COUNT - 1 && styles.toggleRowBorder]}
          >
            <View style={styles.toggleInfo}>
              <SkeletonBlock width="55%" height={typography.labelMd.lineHeight} />
              <SkeletonBlock
                width="90%"
                height={typography.labelSm.lineHeight * (isNarrow ? 3 : 2)}
                style={styles.description}
              />
            </View>
            {/* Matches the real Switch's footprint so the row doesn't narrow when it lands. */}
            <SkeletonBlock width={51} height={31} borderRadius={radius.full} />
          </View>
        ))}
      </View>
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: layout.cardGap,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitleLine: {
    marginTop: spacing.xs,
  },
  subtitleFinalLine: {
    marginTop: spacing.xs,
    marginBottom: layout.cardGap,
  },
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: 0,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.cardGap,
    gap: spacing.md,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  toggleInfo: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    marginTop: 2,
  },
});
