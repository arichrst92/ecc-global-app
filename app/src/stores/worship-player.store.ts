/**
 * ECC Worship — pemutar global (satu AudioPlayer expo-audio untuk seluruh app).
 *
 * - Antrian dengan sumber ("Semua lagu", "Album X", "Disukai", "Pilihan", …).
 * - Acak (urutan acak dari sumber) & Ulang (mati / semua / 1 lagu).
 * - Mode Vokal / Karaoke: ganti file, lanjut dari detik yang sama.
 * - Background playback + kontrol lock screen (setActiveForLockScreen).
 * - Hitung "diputar" setelah ≥ 30 detik (sekali per lagu per pemutaran).
 * - File unduhan dipakai bila ada (offline).
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';

import { getWorshipPlayUrl, reportWorshipPlayed, type WorshipMode, type WorshipTrack } from '@/api/worship';
import { localUriOf } from '@/lib/worshipDownloads';
import { addBreadcrumb, reportError } from '@/services/errorReporting';

const PLAY_COUNT_AFTER_SEC = 30;

export type RepeatMode = 'off' | 'all' | 'one';

type State = {
  queue: WorshipTrack[];
  /** urutan putar (index ke queue) — acak bila shuffle */
  order: number[];
  /** posisi di `order` */
  pos: number;
  sourceLabel: string;
  shuffle: boolean;
  repeat: RepeatMode;
  mode: WorshipMode;
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;

  current: () => WorshipTrack | null;
  playTracks: (tracks: WorshipTrack[], startIndex: number, opts: { source: string; shuffle?: boolean; mode?: WorshipMode }) => Promise<void>;
  addToQueue: (tracks: WorshipTrack[]) => void;
  toggle: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (sec: number) => void;
  jumpTo: (orderPos: number) => Promise<void>;
  setMode: (mode: WorshipMode) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  close: () => void;
};

let player: AudioPlayer | null = null;
let countedFor: string | null = null;
let pendingSeek: number | null = null;
let urlCache: Record<string, { url: string; exp: number }> = {};

function shuffled(n: number, first: number): number[] {
  const rest = [...Array(n).keys()].filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return [first, ...rest];
}

async function sourceOf(track: WorshipTrack, mode: WorshipMode): Promise<string> {
  const local = localUriOf(track.id, mode);
  if (local) return local;
  const k = `${track.id}:${mode}`;
  const c = urlCache[k];
  if (c && c.exp - Date.now() > 10 * 60_000) return c.url;
  const { url, expiresAt } = await getWorshipPlayUrl(track.id, mode);
  urlCache[k] = { url, exp: new Date(expiresAt).getTime() };
  return url;
}

