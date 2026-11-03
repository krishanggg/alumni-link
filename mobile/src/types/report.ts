export type ReportType = 'alumni_summary' | 'batch_report' | 'gender_distribution' | 'yearly_comparison';

export type ReportFormat = 'pdf' | 'xlsx' | 'csv';

export interface ReportRecord {
  id: number;
  title: string;
  report_type: ReportType;
  format: ReportFormat;
  published_at: string | null;
  created_at: string;
  school?: { id: number; name: string } | null;
}
