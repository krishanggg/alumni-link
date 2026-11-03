import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Icon from '../shared/Icon';
import { CountdownTimer } from '../shared/CountdownTimer';
import { TYPE_STYLES, TYPE_ICONS, TYPE_LABELS, batchReference } from './announcementDisplay';

import type { Announcement } from '../../types/announcement';

import { colors, presets, radius, spacing, typography } from '../../theme';

interface AnnouncementCardProps {
  announcement: Announcement;
}

function AnnouncementCardComponent({ announcement }: AnnouncementCardProps) {
  const palette = TYPE_STYLES[announcement.type];
  const icon = TYPE_ICONS[announcement.type];
  const isExpired = announcement.status === 'expired';

  return (
    <View style={[styles.card, isExpired && styles.cardExpired, { borderColor: palette.border }]}>
      <View style={styles.cardContent}>
        <View style={[styles.iconTile, { backgroundColor: palette.bg }]}>
          <Icon name={icon} size={18} color={palette.text} />
        </View>
        <View style={styles.cardBody}>
          {/* The reference labels each card with its type above the title. This
              renders the stored `type` column, not a new field. */}
          <Text style={[styles.typeLabel, { color: palette.text }]}>
            {TYPE_LABELS[announcement.type].toUpperCase()}
          </Text>
          <Text style={styles.title}>{announcement.title}</Text>
          <Text style={styles.message}>{announcement.message}</Text>

          {announcement.type === 'event' && announcement.target_date && (
            <View style={styles.countdownRow}>
              <CountdownTimer targetDate={announcement.target_date} />
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{batchReference(announcement)}</Text>
            {announcement.published_at && (
              <Text style={styles.metaText}>
                Published {new Date(announcement.published_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 5,
  },
  cardExpired: {
    opacity: 0.7,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  // Rounded square, the enclosure shape shared with the dashboard quick-access,
  // batch and report tiles.
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    ...typography.overline,
    marginBottom: 2,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  message: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  countdownRow: {
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.labelSm,
    color: colors.outline,
  },
});

export const AnnouncementCard = memo(AnnouncementCardComponent);
