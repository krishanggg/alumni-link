import { BackupRepository } from '../repositories/BackupRepository';
import type { BackupItem, RestoreResponse } from '../types/Profile';

export const BackupService = {
  listBackups(): Promise<{ backups: BackupItem[] }> {
    return BackupRepository.listBackups();
  },

  createBackup(): Promise<{ message: string; backup: BackupItem }> {
    return BackupRepository.createBackup();
  },

  downloadBackup(id: number): void {
    const link = document.createElement('a');
    link.href = `/api/backups/${id}/download`;
    link.click();
  },

  deleteBackup(id: number): Promise<{ message: string }> {
    return BackupRepository.deleteBackup(id);
  },

  restoreBackup(id: number): Promise<RestoreResponse> {
    return BackupRepository.restoreBackup(id);
  },
};
