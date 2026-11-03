import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function getBrowserStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') {
    return null;
  }

  return globalThis.localStorage;
}

export async function getAppStorageItem(key: string): Promise<string | null> {
  const browserStorage = getBrowserStorage();
  return browserStorage ? browserStorage.getItem(key) : SecureStore.getItemAsync(key);
}

export async function setAppStorageItem(key: string, value: string): Promise<void> {
  const browserStorage = getBrowserStorage();
  if (browserStorage) {
    browserStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteAppStorageItem(key: string): Promise<void> {
  const browserStorage = getBrowserStorage();
  if (browserStorage) {
    browserStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
