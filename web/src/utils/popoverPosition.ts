// Shared placement logic for every portalled popover/dropdown/menu in the app
// (date pickers, SelectField listboxes, row-action menus, filter panels). All of
// these anchor a fixed-position panel to a trigger and must stay fully on-screen
// no matter how short the viewport is. When neither side has enough room for
// the panel's natural height, open on whichever side has more room and cap the
// panel's height to that space so it scrolls internally instead of clipping or
// running off the viewport edge.

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
}

export interface AnchorViewport {
  innerWidth: number;
  innerHeight: number;
}

export interface AnchoredPositionOptions {
  /**
   * The panel's natural/desired height. Doubles as the height budget used to
   * decide which side to open on: if the space below can't fit this, and the
   * space above is roomier, the panel flips up.
   */
  estimatedHeight: number;
  /** Panel width, used to keep the left edge within the viewport. */
  width: number;
  /**
   * Horizontal anchoring. 'start' aligns the panel's left edge to the trigger's
   * left; 'end' aligns the panel's right edge to the trigger's right (menus).
   */
  align?: 'start' | 'end';
  /** Gap between trigger and panel. */
  gap?: number;
  /** Minimum distance the panel keeps from the viewport edges. */
  margin?: number;
}

export interface AnchoredPosition {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
  maxHeight: number;
}

const DEFAULT_GAP = 4;
const DEFAULT_MARGIN = 8;

/**
 * Compute a fixed-position placement for a panel anchored to `rect` that always
 * stays within `viewport`. Pure and viewport-injected so it is unit-testable
 * without a DOM.
 *
 * Consumers apply the returned `maxHeight` to the panel (with `overflow-y:auto`)
 * so its content scrolls when the available space is smaller than the panel's
 * natural height. When `openUpward` is true, anchor with `bottom` (see the JSX
 * pattern in the popover components) so the panel grows upward from the trigger.
 */
export function computeAnchoredPosition(
  rect: AnchorRect,
  options: AnchoredPositionOptions,
  viewport: AnchorViewport = { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
): AnchoredPosition {
  const {
    estimatedHeight,
    width,
    align = 'start',
    gap = DEFAULT_GAP,
    margin = DEFAULT_MARGIN,
  } = options;

  const spaceBelow = viewport.innerHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  // Prefer opening downward; flip up only when below can't fit the panel and
  // above is strictly roomier.
  const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
  const available = openUpward ? spaceAbove : spaceBelow;
  // Cap strictly to the chosen side's available space so the panel is always
  // fully on-screen: since it is anchored to the trigger, any height beyond
  // `available` would run off the far viewport edge. When the panel's natural
  // height fits, `estimatedHeight` wins and the cap is a no-op. `Math.max(_, 0)`
  // guards the degenerate case of a trigger flush against a viewport edge.
  const maxHeight = Math.max(Math.min(estimatedHeight, available), 0);

  // Keep a narrow viewport from forcing a fixed-width panel off-screen. The
  // caller can apply this returned width to its panel so long labels/content
  // wrap inside the available space.
  const availableWidth = Math.max(viewport.innerWidth - margin * 2, 0);
  const boundedWidth = Math.min(width, availableWidth);
  const anchoredLeft = align === 'end' ? rect.right - boundedWidth : rect.left;
  const minLeft = Math.min(margin, Math.max(viewport.innerWidth - boundedWidth, 0));
  const maxLeft = Math.max(minLeft, viewport.innerWidth - boundedWidth - minLeft);
  const left = Math.max(minLeft, Math.min(anchoredLeft, maxLeft));

  return {
    top: openUpward ? rect.top - gap : rect.bottom + gap,
    left,
    width: boundedWidth,
    openUpward,
    maxHeight,
  };
}
