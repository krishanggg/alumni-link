import { request } from '../services/api';
import type { BackupItem, RestoreResponse } from '../types/Profile';

export const BackupRepository = {
  listBackups(): Promise<{ backups: BackupItem[] }> {
    return request<{ backups: BackupItem[] }>('/backups');
  },

  createBackup(): Promise<{ message: string; backup: BackupItem }> {
    return request<{ message: string; backup: BackupItem }>('/backups', {
      method: 'POST',
    });
  },

  deleteBackup(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/backups/${id}`, {
      method: 'DELETE',
    });
  },

  restoreBackup(id: number): Promise<RestoreResponse> {
    return request<RestoreResponse>(`/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RESTORE' }),
    });
  },
};
