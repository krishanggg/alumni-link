import { FileText, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { type Tone } from './toneClasses';

export const REPORT_TYPE_META: Record<string, { icon: LucideIcon; tone: Tone }> = {
  yearly_comparison: { icon: TrendingUp, tone: 'purple' },
  alumni_summary: { icon: Users, tone: 'blue' },
};

export const DEFAULT_REPORT_META: { icon: LucideIcon; tone: Tone } = { icon: FileText, tone: 'gray' };

export function formatReportType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatActivityKey(key: string): string {
  return key
    .split('.')
    .map((segment) => formatReportType(segment))
    .join(' ');
}
