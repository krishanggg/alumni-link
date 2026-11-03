import type { TextStyle } from 'react-native';

/**
 * Type scale, transcribed from the `typography:` block of `DESIGN.md`.
 * CSS `px` map to React Native's unitless density-independent values 1:1.
 *
 * `fontFamily` is omitted: DESIGN.md specifies Plus Jakarta Sans, but mobile
 * ships no font asset or `expo-font` dependency yet, so every level renders in
 * the platform's system face (Roboto on Android). Add it here once the font
 * asset lands and every consumer inherits it.
 *
 * `letterSpacing` is converted from `em` to absolute units at each level's own
 * font size — React Native has no em-relative letter spacing:
 * `letterSpacing(dp) = em * fontSize`.
 */
export const typography = {
  displayLg: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.64, // -0.02em * 32
  },
  displayMd: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.39, // -0.015em * 26
  },
  headlineLg: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.22, // -0.01em * 22
  },
  headlineSm: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.1, // -0.005em * 20
  },
  titleMd: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  bodyLg: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  labelMd: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  labelSm: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.08, // 0.006em * 13
  },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 0.88, // 0.08em * 11
  },
} as const satisfies Record<string, TextStyle>;
