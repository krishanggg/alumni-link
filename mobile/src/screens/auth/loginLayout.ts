import { layout } from '../../theme';

const BASE_VIEWPORT_HEIGHT = 740;
export const MIN_LOGIN_LAYOUT_SCALE = 0.85;
export const MIN_LOGIN_TOUCH_TARGET = layout.minTouchTarget;

export function getLoginLayoutScale(viewportHeight: number): number {
  return Math.max(
    MIN_LOGIN_LAYOUT_SCALE,
    Math.min(1, viewportHeight / BASE_VIEWPORT_HEIGHT),
  );
}

export function scaleLoginLayout(value: number, scale: number): number {
  return Math.round(value * scale);
}

export function getLoginControlHeight(scale: number): number {
  return Math.max(MIN_LOGIN_TOUCH_TARGET, scaleLoginLayout(52, scale));
}
