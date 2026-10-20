/**
 * ECC Worship — unduhan offline.
 *
 * File disimpan di folder dokumen app (sandbox; tidak terlihat aplikasi lain)
 * dan hanya diputar dari dalam Els App. Index unduhan di AsyncStorage.
 * Web: tidak didukung (disembunyikan di UI).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

import { reportError } from '@/services/errorReporting';
import { getWorshipPlayUrl, reportWorshipDownloaded, type WorshipMode, type WorshipTrack } from '@/api/worship';

const KEY = 'ecc.worship.downloads.v1';
const DIR = `${FileSystem.documentDirectory ?? ''}worship/`;

export const downloadsSupported = Platform.OS !== 'web';

export type DownloadEntry = {
  songId: string;
  mode: WorshipMode;
  uri: string;
  size: number;
  judul: string;
  albumJudul: string;
  coverUrl: string | null;
  savedAt: number;
};

type State = {
  entries: Record<string, DownloadEntry>;
  /** key → progres 0..1 (sedang mengunduh) */
  progress: Record<string, number>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  download: (track: WorshipTrack, mode: WorshipMode) => Promise<void>;
  remove: (songId: string, mode?: WorshipMode) => Promise<void>;
  removeAll: () => Promise<void>;
};

export const dlKey = (songId: string, mode: WorshipMode) => `${songId}:${mode}`;

async function persist(entries: Record<string, DownloadEntry>) {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries)).catch(() => {});
}

export const useWorshipDownloads = create<State>((set, get) => ({
  entries: {},
  progress: {},
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated || !downloadsSupported) return set({ hydrated: true });
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, DownloadEntry>) : {};
      // Buang entri yang filenya hilang.
      const checked: Record<string, DownloadEntry> = {};
      for (const [k, e] of Object.entries(parsed)) {
        const info = await FileSystem.getInfoAsync(e.uri).catch(() => ({ exists: false }));
        if (info.exists) checked[k] = e;
      }
      set({ entries: checked, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  download: async (track, mode) => {
    if (!downloadsSupported) return;
    const k = dlKey(track.id, mode);
    if (get().entries[k] || get().progress[k] !== undefined) return;
    set((s) => ({ progress: { ...s.progress, [k]: 0 } }));
    try {
      await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
      const { url } = await getWorshipPlayUrl(track.id, mode);
      const ext = (mode === 'KARAOKE' ? track.karaokeExt : track.audioExt) ?? 'mp3';
      const target = `${DIR}${track.id}-${mode.toLowerCase()}.${ext}`;
      const task = FileSystem.createDownloadResumable(url, target, {}, (p) => {
        const frac = p.totalBytesExpectedToWrite > 0 ? p.totalBytesWritten / p.totalBytesExpectedToWrite : 0;
        set((s) => ({ progress: { ...s.progress, [k]: frac } }));
      });
      const res = await task.downloadAsync();
      if (!res || res.status >= 400) throw new Error('download failed');
      const info = await FileSystem.getInfoAsync(res.uri);
      const entry: DownloadEntry = {
        songId: track.id,
        mode,
        uri: res.uri,
        size: info.exists && 'size' in info ? (info.size ?? 0) : 0,
        judul: track.judul,
        albumJudul: track.albumJudul,
        coverUrl: track.coverUrl,
        savedAt: Date.now(),
      };
      const entries = { ...get().entries, [k]: entry };
      set({ entries });
      await persist(entries);
      void reportWorshipDownloaded(track.id, mode).catch(() => {});
    } catch (e) {
      reportError(e, { source: 'worship-download', songId: track.id, mode });
      throw e;
    } finally {
      set((s) => {
        const p = { ...s.progress };
        delete p[k];
        return { progress: p };
      });
    }
  },
  remove: async (songId, mode) => {
    const entries = { ...get().entries };
    for (const m of mode ? [mode] : (['VOKAL', 'KARAOKE'] as WorshipMode[])) {
      const e = entries[dlKey(songId, m)];
      if (e) {
        await FileSystem.deleteAsync(e.uri, { idempotent: true }).catch(() => {});
        delete entries[dlKey(songId, m)];
      }
    }
    set({ entries });
    await persist(entries);
  },
  removeAll: async () => {
    await FileSystem.deleteAsync(DIR, { idempotent: true }).catch(() => {});
    set({ entries: {} });
    await persist({});
  },
}));

export function localUriOf(songId: string, mode: WorshipMode): string | null {
  return useWorshipDownloads.getState().entries[dlKey(songId, mode)]?.uri ?? null;
}
