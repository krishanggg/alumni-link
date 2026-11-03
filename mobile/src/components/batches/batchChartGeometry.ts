export interface DonutSegment {
  label: string;
  value: number;
  percentage: number;
  dashLength: number;
  dashOffset: number;
}

export interface SectionBar {
  label: string;
  value: number;
  /** Share of the plot area's height, normalized against the largest section. */
  heightPercentage: number;
}

function safeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function displayLabel(value: string, fallback: string): string {
  const words = value.trim().replace(/[_-]+/g, ' ');
  if (!words) {
    return fallback;
  }

  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Converts counts into the circumference-based geometry consumed by SVG circles.
 * Keeping this independent of React makes percentage and slice regressions visible
 * in unit tests instead of only in a screenshot.
 */
export function buildDonutSegments(
  values: Record<string, number>,
  circumference: number,
): DonutSegment[] {
  const entries = Object.entries(values).map(([label, value]) => ({
    label: displayLabel(label, 'Unknown'),
    value: safeCount(value),
  }));
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  let consumedLength = 0;

  return entries.map((entry) => {
    const percentage = total > 0 ? (entry.value / total) * 100 : 0;
    const dashLength = total > 0 ? (entry.value / total) * circumference : 0;
    const segment = {
      ...entry,
      percentage,
      dashLength,
      dashOffset: -consumedLength,
    };
    consumedLength += dashLength;
    return segment;
  });
}

/**
 * Sorts the largest sections and normalizes their bars against the largest.
 *
 * The limit is 4 rather than 5: these render as vertical columns with a label
 * under each, and at 320 dp a fifth column leaves ~52 dp per label, which is not
 * enough for a section name like "STEM 12-A" at any readable size.
 */
export function buildSectionBars(
  values: Record<string, number>,
  limit = 4,
): SectionBar[] {
  const entries = Object.entries(values)
    .map(([label, value]) => ({
      label: displayLabel(label, 'Unknown section'),
      value: safeCount(value),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
  const maximum = entries[0]?.value ?? 0;

  return entries.map((entry) => ({
    ...entry,
    heightPercentage: maximum > 0 ? (entry.value / maximum) * 100 : 0,
  }));
}
