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
  /** Flag mode tamu (browse-only). Persist supaya kalau user close app di
   *  guest mode, re-open tetap di guest (tidak harus klik "lihat sebagai
   *  tamu" lagi). */
  guestMode: 'ecc.guestMode',
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

  /** Mode tamu — user akses app tanpa signup. isAuthenticated juga true
   *  supaya navigate ke tabs OK. Interaction yang butuh auth (RSVP, giving,
   *  attendance) detect isGuest dan show prompt signup. */
  isGuest: boolean;

  /** In-memory flag: user baru saja sign-out. Welcome screen check ini
   *  supaya tidak auto-launch face capture (user explicit minta keluar,
   *  re-launch immediately = bad UX). NOT persisted — reset di cold start. */
  justSignedOut: boolean;

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
  /** Masuk ke mode tamu — tanpa JWT, tanpa user data. Bisa browse public
   *  content (news, renungan, info gereja) tapi tidak bisa interact. */
  enterGuestMode: () => Promise<void>;
  /** Keluar dari mode tamu — kembali ke welcome screen. */
  exitGuestMode: () => Promise<void>;
  /** Clear justSignedOut flag — dipanggil oleh Welcome screen setelah
   *  acknowledge (skip auto-face-launch satu kali). */
  acknowledgeSignOut: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  faceEnrolledHint: false,
  isGuest: false,
  justSignedOut: false,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson, faceFlag, guestFlag] = await Promise.all([
        storage.getItem(KEYS.accessToken),
        storage.getItem(KEYS.refreshToken),
        storage.getItem(KEYS.user),
        storage.getItem(KEYS.faceEnrolledHint),
        storage.getItem(KEYS.guestMode),
      ]);
      const user = userJson ? (JSON.parse(userJson) as User) : null;
      const isGuest = guestFlag === '1';
      set({
        accessToken,
        refreshToken,
        user,
        // Authenticated kalau ada token+user ATAU dalam guest mode.
        // Guest mode tidak punya token tapi tetap dianggap "authenticated"
        // untuk routing — bisa browse tabs.
        isAuthenticated: (!!accessToken && !!user) || isGuest,
        faceEnrolledHint: faceFlag === '1',
        isGuest,
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
      // Login normal → exit guest mode kalau sebelumnya guest
      storage.deleteItem(KEYS.guestMode),
    ]);
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      isGuest: false,
    });
  },

  logout: async () => {
    // Soft logout: bersihkan accessToken tapi pertahankan refreshToken +
    // user + faceEnrolledHint kalau ada — supaya Welcome face login bisa
    // restore sesi tanpa OTP.
    // Set justSignedOut=true supaya Welcome screen skip auto-launch face
    // capture sekali (user explicit minta keluar — auto-relaunch=bad UX).
    const { faceEnrolledHint } = get();
    if (faceEnrolledHint) {
      await storage.deleteItem(KEYS.accessToken);
      set({
        accessToken: null,
        isAuthenticated: false,
        justSignedOut: true,
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
        justSignedOut: true,
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
      justSignedOut: true,
    });
  },

  acknowledgeSignOut: () => {
    set({ justSignedOut: false });
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

  enterGuestMode: async () => {
    await storage.setItem(KEYS.guestMode, '1');
    set({
      isGuest: true,
      isAuthenticated: true, // bypass auth gate, navigate ke tabs
      // Clear any stale credentials supaya API calls jangan attach Bearer token guest.
      accessToken: null,
      user: null,
    });
  },

  exitGuestMode: async () => {
    await storage.deleteItem(KEYS.guestMode);
    set({
      isGuest: false,
      isAuthenticated: false,
    });
  },
}));
