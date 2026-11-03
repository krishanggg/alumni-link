import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonCircle, SkeletonScreen } from '../shared/Skeleton';

import { layout, radius, spacing, typography } from '../../theme';

/** Uses `presets.input` height so fields don't resize once they render for real. */
function FieldSkeleton({ labelWidth, hasHelper = false }: { labelWidth: number; hasHelper?: boolean }) {
  return (
    <View style={styles.fieldGroup}>
      <SkeletonBlock width={labelWidth} height={typography.labelMd.lineHeight} style={styles.label} />
      {hasHelper ? (
        <SkeletonBlock
          width={180}
          height={typography.labelSm.lineHeight}
          style={styles.helper}
        />
      ) : null}
      <SkeletonBlock width="100%" height={layout.controlHeight} borderRadius={radius.base} />
    </View>
  );
}

export function ProfileSettingsSkeleton() {
  return (
    <SkeletonScreen label="Loading profile settings" style={styles.container}>
      <View style={styles.photoSection}>
        <SkeletonCircle size={96} />
        <View style={styles.photoActions}>
          <SkeletonBlock width={130} height={40} borderRadius={radius.base} />
          <SkeletonBlock width={92} height={40} borderRadius={radius.base} />
        </View>
      </View>

      <SkeletonBlock
        width={200}
        height={typography.headlineSm.lineHeight}
        style={styles.sectionTitle}
      />

      <FieldSkeleton labelWidth={80} />
      <FieldSkeleton labelWidth={110} hasHelper />
      <FieldSkeleton labelWidth={90} />
    </SkeletonScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: layout.cardGap,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: layout.cardGap,
  },
  fieldGroup: {
    marginBottom: layout.cardGap,
  },
  label: {
    marginBottom: 6,
  },
  helper: {
    marginBottom: 6,
  },
});
