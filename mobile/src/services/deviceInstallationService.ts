import * as Crypto from 'expo-crypto';

import {
  getAppStorageItem,
  setAppStorageItem,
} from './appStorage';

const INSTALLATION_ID_KEY = 'alumnilink_installation_id_v1';

// Prevent simultaneous requests from generating different IDs.
let installationIdPromise: Promise<string> | null = null;

/**
 * Returns the unique identifier for this app installation.
 *
 * The ID is generated only once and saved in persistent storage.
 *
 * It survives:
 * - Logging out
 * - Logging in again
 * - Closing and reopening the app
 * - Normal app updates
 *
 * It may change if the app is uninstalled or its data is cleared.
 */
export async function getOrCreateInstallationId(): Promise<string> {
  if (!installationIdPromise) {
    installationIdPromise = (async () => {
      const savedId = await getAppStorageItem(
        INSTALLATION_ID_KEY,
      );

      // Reuse the previously generated installation ID.
      if (savedId && isValidInstallationId(savedId)) {
        return savedId;
      }

      // Generate a cryptographically secure UUID.
      const newId = Crypto.randomUUID();

      await setAppStorageItem(
        INSTALLATION_ID_KEY,
        newId,
      );

      return newId;
    })().catch((error) => {
      // Allow another attempt if storage fails.
      installationIdPromise = null;
      throw error;
    });
  }

  return installationIdPromise;
}

/**
 * Checks whether the stored identifier is a valid UUID v4.
 */
function isValidInstallationId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}