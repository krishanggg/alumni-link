import { useEffect, useRef } from 'react';
import {
  View, Text, Pressable,
  StyleSheet, Modal, ScrollView, Animated, Easing, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileSheetSkeleton } from '../skeletons/ProfileSheetSkeleton';
import { useDirectoryEntry } from '../../hooks/useDirectory';
import { formatLastFirstName } from '../../utils/formatName';

import { colors, layout, presets, radius, ripple, spacing, typography } from '../../theme';

interface AlumniProfileSheetProps {
  alumniId: number | null;
  onClose: () => void;
}

const OPEN_DURATION_MS = 240;
const CLOSE_DURATION_MS = 200;

export function AlumniProfileSheet({ alumniId, onClose }: AlumniProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const transition = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);
  // Reopening a profile already viewed renders it on the first frame from cache
  // and revalidates in the background, so the sheet doesn't flash a spinner every time.
  const { entry, isLoading, error } = useDirectoryEntry(alumniId);

  const fullName = entry ? formatLastFirstName(entry) : '';

  useEffect(() => {
    if (alumniId === null) {
      return;
    }

    isClosing.current = false;
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: OPEN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [alumniId, transition]);

  function handleClose() {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;
    Animated.timing(transition, {
      toValue: 0,
      duration: CLOSE_DURATION_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }

  return (
    <Modal
      visible={alumniId !== null}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: transition }]}>
          <Pressable
            style={styles.backdropPressable}
            onPress={handleClose}
            android_ripple={ripple.onLight}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 24,
              transform: [{
                translateY: transition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [viewportHeight, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {isLoading ? (
              <ProfileSheetSkeleton />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  onPress={handleClose}
                  style={styles.closeButton}
                  android_ripple={ripple.onLight}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            ) : entry ? (
              <View style={styles.content}>
                <View style={styles.profileHeader}>
                  {entry.profile_photo_url ? (
                    <Image source={{ uri: entry.profile_photo_url }} style={styles.profileAvatar} />
                  ) : (
                    <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                      <Text style={styles.profileAvatarText}>
                        {entry.first_name[0]}{entry.last_name[0]}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.profileName}>{fullName}</Text>
                  <Text style={styles.profileSchool}>{entry.school}</Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.yearBadge}>
                    <Text style={styles.yearBadgeText}>Batch {entry.graduation_year}</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Section / Strand</Text>
                  <Text style={styles.fieldValue}>
                    {entry.section_strand || '\u2014'}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            style={styles.doneButton}
            onPress={handleClose}
            android_ripple={ripple.onDark}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.doneButtonText}>Close</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '75%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
  closeButton: {
    ...presets.secondaryButton,
    paddingHorizontal: spacing.xl,
  },
  closeButtonText: {
    ...presets.secondaryButtonText,
  },
  content: {},
  profileHeader: {
    alignItems: 'center',
    paddingTop: layout.cardGap,
    paddingBottom: layout.cardGap,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  profileAvatarPlaceholder: {
    // Matches the tint DirectoryCard's placeholder uses, so the avatar does not
    // change colour when a card is tapped open into this sheet.
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    ...typography.displayMd,
    color: colors.onPrimaryFixedVariant,
  },
  profileName: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
  },
  profileSchool: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  yearBadge: {
    ...presets.badge,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
  },
  yearBadgeText: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.onPrimaryFixedVariant,
  },
  fieldGroup: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
    paddingTop: layout.cardGap,
    paddingBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.outline,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onSurface,
  },
  doneButton: {
    ...presets.primaryButton,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  doneButtonText: {
    ...presets.primaryButtonText,
  },
});

export default AlumniProfileSheet;
