export type Tone = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';

// Chart.js draws to canvas, so it needs resolved colors rather than CSS
// custom-property references. Keep the approved Academic Heritage Modern
// series in one palette for every web chart that uses these colors.
export const CHART_PALETTE = ['#0041c9', '#1e9e5a', '#f4a51e', '#f4841e', '#5b3ec9', '#c4384a'] as const;
export const CHART_PRIMARY = '#1476d6';
export const CHART_ON_COLOR = '#ffffff';

export const TONE_CLASSES: Record<Tone, string> = {
  blue: 'bg-gradient-to-br from-info-container to-tone-blue-end text-secondary',
  green: 'bg-gradient-to-br from-success-container to-tone-green-end text-on-success-container',
  purple: 'bg-gradient-to-br from-tone-purple-start to-tone-purple-end text-tone-purple-foreground',
  amber: 'bg-gradient-to-br from-warning-container to-tone-amber-end text-on-warning-container',
  red: 'bg-gradient-to-br from-tone-red-start to-tone-red-end text-on-error-container',
  gray: 'bg-gradient-to-br from-surface-container to-tone-gray-end text-on-surface-variant',
};

export const DEFAULT_ICON_TONE = TONE_CLASSES.blue;

export const TONE_SURFACE_CLASSES: Record<Tone, string> = {
  blue: 'border-outline-variant bg-gradient-to-br from-info-container to-white',
  green: 'border-outline-variant bg-gradient-to-br from-success-container to-white',
  purple: 'border-outline-variant bg-gradient-to-br from-secondary-fixed to-white',
  amber: 'border-outline-variant bg-gradient-to-br from-warning-container to-white',
  red: 'border-outline-variant bg-gradient-to-br from-error-container to-white',
  gray: 'border-outline-variant bg-gradient-to-br from-surface-container to-white',
};
