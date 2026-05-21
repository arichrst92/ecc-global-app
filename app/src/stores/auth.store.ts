import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { User } from '@/types/api';

const KEYS = {
  accessToken: 'ecc.accessToken',
  refreshToken: 'ecc.refreshToken',
  user: 'ecc.user',
  biometricEnabled: 'ecc.biometricEnabled',
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;

  /** User sudah aktifkan biometric unlock. Persisted di SecureStore. */
  biometricEnabled: boolean;
  /** Untuk session ini, biometric gate sudah lewat (atau tidak required) */
  biometricUnlocked: boolean;
  /** True saat baru selesai OTP login, dipakai untuk show enrollment prompt
   *  sekali di tabs layout. Di-clear setelah user decide. */
  pendingBiometricEnrollment: boolean;

  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  markBiometricUnlocked: () => void;
  clearPendingEnrollment: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  biometricEnabled: false,
  biometricUnlocked: false,
  pendingBiometricEnrollment: false,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson, biometricFlag] = await Promise.all([
        storage.getItem(KEYS.accessToken),
        storage.getItem(KEYS.refreshToken),
        storage.getItem(KEYS.user),
        storage.getItem(KEYS.biometricEnabled),
      ]);
      const user = userJson ? (JSON.parse(userJson) as User) : null;
      const biometricEnabled = biometricFlag === '1';
      const isAuthenticated = !!accessToken && !!user;
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated,
        biometricEnabled,
        // Kalau biometric disabled, sesi langsung dianggap unlocked.
        // Kalau enabled tapi belum authenticated, juga unlocked (login flow).
        // Cuma kalau (isAuthenticated && biometricEnabled) yang perlu gate.
        biometricUnlocked: !(isAuthenticated && biometricEnabled),
        isHydrating: false,
      });
    } catch {
      set({ isHydrating: false });
    }
  },

  setTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      storage.setItem(KEYS.accessToken, accessToken),
      storage.setItem(KEYS.refreshToken, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  setUser: async (user) => {
    await storage.setItem(KEYS.user, JSON.stringify(user));
    set({ user, isAuthenticated: !!get().accessToken });
  },

  login: async (accessToken, refreshToken, user) => {
    await Promise.all([
      storage.setItem(KEYS.accessToken, accessToken),
      storage.setItem(KEYS.refreshToken, refreshToken),
      storage.setItem(KEYS.user, JSON.stringify(user)),
    ]);
    // Saat baru login fresh, session selalu dianggap unlocked.
    // Biometric prompt baru muncul saat app re-open setelah ini.
    // pendingBiometricEnrollment akan trigger one-time enrollment modal
    // di tabs layout kalau user belum opt-in.
    const isFreshOptIn = !get().biometricEnabled;
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
      pendingBiometricEnrollment: isFreshOptIn,
    });
  },

  logout: async () => {
    await Promise.all([
      storage.deleteItem(KEYS.accessToken),
      storage.deleteItem(KEYS.refreshToken),
      storage.deleteItem(KEYS.user),
      storage.deleteItem(KEYS.biometricEnabled),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      biometricEnabled: false,
      biometricUnlocked: false,
    });
  },

  setBiometricEnabled: async (enabled) => {
    if (enabled) {
      await storage.setItem(KEYS.biometricEnabled, '1');
    } else {
      await storage.deleteItem(KEYS.biometricEnabled);
    }
    set({ biometricEnabled: enabled });
  },

  markBiometricUnlocked: () => {
    set({ biometricUnlocked: true });
  },

  clearPendingEnrollment: () => {
    set({ pendingBiometricEnrollment: false });
  },
}));
