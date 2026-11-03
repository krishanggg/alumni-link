/**
 * Shared `android_ripple` configs for `Pressable`. Centralized for the same
 * reason `colors`/`presets` are: without one canonical source every touch
 * surface would pick its own ripple tint by copy-paste.
 *
 * Two variants because a single flat tint reads wrong on both ends of the
 * app's surface range — `onLight` is `colors.primary` (#2d75b4) at low
 * opacity, for the app's near-white surfaces (cards, list rows,
 * secondary/text buttons); `onDark` is `colors.onPrimary` (white) at higher
 * opacity, for touches on `colors.primary` (the primary button, blue
 * headers). Pick by the surface the touch sits on, not by the component.
 */
export const ripple = {
  onLight: { color: 'rgba(45, 117, 180, 0.12)' },
  onDark: { color: 'rgba(255, 255, 255, 0.24)' },
} as const satisfies Record<string, { color: string }>;
