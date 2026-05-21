import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { User } from '@/types/api';

const KEYS = {
  accessToken: 'ecc.accessToken',
  refreshToken: 'ecc.refreshToken',
  user: 'ecc.user',
  /** Hint flag bahwa user pernah enroll face di server. Cache lokal supaya
   *  Welcome screen bisa decide tampilkan "Login Wajah" button tanpa hit
   *  /auth/me/face-profile dulu. Source of truth tetap di BE. */
  faceEnrolledHint: 'ecc.faceEnrolledHint',
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;

  /** Cached hint: user pernah enroll face. Untuk show Welcome face button
   *  tanpa network call dulu. Diset/clear via setFaceEnrolledHint. */
  faceEnrolledHint: boolean;

  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  /** Soft logout: bersihkan accessToken tapi pertahankan refreshToken + user
   *  + faceEnrolledHint, supaya Welcome face login bisa restore sesi. */
  logout: () => Promise<void>;
  /** Hard logout: clear semua tokens + face hint + user dari device. */
  forgetDevice: () => Promise<void>;
  setFaceEnrolledHint: (enrolled: boolean) => Promise<void>;
  /** Check kalau ada sesi yang bisa di-restore via face login dari welcome
   *  screen (refresh token + user data tersisa, face enrolled). */
  hasFaceSession: () => Promise<boolean>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  faceEnrolledHint: false,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson, faceFlag] = await Promise.all([
        storage.getItem(KEYS.accessToken),
        storage.getItem(KEYS.refreshToken),
        storage.getItem(KEYS.user),
        storage.getItem(KEYS.faceEnrolledHint),
      ]);
      const user = userJson ? (JSON.parse(userJson) as User) : null;
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: !!accessToken && !!user,
        faceEnrolledHint: faceFlag === '1',
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
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    // Soft logout: bersihkan accessToken tapi pertahankan refreshToken +
    // user + faceEnrolledHint kalau ada — supaya Welcome face login bisa
    // restore sesi tanpa OTP.
    const { faceEnrolledHint } = get();
    if (faceEnrolledHint) {
      await storage.deleteItem(KEYS.accessToken);
      set({
        accessToken: null,
        isAuthenticated: false,
      });
    } else {
      // Tidak ada face enrolled — tidak ada cara restore tanpa OTP.
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
      });
    }
  },

  forgetDevice: async () => {
    // Hard logout: clear semua. Setelah ini user perlu OTP login dari nol.
    await Promise.all([
      storage.deleteItem(KEYS.accessToken),
      storage.deleteItem(KEYS.refreshToken),
      storage.deleteItem(KEYS.user),
      storage.deleteItem(KEYS.faceEnrolledHint),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      faceEnrolledHint: false,
    });
  },

  hasFaceSession: async () => {
    const [refreshToken, faceFlag, userJson] = await Promise.all([
      storage.getItem(KEYS.refreshToken),
      storage.getItem(KEYS.faceEnrolledHint),
      storage.getItem(KEYS.user),
    ]);
    return !!refreshToken && faceFlag === '1' && !!userJson;
  },

  setFaceEnrolledHint: async (enrolled) => {
    if (enrolled) {
      await storage.setItem(KEYS.faceEnrolledHint, '1');
    } else {
      await storage.deleteItem(KEYS.faceEnrolledHint);
    }
    set({ faceEnrolledHint: enrolled });
  },
}));
