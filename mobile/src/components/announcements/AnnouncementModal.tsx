import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../shared/Icon';
import { CountdownTimer } from '../shared/CountdownTimer';
import { TYPE_ICONS, TYPE_LABELS, batchReference } from './announcementDisplay';

import type { Announcement } from '../../types/announcement';

import { colors, ripple } from '../../theme';

interface AnnouncementModalProps {
  queue: Announcement[];
  onGotIt: (id: number) => Promise<boolean>;
}

export function AnnouncementModal({ queue, onGotIt }: AnnouncementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const insets = useSafeAreaInsets();
  const current = queue[0];

  if (!current) {
    return null;
  }

  async function handleGotIt() {
    setIsSubmitting(true);
    setSubmitError(false);
    const ok = await onGotIt(current.id);
    setIsSubmitting(false);
    if (!ok) {
      setSubmitError(true);
    }
  }

  const icon = TYPE_ICONS[current.type];
  const label = TYPE_LABELS[current.type];

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={handleGotIt}>
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.content}>
          <Text style={styles.typeLabel}>{label}</Text>
          <Icon name={icon} size={48} color={colors.primary} style={styles.icon} />
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.message}>{current.message}</Text>

          {current.type === 'event' && current.target_date && (
            <View style={styles.countdownRow}>
              <CountdownTimer targetDate={current.target_date} />
            </View>
          )}

          <Text style={styles.batchRef}>{batchReference(current)}</Text>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {submitError && (
            <Text style={styles.errorText}>
              Could not save. Please try again.
            </Text>
          )}
          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleGotIt}
            disabled={isSubmitting}
            android_ripple={ripple.onDark}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Got it</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.96,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  countdownRow: {
    marginTop: 24,
  },
  batchRef: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.outline,
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
