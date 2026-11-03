import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, Pressable,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

import { getToken, getApiBase } from '../../services/api';
import type { ReportFormat } from '../../types/report';

import { colors, layout, presets, radius, ripple, spacing, typography } from '../../theme';

const FORMAT_EXT: Record<ReportFormat, string> = {
  pdf: '.pdf',
  xlsx: '.xlsx',
  csv: '.csv',
};

const FORMAT_MIME: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};

interface ReportViewerProps {
  visible: boolean;
  reportId: number;
  title: string;
  format: ReportFormat;
  openWindow?: Window | null;
  onClose: () => void;
}

function ReportViewer({ visible, reportId, title, format, openWindow, onClose }: ReportViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tapping "View" on the report card already expresses intent, so the fetch fires
  // as soon as the modal mounts rather than asking for confirmation again — the
  // dialog only shows once there's something to display (a spinner or an error).
  const hasStarted = useRef(false);

  useEffect(() => {
    if (visible && !hasStarted.current) {
      hasStarted.current = true;
      handleView();
    }
    if (!visible) {
      hasStarted.current = false;
    }
  }, [visible]);

  async function handleView() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const url = format === 'xlsx'
        ? `${getApiBase()}/reports/${reportId}/preview`
        : `${getApiBase()}/reports/${reportId}/download`;
      const ext = FORMAT_EXT[format] ?? '.pdf';
      const mimeType = FORMAT_MIME[format] ?? 'application/pdf';

      const safeFragment = title.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').slice(0, 60);
      if (Platform.OS === 'web') {
        if (!openWindow || openWindow.closed) {
          setError('Could not open the report. Please try again.');
          return;
        }
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          setError('Report is no longer available.');
          openWindow.close();
          return;
        }

        const previewBlob = format === 'xlsx'
          ? new Blob([await response.text()], { type: 'text/html;charset=utf-8' })
          : await response.blob();
        const objectUrl = URL.createObjectURL(previewBlob);
        openWindow.document.title = title;
        openWindow.location.replace(objectUrl);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        onClose();
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}report_${reportId}_${safeFragment}${ext}`;

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (result.status !== 200) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        setError('Report is no longer available.');
        return;
      }

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: mimeType,
        });
      } else {
        await Sharing.shareAsync(result.uri, {
          mimeType,
          dialogTitle: title,
        });
      }

      onClose();
    } catch {
      if (Platform.OS === 'web' && openWindow && !openWindow.closed) {
        openWindow.close();
      }
      setError('Could not open the report.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <Text style={styles.loadingText}>Opening report...</Text>
            </View>
          ) : (
            <View style={styles.centerColumn}>
              <Text style={styles.errorText}>{error}</Text>
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={onClose}
                  android_ripple={ripple.onLight}
                  hitSlop={{ top: 4, bottom: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.cancelText}>Close</Text>
                </Pressable>
                <Pressable
                  style={styles.retryButton}
                  onPress={handleView}
                  android_ripple={ripple.onDark}
                  hitSlop={{ top: 4, bottom: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Retry opening report"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    gap: layout.cardGap,
  },
  loadingText: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  centerColumn: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySm,
    fontWeight: '500',
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  // Right-aligned text-button row, Material's dialog-actions convention —
  // Close first (dismissive), primary action last (closest to the edge).
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  // Visual height stays below the 52dp default to match the compact Material
  // dialog-actions convention above; the Pressables restore the 48dp touch
  // target with hitSlop instead of growing the button.
  retryButton: {
    ...presets.primaryButton,
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  retryText: {
    ...presets.primaryButtonText,
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    height: 40,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.labelMd,
    color: colors.outline,
  },
});

export default ReportViewer;
