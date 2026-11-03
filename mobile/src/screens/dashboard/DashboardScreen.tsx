import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../../contexts/AuthContext';
import Icon, { type IconName } from '../../components/shared/Icon';
import StatTile, { StatRow } from '../../components/shared/StatTile';
import ErrorAlert from '../../components/shared/ErrorAlert';
import { AnnouncementModal } from '../../components/announcements/AnnouncementModal';
import {
  DashboardAnnouncementCard,
  pickDashboardAnnouncement,
} from '../../components/announcements/DashboardAnnouncementCard';
import { DashboardSkeleton } from '../../components/skeletons/DashboardSkeleton';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useDashboard } from '../../hooks/useDashboard';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';
import { formatLastFirstName } from '../../utils/formatName';
import type { MainTabParamList } from '../../navigation/MainTabNavigator';

import { countDashboardAnnouncements } from './dashboardStats';

import {
  colors, extendedColors, layout, presets, radius, ripple, spacing, typography,
} from '../../theme';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

const PRIVACY_LABELS: Record<string, string> = {
  public: 'Public',
  private: 'Private',
};

type QuickLinkProps = {
  icon: IconName;
  tint: string;
  label: string;
  sub: string;
  onPress?: () => void;
};

/**
 * One Quick Access tile: a tinted rounded-square icon enclosure over the label,
 * the same shape used by the announcement and report tiles — one enclosure
 * shape shared across the app rather than a per-screen choice.
 */
