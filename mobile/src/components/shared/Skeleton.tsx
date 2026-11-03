import { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { DimensionValue, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/**
 * The skeleton primitive every per-screen skeleton is built from.
 *
 * Rules for using it, so the skeletons stay worth having:
 *
 * 1. **Match the real layout's box, not its idea.** A skeleton whose height
 *    differs from the content that replaces it causes a reflow when the real
 *    content lands. Copy the real component's padding, gaps and fixed
 *    dimensions from its own `StyleSheet` rather than eyeballing them.
 * 2. **Tokens only.** Fills come from `colors.surfaceContainer` via this file;
 *    no per-screen greys.
 * 3. **One announcement per screen.** Wrap a screen's skeleton in
 *    `SkeletonScreen` so a screen reader hears "Loading X" once, instead of
 *    every bar announcing itself.
 */

// One shared driver so N bars on a screen pulse in phase and cost a single
// animation rather than one per bar. Native-driven, so it keeps running while
// the JS thread parses the response it is standing in for.
const pulse = new Animated.Value(0);
let isPulsing = false;

function startPulse(): void {
  if (isPulsing) {
    return;
  }
  isPulsing = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]),
  ).start();
}

const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });

type SkeletonBlockProps = {
  width?: DimensionValue;
  height?: number;
  /** Corner radius. Defaults to a pill, which is what text placeholders want. */
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
};

export function SkeletonBlock({
  width = '100%',
  height = 14,
  borderRadius = radius.full,
  style,
}: SkeletonBlockProps) {
  useEffect(() => {
    startPulse();
  }, []);

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius, opacity: pulseOpacity }, style]}
    />
  );
}

/** Avatar and icon-tile placeholder. `size` is the diameter or edge length. */
export function SkeletonCircle({ size, style }: { size: number; style?: ViewStyle }) {
  return <SkeletonBlock width={size} height={size} borderRadius={size / 2} style={style} />;
}

/**
 * Rounded-square placeholder for the app's shared icon enclosure (dashboard
 * quick-access, batch, announcement and report tiles all draw one).
 */
export function SkeletonTile({ size, style }: { size: number; style?: ViewStyle }) {
  return <SkeletonBlock width={size} height={size} borderRadius={radius.md} style={style} />;
}

/**
 * Card-shaped container matching `presets.card` at `radius.md`, which is the
 * radius every list card on mobile uses.
 */
export function SkeletonCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * Screen-level wrapper. Carries the single busy announcement for the whole
 * skeleton and hides its decorative innards from assistive tech.
 */
export function SkeletonScreen({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <View
      style={style}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceContainer,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: spacing.lg,
  },
});
