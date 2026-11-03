import { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';

import type { BatchSummary } from '../../types/batch';

import Icon from '../shared/Icon';
import StatTile, { StatRow } from '../shared/StatTile';

import { colors, presets, radius, ripple, spacing, typography } from '../../theme';

interface BatchCardProps {
  batch: BatchSummary;
  onPress: (year: number) => void;
}

function formatProgress(value: number | null): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${value}%`;
}

function BatchCardComponent({ batch, onPress }: BatchCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(batch.graduation_year)}
      android_ripple={ripple.onLight}
      accessibilityRole="button"
      accessibilityLabel={`Batch ${batch.graduation_year}. ${batch.total_graduates} graduates. Opens batch details.`}
    >
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Icon name="graduationCap" size={20} color={colors.onPrimaryFixedVariant} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.year}>Batch {batch.graduation_year}</Text>
          <Text style={styles.subtitle}>Tap to view details</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.outline} />
      </View>

      <View style={styles.divider} />

      <StatRow>
        <StatTile value={String(batch.total_graduates)} label="Graduates" />
        <StatTile value={formatProgress(batch.registration_progress)} label="Registration" />
        <StatTile value={formatProgress(batch.profile_completeness)} label="Completeness" />
      </StatRow>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Rounded square rather than a circle, matching the dashboard quick-access,
  // announcement and report tiles. One enclosure shape across the app.
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  year: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: spacing.md,
  },
});

const BatchCard = memo(BatchCardComponent);

export default BatchCard;
