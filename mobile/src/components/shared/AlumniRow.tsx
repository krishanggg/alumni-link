import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import Icon from './Icon';

import { colors, presets, radius, ripple, spacing, typography } from '../../theme';

type AlumniRowProps = {
  /** Resolved photo URL, or `null` to fall back to the initials circle. */
  photoUrl: string | null;
  /** Two letters. The caller composes them, since name order differs by screen. */
  initials: string;
  name: string;
  /** Secondary lines under the name, most significant first. Empty entries are dropped. */
  lines?: (string | null | undefined)[];
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * One tappable alumni row: avatar, a stacked identity block, trailing chevron.
 * The single shared implementation for the directory and batch-detail lists.
 *
 * Takes composed strings rather than a record type on purpose: the two callers
 * hold different shapes (`DirectoryEntry` carries school and graduation year,
 * `BatchAlumniItem` carries neither), and widening either type to fit a shared
 * component would be a data change, not a presentation one.
 */
function AlumniRowComponent({
  photoUrl,
  initials,
  name,
  lines = [],
  onPress,
  accessibilityLabel,
}: AlumniRowProps) {
  const visibleLines = lines.filter((line): line is string => Boolean(line));

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      android_ripple={ripple.onLight}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {visibleLines.map((line, index) => (
          <Text
            key={line}
            style={index === 0 ? styles.meta : styles.sub}
            numberOfLines={1}
          >
            {line}
          </Text>
        ))}
      </View>

      <Icon name="chevronRight" size={20} color={colors.outline} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...presets.card,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.titleMd,
    color: colors.onPrimaryFixedVariant,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  meta: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
});

export const AlumniRow = memo(AlumniRowComponent);
export default AlumniRow;