export const useWorshipPlayer = create<State>((set, get) => {
  const ensurePlayer = () => {
    if (player) return player;
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    player = createAudioPlayer(null, { updateInterval: 250 });
    player.addListener('playbackStatusUpdate', (st: AudioStatus) => onStatus(st));
    return player;
  };

  const onStatus = (st: AudioStatus) => {
    if (pendingSeek !== null && st.isLoaded) {
      const t = pendingSeek;
      pendingSeek = null;
      void player?.seekTo(t);
    }
    set({ playing: st.playing, buffering: st.isBuffering, currentTime: st.currentTime, duration: st.duration || get().duration });
    const cur = get().current();
    if (cur && countedFor !== `${cur.id}:${get().pos}` && st.currentTime >= PLAY_COUNT_AFTER_SEC) {
      countedFor = `${cur.id}:${get().pos}`;
      void reportWorshipPlayed(cur.id, get().mode).catch(() => {});
    }
    if (st.didJustFinish) void onFinish();
  };

  const onFinish = async () => {
    const { repeat, pos, order } = get();
    if (repeat === 'one') {
      countedFor = null;
      await player?.seekTo(0);
      player?.play();
      return;
    }
    if (pos + 1 < order.length) return load(pos + 1, 0, true);
    if (repeat === 'all' && order.length) return load(0, 0, true);
    set({ playing: false });
  };

  const load = async (pos: number, startAt: number, autoplay: boolean) => {
    const { queue, order } = get();
    const track = queue[order[pos]!];
    if (!track) return;
    const mode = get().mode === 'KARAOKE' && !track.hasKaraoke ? 'VOKAL' : get().mode;
    addBreadcrumb(`worship play ${track.id} ${mode}`, 'worship');
    set({ pos, mode, loading: true, error: null, currentTime: startAt, duration: (mode === 'KARAOKE' ? track.karaokeDurasi : track.durasi) ?? 0 });
    countedFor = startAt >= PLAY_COUNT_AFTER_SEC ? `${track.id}:${pos}` : null;
    try {
      const uri = await sourceOf(track, mode);
      const p = ensurePlayer();
      p.replace({ uri });
      pendingSeek = startAt > 0 ? startAt : null;
      p.setActiveForLockScreen(
        true,
        { title: track.judul, artist: track.ciptaan ?? 'ECC Worship', albumTitle: track.albumJudul, artworkUrl: track.coverUrl ?? undefined },
        { showSeekBackward: true, showSeekForward: true },
      );
      if (autoplay) p.play();
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: 'Lagu tidak bisa diputar. Periksa koneksi internet.' });
      // Masuk ke Diagnostics portal (kecuali error jaringan yang sudah dicatat api client).
      reportError(e, { source: 'worship-player', songId: track.id, mode, offline: !!localUriOf(track.id, mode) });
    }
  };

  return {
    queue: [],
    order: [],
    pos: 0,
    sourceLabel: '',
    shuffle: false,
    repeat: 'off',
    mode: 'VOKAL',
    playing: false,
    buffering: false,
    currentTime: 0,
    duration: 0,
    loading: false,
    error: null,

    current: () => {
      const { queue, order, pos } = get();
      return order.length ? (queue[order[pos]!] ?? null) : null;
    },

    playTracks: async (tracks, startIndex, opts) => {
      if (!tracks.length) return;
      const shuffle = opts.shuffle ?? false;
      const start = shuffle && startIndex < 0 ? Math.floor(Math.random() * tracks.length) : Math.max(0, startIndex);
      const order = shuffle ? shuffled(tracks.length, start) : [...tracks.keys()];
      set({
        queue: tracks,
        order,
        sourceLabel: opts.source,
        shuffle,
        mode: opts.mode ?? get().mode,
      });
      await load(shuffle ? 0 : start, 0, true);
    },

    addToQueue: (tracks) => {
      if (!get().order.length) {
        void get().playTracks(tracks, 0, { source: 'Antrian' });
        return;
      }
      const base = get().queue.length;
      set((s) => ({ queue: [...s.queue, ...tracks], order: [...s.order, ...tracks.map((_, i) => base + i)] }));
    },

    toggle: () => {
      if (!player || !get().current()) return;
      if (player.playing) player.pause();
      else player.play();
    },

    next: async () => {
      const { pos, order, repeat } = get();
      if (pos + 1 < order.length) return load(pos + 1, 0, true);
      if (repeat !== 'off' && order.length) return load(0, 0, true);
    },

    prev: async () => {
      if (get().currentTime > 3 || get().pos === 0) {
        await player?.seekTo(0);
        return;
      }
      await load(get().pos - 1, 0, true);
    },

    seek: (sec) => {
      set({ currentTime: sec });
      void player?.seekTo(sec);
    },

    jumpTo: async (orderPos) => load(orderPos, 0, true),

    setMode: async (mode) => {
      const cur = get().current();
      if (!cur || mode === get().mode) return set({ mode });
      if (mode === 'KARAOKE' && !cur.hasKaraoke) return;
      const t = player?.currentTime ?? get().currentTime;
      const wasPlaying = player?.playing ?? true;
      set({ mode });
      await load(get().pos, t, wasPlaying);
    },

    toggleShuffle: () => {
      const { shuffle, queue, order, pos } = get();
      const curIdx = order[pos] ?? 0;
      if (!queue.length) return set({ shuffle: !shuffle });
      const nextOrder = !shuffle ? shuffled(queue.length, curIdx) : [...queue.keys()];
      set({ shuffle: !shuffle, order: nextOrder, pos: nextOrder.indexOf(curIdx) });
    },

    cycleRepeat: () => set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),

    close: () => {
      if (player) {
        player.pause();
        player.clearLockScreenControls();
      }
      countedFor = null;
      urlCache = {};
      set({ queue: [], order: [], pos: 0, playing: false, currentTime: 0, duration: 0, sourceLabel: '', error: null });
    },
  };
});

/** Lagu aktif (re-render saat lagu berganti). */
export function useCurrentTrack(): WorshipTrack | null {
  return useWorshipPlayer((s) => (s.order.length ? (s.queue[s.order[s.pos]!] ?? null) : null));
}
