import {
  View, Text, Pressable, FlatList,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';

import { useDirectorySuggestions } from '../../hooks/useDirectory';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatLastFirstName } from '../../utils/formatName';

import { colors, ripple, typography } from '../../theme';

export const SUGGEST_MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

interface SearchSuggestionsProps {
  query: string;
  onSelect: (id: number) => void;
  onDismiss: () => void;
  topOffset?: number;
}

export function SearchSuggestions({ query, onSelect, onDismiss, topOffset = 60 }: SearchSuggestionsProps) {
  // The debounced term is the query key, so a stale response lands in its own
  // term's cache entry and can't overwrite the rendered one. Re-typing a term
  // already searched shows its results with no new request.
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const { suggestions, isLoading } = useDirectorySuggestions(debouncedQuery, SUGGEST_MIN_CHARS);

  if (query.length < SUGGEST_MIN_CHARS && suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, { top: topOffset }]}>
      <View style={styles.list}>
        {isLoading && suggestions.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : suggestions.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No matching alumni found</Text>
          </View>
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={styles.item}
                onPress={() => onSelect(item.id)}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
                accessibilityLabel={
                  `${formatLastFirstName(item)}. Batch ${item.graduation_year}` +
                  `${item.section_strand ? `, ${item.section_strand}` : ''}. Opens profile.`
                }
              >
                {item.profile_photo_url ? (
                  <Image
                    source={{ uri: item.profile_photo_url }}
                    style={styles.itemAvatar}
                  />
                ) : (
                  <View style={styles.itemAvatar}>
                    <Text style={styles.itemAvatarText}>
                      {item.first_name[0]}{item.last_name[0]}
                    </Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {formatLastFirstName(item)}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Batch {item.graduation_year}
                    {item.section_strand ? ` \u2022 ${item.section_strand}` : ''}
                  </Text>
                </View>
              </Pressable>
            )}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        )}
      </View>

      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        android_ripple={ripple.onLight}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  backdrop: {
    flex: 1,
  },
  list: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    maxHeight: 240,
    overflow: 'hidden',
  },
  loadingRow: {
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.outline,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  itemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  itemMeta: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
});
