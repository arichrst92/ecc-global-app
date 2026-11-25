/**
 * Tab per anggota keluarga (2.5.1) — dipakai halaman Homecell & Zona:
 * "Saya" lalu setiap anggota keluarga (bukan tamu). Bergulir ke samping bila
 * keluarga banyak; nama dipotong supaya chip tidak melebar.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/Avatar';

export type FamilyTabPerson = { id: string; namaLengkap: string; fotoUrl: string | null; relasi?: string };

export function FamilyMemberTabs({
  me,
  people,
  value,
  onChange,
}: {
  me: { namaLengkap: string; fotoUrl: string | null } | null;
  people: FamilyTabPerson[];
  /** null = Saya */
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  if (!people.length) return null;
  const items: { id: string | null; nama: string; fotoUrl: string | null; sub: string }[] = [
    { id: null, nama: t('family_tabs.me'), fotoUrl: me?.fotoUrl ?? null, sub: me?.namaLengkap.split(' ')[0] ?? '' },
    ...people.map((p) => ({ id: p.id, nama: p.namaLengkap.split(' ')[0] ?? p.namaLengkap, fotoUrl: p.fotoUrl, sub: p.relasi ?? '' })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
    >
      {items.map((it) => {
        const on = value === it.id;
        return (
          <Pressable
            key={it.id ?? 'me'}
            onPress={() => onChange(it.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`flex-row items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border ${
              on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'
            }`}
            style={{ maxWidth: 180 }}
          >
            <Avatar name={it.id ? it.nama : me?.namaLengkap ?? it.nama} fotoUrl={it.fotoUrl} size={26} />
            <View className="min-w-0 flex-shrink">
              <Text className={`text-xs font-bold ${on ? 'text-white' : 'text-neutral-800'}`} numberOfLines={1}>
                {it.nama}
              </Text>
              {it.sub ? (
                <Text className={`text-[10px] ${on ? 'text-white/80' : 'text-neutral-500'}`} numberOfLines={1}>
                  {it.sub}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
