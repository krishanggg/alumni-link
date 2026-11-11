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
      let message = 'Report download failed';
      try {
        const body = await response.json() as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // The server or proxy may return a non-JSON error response.
      }
      throw new ApiError(`${message} (HTTP ${response.status})`, response.status);
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

  const fileName = `report_${id}_${safeFragment}${ext}`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    let message = 'Report download failed';
    try {
      const body = await FileSystem.readAsStringAsync(result.uri);
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // The response may be a non-JSON server or proxy error.
    }
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new ApiError(`${message} (HTTP ${result.status})`, result.status);
  }

  if (Platform.OS === 'android') {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) {
      throw new ApiError('Choose a folder to save the report.', 0);
    }
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const destination = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      fileName,
      mimeType,
    );
    await FileSystem.writeAsStringAsync(destination, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
  } else if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType,
      dialogTitle: title,
    });
  } else {
    throw new ApiError('Saving reports is not available on this device.', 0);
  }
}
