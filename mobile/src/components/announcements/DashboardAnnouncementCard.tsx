import { View, Text, Pressable, StyleSheet } from 'react-native';

import Icon from '../shared/Icon';
import { CountdownTimer } from '../shared/CountdownTimer';
import { TYPE_STYLES, TYPE_ICONS, TYPE_LABELS } from './announcementDisplay';

import type { Announcement } from '../../types/announcement';

import { colors, presets, radius, ripple, spacing, typography } from '../../theme';

function publishedTime(announcement: Announcement): number {
  return new Date(announcement.published_at ?? announcement.created_at).getTime();
}

function eventTime(announcement: Announcement): number | null {
  if (announcement.type !== 'event' || !announcement.target_date) {
    return null;
  }
  return new Date(announcement.target_date).getTime();
}

/**
 * Which announcement the dashboard card carries: the soonest event still in
 * the future, falling back to the most recently published announcement of any
 * type.
 */
export function pickDashboardAnnouncement(
  announcements: Announcement[],
): Announcement | null {
  if (announcements.length === 0) {
    return null;
  }

  const now = Date.now();
  const upcoming = announcements
    .filter((a) => {
      const at = eventTime(a);
      return at !== null && at > now;
    })
    .sort((a, b) => (eventTime(a) as number) - (eventTime(b) as number));

  if (upcoming.length > 0) {
    return upcoming[0];
  }

  return [...announcements].sort((a, b) => publishedTime(b) - publishedTime(a))[0];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface DashboardAnnouncementCardProps {
  announcement: Announcement;
  onPress: () => void;
}

/**
 * The dashboard's browsable announcement surface: icon tile, title, a short
 * stack of the record's own fields, and an explicit "View Details" affordance.
 *
 * Every line here is a real column on `announcements`. The reference design puts
 * a venue under the date ("NHS Covered Court"); there is no location or venue
 * field anywhere in the v1 schema and one must not be invented to fill the line.
 */
export function DashboardAnnouncementCard({
  announcement,
  onPress,
}: DashboardAnnouncementCardProps) {
  const palette = TYPE_STYLES[announcement.type];
  const showCountdown =
    announcement.type === 'event' &&
    Boolean(announcement.target_date) &&
    new Date(announcement.target_date as string).getTime() > Date.now();

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      android_ripple={ripple.onLight}
      accessibilityRole="button"
      accessibilityLabel={`${TYPE_LABELS[announcement.type]}: ${announcement.title}. Opens announcements.`}
    >
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: palette.bg }]}>
          <Icon name={TYPE_ICONS[announcement.type]} size={20} color={palette.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {announcement.title}
          </Text>
          <Text style={styles.type}>{TYPE_LABELS[announcement.type]}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        {announcement.target_date ? (
          <Text style={styles.metaText}>{formatDate(announcement.target_date)}</Text>
        ) : (
          announcement.published_at && (
            <Text style={styles.metaText}>
              Published {formatDate(announcement.published_at)}
            </Text>
          )
        )}
        {showCountdown && announcement.target_date && (
          <CountdownTimer targetDate={announcement.target_date} style={styles.countdown} />
        )}
      </View>

      {/* Not a nested button: the whole card is the tap target and already
          announces itself, so this reads as a label rather than a second control
          a screen reader has to step through. The reference carries it because a
          card-wide tap target is otherwise undiscoverable. */}
      <View
        style={styles.viewDetails}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Icon name="chevronRight" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  type: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: spacing.xs,
  },
  meta: {
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  countdown: {
    fontSize: 13,
  },
  viewDetails: {
    ...presets.secondaryButton,
    height: 44,
  },
  viewDetailsText: {
    ...presets.secondaryButtonText,
  },
});
