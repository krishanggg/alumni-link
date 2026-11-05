import {
  View, Text, Switch, Pressable,
  ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';

import ErrorAlert from '../../components/shared/ErrorAlert';
import { NotificationSettingsSkeleton } from '../../components/skeletons/NotificationSettingsSkeleton';
import { useNotificationPreferences } from '../../hooks/useSettings';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';
import type { NotificationPreferences } from '../../types/settings';

import { colors, layout, presets, radius, ripple, spacing, typography } from '../../theme';

interface ToggleItem {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

const TOGGLES: ToggleItem[] = [
  {
    key: 'account_activity',
    label: 'Account Activity',
    description: 'Get notified about password changes and login from new devices',
  },
  {
    key: 'alumni_record_updates',
    label: 'Alumni Record Updates',
    description: 'Get notified when your linked alumni record is modified by an admin',
  },
  {
    key: 'system_announcements',
    label: 'System Announcements',
    description: 'Get notified about new announcements from the school',
  },
  {
    key: 'report_completion',
    label: 'Report Completion',
    description: 'Get notified when a new report is completed',
  },
];

function NotificationSettingsScreen() {
  // Optimistic write: the cached preference flips on the tap frame, rolls back
  // on failure, and is seeded from the response on success — the Switch never
  // waits on a round trip.
  const { preferences, isLoading, error, isSaving, saveError, setPreference, refetch } =
    useNotificationPreferences();
  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);

  if (isLoading) {
    return showSkeleton ? (
      <NotificationSettingsSkeleton />
    ) : (
      <View style={styles.container} />
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => refetch()}
          style={styles.retryButton}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel="Retry loading notification settings"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      <Text style={styles.subtitle}>
        Choose which email and push notifications you receive.{'\n'}
        Changes are saved automatically.
      </Text>

      <View style={styles.card}>
        {TOGGLES.map((item) => (
          <View
            key={item.key}
            style={[
              styles.toggleRow,
              item.key !== TOGGLES[TOGGLES.length - 1].key && styles.toggleRowBorder,
            ]}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Text style={styles.toggleDescription}>{item.description}</Text>
            </View>
            <Switch
              value={preferences?.[item.key] ?? false}
              onValueChange={(value) => setPreference(item.key, value)}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryFixedDim }}
              thumbColor={preferences?.[item.key] ? colors.accent : colors.surfaceContainerLow}
              disabled={isSaving}
            />
          </View>
        ))}
      </View>

      {isSaving ? (
        <View style={styles.savingBar}>
          <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      ) : null}

      {saveError ? <ErrorAlert message={saveError} style={styles.alert} /> : null}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    padding: layout.cardGap,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.cardGap,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.outline,
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
  toggleLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: 2,
  },
  toggleDescription: {
    ...typography.labelSm,
    color: colors.outline,
  },
  savingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: layout.cardGap,
    paddingVertical: spacing.sm,
  },
  savingText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  alert: {
    marginTop: layout.cardGap,
  },
  errorText: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  // Same primary-button treatment used everywhere else in the app.
  retryButton: {
    ...presets.primaryButton,
    paddingHorizontal: spacing.xl,
  },
  retryText: {
    ...presets.primaryButtonText,
    ...typography.labelMd,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default NotificationSettingsScreen;
