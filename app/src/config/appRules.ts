/**
 * Aturan & teks dari server (GET /public/app-config → `rules`, `texts`), 2026-11.
 *
 * Dulu angka aturan (menit check-in, usia anak, batas hari homecell…) dan teks
 * yang menyebutnya tertanam di app → mengubah aturan server butuh build baru.
 * Sekarang:
 *   - `appRule('kidsMaxAge')` dll. → angka dari server, cadangan = nilai bawaan.
 *   - `texts` → menimpa teks i18n app (per bahasa). Bisa diatur di Portal
 *     (Developer Tools → Diagnostics → App Config → Teks app).
 * Konfigurasi terakhir disimpan (AsyncStorage) supaya langsung berlaku saat
 * app dibuka tanpa jaringan.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';

export type AppRules = {
  selfCheckinOpenBeforeMin: number;
  selfCheckinCloseAfterMin: number;
  scanBeforeMin: number;
  scanAfterMin: number;
  cancelCheckinAfterMin: number;
  visitCancelMin: number;
  kidsMaxAge: number;
  signupWindowMin: number;
  homecellOkDays: number;
  homecellWarnDays: number;
  zoneMetDays: number;
  zoneNotMetDays: number;
};

export type AppTexts = { id?: Record<string, string>; en?: Record<string, string> };
export type AppLinks = { manual?: { id?: string; en?: string } };

/** Tautan bawaan (server bisa mengganti lewat app-config `links`). */
const LINK_DEFAULTS = {
  manual: { id: 'https://portal.eccchurch.global/download/manual.pdf', en: 'https://portal.eccchurch.global/download/manual.pdf' },
};
let links = LINK_DEFAULTS;

/** URL User Manual sesuai bahasa app. */
export function manualUrl(lang: string | undefined): string {
  return (lang?.startsWith('en') ? links.manual.en : links.manual.id) || LINK_DEFAULTS.manual.id;
}

/** Nilai bawaan = aturan saat build ini dibuat (dipakai bila server belum mengirim). */
export const APP_RULE_DEFAULTS: AppRules = {
  selfCheckinOpenBeforeMin: 15,
  selfCheckinCloseAfterMin: 30,
  scanBeforeMin: 30,
  scanAfterMin: 30,
  cancelCheckinAfterMin: 30,
  visitCancelMin: 60,
  kidsMaxAge: 13,
  signupWindowMin: 60,
  homecellOkDays: 7,
  homecellWarnDays: 30,
  zoneMetDays: 7,
  zoneNotMetDays: 14,
};

const STORAGE_KEY = 'ecc.appRules.v1';
let rules: AppRules = { ...APP_RULE_DEFAULTS };
/** Teks asli app untuk kunci yang sedang ditimpa → dikembalikan bila override dihapus. */
const originals: Record<string, Map<string, string | undefined>> = { id: new Map(), en: new Map() };

const sane = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 100_000 ? v : def);

/** Angka aturan dari server (cadangan: nilai bawaan build). */
export function appRule<K extends keyof AppRules>(key: K): AppRules[K] {
  return rules[key];
}

let lastTextsJson = '';
function applyTexts(texts: AppTexts | undefined) {
  const json = JSON.stringify(texts ?? {});
  if (json === lastTextsJson) return; // tidak berubah -> tanpa render ulang seluruh app
  lastTextsJson = json;
  for (const lang of ['id', 'en'] as const) {
    const next = texts?.[lang] ?? {};
    const orig = originals[lang]!;
    // Kembalikan kunci yang tidak lagi ditimpa.
    for (const [key, val] of orig) {
      if (!(key in next)) {
        if (val === undefined) i18n.addResource(lang, 'translation', key, '');
        else i18n.addResource(lang, 'translation', key, val);
        orig.delete(key);
      }
    }
    for (const [key, val] of Object.entries(next)) {
      if (typeof val !== 'string' || !val.trim()) continue;
      if (!orig.has(key)) orig.set(key, i18n.getResource(lang, 'translation', key) as string | undefined);
      i18n.addResource(lang, 'translation', key, val);
    }
  }
  // Komponen yang memakai useTranslation ikut menggambar ulang.
  i18n.emit('languageChanged', i18n.language);
}

/** Terapkan konfigurasi server (rules + texts). Aman dipanggil berulang. */
export function applyAppRulesConfig(
  cfg: { rules?: Partial<AppRules> | null; texts?: AppTexts | null; links?: AppLinks | null } | null | undefined,
  persist = true,
) {
  if (!cfg) return;
  if (cfg.links?.manual) {
    const ok = (u?: string) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : undefined);
    links = { manual: { id: ok(cfg.links.manual.id) ?? LINK_DEFAULTS.manual.id, en: ok(cfg.links.manual.en) ?? ok(cfg.links.manual.id) ?? LINK_DEFAULTS.manual.en } };
  }
  if (cfg.rules) {
    const next = { ...APP_RULE_DEFAULTS };
    for (const k of Object.keys(APP_RULE_DEFAULTS) as (keyof AppRules)[]) next[k] = sane(cfg.rules[k], APP_RULE_DEFAULTS[k]);
    rules = next;
  }
  if (cfg.texts) applyTexts(cfg.texts);
  if (persist && (cfg.rules || cfg.texts || cfg.links)) {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ rules: cfg.rules ?? null, texts: cfg.texts ?? null, links: cfg.links ?? null })).catch(() => {});
  }
}

/** Muat konfigurasi terakhir dari penyimpanan (dipanggil saat app dibuka). */
export async function hydrateAppRules(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) applyAppRulesConfig(JSON.parse(raw), false);
  } catch {
    // abaikan — pakai nilai bawaan
  }
}
