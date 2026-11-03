import { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';

import { DirectoryCard } from '../../components/directory/DirectoryCard';
import Icon from '../../components/shared/Icon';
import StatTile, { StatRow } from '../../components/shared/StatTile';
import EmptyState from '../../components/shared/EmptyState';
import ErrorAlert from '../../components/shared/ErrorAlert';
import { SearchSuggestions, SUGGEST_MIN_CHARS } from '../../components/directory/SearchSuggestions';
import { FilterBottomSheet } from '../../components/directory/FilterBottomSheet';
import { AlumniProfileSheet } from '../../components/directory/AlumniProfileSheet';
import { DirectorySkeleton } from '../../components/skeletons/DirectorySkeleton';
import { useDirectory, useDirectoryFilterOptions } from '../../hooks/useDirectory';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';

import { colors, layout, presets, radius, ripple, spacing, typography } from '../../theme';

const DEBOUNCE_MS = 300;

function DirectoryScreen() {
  const [search, setSearch] = useState('');
  const [graduationYear, setGraduationYear] = useState<number | undefined>(undefined);
  const [section, setSection] = useState<string | undefined>(undefined);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // The debounced values are what reach the query key, so a term the user has
  // typed past resolves into its own cache entry instead of racing the current
  // one.
  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_MS);
  const debouncedYear = useDebouncedValue(graduationYear, DEBOUNCE_MS);
  const debouncedSection = useDebouncedValue(section, DEBOUNCE_MS);

  const {
    entries,
    total,
    stats,
    isLoading,
    isFetching,
    isLoadingMore,
    error,
    loadMoreError,
    loadMore,
    refetch,
  } = useDirectory({
    search: debouncedSearch,
    graduationYear: debouncedYear,
    section: debouncedSection,
  });

  const { filterOptions } = useDirectoryFilterOptions();

  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);
  // The debounce still has to elapse and the query still has to land after the
  // last keystroke; without this the input looks inert for that whole beat.
  const isSearchBusy = search !== debouncedSearch || isFetching;

  const hasActiveFilters = search.length > 0 || graduationYear !== undefined || section !== undefined;
  const activeFilterCount = (graduationYear !== undefined ? 1 : 0) + (section !== undefined ? 1 : 0);

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }

  function handleSearchChange(text: string) {
    setSearch(text);
    setShowSuggestions(text.length >= SUGGEST_MIN_CHARS);
  }

  function handleSearchFocus() {
    if (search.length >= SUGGEST_MIN_CHARS) {
      setShowSuggestions(true);
    }
  }

  function clearFilters() {
    setSearch('');
    setGraduationYear(undefined);
    setSection(undefined);
  }

  function clearSheetFilters() {
    setGraduationYear(undefined);
    setSection(undefined);
  }

  const renderStats = () => {
    if (!stats) {
      return null;
    }

    return (
      <StatRow style={styles.statsRow}>
        <StatTile tone="raised" value={String(stats.total_alumni)} label="Total Alumni" />
        <StatTile tone="raised" value={String(stats.batch_count)} label="Batches" />
        <StatTile
          tone="raised"
          value={stats.most_recent_batch !== null ? String(stats.most_recent_batch) : '—'}
          label="Most Recent"
        />
      </StatRow>
    );
  };

  const renderHeader = () => (
    <View>
      {renderStats()}

      {hasActiveFilters && (
        <View style={styles.filterBar}>
          <Text style={styles.filterCount}>
            Showing {total} result{total !== 1 ? 's' : ''}
            {search ? ` for "${search}"` : ''}
          </Text>
          <Pressable onPress={clearFilters} android_ripple={ripple.onLight} accessibilityRole="button">
            <Text style={styles.clearFilters}>Clear</Text>
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
        title="No alumni found"
        subtitle="Try adjusting your search or filters."
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and filters sit outside the loading branch — they depend on no
          response, so they stay usable while the first page is in flight. */}
      <View style={styles.searchRow}>
        {/* Icon-prefixed input row, the same treatment used by LoginScreen. */}
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={18} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search alumni by name"
            value={search}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
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
        {/* Icon-only control, so the button carries the label itself — the glyph
            inside is decorative and announces nothing. The active filter count
            goes in the label because the badge is a bare number out of context. */}
        <Pressable
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
          android_ripple={ripple.onLight}
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0
              ? `Filters, ${activeFilterCount} applied`
              : 'Filters'
          }
        >
          <Icon
            name="filter"
            size={18}
            color={activeFilterCount > 0 ? colors.accent : colors.onSurfaceVariant}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Shown above the list rather than instead of it — on a failed refresh the
          already-loaded rows stay on screen behind the alert. */}
      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => refetch()}
          retryAccessibilityLabel="Retry loading directory"
          style={styles.alert}
        />
      )}

      <View style={styles.listContainer}>
        {isLoading ? (
          showSkeleton ? <DirectorySkeleton /> : null
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <DirectoryCard entry={item} onPress={setSelectedId} />
            )}
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

      {showSuggestions && (
        <SearchSuggestions
          query={search}
          onSelect={(id) => { setShowSuggestions(false); setSelectedId(id); }}
          onDismiss={() => setShowSuggestions(false)}
        />
      )}

      <FilterBottomSheet
        visible={showFilters}
        filterOptions={filterOptions}
        graduationYear={graduationYear}
        section={section}
        activeFilterCount={activeFilterCount}
        onYearChange={setGraduationYear}
        onSectionChange={setSection}
        onClear={clearSheetFilters}
        onClose={() => setShowFilters(false)}
      />

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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.cardGap,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInputWrapper: {
    ...presets.inputRow,
    flex: 1,
  },
  searchInput: {
    ...presets.inputText,
  },
  searchSpinner: {
    marginLeft: spacing.xs,
  },
  filterButton: {
    // Square on the input row's own height, so the two controls align.
    width: layout.controlHeight,
    height: layout.controlHeight,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.infoContainer,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    ...typography.overline,
    letterSpacing: 0,
    color: colors.onPrimary,
  },
  statsRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  // The stats row, filter bar and cards all sit inside the list's own
  // `paddingHorizontal`, so neither of the first two adds its own — doing so
  // would double the inset to 32 dp against the cards' 16 and leave the header
  // visibly narrower than the list it heads.
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
  clearFilters: {
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

export default DirectoryScreen;
