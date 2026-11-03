import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { StyleProp, ViewStyle } from 'react-native';

import { GraduationCapGlyph, MegaphoneGlyph } from './icons/CustomGlyphs';

import { colors } from '../../theme';

/**
 * Semantic names drawn by the hand-built glyphs rather than by Feather.
 * `batch`/`announcements` are the navigation names; `graduationCap`/`megaphone`
 * are the same drawings referred to by shape, for content uses where the
 * navigation meaning does not apply.
 */
const CUSTOM_GLYPHS = {
  batch: 'graduationCap',
  graduationCap: 'graduationCap',
  announcements: 'megaphone',
  megaphone: 'megaphone',
  general: 'megaphone',
} as const;

type CustomGlyph = keyof typeof CUSTOM_GLYPHS;

/**
 * Semantic icon names. Screens name what the icon *means*, not which glyph
 * draws it, so re-pointing an icon is a one-line change here rather than a
 * sweep through every call site.
 */
const FEATHER_GLYPHS = {
  // Navigation
  home: 'home',
  directory: 'users',
  reports: 'file-text',
  profile: 'user',

  // Actions
  search: 'search',
  filter: 'filter',
  download: 'download',
  view: 'eye',
  edit: 'edit-3',
  close: 'x',
  check: 'check',
  retry: 'refresh-cw',
  logOut: 'log-out',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  back: 'arrow-left',

  // Form affordances
  email: 'mail',
  password: 'lock',
  showPassword: 'eye',
  hidePassword: 'eye-off',
  calendar: 'calendar',
  phone: 'phone',

  // Content
  event: 'calendar',
  closure: 'alert-triangle',
  notifications: 'bell',
  security: 'lock',
  distribution: 'pie-chart',
  trend: 'bar-chart-2',
  school: 'map-pin',
  info: 'info',
  /** Personal/identity details — the ID-card sense, not the account sense. */
  identity: 'credit-card',
} as const;

export type IconName = keyof typeof FEATHER_GLYPHS | CustomGlyph;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Supply **only** when the icon carries meaning no adjacent text already
   * conveys. Leaving it unset is the common and correct case.
   */
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * The app's only icon primitive.
 *
 * **Decorative by default.** An icon is hidden from assistive technology unless
 * given an `accessibilityLabel`. Hiding sets *both* `accessibilityElementsHidden`
 * (iOS) and `importantForAccessibility` (Android) — setting only one is a no-op
 * on the other platform.
 *
 * Enforced here rather than per call site, since leaving it to each call site
 * to remember both props is easy to get wrong.
 */
function Icon({
  name,
  size = 20,
  color = colors.onSurfaceVariant,
  style,
  accessibilityLabel,
  testID,
}: IconProps) {
  const isDecorative = accessibilityLabel === undefined;

  return (
    <View
      style={style}
      testID={testID}
      accessible={!isDecorative}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={isDecorative}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'yes'}
    >
      {renderGlyph(name, size, color)}
    </View>
  );
}

function renderGlyph(name: IconName, size: number, color: string) {
  if (name in CUSTOM_GLYPHS) {
    const glyph = CUSTOM_GLYPHS[name as CustomGlyph];
    if (glyph === 'megaphone') {
      return <MegaphoneGlyph size={size} color={color} />;
    }
    return <GraduationCapGlyph size={size} color={color} />;
  }
  return <Feather name={FEATHER_GLYPHS[name as keyof typeof FEATHER_GLYPHS]} size={size} color={color} />;
}

export default Icon;
