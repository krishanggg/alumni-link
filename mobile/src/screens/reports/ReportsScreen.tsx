import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Pressable,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ReportsStackParamList } from '../../navigation/ReportsNavigator';
import type { ReportRecord, ReportFormat } from '../../types/report';

import * as reportService from '../../services/reportService';
import Icon from '../../components/shared/Icon';
import EmptyState from '../../components/shared/EmptyState';
import ErrorAlert from '../../components/shared/ErrorAlert';
import ReportViewer from '../../components/reports/ReportViewer';
import { ReportListSkeleton } from '../../components/skeletons/ReportListSkeleton';
import { usePublishedReports } from '../../hooks/useReports';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';
import {
  REPORT_TYPE_COLORS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
} from '../../components/reports/reportDisplay';
import { ApiError } from '../../services/api';

import { colors, layout, presets, radius, ripple, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ReportList'>;

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: 'PDF',
  xlsx: 'Excel',
  csv: 'CSV',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReportsScreen({ route }: Props) {
  const { reportType } = route.params;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportRecord | null>(null);
  const [webViewWindow, setWebViewWindow] = useState<Window | null>(null);
  // A download failure is a one-off action error, not a state of the list —
  // stays local rather than being folded into the query's error.
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    reports,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreError,
    loadMore,
    refetch,
  } = usePublishedReports(reportType);

  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);

  async function handleRefresh() {
    setIsRefreshing(true);
    setDownloadError(null);
    await refetch();
    setIsRefreshing(false);
  }

  const handleDownload = useCallback(async (report: ReportRecord) => {
    setDownloadingId(report.id);
    setDownloadError(null);
    try {
      await reportService.downloadReport(report.id, report.title, report.format as ReportFormat);
    } catch (e) {
      setDownloadError(
        e instanceof ApiError ? e.message : 'Could not download the report. Please try again.',
      );
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleView = useCallback((report: ReportRecord) => {
    if (Platform.OS === 'web') {
      // Open synchronously from the tap so the browser allows the new tab;
      // the authenticated PDF fetch completes in ReportViewer.
      const reportWindow = window.open('about:blank', '_blank');
      if (!reportWindow) {
        setDownloadError('Please allow pop-ups to view the report.');
        return;
      }
      setWebViewWindow(reportWindow);
    }
    setViewingReport(report);
  }, []);

  const keyExtractor = useCallback((item: ReportRecord) => item.id.toString(), []);

  const renderReportCard = useCallback(({ item }: { item: ReportRecord }) => {
    const isDownloading = downloadingId === item.id;
    const type = item.report_type;
    const icon = REPORT_TYPE_ICONS[type] ?? 'reports';
    const bgColor = REPORT_TYPE_COLORS[type] ?? colors.surfaceContainer;
    const typeLabel = REPORT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
    const formatLabel = FORMAT_LABELS[item.format as ReportFormat] ?? item.format.toUpperCase();

    return (
      <View style={styles.card}>
        <View style={styles.cardBody}>
          <View style={[styles.cardIcon, { backgroundColor: bgColor }]}>
            <Icon name={icon} size={20} color={colors.onSurfaceVariant} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeLabel}>{typeLabel}</Text>
              </View>
              <View style={styles.formatBadge}>
                <Text style={styles.formatLabel}>{formatLabel}</Text>
              </View>
              <Text style={styles.publishedDate}>
                Published {formatDate(item.published_at)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          {/* Every card renders an identical "View"/"Download" pair, so without a label
              naming the report a screen reader announces a run of indistinguishable
              buttons. The download glyph is decorative — the touchable above already
              names the action, so `Icon` hides it by default. */}
          <Pressable
            style={[styles.viewButton, isDownloading && styles.actionButtonDisabled]}
            onPress={() => handleView(item)}
            android_ripple={ripple.onLight}
            disabled={isDownloading}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.title}`}
            accessibilityState={{ disabled: isDownloading }}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>
          <Pressable
            style={[styles.downloadButton, isDownloading && styles.actionButtonDisabled]}
            onPress={() => handleDownload(item)}
            android_ripple={ripple.onDark}
            disabled={isDownloading}
            accessibilityRole="button"
            accessibilityLabel={
              isDownloading
                ? `Downloading ${item.title}`
                : `Download ${item.title}, ${formatLabel}`
            }
            accessibilityState={{ disabled: isDownloading, busy: isDownloading }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Icon name="download" size={16} color={colors.onPrimary} />
            )}
            <Text style={[styles.downloadText, isDownloading && styles.downloadTextDisabled]}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }, [downloadingId, handleDownload, handleView]);

  const renderFooter = useCallback(() => {
    if (loadMoreError) {
      return (
        <Pressable
          style={styles.loadMoreRetry}
          onPress={() => loadMore()}
          android_ripple={ripple.onLight}
          accessibilityRole="button"
        >
          <Text style={styles.loadMoreRetryText}>Could not load more. Tap to retry.</Text>
        </Pressable>
      );
    }
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }, [loadMoreError, isLoadingMore, loadMore]);

  if (isLoading) {
    return showSkeleton ? <ReportListSkeleton /> : <View style={styles.root} />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => refetch()}
          style={styles.retryButton}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel="Retry loading reports"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {downloadError && (
        <ErrorAlert
          message={downloadError}
          onDismiss={() => setDownloadError(null)}
          style={styles.alert}
        />
      )}

      <FlatList
        data={reports}
        keyExtractor={keyExtractor}
        renderItem={renderReportCard}
        contentContainerStyle={reports.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        onEndReached={() => { if (hasMore) { loadMore(); } }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <EmptyState
            icon="reports"
            title={`No ${REPORT_TYPE_LABELS[reportType]} Reports Yet`}
            subtitle="Reports of this type published by your school will appear here."
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {viewingReport && (
        <ReportViewer
          visible={true}
          reportId={viewingReport.id}
          title={viewingReport.title}
          format={viewingReport.format as ReportFormat}
          openWindow={webViewWindow}
          onClose={() => { setViewingReport(null); setWebViewWindow(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  retryButton: {
    ...presets.primaryButton,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    ...presets.primaryButtonText,
    ...typography.labelMd,
  },
  alert: {
    marginHorizontal: layout.cardGap,
    marginTop: spacing.md,
  },
  listContent: {
    padding: layout.cardGap,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: layout.cardGap,
    gap: spacing.md,
  },
  cardBody: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  // Rounded square — the enclosure shape shared with the dashboard quick-access,
  // batch and announcement tiles.
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    ...presets.badge,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
  },
  typeLabel: {
    ...presets.badgeText,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  formatBadge: {
    ...presets.badge,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
  },
  formatLabel: {
    ...presets.badgeText,
    color: colors.onPrimaryFixedVariant,
    letterSpacing: 0.4,
  },
  publishedDate: {
    ...typography.labelSm,
    color: colors.outline,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewButton: {
    ...presets.secondaryButton,
    flex: 1,
  },
  viewButtonText: {
    ...presets.secondaryButtonText,
    fontSize: 14,
  },
  // Download is the card's primary action, so it takes the primary treatment.
  downloadButton: {
    ...presets.primaryButton,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  downloadText: {
    ...presets.primaryButtonText,
    fontSize: 14,
  },
  downloadTextDisabled: {
    color: colors.onPrimary,
  },
  footerLoader: {
    paddingVertical: layout.cardGap,
    alignItems: 'center',
  },
  loadMoreRetry: {
    paddingVertical: layout.cardGap,
    alignItems: 'center',
  },
  loadMoreRetryText: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.accent,
  },
});

export default ReportsScreen;
