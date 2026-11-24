/**
 * Petugas Pelayanan di detail ibadah & event.
 *
 * Tata letak aman untuk HP layar kecil:
 *  - dikelompokkan per ministry (judul kelompok = ikon + nama ministry + jumlah)
 *  - tiap orang: foto | nama (maks 2 baris) di atas, peran di bawah — tidak ada
 *    chip + peran berjejer dalam satu baris yang bisa meluber
 *  - tim besar diringkas (maks VISIBLE orang) dengan tombol "Lihat semua"
 * Ketuk orang → profil (view-only).
 * 2.5.0 — bagian/tugas (Kategori › Tugas) hanya dikirim server untuk petugas
 * pelayanan itu (dan rekannya) serta koordinatornya; jemaat lain cukup peran.
 */
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, ClipboardList, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ministryIconComponent, ministryWarna } from '@/components/ministry/MinistryIcon';
import { nc } from '@/theme/ThemeRoot';
import { tugasText, type TugasEntry } from '@/api/ministry';

export type TeamMember = {
  id: string;
  pelayananNama: string;
  pelayananIkon?: string | null;
  pelayananWarna?: string | null;
  role: string;
  jemaat: { id: string; namaLengkap: string; fotoUrl?: string | null };
  /** 2.5.0 — hanya ada bila viewer boleh melihat. */
  tugas?: TugasEntry[];
  /** Viewer sendiri. */
  isMe?: boolean;
};

const VISIBLE = 8;

export function MinistryTeamCard({ petugas, className = '' }: { petugas: TeamMember[] | undefined; className?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [all, setAll] = useState(false);

  // Kelompok per ministry, urutan dari server dipertahankan.
  const groups = useMemo(() => {
    const map = new Map<string, { nama: string; ikon?: string | null; warna?: string | null; people: TeamMember[] }>();
    for (const p of petugas ?? []) {
      const g = map.get(p.pelayananNama) ?? { nama: p.pelayananNama, ikon: p.pelayananIkon, warna: p.pelayananWarna, people: [] };
      g.people.push(p);
      map.set(p.pelayananNama, g);
    }
    return [...map.values()];
  }, [petugas]);

  const total = petugas?.length ?? 0;
  if (!total) return null;

  // Batasi jumlah orang yang tampil (lintas kelompok) saat diringkas.
  let budget = all ? Infinity : VISIBLE;
  const shown = groups
    .map((g) => {
      const people = g.people.slice(0, Math.max(0, budget));
      budget -= people.length;
      return { ...g, people };
    })
    .filter((g) => g.people.length);

  return (
    <View className={`bg-card rounded-2xl p-4 border border-neutral-100 ${className}`}>
      <View className="flex-row items-center gap-2 mb-1">
        <Users size={16} color={nc('#525252')} />
        <Text className="flex-1 text-sm font-semibold text-neutral-700" numberOfLines={1}>
          {t('ibadah.team')}
        </Text>
        <Text className="text-xs text-neutral-500">{total}</Text>
      </View>

      {shown.map((g, gi) => {
        const Icon = ministryIconComponent(g.ikon);
        const w = ministryWarna(g.warna);
        const fullCount = groups.find((x) => x.nama === g.nama)?.people.length ?? g.people.length;
        return (
          <View key={g.nama} className={gi > 0 ? 'mt-3 pt-3 border-t border-neutral-100' : 'mt-2'}>
            {/* Judul kelompok: ikon ministry + nama (boleh turun baris) + jumlah */}
            <View className="flex-row items-center gap-2 mb-2">
              <View style={{ backgroundColor: w.bg }} className="w-6 h-6 rounded-md items-center justify-center">
                <Icon size={13} color={w.fg} />
              </View>
              <Text className="flex-1 text-xs font-bold leading-4" style={{ color: w.fg }} numberOfLines={2}>
                {g.nama}
              </Text>
              <Text className="text-[11px] text-neutral-500">{fullCount}</Text>
            </View>

            <View className="gap-2">
              {g.people.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/jemaat/${p.jemaat.id}` as never)}
                  className="flex-row items-center gap-3 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={`${p.jemaat.namaLengkap}, ${p.role}${p.tugas?.length ? `, ${tugasText(p.tugas)}` : ''}`}
                >
                  <Avatar name={p.jemaat.namaLengkap} fotoUrl={p.jemaat.fotoUrl ?? null} size={32} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-medium text-neutral-900 leading-5" numberOfLines={2}>
                      {p.jemaat.namaLengkap}
                      {p.isMe ? <Text className="text-xs font-semibold text-brand-600">{`  ${t('ibadah.team_you')}`}</Text> : null}
                    </Text>
                    {p.role ? (
                      <Text className="text-xs text-neutral-500 leading-4" numberOfLines={1}>
                        {p.role}
                      </Text>
                    ) : null}
                    {p.tugas?.length ? (
                      <View className="flex-row items-start gap-1 mt-0.5">
                        <ClipboardList size={11} color="#EA580C" style={{ marginTop: 2 }} />
                        <Text className="flex-1 text-xs font-medium text-brand-700 leading-4" numberOfLines={2}>
                          {tugasText(p.tugas)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      {total > VISIBLE ? (
        <Pressable
          onPress={() => setAll((v) => !v)}
          hitSlop={6}
          className="mt-3 pt-3 border-t border-neutral-100 flex-row items-center justify-center gap-1"
        >
          <Text className="text-sm font-semibold text-brand-600">
            {all ? t('ibadah.team_less') : t('ibadah.team_all', { count: total })}
          </Text>
          {all ? <ChevronUp size={16} color="#EA580C" /> : <ChevronDown size={16} color="#EA580C" />}
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * "Anda bertugas" — kartu menonjol di atas detail ibadah / event untuk petugas
 * yang melayani (2.5.1). Menampilkan pelayanan, peran, dan tugas (Kategori ›
 * Tugas) dari koordinator; bila belum diatur → keterangan "belum diatur".
 * Data = baris `isMe` dari daftar petugas (server sudah mengirim tugas untuk
 * petugas itu sendiri).
 */
export function MyDutyCard({ petugas, className = '' }: { petugas: TeamMember[] | undefined; className?: string }) {
  const { t } = useTranslation();
  const mine = (petugas ?? []).filter((p) => p.isMe);
  if (!mine.length) return null;
  return (
    <View className={`bg-brand-50 border border-brand-200 rounded-2xl p-4 ${className}`} accessibilityRole="summary">
      <View className="flex-row items-center gap-2 mb-2">
        <ClipboardList size={16} color="#EA580C" />
        <Text className="flex-1 text-sm font-bold text-brand-800">{t('ibadah.my_duty_title')}</Text>
      </View>
      <View className="gap-2.5">
        {mine.map((p) => {
          const Icon = ministryIconComponent(p.pelayananIkon);
          const w = ministryWarna(p.pelayananWarna);
          return (
            <View key={p.id} className="flex-row items-start gap-2.5">
              <View style={{ backgroundColor: w.bg }} className="w-7 h-7 rounded-lg items-center justify-center mt-0.5">
                <Icon size={14} color={w.fg} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-neutral-900 leading-5" numberOfLines={2}>
                  {p.pelayananNama}
                  {p.role ? <Text className="text-xs font-normal text-neutral-500">{`  ·  ${p.role}`}</Text> : null}
                </Text>
                {p.tugas?.length ? (
                  <Text className="text-sm font-medium text-brand-700 leading-5 mt-0.5">{tugasText(p.tugas)}</Text>
                ) : (
                  <Text className="text-xs text-neutral-500 leading-4 mt-0.5">{t('ibadah.my_duty_none')}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
