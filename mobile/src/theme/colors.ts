/**
 * Color tokens, transcribed verbatim from the `colors:` block of
 * `DESIGN.md`'s YAML frontmatter.
 *
 * Names are the design-system token names in camelCase (`surface-container-high`
 * becomes `surfaceContainerHigh`), so a value here can always be traced back to
 * its source token by reversing the case change. Do not rename them to describe
 * where they happen to be used — the point of the mapping is that it is
 * mechanical.
 *
 * Web binds these through Tailwind's `@theme` directive; mobile has no
 * equivalent, so this module is the binding. It is the only place a raw hex
 * literal belongs.
 */
export const colors = {
  surface: '#f7f9fb',
  surfaceDim: '#d8dadc',
  surfaceBright: '#f7f9fb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f6',
  surfaceContainer: '#eceef0',
  surfaceContainerHigh: '#e6e8ea',
  surfaceContainerHighest: '#e0e3e5',
  onSurface: '#191c1e',
  onSurfaceVariant: '#444750',
  inverseSurface: '#2d3133',
  inverseOnSurface: '#eff1f3',
  outline: '#747781',
  outlineVariant: '#c4c6d1',
  surfaceTint: '#2d75b4',

  primary: '#2d75b4',
  onPrimary: '#ffffff',
  primaryContainer: '#3f85c4',
  onPrimaryContainer: '#eaf2fa',
  inversePrimary: '#bcd7f2',

  secondary: '#0041c9',
  onSecondary: '#ffffff',
  secondaryContainer: '#0356ff',
  onSecondaryContainer: '#e4e7ff',

  tertiary: '#191e27',
  onTertiary: '#ffffff',
  tertiaryContainer: '#2e333d',
  onTertiaryContainer: '#969ba7',

  successContainer: '#e2f7e8',
  onSuccessContainer: '#1e7d3c',
  warningContainer: '#fef3dc',
  onWarningContainer: '#a15c00',
  infoContainer: '#e2eaff',
  onInfoContainer: '#0041c9',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  primaryFixed: '#dcebf8',
  primaryFixedDim: '#bcd7f2',
  onPrimaryFixed: '#0d3255',
  onPrimaryFixedVariant: '#1f5a8c',
  secondaryFixed: '#dce1ff',
  secondaryFixedDim: '#b6c4ff',
  onSecondaryFixed: '#001551',
  onSecondaryFixedVariant: '#0039b3',
  tertiaryFixed: '#dee2ef',
  tertiaryFixedDim: '#c2c6d3',
  onTertiaryFixed: '#171c25',
  onTertiaryFixedVariant: '#424751',

  background: '#f7f9fb',
  onBackground: '#191c1e',
  surfaceVariant: '#e0e3e5',
  accent: '#1476d6',
  accentHover: '#105ca8',
  sidebar: '#2d75b4',
  sidebarDeep: '#23598b',
  sidebarHover: '#3f85c4',
  sidebarActive: '#1476d6',
} as const;

/**
 * Values in use on mobile that `DESIGN.md` does not define.
 *
 * Kept in a separate export **on purpose**: everything in `colors` above can be
 * traced to a design-system token, and nothing here can. Reach for `colors`
 * first; only use these where the audit below says there is no alternative.
 *
 * Near-duplicate literals get snapped to the closest existing token rather
 * than promoted here — carrying two greens a shade apart is how the palette
 * drifts. The values below are real gaps, not drift, so they're promoted as-is.
 */
export const extendedColors = {
  /**
   * Border tones for the soft-fill status containers. DESIGN.md specifies the
   * background and text of each status pair but not the 1px outline the mobile
   * alert boxes draw around them, so these three complete the set.
   */
  errorContainerBorder: '#ffb4ab',
  successContainerBorder: '#a2d9a0',
  warningContainerBorder: '#f5d49a',

  /**
   * A fourth categorical tint, used only to distinguish the fourth report type
   * from the other three in the Reports list. The reference design gives each
   * report type its own tinted icon tile, and the palette has three soft
   * container tints (info/primaryFixed blue, success green, warning amber) —
   * this supplies the fourth. DESIGN.md defines no purple at any level.
   */
  categoricalViolet: '#e7e0fb',
} as const;