function QuickLink({ icon, tint, label, sub, onPress }: QuickLinkProps) {
  const content = (
    <>
      <View style={[styles.quickLinkIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={20} color={colors.onSurfaceVariant} />
      </View>
      <Text style={[styles.quickLinkLabel, !onPress && styles.quickLinkLabelDisabled]}>
        {label}
      </Text>
      {onPress && <Text style={styles.quickLinkSub}>{sub}</Text>}
    </>
  );

  if (!onPress) {
    return <View style={[styles.quickLink, styles.quickLinkDisabled]}>{content}</View>;
  }

  return (
    <Pressable
      style={styles.quickLink}
      onPress={onPress}
      android_ripple={ripple.onLight}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${sub}`}
    >
      {content}
    </Pressable>
  );
}

function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    dashboard,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard();

  const showSkeleton = useDelayedFlag(isDashboardLoading, SKELETON_DELAY_MS);

  const {
    announcements,
    modalQueue,
    error: announcementsError,
    markSeen,
    refetch: refetchAnnouncements,
  } = useAnnouncements();

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([refetchDashboard(), refetchAnnouncements()]);
    setIsRefreshing(false);
  }

  const profile = dashboard?.profile;
  const batch = dashboard?.batch_summary;
  const firstName = user?.name?.split(' ')[0] ?? 'Alumni';

  const cardAnnouncement = pickDashboardAnnouncement(announcements);
  const announcementCounts = countDashboardAnnouncements(announcements);
  const isUpcomingEvent =
    cardAnnouncement?.type === 'event' &&
    Boolean(cardAnnouncement.target_date) &&
    new Date(cardAnnouncement.target_date as string).getTime() > Date.now();

  return (
    <View style={styles.root}>
      <AnnouncementModal queue={modalQueue} onGotIt={markSeen} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {dashboardError && (
          <ErrorAlert
            message={dashboardError}
            onRetry={() => refetchDashboard()}
            retryAccessibilityLabel="Retry loading dashboard"
            style={styles.alert}
          />
        )}

        {announcementsError && (
          <ErrorAlert
            message={announcementsError}
            onRetry={() => refetchAnnouncements()}
            retryAccessibilityLabel="Retry loading announcements"
            style={styles.alert}
          />
        )}

        {/* Only the two data-backed cards are skeletonised. Quick Access below
            depends on no response, so it renders for real on the first frame —
            whatever can be shown immediately, is. */}
        {isDashboardLoading && showSkeleton && <DashboardSkeleton />}

        {!isDashboardLoading && (
        <View style={[styles.card, styles.welcomeCard]}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeLabel}>WELCOME BACK,</Text>
              <Text style={styles.welcomeName} numberOfLines={2}>
                {profile ? formatLastFirstName(profile) : firstName}
              </Text>
              {profile && (
                <Text style={styles.welcomeMeta} numberOfLines={2}>
                  Batch {profile.graduation_year}
                  {profile.section_strand ? ` • ${profile.section_strand}` : ''}
                </Text>
              )}
            </View>
            {profile?.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {profile
                    ? `${(profile.first_name || '')[0]}${(profile.last_name || '')[0]}`
                    : firstName[0]}
                </Text>
              </View>
            )}
          </View>

          {profile ? (
            <View style={styles.profileDetails}>
              <View style={styles.detailRow}>
                <Icon name="school" size={14} color={colors.outline} />
                <Text style={styles.detailText} numberOfLines={2}>{profile.school}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="phone" size={14} color={colors.outline} />
                <Text style={styles.detailText}>
                  {profile.contact_number || 'No contact number on file'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="email" size={14} color={colors.outline} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {profile.contact_email || 'No contact email on file'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>Directory visibility:</Text>
                <Text style={styles.privacyBadge}>
                  {profile.privacy ? PRIVACY_LABELS[profile.privacy] : '—'}
                </Text>
              </View>
            </View>
          ) : (!dashboardError && (
            <Text style={styles.emptyText}>No alumni profile linked to your account.</Text>
          ))}
        </View>
        )}

        {!isDashboardLoading && (batch ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Batch Snapshot</Text>
            <Text style={styles.cardSubtitle}>Batch {batch.graduation_year}</Text>
            <StatRow style={styles.dashboardStatsGrid}>
              <StatTile
                icon="directory"
                iconTint={colors.primaryFixed}
                value={String(batch.total_graduates)}
                label="Total Graduates"
                style={styles.dashboardStatTile}
              />
              <StatTile
                icon="graduationCap"
                iconTint={extendedColors.categoricalViolet}
                value={`${batch.registration_progress}%`}
                label="Registration"
                style={styles.dashboardStatTile}
              />
              <StatTile
                icon="event"
                iconTint={colors.warningContainer}
                value={String(announcementCounts.events)}
                label="Events"
                style={styles.dashboardStatTile}
              />
              <StatTile
                icon="general"
                iconTint={colors.successContainer}
                value={String(announcementCounts.news)}
                label="News & Updates"
                style={styles.dashboardStatTile}
              />
            </StatRow>
            <View
              style={styles.completenessBlock}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Profile completeness: ${batch.profile_completeness} percent`}
            >
              <View style={styles.completenessLabels}>
                <Text style={styles.completenessLabel}>Profile Completeness</Text>
                <Text style={styles.completenessValue}>{batch.profile_completeness}%</Text>
              </View>
              <View
                style={styles.completenessTrack}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View
                  style={[
                    styles.completenessFill,
                    { width: `${Math.max(0, Math.min(100, batch.profile_completeness))}%` as `${number}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        ) : (!dashboardError && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Batch Snapshot</Text>
            <Text style={styles.emptyText}>No batch data available.</Text>
          </View>
        )))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickLinksGrid}>
            <QuickLink
              icon="directory"
              tint={colors.primaryFixed}
              label="Alumni Directory"
              sub="Browse fellow graduates"
              onPress={() => navigation.navigate('Directory')}
            />
            <QuickLink
              icon="graduationCap"
              tint={extendedColors.categoricalViolet}
              label="My Batch"
              sub="View your batch stats"
              onPress={profile?.graduation_year ? () => navigation.navigate('Batch') : undefined}
            />
            <QuickLink
              icon="reports"
              tint={colors.warningContainer}
              label="Reports"
              sub="View published reports"
              onPress={() => navigation.navigate('Reports')}
            />
            <QuickLink
              icon="edit"
              tint={colors.successContainer}
              label="Update Profile"
              sub="Edit your information"
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>

        {/* The dashboard's only announcement surface — full text lives on the
            Announcements tab. */}
        {cardAnnouncement && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isUpcomingEvent ? 'Upcoming Event' : 'Latest Announcement'}
            </Text>
            <DashboardAnnouncementCard
              announcement={cardAnnouncement}
              onPress={() => navigation.navigate('Announcements')}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: layout.cardGap,
    paddingTop: spacing.xl,
  },
  alert: {
    marginHorizontal: layout.cardGap,
    marginTop: layout.cardGap,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: spacing.xs,
  },
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
  welcomeLabel: {
    ...typography.overline,
    color: colors.outline,
  },
  welcomeName: {
    ...typography.headlineLg,
    color: colors.onSurface,
    marginTop: 2,
  },
  welcomeMeta: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.headlineSm,
    color: colors.onPrimaryFixedVariant,
  },
  profileDetails: {
    marginTop: layout.cardGap,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
    paddingTop: layout.cardGap,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    flexShrink: 1,
    minWidth: 0,
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  privacyBadge: {
    ...presets.badge,
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.onPrimaryFixedVariant,
    backgroundColor: colors.primaryFixed,
    overflow: 'hidden',
  },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginBottom: layout.cardGap,
  },
  dashboardStatsGrid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dashboardStatTile: {
    flexBasis: '45%',
    flexGrow: 1,
  },
  completenessBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  completenessLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completenessLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  completenessValue: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  completenessTrack: {
    height: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  completenessFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickLink: {
    ...presets.card,
    borderRadius: radius.md,
    // Two columns. `flexGrow` does the filling, so the basis only has to be big
    // enough to keep three tiles off one row and small enough to let two on.
    // 48% is not safe: at 320 dp the row is 288 dp, and 2 x 48% + the 12 dp gap
    // comes to 288.5 — half a dp of overflow that silently collapses the grid to
    // a single column. 45% clears the gap at both 320 and 366.7 dp.
    flexBasis: '45%',
    flexGrow: 1,
    padding: layout.cardGap,
    gap: spacing.xs,
  },
  quickLinkDisabled: {
    opacity: 0.5,
  },
  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickLinkLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  quickLinkLabelDisabled: {
    color: colors.onSurfaceVariant,
  },
  quickLinkSub: {
    ...typography.labelSm,
    color: colors.outline,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default DashboardScreen;
