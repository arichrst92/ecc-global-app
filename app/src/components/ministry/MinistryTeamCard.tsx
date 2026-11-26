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

/**
 * Kelompokkan petugas satu pelayanan per **kategori tugas** (Portal → Pelayanan →
 * tugas, mis. "Registrasi", "Camera"); baris orang menampilkan tugasnya.
 * Petugas yang belum diberi tugas → dikelompokkan per peran.
 * Urutan kelompok = urutan kemunculan dari server.
 */
type TeamGroup = { key: string; title: string; people: { p: TeamMember; sub: string | null }[] };
function byTugas(people: TeamMember[]): TeamGroup[] {
  const m = new Map<string, TeamGroup>();
  const add = (key: string, title: string, p: TeamMember, sub: string | null) => {
    const g = m.get(key) ?? { key, title, people: [] };
    g.people.push({ p, sub });
    m.set(key, g);
  };
  for (const p of people) {
    const first = p.tugas?.[0];
    if (first) {
      // Tugas di kategori yang sama digabung ("Operator Atas, Switcher"); kategori lain ikut disebut.
      const same = p.tugas!.filter((x) => x.kategoriId === first.kategoriId).map((x) => x.tugas).filter(Boolean) as string[];
      const other = p.tugas!.filter((x) => x.kategoriId !== first.kategoriId);
      const sub = [same.join(', ') || p.role || null, other.length ? tugasText(other) : null].filter(Boolean).join(' · ') || null;
      add(`k:${first.kategoriId}`, first.kategori, p, sub);
    } else {
      const r = (p.role ?? '').trim();
      add(`r:${r}`, r, p, null);
    }
  }
  return [...m.values()];
}

export function MinistryTeamCard({
  petugas,
  className = '',
  embedded = false,
}: {
  petugas: TeamMember[] | undefined;
  className?: string;
  /** Di dalam tab Detail Ibadah/Event — judul kartu tidak perlu (sudah di tab). */
  embedded?: boolean;
}) {
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
      {!embedded ? (
        <View className="flex-row items-center gap-2 mb-1">
          <Users size={16} color={nc('#525252')} />
          <Text className="flex-1 text-sm font-semibold text-neutral-700" numberOfLines={1}>
            {t('ibadah.team')}
          </Text>
          <Text className="text-xs text-neutral-500">{total}</Text>
        </View>
      ) : null}

      {shown.map((g, gi) => {
        const Icon = ministryIconComponent(g.ikon);
        const w = ministryWarna(g.warna);
        const fullCount = groups.find((x) => x.nama === g.nama)?.people.length ?? g.people.length;
        return (
          <View key={g.nama} className={gi > 0 ? 'mt-3 pt-3 border-t border-neutral-100' : embedded ? '' : 'mt-2'}>
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

            {/* Dikelompokkan per kategori tugas (atau peran bila belum ada tugas) — tidak terpisah-pisah. */}
            <View className="gap-3">
              {byTugas(g.people).map((r) => {
                return (
                  <View key={r.key}>
                    {r.title ? (
                      <View className="flex-row items-center gap-2 mb-1.5">
                        <Text className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide flex-shrink" numberOfLines={1}>
                          {r.title}
                        </Text>
                        <View className="flex-1 h-px bg-neutral-100" />
                      </View>
                    ) : null}
                    <View className="gap-2">
                      {r.people.map(({ p, sub }) => (
                        <Pressable
                          key={p.id}
                          onPress={() => router.push(`/jemaat/${p.jemaat.id}` as never)}
                          className="flex-row items-center gap-3 active:opacity-70"
                          accessibilityRole="button"
                          accessibilityLabel={`${p.jemaat.namaLengkap}, ${p.role}${p.tugas?.length ? `, ${tugasText(p.tugas)}` : ''}`}
                        >
                          {/* Foto sejajar dua baris: nama, lalu tugasnya. */}
                          <Avatar name={p.jemaat.namaLengkap} fotoUrl={p.jemaat.fotoUrl ?? null} size={36} />
                          <View className="flex-1 min-w-0">
                            <Text className="text-sm font-semibold text-neutral-900 leading-5" numberOfLines={1}>
                              {p.jemaat.namaLengkap}
                              {p.isMe ? <Text className="text-xs font-semibold text-brand-600">{`  ${t('ibadah.team_you')}`}</Text> : null}
                            </Text>
                            {sub ? (
                              <Text className="text-xs text-neutral-500 leading-4" numberOfLines={2}>
                                {sub}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
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
export function MyDutyCard({
  petugas,
  className = '',
  compact = false,
}: {
  petugas: TeamMember[] | undefined;
  className?: string;
  /** Relayout detail (2.5.1): satu baris ringkas, ketuk → rincian. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const mine = (petugas ?? []).filter((p) => p.isMe);
  if (!mine.length) return null;
  if (compact && !open) {
    const p = mine[0]!;
    const what = [p.pelayananNama, p.tugas?.length ? tugasText(p.tugas) : p.role].filter(Boolean).join(' · ');
    return (
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center gap-2.5 bg-brand-50 border border-brand-200 rounded-2xl px-3.5 py-2.5 active:opacity-80 ${className}`}
        accessibilityRole="button"
        accessibilityLabel={`${t('ibadah.my_duty_title')}: ${what}`}
      >
        <ClipboardList size={16} color="#EA580C" />
        <Text className="flex-1 text-xs text-brand-800" numberOfLines={1}>
          {t('detail.on_duty')} <Text className="font-extrabold">{what}</Text>
          {mine.length > 1 ? <Text className="font-bold">{`  +${mine.length - 1}`}</Text> : null}
        </Text>
        <ChevronDown size={16} color="#C2410C" />
      </Pressable>
    );
  }
  return (
    <View className={`bg-brand-50 border border-brand-200 rounded-2xl p-4 ${className}`} accessibilityRole="summary">
      <Pressable disabled={!compact} onPress={() => setOpen(false)} className="flex-row items-center gap-2 mb-2">
        <ClipboardList size={16} color="#EA580C" />
        <Text className="flex-1 text-sm font-bold text-brand-800">{t('ibadah.my_duty_title')}</Text>
        {compact ? <ChevronUp size={16} color="#C2410C" /> : null}
      </Pressable>
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
