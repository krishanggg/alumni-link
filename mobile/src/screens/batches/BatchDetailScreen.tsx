import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, ActivityIndicator, RefreshControl,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { BatchAlumniItem } from '../../types/batch';
import type { BatchStackParamList } from '../../navigation/BatchNavigator';

import BatchStatisticsChart from '../../components/batches/BatchStatisticsChart';
import { AlumniProfileSheet } from '../../components/directory/AlumniProfileSheet';
import AlumniRow from '../../components/shared/AlumniRow';
import EmptyState from '../../components/shared/EmptyState';
import ErrorAlert from '../../components/shared/ErrorAlert';
import Icon from '../../components/shared/Icon';
import StatTile, { StatRow } from '../../components/shared/StatTile';
import { BatchDetailSkeleton } from '../../components/skeletons/BatchDetailSkeleton';
import { useBatchDetail } from '../../hooks/useBatches';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';
import { formatLastFirstName } from '../../utils/formatName';

import {
  colors, extendedColors, layout, presets, radius, ripple, spacing, typography,
} from '../../theme';

const DEBOUNCE_MS = 300;

type Props = NativeStackScreenProps<BatchStackParamList, 'BatchDetail'>;

function BatchDetailScreen({ route }: Props) {
  const { year } = route.params;

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_MS);

  const {
    entries,
    total,
    stats,
    isLoading,
    isFetching,
    isLoadingMore,
    error,
    loadMoreError,
    statsError,
    loadMore,
    refetch,
    refetchStats,
  } = useBatchDetail(year, debouncedSearch);

  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);
  const isSearchBusy = search !== debouncedSearch || isFetching;

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }

  const renderStats = () => {
    if (statsError) {
      return (
        <View style={styles.statsError}>
          <Text style={styles.statsErrorText}>{statsError}</Text>
          <Pressable onPress={() => refetchStats()} android_ripple={ripple.onLight} accessibilityRole="button">
            <Text style={styles.clearSearch}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!stats) {
      return null;
    }

    return (
      <View style={styles.statsSection}>
        {/* `raised` — these tiles sit on the page background, not inside a card. */}
        <StatRow style={styles.statsGrid}>
          <StatTile tone="raised" value={String(stats.total)} label="Total" />
          <StatTile tone="raised" value={`${stats.registration_progress}%`} label="Registration" />
          <StatTile tone="raised" value={`${stats.profile_completeness}%`} label="Completeness" />
        </StatRow>

        <BatchStatisticsChart gender={stats.gender} sections={stats.sections} />
      </View>
    );
  };

  const renderAlumniItem = ({ item }: { item: BatchAlumniItem }) => {
    const fullName = formatLastFirstName(item);

    return (
      <AlumniRow
        photoUrl={item.profile_photo_url}
        initials={`${item.first_name[0]}${item.last_name[0]}`}
        name={fullName}
        lines={[item.section_strand]}
        onPress={() => setSelectedId(item.id)}
        accessibilityLabel={
          item.section_strand
            ? `${fullName}, ${item.section_strand}. Opens profile.`
            : `${fullName}. Opens profile.`
        }
      />
    );
  };

  // While a search is active the title + stat cards + breakdown cards are collapsed away.
  // At 366 dp they run ~1,000 px, which would push every result below the fold: with the
  // keyboard open no match would be visible, and scrolling to one would dismiss the keyboard.
  // The stats return as soon as the term is cleared.
  const isSearching = search.length > 0;

  const renderHeader = () => (
    <View>
      {isSearching ? null : (
        <>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Batch {year}</Text>
          </View>

          {renderStats()}
        </>
      )}

      {isSearching && !error && (
        <View style={styles.filterBar}>
          <Text style={styles.filterCount}>
            Showing {total} result{total !== 1 ? 's' : ''} for &quot;{search}&quot;
          </Text>
          <Pressable onPress={() => setSearch('')} android_ripple={ripple.onLight} accessibilityRole="button">
            <Text style={styles.clearSearch}>Clear</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (loadMoreError) {
      return (
        <Pressable
          style={styles.footerError}
          onPress={() => loadMore()}
          android_ripple={ripple.onLight}
          accessibilityRole="button"
        >
          <Text style={styles.footerErrorText}>Could not load more results. Tap to retry.</Text>
        </Pressable>
      );
    }
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (error) {
      return null;
    }
    return (
      <EmptyState
        title="No alumni in this batch"
        subtitle={
          search ? 'Try adjusting your search.' : 'No records found for this graduation year.'
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* The search field depends on no response, so it stays mounted through
          the loading branch and is usable while the first page is in flight. */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={18} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search this batch by name"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.outline}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearchBusy && (
            <ActivityIndicator
              size="small"
              color={colors.outline}
              style={styles.searchSpinner}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </View>
      </View>

      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => refetch()}
          retryAccessibilityLabel="Retry loading batch details"
          style={styles.alert}
        />
      )}

      <View style={styles.listContainer}>
        {isLoading ? (
          showSkeleton ? <BatchDetailSkeleton /> : null
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderAlumniItem}
            contentContainerStyle={[
              styles.list,
              entries.length === 0 && !error && styles.listEmpty,
            ]}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>

      <AlumniProfileSheet
        alumniId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // The list's own content padding supplies the horizontal inset for everything
  // inside `ListHeaderComponent`, so the header blocks below add none of their
  // own — adding one here would double the inset.
  headerSection: {
    paddingTop: layout.cardGap,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  searchRow: {
    paddingHorizontal: layout.cardGap,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInputWrapper: {
    ...presets.inputRow,
  },
  searchInput: {
    ...presets.inputText,
  },
  searchSpinner: {
    marginLeft: spacing.xs,
  },
  statsError: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningContainer,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: extendedColors.warningContainerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statsErrorText: {
    flex: 1,
    ...typography.labelSm,
    color: colors.onWarningContainer,
  },
  statsSection: {
    paddingTop: spacing.xs,
  },
  statsGrid: {
    marginBottom: spacing.md,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  filterCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  clearSearch: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.accent,
  },
  alert: {
    marginHorizontal: layout.cardGap,
    marginBottom: spacing.sm,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.cardGap,
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  footerLoader: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerError: {
    paddingVertical: layout.cardGap,
    paddingHorizontal: layout.cardGap,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerErrorText: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.accent,
  },
});

export default BatchDetailScreen;
