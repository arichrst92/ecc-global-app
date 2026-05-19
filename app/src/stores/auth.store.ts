import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { User } from '@/types/api';

const KEYS = {
  accessToken: 'ecc.accessToken',
  refreshToken: 'ecc.refreshToken',
  user: 'ecc.user',
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;

  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        storage.getItem(KEYS.accessToken),
        storage.getItem(KEYS.refreshToken),
        storage.getItem(KEYS.user),
      ]);
      const user = userJson ? (JSON.parse(userJson) as User) : null;
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: !!accessToken && !!user,
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
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  logout: async () => {
    await Promise.all([
      storage.deleteItem(KEYS.accessToken),
      storage.deleteItem(KEYS.refreshToken),
      storage.deleteItem(KEYS.user),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },
}));
