import type { ReportType } from '../../types/report';
import type { IconName } from '../shared/Icon';

import { colors, extendedColors } from '../../theme';

export const REPORT_TYPES: ReportType[] = [
  'alumni_summary',
  'batch_report',
  'gender_distribution',
  'yearly_comparison',
];

export const REPORT_TYPE_ICONS: Record<ReportType, IconName> = {
  alumni_summary: 'directory',
  batch_report: 'graduationCap',
  // A distribution chart describes the stored type more honestly than a
  // gender-symbol glyph, which Feather does not provide.
  gender_distribution: 'distribution',
  yearly_comparison: 'trend',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  alumni_summary: colors.primaryFixed,
  batch_report: colors.successContainer,
  gender_distribution: colors.warningContainer,
  yearly_comparison: extendedColors.categoricalViolet,
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  alumni_summary: 'Alumni Summary',
  batch_report: 'Batch Report',
  gender_distribution: 'Gender Distribution',
  yearly_comparison: 'Yearly Comparison',
};

// Reworded from specs/05-report-generation.md FR-01's per-type descriptions for
// an alumni reader rather than the admin who generates them.
export const REPORT_TYPE_SUBTITLES: Record<ReportType, string> = {
  alumni_summary: 'Total alumni, gender breakdown, and batch distribution',
  batch_report: 'Alumni list for a specific graduation year',
  gender_distribution: 'Gender counts broken down by batch',
  yearly_comparison: 'Graduate counts compared year over year',
};
