import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { request, getToken, getApiBase, ApiError } from './api';
import type { ReportRecord, ReportFormat } from '../types/report';

const FORMAT_EXT: Record<ReportFormat, string> = {
  pdf: '.pdf',
  xlsx: '.xlsx',
  csv: '.csv',
};

const FORMAT_MIME: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};

export const reportKeys = {
  all: ['reports'] as const,
  published: (reportType?: ReportRecord['report_type']) =>
    [...reportKeys.all, 'published', reportType ?? 'all'] as const,
};

export interface PublishedReportsPage {
  reports: ReportRecord[];
  nextPage: number | null;
}

export async function fetchPublishedReports(
  page: number = 1,
  reportType?: ReportRecord['report_type'],
): Promise<PublishedReportsPage> {
  const qs = new URLSearchParams({ page: String(page), per_page: '15' });
  if (reportType) {
    qs.set('report_type', reportType);
  }
  const data = await request<{ data: ReportRecord[]; meta?: { current_page: number; last_page: number } }>(`/reports/published?${qs.toString()}`);
  const current = data.meta?.current_page ?? page;
  const last = data.meta?.last_page ?? 1;
  return { reports: data.data, nextPage: current < last ? current + 1 : null };
}

export async function downloadReport(id: number, title: string, format: ReportFormat): Promise<void> {
  const token = await getToken();
  const url = `${getApiBase()}/reports/${id}/download`;
  const ext = FORMAT_EXT[format] ?? '.pdf';
  const mimeType = FORMAT_MIME[format] ?? 'application/pdf';

  const safeFragment = title.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').slice(0, 60);
  if (Platform.OS === 'web') {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new ApiError('Report download failed', response.status);
    }

    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `report_${id}_${safeFragment}${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }

  const fileUri = `${FileSystem.cacheDirectory}report_${id}_${safeFragment}${ext}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new ApiError('Report download failed', result.status);
  }

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType,
      dialogTitle: title,
    });
  } else {
    throw new ApiError('Sharing is not available on this device', 0);
  }
}
