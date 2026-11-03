import { Platform, StyleSheet } from 'react-native';

import { colors, extendedColors } from './colors';
import { elevation } from './elevation';
import { layout, radius, spacing } from './spacing';
import { typography } from './typography';

/**
 * Shared style fragments for the treatments that repeat across screens.
 *
 * Spread or compose these rather than re-declaring them:
 *
 *   const styles = StyleSheet.create({
 *     card: { ...presets.card, marginBottom: spacing.lg },
 *   });
 *
 * Input, button, and alert values match `LoginScreen`, the verified styling
 * reference. Anything that needs to differ is a deliberate design decision —
 * make it on purpose, not by copy-paste drift.
 */
export const presets = StyleSheet.create({
  /** Surface Level 1 per DESIGN.md: white, thin outline, no shadow. */
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: layout.cardPadding,
  },

  /** Icon-prefixed text input row. Fixed height so rows align across a form. */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.base,
    paddingHorizontal: 14,
    height: layout.controlHeight,
  },
  /**
   * Standalone bordered text input, for the label-above-field forms on the
   * settings screens. Same metrics as `inputRow` so a form mixing the two keeps
   * one control height and one border treatment.
   */
  input: {
    ...typography.bodySm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.base,
    paddingHorizontal: 14,
    height: layout.controlHeight,
    color: colors.onSurface,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  inputText: {
    ...typography.bodySm,
    flex: 1,
    // Without this the text sits low in the fixed-height row on Android, which
    // applies its own default vertical padding to TextInput.
    minWidth: 0,
    color: colors.onSurface,
    paddingVertical: 0,
  },

  /**
   * Navy rather than DESIGN.md's Action Blue: the reference design's mobile
   * primary button is navy. Action Blue remains the accent for links and
   * active state.
   */
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.base,
    height: layout.controlHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
  /** Applies to either button variant. */
  buttonDisabled: {
    opacity: 0.6,
  },

  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.base,
    height: layout.controlHeight,
  },
  secondaryButtonText: {
    ...typography.labelMd,
    color: colors.primary,
  },

  /** Soft-fill status badge per DESIGN.md: desaturated fill, same-hue text. */
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    ...typography.overline,
  },

  errorAlert: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: extendedColors.errorContainerBorder,
    padding: spacing.md,
  },
  errorAlertText: {
    ...typography.labelSm,
    color: colors.onErrorContainer,
  },

  /**
   * Multi-line variant of `input`. Must clear the fixed `height`, or the row
   * stays one line tall no matter how much text is in it.
   */
  textArea: {
    height: undefined,
    minHeight: 80,
    paddingVertical: spacing.md,
    textAlignVertical: 'top' as const,
  },

  /**
   * Bordered enclosure for a `@react-native-picker/picker`. Same border, radius
   * and fill as `input` so a form mixing text fields and pickers reads as one
   * control family.
   *
   * The height is Android-only and deliberate. Android draws the picker as a
   * Spinner whose intrinsic height is taller than `layout.controlHeight`, so
   * without this the gender field on the registration form stood visibly taller
   * than every input beside it. iOS renders an inline wheel that is ~216pt tall
   * and would be clipped to an unusable sliver by a fixed height, so it keeps
   * its intrinsic sizing.
   */
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.base,
    overflow: 'hidden' as const,
    backgroundColor: colors.surfaceContainerLowest,
    ...Platform.select({
      android: { height: layout.controlHeight, justifyContent: 'center' as const },
      default: {},
    }),
  },

  /** Pass to the `Picker` itself so its own box matches `pickerContainer`. */
  picker: {
    color: colors.onSurface,
    ...Platform.select({
      android: { height: layout.controlHeight },
      default: {},
    }),
  },

  /** Heading above a group of related fields. */
  sectionLabel: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: layout.cardGap,
  },
  fieldGroup: {
    marginBottom: layout.cardGap,
  },
  formRow: {
    flexDirection: 'row' as const,
    gap: spacing.md,
  },

  fieldLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  fieldError: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },

  /**
   * Centred single-card layout shared by the short auth screens — forgot
   * password, pending approval, non-alumni.
   */
  centeredScreen: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: layout.cardGap,
  },
  // A white card centred on the near-white `surface` background. Without a
  // border it's all but invisible — the 1px `outlineVariant` outline
  // (DESIGN.md's Surface Level 1 treatment) gives it an edge, and the soft
  // `elevation.card` shadow lifts it off the background, one of the few
  // places DESIGN.md's "used sparingly" shadow earns its place.
  authCard: {
    width: '100%' as const,
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: layout.cardPadding,
    ...elevation.card,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  screenContent: {
    paddingHorizontal: layout.screenPadding,
  },
});
