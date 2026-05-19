import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform secure storage wrapper.
 *
 * - Native (iOS/Android): pakai expo-secure-store (iOS Keychain / Android Keystore).
 *   Token disimpan terenkripsi by OS, tidak bisa dibaca app lain.
 *
 * - Web: fallback ke localStorage. ⚠️ TIDAK SECURE — bisa di-inspect via DevTools.
 *   Ini hanya untuk dev/demo. Production app harus jalan di native.
 *
 * Penggunaan: import { storage } from '@/utils/storage'; await storage.getItem(...);
 */

const isWeb = Platform.OS === 'web';

function webGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function webSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / SecurityError
  }
}

function webRemove(key: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return webGet(key);
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      webSet(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      webRemove(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
