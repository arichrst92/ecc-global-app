/**
 * Analitik anonim Els App (iOS, Android, web) → POST /telemetry.
 *
 *   - Halaman yang dibuka + lama di halaman (diringkas per hari × halaman)
 *   - "Aktif sekarang": halaman saat ini, dikirim ±30 detik selama app terbuka
 *   - Sampel waktu respons API (20%) termasuk jaringan
 *
 * Anonim: memakai ID acak per instalasi (bukan akun, nama, atau no HP).
 * Bisa dimatikan di Pengaturan → Privasi, atau dari server
 * (/public/app-config → telemetrySamplingRate = 0). Tidak memakai modul
 * native — aman untuk start app. Semua kesalahan ditelan diam-diam.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

import { env } from '@/config/env';

const K_INSTALL = 'ecc.analytics.installId';
const K_OPTOUT = 'ecc.analytics.optOut';
const K_PENDING = 'ecc.analytics.pending.v1';
const FLUSH_MS = 30_000;
const API_SAMPLE = 0.2;
const MAX_VIEW_SEC = 30 * 60;

type ViewAgg = { date: string; route: string; count: number; durSec: number };
type ApiSample = { m: string; p: string; ms: number; s: number; t: number };

const state = {
  ready: false,
  installId: '',
  optOut: false,
  /** 0..1 dari app-config; 0 = mati dari server. */
  serverRate: 1,
  mode: 'tamu' as 'login' | 'tamu',
  route: null as string | null,
  routeSince: 0,
  foreground: true,
  views: new Map<string, ViewAgg>(),
  api: [] as ApiSample[],
  timer: null as ReturnType<typeof setInterval> | null,
  sending: false,
};

const platform = (Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web') as 'ios' | 'android' | 'web';
const appVersion = (Constants.expoConfig?.version ?? '').slice(0, 20) || undefined;

function randomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Tanggal lokal HP (YYYY-MM-DD). */
function localDate(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const active = () => state.ready && !state.optOut && state.serverRate > 0;

/** Tutup kunjungan halaman yang sedang berjalan → tambahkan durasinya. */
function closeCurrent(now = Date.now()) {
  if (!state.route || !state.routeSince) return;
  const sec = Math.min(MAX_VIEW_SEC, Math.max(0, Math.round((now - state.routeSince) / 1000)));
  const key = `${localDate(state.routeSince)}|${state.route}`;
  const v = state.views.get(key);
  if (v) v.durSec += sec;
  // Kunjungan yang sudah terkirim tetap menambah durasi (baris baru, 0 kunjungan).
  else if (sec > 0 && active()) state.views.set(key, { date: localDate(state.routeSince), route: state.route, count: 0, durSec: sec });
  state.routeSince = now;
}

function addView(route: string) {
  const key = `${localDate()}|${route}`;
  const v = state.views.get(key);
  if (v) v.count++;
  else state.views.set(key, { date: localDate(), route, count: 1, durSec: 0 });
}

async function send(background = false) {
  if (!active() || state.sending) return;
  closeCurrent();
  const views = [...state.views.values()].filter((v) => v.count > 0 || v.durSec > 0).slice(0, 100);
  const api = state.api.splice(0, 200);
  state.views.clear();
  const body = {
    installId: state.installId,
    platform,
    appVersion,
    mode: state.mode,
    route: background || !state.foreground ? null : state.route,
    views,
    api,
  };
  state.sending = true;
  try {
    const res = await fetch(`${env.apiBaseUrl}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' },
      body: JSON.stringify(body),
      // Web: tetap terkirim saat tab ditutup / disembunyikan.
      ...(platform === 'web' ? { keepalive: true } : {}),
    });
    if (res.status >= 500) throw new Error(`telemetry ${res.status}`);
  } catch {
    // Gagal (offline) → kembalikan kunjungan, simpan untuk nanti. Sampel API dibuang.
    for (const v of views) {
      const key = `${v.date}|${v.route}`;
      const cur = state.views.get(key);
      if (cur) {
        cur.count += v.count;
        cur.durSec += v.durSec;
      } else state.views.set(key, { ...v });
    }
    if (state.views.size > 300) state.views = new Map([...state.views].slice(-300));
    void AsyncStorage.setItem(K_PENDING, JSON.stringify([...state.views.values()])).catch(() => {});
  } finally {
    state.sending = false;
  }
}

function onAppState(s: AppStateStatus) {
  const fg = s === 'active';
  if (fg === state.foreground) return;
  if (!fg) {
    closeCurrent();
    state.foreground = false;
    void send(true); // keluar dari "aktif sekarang"
  } else {
    state.foreground = true;
    state.routeSince = Date.now();
    void send();
  }
}

/** Dipanggil sekali saat app mulai. */
export async function initAnalytics() {
  if (state.ready) return;
  try {
    let id = await AsyncStorage.getItem(K_INSTALL);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = randomId();
      await AsyncStorage.setItem(K_INSTALL, id);
    }
    state.installId = id;
    state.optOut = (await AsyncStorage.getItem(K_OPTOUT)) === '1';
    const pending = await AsyncStorage.getItem(K_PENDING);
    if (pending) {
      for (const v of JSON.parse(pending) as ViewAgg[]) {
        if (v && v.route && v.date) state.views.set(`${v.date}|${v.route}`, v);
      }
      await AsyncStorage.removeItem(K_PENDING);
    }
  } catch {
    state.installId = state.installId || randomId();
  }
  state.ready = true;
  if (state.route && active()) addView(state.route);
  state.foreground = AppState.currentState === 'active' || platform === 'web';
  AppState.addEventListener('change', onAppState);
  state.timer = setInterval(() => {
    if (state.foreground) void send();
  }, FLUSH_MS);
}

/** Halaman (pola route expo-router, mis. /event/[id]) yang sedang dibuka. */
export function trackScreen(route: string) {
  if (route === state.route) return;
  if (!state.ready) {
    // Layar pertama sebelum init selesai — dicatat setelah siap.
    state.route = route;
    state.routeSince = Date.now();
    return;
  }
  const now = Date.now();
  closeCurrent(now);
  state.route = route;
  state.routeSince = now;
  if (active()) addView(route);
}

export function setAnalyticsMode(mode: 'login' | 'tamu') {
  state.mode = mode;
}

export function setAnalyticsServerRate(rate: number) {
  state.serverRate = Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 1;
}

/** Catat sampel waktu respons API (dari api client). status 0 = gagal jaringan. */
export function recordApiSample(method: string, url: string, ms: number, status: number) {
  if (!active() || Math.random() > API_SAMPLE) return;
  const path = url.replace(env.apiBaseUrl, '').split('?')[0] ?? '';
  if (!path || path.startsWith('/telemetry')) return;
  state.api.push({ m: method, p: path.slice(0, 300), ms: Math.round(ms), s: status, t: Date.now() });
  if (state.api.length > 300) state.api.splice(0, state.api.length - 300);
}

export async function isAnalyticsEnabled() {
  return (await AsyncStorage.getItem(K_OPTOUT).catch(() => null)) !== '1';
}

export async function setAnalyticsEnabled(enabled: boolean) {
  state.optOut = !enabled;
  if (!enabled) {
    state.views.clear();
    state.api.length = 0;
  }
  await AsyncStorage.setItem(K_OPTOUT, enabled ? '0' : '1').catch(() => {});
}
