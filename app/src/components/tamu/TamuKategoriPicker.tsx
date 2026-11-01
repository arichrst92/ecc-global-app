/**
 * Pilihan kategori tamu (2.4.5): Belum ditentukan (default) · New Comer · Visitor saja.
 * Wajib terlihat di setiap form tamu; "Belum ditentukan" adalah pilihan sah
 * dan bisa dirapikan tim ECC di Portal → Tamu.
 *
 * variant="self" → label untuk tamu yang mengisi sendiri (mode tamu, minta
 * bergabung homecell): "Belum tahu" · "Ingin bergabung" · "Sekadar berkunjung".
 */
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type TamuKategori = 'BELUM' | 'NEW_COMER' | 'VISITOR';
export const TAMU_KATEGORI_OPTIONS: TamuKategori[] = ['BELUM', 'NEW_COMER', 'VISITOR'];

export function tamuKategoriLabel(t: (k: string) => string, k: string | null | undefined): string {
  return t(`tamu.kategori_${k === 'NEW_COMER' || k === 'VISITOR' ? k : 'BELUM'}`);
}

export function TamuKategoriPicker({
  value,
  onChange,
  variant = 'staff',
}: {
  value: TamuKategori;
  onChange: (v: TamuKategori) => void;
  variant?: 'staff' | 'self';
}) {
  const { t } = useTranslation();
  const prefix = variant === 'self' ? 'tamu.kategori_self_' : 'tamu.kategori_';
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-neutral-800">
        {t(variant === 'self' ? 'tamu.kategori_self_title' : 'tamu.kategori_title')}
      </Text>
      <View className="flex-row gap-1.5">
        {TAMU_KATEGORI_OPTIONS.map((k) => {
          const on = value === k;
          return (
            <Pressable
              key={k}
              onPress={() => onChange(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              className={`flex-1 rounded-xl px-2 py-2.5 border items-center justify-center ${
                on ? 'bg-brand-50 border-brand-500' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <Text
                className={`text-xs text-center font-semibold ${on ? 'text-brand-700' : 'text-neutral-700'}`}
                numberOfLines={2}
              >
                {t(`${prefix}${k}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-[11px] text-neutral-500 leading-4">{t(`${prefix}${value}_hint`)}</Text>
    </View>
  );
}
