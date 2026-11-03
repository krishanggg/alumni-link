/**
 * The mobile design-token module.
 *
 * `DESIGN.md` is the source of truth; this directory is its binding for
 * React Native, the way Tailwind's `@theme` directive is on web. Import tokens
 * from here rather than writing hex literals, magic font sizes, or ad-hoc
 * corner radii into a screen's `StyleSheet`.
 * */
export {
  colors,
  extendedColors,
} from './colors';
export { typography } from './typography';
export { spacing, layout, radius } from './spacing';
export { elevation } from './elevation';
export { presets } from './presets';
export { ripple } from './interaction';
