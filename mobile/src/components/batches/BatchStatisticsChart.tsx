import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { buildDonutSegments, buildSectionBars } from './batchChartGeometry';

import { colors, layout, presets, radius, spacing, typography } from '../../theme';

interface BatchStatisticsChartProps {
  gender: Record<string, number>;
  sections: Record<string, number>;
}

const DONUT_SIZE = 136;
const DONUT_STROKE = 20;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/** Height of the Top Sections plot area, which the bars fill proportionally. */
const PLOT_HEIGHT = 132;

const GENDER_COLORS = [
  colors.secondary,
  colors.onSuccessContainer,
  colors.onWarningContainer,
  colors.onPrimaryFixedVariant,
] as const;

function formatPercentage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function BatchStatisticsChart({ gender, sections }: BatchStatisticsChartProps) {
  const genderSegments = buildDonutSegments(gender, DONUT_CIRCUMFERENCE);
  const sectionBars = buildSectionBars(sections);
  const genderTotal = genderSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <>
      {genderSegments.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>Gender Breakdown</Text>
          <View style={styles.donutContent}>
            <View style={styles.donutWrapper}>
              <Svg
                width={DONUT_SIZE}
                height={DONUT_SIZE}
                viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Circle
                  cx={DONUT_SIZE / 2}
                  cy={DONUT_SIZE / 2}
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke={colors.surfaceContainer}
                  strokeWidth={DONUT_STROKE}
                />
                {genderSegments.map((segment, index) => (
                  <Circle
                    key={segment.label}
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke={GENDER_COLORS[index % GENDER_COLORS.length]}
                    strokeWidth={DONUT_STROKE}
                    strokeDasharray={`${segment.dashLength} ${DONUT_CIRCUMFERENCE - segment.dashLength}`}
                    strokeDashoffset={segment.dashOffset}
                    rotation={-90}
                    origin={`${DONUT_SIZE / 2}, ${DONUT_SIZE / 2}`}
                  />
                ))}
              </Svg>
              <View style={styles.donutCenter} pointerEvents="none">
                <Text style={styles.totalValue}>{genderTotal}</Text>
                <Text style={styles.totalLabel}>Alumni</Text>
              </View>
            </View>

            <View style={styles.legend}>
              {genderSegments.map((segment, index) => {
                const percentage = formatPercentage(segment.percentage);
                return (
                  <View
                    key={segment.label}
                    style={styles.legendRow}
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={`${segment.label}: ${segment.value} alumni, ${percentage} percent`}
                  >
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length] },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {segment.label}: {segment.value} ({percentage}%)
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {sectionBars.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>Top Sections</Text>
          {/* Plain views rather than SVG. A percentage-width SVG needs
              `preserveAspectRatio="none"` to fill the card, which stretches the
              rounded corners into ellipses and cannot lay out the axis labels.
              Flex columns against a fixed-height plot area give crisp radii and
              real text wrapping for free. */}
          <View style={styles.barChart}>
            {sectionBars.map((bar) => (
              <View
                key={bar.label}
                style={styles.barColumn}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${bar.label}: ${bar.value} alumni`}
              >
                <Text style={styles.barValue}>{bar.value}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${bar.heightPercentage}%` as `${number}%` },
                      // A section with at least one alumnus must not render as
                      // nothing when the largest section dwarfs it.
                      bar.value > 0 && styles.barFillNonZero,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={2}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: layout.cardGap,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  donutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: spacing.lg,
  },
  donutWrapper: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  totalValue: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    ...typography.overline,
    color: colors.onSurfaceVariant,
  },
  legend: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  legendText: {
    flex: 1,
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    alignSelf: 'stretch',
    height: PLOT_HEIGHT,
    borderRadius: radius.base,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.base,
    backgroundColor: colors.accent,
  },
  barFillNonZero: {
    minHeight: 4,
  },
  barValue: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  barLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

export default BatchStatisticsChart;
