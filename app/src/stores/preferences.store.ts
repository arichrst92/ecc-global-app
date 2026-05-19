import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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
  language: 'id',
  darkMode: false,
  notif: { ibadah: true, renungan: true, event: true, payment: true },
};

type PrefsStore = Prefs & {
  hydrate: () => Promise<void>;
  setLanguage: (lang: SupportedLang) => Promise<void>;
  toggleDark: () => Promise<void>;
  setNotif: (key: keyof Prefs['notif'], value: boolean) => Promise<void>;
};

export const usePreferencesStore = create<PrefsStore>((set, get) => ({
  ...DEFAULTS,

  hydrate: async () => {
    const json = await SecureStore.getItemAsync(KEY);
    if (json) {
      try {
        const parsed = { ...DEFAULTS, ...(JSON.parse(json) as Partial<Prefs>) };
        set(parsed);
        await setLanguage(parsed.language);
      } catch {
        // ignore
      }
    }
  },

  setLanguage: async (language) => {
    set({ language });
    await setLanguage(language);
    await SecureStore.setItemAsync(KEY, JSON.stringify({ ...get(), language }));
  },

  toggleDark: async () => {
    const darkMode = !get().darkMode;
    set({ darkMode });
    await SecureStore.setItemAsync(KEY, JSON.stringify({ ...get(), darkMode }));
  },

  setNotif: async (key, value) => {
    const notif = { ...get().notif, [key]: value };
    set({ notif });
    await SecureStore.setItemAsync(KEY, JSON.stringify({ ...get(), notif }));
  },
}));
