import { useState } from 'react';
import {
  View, FlatList,
  StyleSheet, RefreshControl, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { BatchStackParamList } from '../../navigation/BatchNavigator';

import BatchCard from '../../components/batches/BatchCard';
import EmptyState from '../../components/shared/EmptyState';
import ErrorAlert from '../../components/shared/ErrorAlert';
import { BatchListSkeleton } from '../../components/skeletons/BatchListSkeleton';
import { useBatches } from '../../hooks/useBatches';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';

import { colors, layout, spacing } from '../../theme';

type NavigationProp = NativeStackNavigationProp<BatchStackParamList>;

function BatchListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { batches, isLoading, error, refetch } = useBatches();
  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }

  function handleBatchPress(year: number) {
    navigation.navigate('BatchDetail', { year });
  }

  const renderEmpty = () => {
    if (error) {
      return null;
    }
    return (
      <EmptyState
        title="No batches available"
        subtitle="Batch data will appear once alumni records are added."
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {showSkeleton && <BatchListSkeleton />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Above the list, not instead of it — a failed refresh keeps the cards
          that already loaded on screen. */}
      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => refetch()}
          retryAccessibilityLabel="Retry loading batches"
          style={styles.alert}
        />
      )}

      <FlatList
        data={batches}
        keyExtractor={(item) => item.graduation_year.toString()}
        renderItem={({ item }) => (
          <BatchCard batch={item} onPress={handleBatchPress} />
        )}
        contentContainerStyle={[
          styles.list,
          batches.length === 0 && !error && styles.listEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  alert: {
    marginHorizontal: layout.cardGap,
    marginTop: layout.cardGap,
  },
  list: {
    padding: layout.cardGap,
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
});

export default BatchListScreen;
