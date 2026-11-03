import { RememberedDeviceRepository } from '../repositories/RememberedDeviceRepository';
import type { RememberedDevice } from '../types/Profile';

export const RememberedDeviceService = {
  listRememberedDevicesForCurrentUser(): Promise<{ devices: RememberedDevice[] }> {
    return RememberedDeviceRepository.listRememberedDevices();
  },

  revokeRememberedDeviceForCurrentUser(id: string): Promise<{ message: string }> {
    return RememberedDeviceRepository.revokeRememberedDevice(id);
  },

  revokeAllRememberedDevicesForCurrentUser(): Promise<{ message: string }> {
    return RememberedDeviceRepository.revokeAllRememberedDevices();
  },
};
