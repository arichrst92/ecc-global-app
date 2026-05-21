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
  /** Soft logout: session ended tapi refresh token + biometric flag tetap
   *  ada, supaya biometric quick-login dari welcome screen bisa restore. */
  logout: () => Promise<void>;
  /** Hard logout: clear semua tokens + biometric + user dari device. */
  forgetDevice: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  markBiometricUnlocked: () => void;
  clearPendingEnrollment: () => void;
  /** Cek apakah ada sesi yang bisa di-restore via biometric dari welcome
   *  screen (refresh token tersisa + biometric enabled). */
  hasBiometricSession: () => Promise<boolean>;
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
    // Soft logout: bersihkan accessToken supaya API call butuh refresh,
    // tapi pertahankan refreshToken + user + biometricEnabled flag supaya
    // biometric quick-login dari welcome screen bisa restore sesi.
    const { biometricEnabled } = get();
    if (biometricEnabled) {
      // Pertahankan refresh token + biometric flag — Welcome face button
      // akan trigger biometric → refresh token → restore session.
      await storage.deleteItem(KEYS.accessToken);
      set({
        accessToken: null,
        isAuthenticated: false,
        biometricUnlocked: false,
      });
    } else {
      // Tidak ada biometric — hapus semua karena tidak ada cara restore.
      await Promise.all([
        storage.deleteItem(KEYS.accessToken),
        storage.deleteItem(KEYS.refreshToken),
        storage.deleteItem(KEYS.user),
      ]);
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        biometricUnlocked: false,
      });
    }
  },

  forgetDevice: async () => {
    // Hard logout: clear semua. Setelah ini user perlu OTP login dari nol.
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

  hasBiometricSession: async () => {
    const [refreshToken, biometricFlag, userJson] = await Promise.all([
      storage.getItem(KEYS.refreshToken),
      storage.getItem(KEYS.biometricEnabled),
      storage.getItem(KEYS.user),
    ]);
    return !!refreshToken && biometricFlag === '1' && !!userJson;
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
