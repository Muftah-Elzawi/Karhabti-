import * as SecureStore from 'expo-secure-store';

/**
 * Platform storage abstraction (CLAUDE.md: never assume localStorage — clients
 * differ). Backed by the OS keychain/keystore via expo-secure-store, which the
 * auth tokens require; small preferences (locale) ride along.
 */
export const appStorage = {
  /** Returns null when the key is absent or the keystore is unavailable. */
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

export const storageKeys = {
  locale: 'karhabti_locale',
  accessToken: 'karhabti_access_token',
  refreshToken: 'karhabti_refresh_token',
} as const;
