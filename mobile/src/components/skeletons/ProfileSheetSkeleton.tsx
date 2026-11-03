import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonCircle, SkeletonScreen } from '../shared/Skeleton';

import { colors, layout, radius, spacing, typography } from '../../theme';

/** Matches the real sheet's metrics so it doesn't resize under the user's finger when the profile arrives. */
export function ProfileSheetSkeleton() {
  return (
    <SkeletonScreen label="Loading profile">
      <View style={styles.header}>
        <SkeletonCircle size={80} style={styles.avatar} />
        <SkeletonBlock width="70%" height={typography.headlineLg.lineHeight} />
        <SkeletonBlock width="50%" height={typography.bodySm.lineHeight} style={styles.school} />
      </View>

      <View style={styles.badgeRow}>
        <SkeletonBlock width={96} height={26} borderRadius={radius.sm} />
      </View>

      <View style={styles.fieldGroup}>
        <SkeletonBlock width={110} height={typography.labelSm.lineHeight} />
        <SkeletonBlock width="45%" height={typography.bodyMd.lineHeight} style={styles.fieldValue} />
      </View>
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: layout.cardGap,
    paddingBottom: layout.cardGap,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  school: {
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
    paddingTop: layout.cardGap,
    paddingBottom: spacing.sm,
  },
  fieldValue: {
    marginTop: spacing.xs,
  },
});
