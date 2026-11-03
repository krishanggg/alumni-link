import { View, useWindowDimensions, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import { presets, spacing } from '../../theme';

/** Below this width a half-width field is too narrow for its longest content. */
const STACK_BELOW_DP = 340;

type FormRowProps = {
  children: React.ReactNode;
  /**
   * Opt in for rows whose fields carry long values. Off by default: most pairs
   * (graduation year / section, gender / birthdate) hold short values and read
   * better side by side at every width, and stacking every row would make the
   * registration form materially longer for no gain.
   */
  stackWhenNarrow?: boolean;
  style?: ViewStyle;
};

/**
 * A two-column form row that stacks on narrow viewports when asked to.
 *
 * At 320 dp a half-width field is ~121 dp, not enough for a 15-character
 * student ID or an 11-character phone placeholder once the field also pays the
 * card's horizontal padding — long values get clipped instead.
 *
 * This is a plain width breakpoint, deliberately unrelated to
 * `scaleLoginLayout` (`LoginScreen`-only). It adds no continuous scaling and
 * nothing to `src/theme/`.
 */
function FormRow({ children, stackWhenNarrow = false, style }: FormRowProps) {
  const { width } = useWindowDimensions();
  const shouldStack = stackWhenNarrow && width < STACK_BELOW_DP;

  return <View style={[shouldStack ? styles.stacked : styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    ...presets.formRow,
  },
  stacked: {
    flexDirection: 'column',
    gap: spacing.md,
  },
});

export default FormRow;
