/**
 * Bagian bersama layar Update (wajib & biasa) dan Maintenance.
 *
 * - Teks dari server (catatan rilis, pesan maintenance) dipilih sesuai bahasa
 *   app: English memakai kolom *En; bila kosong, TIDAK jatuh ke teks Indonesia
 *   (pakai teks bawaan English / tanpa catatan) supaya bahasa tetap konsisten.
 * - Link store cadangan bila admin belum mengisi Download URL.
 */
import { Image, Platform, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';

import type { AppVersionInfo } from '@/types/appVersion';
import { ELS_APP_LINKS } from '@/utils/shareApp';

export const APP_ICON = require('../../../assets/images/ecc-icon-ios.png');

export const isEnglish = (lang: string | undefined) => (lang ?? 'id').toLowerCase().startsWith('en');

export function releaseNotesFor(data: Pick<AppVersionInfo, 'releaseNotes' | 'releaseNotesEn'>, lang: string) {
  const v = isEnglish(lang) ? data.releaseNotesEn : data.releaseNotes;
  return v?.trim() ? v.trim() : null;
}

export function storeUrlFor(data: Pick<AppVersionInfo, 'downloadUrl'>): string {
  if (data.downloadUrl?.trim()) return data.downloadUrl.trim();
  return Platform.OS === 'android' ? ELS_APP_LINKS.android : ELS_APP_LINKS.ios;
}

/** Logo Els App dengan bingkai putih lembut (dipakai di atas latar oranye). */
export function AppLogo({ size = 88 }: { size?: number }) {
  const pad = Math.round(size * 0.07);
  return (
    <View
      style={{
        padding: pad,
        borderRadius: size * 0.3,
        backgroundColor: 'rgba(255,255,255,0.22)',
      }}
    >
      <Image
        source={APP_ICON}
        style={{ width: size, height: size, borderRadius: size * 0.23 }}
        accessibilityIgnoresInvertColors
        accessibilityLabel="Els App"
      />
    </View>
  );
}

/** Pil "2.4.3 → 2.4.4" di atas latar oranye. */
export function VersionPill({ current, latest }: { current: string; latest: string | null }) {
  if (!latest) return null;
  return (
    <View className="flex-row items-center gap-2 bg-white/20 rounded-full px-3 py-1">
      <Text className="text-white/85 text-xs font-medium">{current || '-'}</Text>
      <Text className="text-white text-xs">→</Text>
      <Text className="text-white text-xs font-bold">{latest}</Text>
    </View>
  );
}

/**
 * Catatan rilis: baris berawalan "-", "•", "*" atau angka ditampilkan sebagai
 * daftar bercentang; baris lain sebagai paragraf.
 */
export function ReleaseNotes({ text }: { text: string }) {
  const { t } = useTranslation();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <View className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
      <Text className="text-xs font-semibold text-brand-600 mb-3">{t('update.release_notes')}</Text>
      <View className="gap-2.5">
        {lines.map((l, i) => {
          const m = l.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
          if (!m) {
            return (
              <Text key={i} className="text-sm text-neutral-700 leading-relaxed">
                {l.replace(/\*\*/g, '')}
              </Text>
            );
          }
          return (
            <View key={i} className="flex-row gap-2.5">
              <View className="w-5 h-5 rounded-full bg-brand-100 items-center justify-center mt-0.5">
                <Check size={12} color="#EA580C" strokeWidth={3} />
              </View>
              <Text className="flex-1 text-sm text-neutral-700 leading-relaxed">{(m[1] ?? '').replace(/\*\*/g, '')}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
