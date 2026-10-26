import { create } from 'zustand';
import { storage } from '@/utils/storage';
import { setLanguage, type SupportedLang } from '@/i18n';

const KEY = 'ecc.preferences';

type Prefs = {
  language: SupportedLang;
  darkMode: boolean;
  notif: {
    ibadah: boolean;
    renungan: boolean;
    event: boolean;
    payment: boolean;
  };
};

const DEFAULTS: Prefs = {
  language: 'en',
  darkMode: false,
  notif: { ibadah: true, renungan: true, event: true, payment: true },
};

type PrefsStore = Prefs & {
  hydrate: () => Promise<void>;
  setLanguage: (lang: SupportedLang) => Promise<void>;
  toggleDark: () => Promise<void>;
  /** Mode Terang/Gelap (Profil → Tampilan). Tidak mengikuti pengaturan HP. */
  setDarkMode: (dark: boolean, returnTo?: string) => Promise<void>;
  /** Rute yang dibuka lagi setelah UI di-mount ulang karena ganti tema (tidak disimpan). */
  afterThemeRoute: string | null;
  clearAfterThemeRoute: () => void;
  setNotif: (key: keyof Prefs['notif'], value: boolean) => Promise<void>;
};

export const usePreferencesStore = create<PrefsStore>((set, get) => ({
  ...DEFAULTS,
  afterThemeRoute: null,
  clearAfterThemeRoute: () => set({ afterThemeRoute: null }),

  hydrate: async () => {
    const json = await storage.getItem(KEY);
    if (json) {
      try {
        const parsed = { ...DEFAULTS, ...(JSON.parse(json) as Partial<Prefs>) };
        set({ ...parsed, afterThemeRoute: null });
        await setLanguage(parsed.language);
      } catch {
        // ignore
      }
    }
  },

  setLanguage: async (language) => {
    set({ language });
    await setLanguage(language);
    await storage.setItem(KEY, JSON.stringify({ ...get(), language }));
  },

  toggleDark: async () => {
    const darkMode = !get().darkMode;
    set({ darkMode });
    await storage.setItem(KEY, JSON.stringify({ ...get(), darkMode }));
  },

  setDarkMode: async (darkMode, returnTo) => {
    if (darkMode === get().darkMode) return;
    set({ darkMode, afterThemeRoute: returnTo ?? null });
    const { afterThemeRoute: _r, ...persisted } = get();
    await storage.setItem(KEY, JSON.stringify({ ...persisted, darkMode }));
  },

  setNotif: async (key, value) => {
    const notif = { ...get().notif, [key]: value };
    set({ notif });
    await storage.setItem(KEY, JSON.stringify({ ...get(), notif }));
  },
}));
