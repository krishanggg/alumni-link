import Svg, { Circle, Path, G } from 'react-native-svg';

import { colors } from '../../../theme';

type SchoolSealProps = {
  size?: number;
  /** Ring, rule and detail color. */
  color?: string;
};

/**
 * The institutional seal on `LoginScreen`'s hero badge.
 *
 * Drawn rather than bitmapped so it stays crisp at any density and can be
 * recolored — a PNG would need three exports and would be locked to one ink.
 *
 * Deliberately generic: the app serves many schools, and inventing a specific
 * institution's crest would be worse than a neutral academic mark. Replace this
 * component's body if a real crest is ever supplied — every caller inherits it.
 *
 * Drawn on a 64x64 grid at a heavier stroke than `Icon`'s glyphs, since this is
 * a brand mark shown at 96 dp — Feather's 2px weight would render as hairlines
 * at that size.
 */
function SchoolSeal({ size = 64, color = colors.primary }: SchoolSealProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="29" stroke={color} strokeWidth={2.5} />
      <Circle cx="32" cy="32" r="24.5" stroke={color} strokeWidth={1.5} />

      <G stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M32 30.5v13" />
        <Path d="M32 30.5c-2.6-2-5.8-3-9.5-3H18v13h4.5c3.7 0 6.9 1 9.5 3" />
        <Path d="M32 30.5c2.6-2 5.8-3 9.5-3H46v13h-4.5c-3.7 0-6.9 1-9.5 3" />

        <Path d="M32 15l12 5-12 5-12-5 12-5z" />
        <Path d="M44 20v5.5" />
      </G>

      {/* Stands in for engraved seal text, which wouldn't stay legible at 96 dp. */}
      <G fill={color}>
        <Circle cx="26" cy="50.5" r="1.4" />
        <Circle cx="32" cy="51.5" r="1.4" />
        <Circle cx="38" cy="50.5" r="1.4" />
      </G>
    </Svg>
  );
}

export default SchoolSeal;
