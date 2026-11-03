import Svg, { Path } from 'react-native-svg';

export type CustomGlyphProps = {
  size: number;
  color: string;
};

/**
 * Hand-built glyphs for icons the reference design needs that Feather doesn't
 * ship.
 *
 * Drawn to Feather's own construction spec — 24x24 viewBox, 2px stroke, round
 * caps and joins, no fill — so the set reads as one family. Any further custom
 * glyph must follow the same constraints; a different stroke weight is visible
 * immediately next to a Feather glyph in a tab bar.
 */
const STROKE_WIDTH = 2;

/**
 * Feather has no megaphone glyph — its nearest neighbours, `volume-2` and
 * `speaker`, read as audio output rather than as a broadcast notice.
 */
export function MegaphoneGlyph({ size, color }: CustomGlyphProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m3 11 18-5v12L3 14v-3z" />
      <Path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </Svg>
  );
}

/** Feather's `award` is a prize rosette — reads as an accolade, not a graduating class. */
export function GraduationCapGlyph({ size, color }: CustomGlyphProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z" />
      <Path d="M22 10v6" />
      <Path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </Svg>
  );
}
