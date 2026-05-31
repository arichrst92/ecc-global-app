import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { User } from '@/types/api';

const KEYS = {
  accessToken: 'ecc.accessToken',
  refreshToken: 'ecc.refreshToken',
  user: 'ecc.user',
  /** Flag mode tamu (browse-only). Persist supaya kalau user close app di
   *  guest mode, re-open tetap di guest (tidak harus klik "lihat sebagai
   *  tamu" lagi). */
  guestMode: 'ecc.guestMode',
  /** ORPHAN — was used untuk face login feature yang sudah di-remove
   *  (M33, 2026-05-26). Key tetap di SecureStore untuk user existing —
   *  hydrate() one-time cleanup delete idempotent. */
  faceEnrolledHintLegacy: 'ecc.faceEnrolledHint',
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;

  /** Mode tamu — user akses app tanpa signup. isAuthenticated juga true
   *  supaya navigate ke tabs OK. Interaction yang butuh auth (RSVP, giving,
   *  attendance) detect isGuest dan show prompt signup. */
  isGuest: boolean;

  /** In-memory flag: user baru saja sign-out. Welcome screen check ini
   *  supaya tidak auto-launch flow apapun (user explicit minta keluar).
   *  NOT persisted — reset di cold start. */
  justSignedOut: boolean;

  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  /** Logout: clear semua tokens + user. */
  logout: () => Promise<void>;
  /** Hard logout — alias logout sekarang karena tidak ada face session
   *  yang perlu di-preserve. Retained sebagai API surface untuk
   *  callers existing (mis. delete account flow). */
  forgetDevice: () => Promise<void>;
  /** Masuk ke mode tamu — tanpa JWT, tanpa user data. Bisa browse public
   *  content (news, renungan, info gereja) tapi tidak bisa interact. */
  enterGuestMode: () => Promise<void>;
  /** Keluar dari mode tamu — kembali ke welcome screen. */
  exitGuestMode: () => Promise<void>;
  /** Clear justSignedOut flag — dipanggil oleh Welcome screen setelah
   *  acknowledge. */
  acknowledgeSignOut: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  isGuest: false,
  justSignedOut: false,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson, guestFlag] = await Promise.all([
        storage.getItem(KEYS.accessToken),
        storage.getItem(KEYS.refreshToken),
        storage.getItem(KEYS.user),
        storage.getItem(KEYS.guestMode),
      ]);
      // One-time cleanup: remove orphan face flag key dari feature yang sudah
      // di-remove (M33). Idempotent — delete non-existent key = no-op. Fire-
      // and-forget supaya tidak block hydrate kalau gagal.
      storage.deleteItem(KEYS.faceEnrolledHintLegacy).catch(() => {});

      const user = userJson ? (JSON.parse(userJson) as User) : null;
      const isGuest = guestFlag === '1';
      set({
        accessToken,
        refreshToken,
        user,
        // Authenticated kalau ada token+user ATAU dalam guest mode.
        isAuthenticated: (!!accessToken && !!user) || isGuest,
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
    // Clear semua tokens + user. Sebelumnya soft logout preserve refreshToken
    // untuk face login restore — sekarang face login removed, full clear.
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
  },

  forgetDevice: async () => {
    // Alias logout — sebelumnya beda karena face hint perlu retained di
    // soft logout. Sekarang same behavior. Retained sebagai API surface
    // untuk callers existing (mis. delete account flow yang lewat sini).
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
  },

  acknowledgeSignOut: () => {
    set({ justSignedOut: false });
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
