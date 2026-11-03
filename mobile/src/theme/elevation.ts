import { Platform, type ViewStyle } from 'react-native';

/**
 * Elevation tokens.
 *
 * `DESIGN.md` defines shadows as two-layer CSS box-shadows (a tight
 * contact shadow plus a wide diffuse one). React Native renders a single shadow
 * per view on iOS and only a scalar `elevation` on Android, so these are
 * approximations of the *diffuse* layer — the one that does the visual work —
 * rather than transcriptions. The shadow color is the tokens' shared
 * `rgba(10, 22, 70, …)` navy tint.
 *
 * DESIGN.md is explicit that depth comes primarily from tonal layers and 1px
 * outlines, with soft shadows "used sparingly". Prefer a border on
 * `outlineVariant` over reaching for one of these.
 */
const SHADOW_TINT = '#0a1646';

function shadow(
  offsetY: number,
  opacity: number,
  radius: number,
  androidElevation: number,
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: SHADOW_TINT,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    // Android's elevation draws its own shadow; shadowColor tints it on API 28+.
    android: {
      elevation: androidElevation,
      shadowColor: SHADOW_TINT,
    },
    default: {},
  }) as ViewStyle;
}

export const elevation = {
  /** `--shadow-card` — resting state of a content card. */
  card: shadow(6, 0.1, 12, 2),
  /** `--shadow-card-hover` — pressed/raised state of a card. */
  cardRaised: shadow(8, 0.13, 16, 4),
  /** `--shadow-panel` — bottom sheets and modals. */
  panel: shadow(10, 0.12, 20, 8),
  /** `--shadow-pop` — dropdowns, popovers, the search-suggestion overlay. */
  pop: shadow(4, 0.12, 8, 6),
} as const;
