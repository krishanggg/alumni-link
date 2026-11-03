/**
 * Spacing scale. `DESIGN.md` states an 8px base unit governs the rhythm;
 * the named `spacing:` tokens in its frontmatter are web-chrome measurements
 * (`sidebar-width`, a 2rem desktop container padding) that have no mobile
 * counterpart, so the numeric scale below is the mobile expression of the same
 * 8px rule, with the semantic names that do carry over kept alongside it.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const layout = {
  /**
   * Horizontal padding for screen-level content. 24 rather than the web token's
   * 2rem/32: this is the value `LoginScreen` was built and device-verified with,
   * and that screen is the approved styling reference for the milestone.
   */
  screenPadding: spacing.xl,
  /** `card-gap` — gap between sibling cards in a stack. */
  cardGap: spacing.lg,
  /** Internal card padding. DESIGN.md specifies 24px for dashboard cards. */
  cardPadding: spacing.xl,
  stackSm: spacing.sm,
  stackMd: spacing.lg,
  stackLg: spacing.xl,
  /**
   * Minimum touch target. Not a DESIGN.md token — it comes from the platform
   * accessibility guidelines (48dp Android / 44pt iOS), taken at the larger of
   * the two so one value satisfies both.
   */
  minTouchTarget: 48,
  /** Height of the standard input row and full-width button, per LoginScreen. */
  controlHeight: 52,
} as const;

export const radius = {
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
