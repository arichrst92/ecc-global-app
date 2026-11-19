/**
 * 2.5.0 — Pilih bagian/tugas petugas: langkah 1 kategori, langkah 2 tugas
 * (opsional). Boleh lebih dari satu, kategori saja, atau kosong.
 */
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';

import type { TugasEntry, TugasKategori, TugasPilihan } from '@/api/ministry';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { ministryIconComponent } from '@/components/ministry/MinistryIcon';

/** Label "Kategori › Tugas" dari pilihan; nama diambil dari opsi aktif atau snapshot lama. */
export function tugasPilihanText(value: TugasPilihan[], options: TugasKategori[], snapshot: TugasEntry[] = []) {
  const kName = new Map<string, string>();
  const tName = new Map<string, string>();
  for (const s of snapshot) {
    kName.set(s.kategoriId, s.kategori);
    if (s.tugasId && s.tugas) tName.set(s.tugasId, s.tugas);
  }
  for (const k of options) {
    kName.set(k.id, k.nama);
    for (const t of k.tugas) tName.set(t.id, t.nama);
  }
  return value
    .map((v) => {
      const k = kName.get(v.kategoriId) ?? '—';
      return v.tugasId ? `${k} › ${tName.get(v.tugasId) ?? '—'}` : k;
    })
    .join(', ');
}

export function TugasPicker({
  options,
  value,
  onChange,
}: {
  options: TugasKategori[];
  value: TugasPilihan[];
  onChange: (v: TugasPilihan[]) => void;
}) {
  const { t } = useTranslation();
  const katOn = (kid: string) => value.some((v) => v.kategoriId === kid);
  const tugasOn = (kid: string, tid: string) => value.some((v) => v.kategoriId === kid && v.tugasId === tid);
  const toggleKat = (kid: string) =>
    onChange(katOn(kid) ? value.filter((v) => v.kategoriId !== kid) : [...value, { kategoriId: kid, tugasId: null }]);
  const toggleTugas = (kid: string, tid: string) => {
    let next = tugasOn(kid, tid)
      ? value.filter((v) => !(v.kategoriId === kid && v.tugasId === tid))
      : [...value.filter((v) => !(v.kategoriId === kid && v.tugasId === null)), { kategoriId: kid, tugasId: tid }];
    // Semua tugas dilepas → kategorinya tetap terpilih.
    if (!next.some((v) => v.kategoriId === kid)) next = [...next, { kategoriId: kid, tugasId: null }];
    onChange(next);
  };

  if (!options.length) {
    return <Text className="text-[11px] text-neutral-500 mt-2 ml-12">{t('ministry.tugas_belum_diatur')}</Text>;
  }
  return (
    <View className="mt-2 ml-12 gap-2">
      <Text className="text-[11px] font-semibold text-neutral-500">{t('ministry.tugas_step_kategori')}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {options.map((k) => {
          const on = katOn(k.id);
          return (
            <Pressable
              key={k.id}
              onPress={() => toggleKat(k.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              {...gx(`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`)}
            >
              {on ? (
                <Check size={11} color="#fff" />
              ) : k.ikon ? (
                (() => {
                  const I = ministryIconComponent(k.ikon);
                  return <I size={12} color={nc('#525252')} />;
                })()
              ) : null}
              <Text className={`text-[11px] font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{k.nama}</Text>
            </Pressable>
          );
        })}
      </View>
      {options
        .filter((k) => katOn(k.id) && k.tugas.length)
        .map((k) => (
          <View key={k.id} className="pl-2 border-l-2 border-brand-200">
            <Text className="text-[11px] text-neutral-500 mb-1">{t('ministry.tugas_step_tugas', { kategori: k.nama })}</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {k.tugas.map((tg) => {
                const on = tugasOn(k.id, tg.id);
                return (
                  <Pressable
                    key={tg.id}
                    onPress={() => toggleTugas(k.id, tg.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    className={`px-2 py-0.5 rounded-full border ${on ? 'bg-brand-50 border-brand-400' : 'bg-card border-neutral-200'}`}
                  >
                    <Text className={`text-[11px] ${on ? 'font-semibold text-brand-700' : 'text-neutral-600'}`}>{tg.nama}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      {value.length ? (
        <Pressable onPress={() => onChange([])} className="self-start py-1">
          <Text className="text-[11px] font-semibold text-neutral-500">{t('ministry.tugas_kosongkan')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
