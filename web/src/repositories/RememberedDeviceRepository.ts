import { request } from '../services/api';
import type { RememberedDevice } from '../types/Profile';

export const RememberedDeviceRepository = {
  listRememberedDevices(): Promise<{ devices: RememberedDevice[] }> {
    return request<{ devices: RememberedDevice[] }>('/profile/remembered-devices');
  },

  revokeRememberedDevice(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/profile/remembered-devices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  revokeAllRememberedDevices(): Promise<{ message: string }> {
    return request<{ message: string }>('/profile/remembered-devices', {
      method: 'DELETE',
    });
  },
};
