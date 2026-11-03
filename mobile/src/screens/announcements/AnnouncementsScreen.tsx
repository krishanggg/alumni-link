import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import Icon from '../../components/shared/Icon';
import EmptyState from '../../components/shared/EmptyState';
import { AnnouncementCard } from '../../components/announcements/AnnouncementCard';
import { AnnouncementsSkeleton } from '../../components/skeletons/AnnouncementsSkeleton';
import { useAnnouncementList } from '../../hooks/useAnnouncementList';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';
import {
  ANNOUNCEMENT_FILTERS,
  announcementTypeParam,
  type AnnouncementTypeFilter,
} from './announcementFilters';

import type { Announcement } from '../../types/announcement';

import { colors, layout, presets, ripple, spacing, typography } from '../../theme';

function isActive(announcement: Announcement): boolean {
  if (announcement.status !== 'published') {
    return false;
  }

  if (announcement.type === 'event' && announcement.target_date) {
    return new Date(announcement.target_date).getTime() > Date.now();
  }

  return true;
}

/** Opacity the outgoing list holds at while the next filter's rows are in flight. */
const SWAPPING_OPACITY = 0.35;

function AnnouncementsScreen() {
  const [typeFilter, setTypeFilter] = useState<AnnouncementTypeFilter>('all');
  const [showPast, setShowPast] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    announcements,
    isLoading,
    isSwapping,
    isLoadingMore,
    hasMore,
    error,
    loadMoreError,
    loadMore,
    refetch,
  } = useAnnouncementList(announcementTypeParam(typeFilter));

  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }

  // The type filter is applied by the API. The active/past split stays here:
  // it depends on the current clock, not on a stored column.
  const active = announcements.filter(isActive);
  const past = announcements.filter((a) => !isActive(a));

  /**
   * Selecting a type keeps the current list on screen and dims it rather than
   * tearing it down for a spinner — `keepPreviousData` holds the outgoing rows
   * while the incoming ones load. The pills restyle on the tap frame, so the
   * control feels immediate however slow the response is.
   *
   * The type is part of the query key, so a late response for a deselected
   * pill lands in that pill's own cache entry, and a page-2 fetch in flight
   * accumulates under the type it was requested for.
   */
  const listOpacity = isSwapping ? SWAPPING_OPACITY : 1;

  const filterRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      style={styles.filterScroller}
    >
      {ANNOUNCEMENT_FILTERS.map((filter) => {
        const selected = filter.value === typeFilter;
        return (
          <Pressable
            key={filter.value}
            style={[styles.filterPill, selected && styles.filterPillSelected]}
            onPress={() => setTypeFilter(filter.value)}
            android_ripple={selected ? ripple.onDark : ripple.onLight}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${filter.label} announcements`}
          >
            <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (isLoading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={false}
      >
        {filterRow}
        {showSkeleton && <AnnouncementsSkeleton />}
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <EmptyState title="Could not load announcements" subtitle={error} />
        <Pressable
          style={styles.retryButton}
          onPress={() => refetch()}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel="Retry loading announcements"
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      {filterRow}

      <View style={{ opacity: listOpacity }}>
        <Text style={styles.sectionTitle}>Active</Text>

        {active.length === 0 ? (
          <EmptyState
            title="No active announcements"
            subtitle={typeFilter === 'all'
              ? 'Check back later for updates.'
              : 'No announcements of this type yet.'}
          />
        ) : (
          <View style={styles.list}>
            {active.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </View>
        )}

        {past.length > 0 && (
          <View style={styles.pastSection}>
            <Pressable
              style={styles.pastToggle}
              onPress={() => setShowPast((prev) => !prev)}
              android_ripple={ripple.onLight}
              accessibilityRole="button"
              accessibilityState={{ expanded: showPast }}
              accessibilityLabel="Past announcements"
            >
              <Text style={styles.pastToggleText}>Past Announcements</Text>
              {/* Decorative — the toggle itself carries accessibilityState.expanded,
                  so the arrow duplicates information TalkBack already announces.
                  `Icon` hides it on both platforms, not just iOS. */}
              <Icon
                name={showPast ? 'chevronUp' : 'chevronDown'}
                size={16}
                color={colors.onSurfaceVariant}
              />
            </Pressable>

            {showPast && (
              <View style={styles.list}>
                {past.map((a) => (
                  <AnnouncementCard key={a.id} announcement={a} />
                ))}
              </View>
            )}
          </View>
        )}

        {hasMore && (
          <View style={styles.loadMoreContainer}>
            {loadMoreError && (
              <Text style={styles.loadMoreError} role="alert">
                {loadMoreError}
              </Text>
            )}
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => loadMore()}
              disabled={isLoadingMore}
              android_ripple={ripple.onLight}
              accessibilityRole="button"
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
              ) : (
                <Text style={styles.loadMoreText}>Load older announcements</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    paddingHorizontal: layout.cardGap,
    paddingTop: layout.cardGap,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.cardGap,
  },
  sectionTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  filterScroller: {
    marginHorizontal: -layout.cardGap,
    marginBottom: spacing.lg,
  },
  filterRow: {
    paddingHorizontal: layout.cardGap,
    gap: spacing.sm,
  },
  filterPill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  filterPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  filterTextSelected: {
    color: colors.onPrimary,
  },
  list: {
    gap: spacing.md,
  },
  pastSection: {
    marginTop: spacing.xxl,
  },
  pastToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pastToggleText: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  loadMoreContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadMoreError: {
    ...typography.labelSm,
    color: colors.error,
    textAlign: 'center',
  },
  loadMoreButton: {
    ...presets.secondaryButton,
    paddingHorizontal: layout.cardGap,
    minWidth: 200,
  },
  loadMoreText: {
    ...presets.secondaryButtonText,
  },
  retryButton: {
    ...presets.primaryButton,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    ...presets.primaryButtonText,
    ...typography.labelMd,
  },
});

export default AnnouncementsScreen;
