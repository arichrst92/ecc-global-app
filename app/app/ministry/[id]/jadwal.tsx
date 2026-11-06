/**
 * Atur jadwal pelayanan (2.4.6) — untuk pemegang OTORITAS di Portal
 * (Pelayanan → anggota → Otoritas approval), per cabang otoritasnya.
 *
 * Daftar ibadah (yang memakai pelayanan ini) & event cabang beberapa minggu ke
 * depan → ketuk untuk mengubah petugas. Ibadah: ubah "tanggal ini saja" atau
 * "setiap jadwal" (susunan tetap), dan "kembalikan ke susunan tetap".
 * Petugas mendapat notifikasi & melihatnya di Jadwal Pelayanan Saya.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ChevronRight, Plus, RotateCcw, Search, UserCheck, Users, X } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { MinistryIcon } from '@/components/ministry/MinistryIcon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import {
  getMinistryJadwal,
  saveEventJadwal,
  saveIbadahJadwal,
  type JadwalEvent,
  type JadwalIbadah,
  type JadwalRole,
  type MinistryJadwal,
} from '@/api/ministry';
import { ApiError } from '@/types/api';
import { formatDateWithDay } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

type Editing = { kind: 'ibadah'; item: JadwalIbadah } | { kind: 'event'; item: JadwalEvent };
type Draft = { jemaatId: string; namaLengkap: string; fotoUrl: string | null; roleId: string };

export default function MinistryJadwalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cabangId, setCabangId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const q = useQuery({
    queryKey: ['ministry', 'jadwal', id, cabangId ?? 'auto'],
    queryFn: () => getMinistryJadwal(id!, cabangId),
    enabled: !!id,
    retry: false,
  });
  const d = q.data;

  // Ibadah dikelompokkan per tanggal.
  const byDate = useMemo(() => {
    const m = new Map<string, JadwalIbadah[]>();
    for (const x of d?.ibadah ?? []) m.set(x.tanggal, [...(m.get(x.tanggal) ?? []), x]);
    return [...m.entries()];
  }, [d]);

  const errMsg = q.error instanceof ApiError ? q.error.message : q.isError ? t('error.generic') : null;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          {d ? (
            <View className="mr-2">
              <MinistryIcon ikon={d.pelayanan.ikon} warna={d.pelayanan.warna} size={32} />
            </View>
          ) : null}
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('ministry.jadwal_title')}</Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {d?.pelayanan.nama ?? ''}
            </Text>
          </View>
        </View>
        {d && d.cabang.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 6 }}>
            {d.cabang.map((c) => {
              const on = (cabangId ?? d.cabangId) === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCabangId(c.id)}
                  className={`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
                >
                  <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{c.nama}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} />}
      >
        {q.isPending ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : errMsg ? (
          <Text className="text-sm text-red-600 text-center py-16 px-6">{errMsg}</Text>
        ) : d ? (
          <>
            <Text className="text-xs text-neutral-500 mb-3 leading-relaxed">
              {t('ministry.jadwal_intro', { cabang: d.cabang.find((c) => c.id === d.cabangId)?.nama ?? '' })}
            </Text>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('ministry.jadwal_ibadah')}</Text>
            {byDate.length === 0 ? (
              <Text className="text-sm text-neutral-500 bg-card rounded-2xl p-4 border border-neutral-100 mb-4">
                {t('ministry.jadwal_ibadah_empty')}
              </Text>
            ) : (
              byDate.map(([tanggal, list]) => (
                <View key={tanggal} className="mb-3">
                  <Text className="text-xs font-semibold text-neutral-600 mb-1.5">{formatDateWithDay(tanggal, i18n.language)}</Text>
                  <View className="gap-2">
                    {list.map((x) => (
                      <SlotCard
                        key={x.key}
                        title={x.nama}
                        sub={`${x.jamMulai}–${x.jamSelesai}${x.source === 'TANGGAL' ? ` · ${t('ministry.jadwal_khusus')}` : ''}`}
                        count={x.petugas.length}
                        names={x.petugas.map((p) => p.jemaat.namaLengkap)}
                        onPress={() => setEditing({ kind: 'ibadah', item: x })}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-3 mb-2">{t('ministry.jadwal_event')}</Text>
            {d.events.length === 0 ? (
              <Text className="text-sm text-neutral-500 bg-card rounded-2xl p-4 border border-neutral-100">{t('ministry.jadwal_event_empty')}</Text>
            ) : (
              <View className="gap-2">
                {d.events.map((e) => (
                  <SlotCard
                    key={e.eventId}
                    title={e.judul}
                    sub={`${formatDateWithDay(e.tanggalMulai.slice(0, 10), i18n.language)}${e.jamMulai ? ` · ${e.jamMulai}` : ''}`}
                    count={e.petugas.length}
                    names={e.petugas.map((p) => p.jemaat.namaLengkap)}
                    onPress={() => setEditing({ kind: 'event', item: e })}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {editing && d ? <EditSheet ministryId={id!} data={d} editing={editing} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function SlotCard({ title, sub, count, names, onPress }: { title: string; sub: string; count: number; names: string[]; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      className={`bg-card rounded-2xl p-3 flex-row items-center gap-3 border ${count ? 'border-neutral-100' : 'border-amber-300'}`}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center ${count ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {count ? <UserCheck size={18} color="#059669" /> : <CalendarDays size={18} color="#B45309" />}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-semibold text-neutral-900" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-neutral-500" numberOfLines={1}>
          {sub}
        </Text>
        <Text className={`text-xs mt-0.5 ${count ? 'text-emerald-700' : 'text-amber-700 font-semibold'}`} numberOfLines={1}>
          {count ? `${t('ministry.jadwal_n_petugas', { count })} · ${names.join(', ')}` : t('ministry.jadwal_belum_ada')}
        </Text>
      </View>
      <ChevronRight size={16} color={nc('#A3A3A3')} />
    </Pressable>
  );
}

function EditSheet({ ministryId, data, editing, onClose }: { ministryId: string; data: MinistryJadwal; editing: Editing; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const roles = data.pelayanan.roles;
  const init: Draft[] = editing.item.petugas.map((p) => ({
    jemaatId: p.jemaat.id,
    namaLengkap: p.jemaat.namaLengkap,
    fotoUrl: p.jemaat.fotoUrl,
    roleId: p.role.id,
  }));
  const [draft, setDraft] = useState<Draft[]>(init);
  const [scope, setScope] = useState<'TANGGAL' | 'DEFAULT'>('TANGGAL');
  const [picking, setPicking] = useState(false);
  const [roleFor, setRoleFor] = useState<string | null>(null);
  const dirty = JSON.stringify(draft.map((x) => [x.jemaatId, x.roleId])) !== JSON.stringify(init.map((x) => [x.jemaatId, x.roleId]));

  const tanggal = editing.kind === 'ibadah' ? editing.item.tanggal : editing.item.tanggalMulai.slice(0, 10);
  const title = editing.kind === 'ibadah' ? editing.item.nama : editing.item.judul;
  const sub =
    editing.kind === 'ibadah'
      ? `${formatDateWithDay(tanggal, i18n.language)} · ${editing.item.jamMulai}`
      : `${formatDateWithDay(tanggal, i18n.language)}${editing.item.jamMulai ? ` · ${editing.item.jamMulai}` : ''}`;

  const save = useMutation({
    mutationFn: async (mode: 'SAVE' | 'RESET') => {
      const petugas = draft.map((x) => ({ jemaatId: x.jemaatId, pelayananRoleId: x.roleId }));
      if (editing.kind === 'event') return saveEventJadwal(ministryId, editing.item.eventId, petugas);
      return saveIbadahJadwal(ministryId, editing.item.ibadahId, {
        tanggal,
        scope: mode === 'RESET' ? 'RESET' : scope,
        petugas: mode === 'RESET' ? [] : petugas,
      });
    },
    onSuccess: (_r, mode) => {
      showToast(mode === 'RESET' ? t('ministry.jadwal_reset_done') : t('ministry.jadwal_saved'), 'success');
      void qc.invalidateQueries({ queryKey: ['ministry', 'jadwal', ministryId] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      onClose();
    },
    onError: (e) => Alert.alert(e instanceof ApiError ? e.message : t('error.network')),
  });

  const close = () => {
    if (!dirty) return onClose();
    Alert.alert(t('ministry.jadwal_discard_title'), t('ministry.jadwal_discard_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('ministry.jadwal_discard_yes'), style: 'destructive', onPress: onClose },
    ]);
  };

  // Urut per level role (tertinggi dulu) lalu nama.
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const sorted = [...draft].sort(
    (a, b) => (roleById.get(b.roleId)?.level ?? 0) - (roleById.get(a.roleId)?.level ?? 0) || a.namaLengkap.localeCompare(b.namaLengkap),
  );

  return (
    <Modal visible animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <View className="flex-1 bg-neutral-50" style={{ paddingBottom: insets.bottom }}>
        <View className="bg-card border-b border-neutral-100 px-4 pt-4 pb-3 flex-row items-start">
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{title}</Text>
            <Text className="text-xs text-neutral-500">{sub}</Text>
          </View>
          <Pressable onPress={close} className="w-9 h-9 items-center justify-center">
            <X size={20} color={nc('#525252')} />
          </Pressable>
        </View>

        {picking ? (
          <MemberPicker
            data={data}
            editing={editing}
            tanggal={tanggal}
            taken={new Set(draft.map((x) => x.jemaatId))}
            onPick={(m) => {
              setDraft((cur) => [...cur, { jemaatId: m.jemaat.id, namaLengkap: m.jemaat.namaLengkap, fotoUrl: m.jemaat.fotoUrl, roleId: m.role.id }]);
              setPicking(false);
            }}
            onBack={() => setPicking(false)}
          />
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
              {editing.kind === 'ibadah' ? (
                <View className="flex-row bg-neutral-100 rounded-xl p-1 mb-3">
                  {(['TANGGAL', 'DEFAULT'] as const).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setScope(s)}
                      className={`flex-1 py-2 rounded-lg items-center ${scope === s ? 'bg-card' : ''}`}
                    >
                      <Text className={`text-xs font-semibold ${scope === s ? 'text-brand-700' : 'text-neutral-500'}`}>
                        {s === 'TANGGAL' ? t('ministry.jadwal_scope_tanggal') : t('ministry.jadwal_scope_default')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {editing.kind === 'ibadah' ? (
                <Text className="text-[11px] text-neutral-500 mb-3">
                  {scope === 'TANGGAL' ? t('ministry.jadwal_scope_tanggal_hint') : t('ministry.jadwal_scope_default_hint')}
                </Text>
              ) : null}

              {sorted.length === 0 ? (
                <View className="bg-card rounded-2xl p-5 border border-dashed border-neutral-300 items-center mb-3">
                  <Users size={22} color={nc('#A3A3A3')} />
                  <Text className="text-sm text-neutral-500 text-center mt-2">{t('ministry.jadwal_kosong')}</Text>
                </View>
              ) : (
                <View className="bg-card rounded-2xl border border-neutral-100 mb-3">
                  {sorted.map((x, idx) => (
                    <View key={x.jemaatId} className={`p-3 ${idx ? 'border-t border-neutral-100' : ''}`}>
                      <View className="flex-row items-center gap-3">
                        <Avatar name={x.namaLengkap} fotoUrl={x.fotoUrl ?? undefined} size={36} />
                        <View className="flex-1 min-w-0">
                          <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                            {x.namaLengkap}
                          </Text>
                          <Pressable onPress={() => setRoleFor(roleFor === x.jemaatId ? null : x.jemaatId)} className="self-start mt-0.5">
                            <Text className="text-xs font-semibold text-brand-700">
                              {roleById.get(x.roleId)?.nama ?? '—'} ▾
                            </Text>
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={() => setDraft((cur) => cur.filter((y) => y.jemaatId !== x.jemaatId))}
                          className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
                          accessibilityLabel={t('ministry.jadwal_remove')}
                        >
                          <X size={14} color={nc('#525252')} />
                        </Pressable>
                      </View>
                      {roleFor === x.jemaatId ? (
                        <RoleChips
                          roles={roles}
                          value={x.roleId}
                          onChange={(rid) => {
                            setDraft((cur) => cur.map((y) => (y.jemaatId === x.jemaatId ? { ...y, roleId: rid } : y)));
                            setRoleFor(null);
                          }}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                onPress={() => setPicking(true)}
                className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-brand-200 bg-brand-50"
              >
                <Plus size={16} color="#EA580C" />
                <Text className="text-sm font-bold text-brand-700">{t('ministry.jadwal_tambah')}</Text>
              </Pressable>
              {editing.kind === 'ibadah' && editing.item.source === 'TANGGAL' ? (
                <Pressable
                  onPress={() =>
                    Alert.alert(t('ministry.jadwal_reset_title'), t('ministry.jadwal_reset_msg'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('ministry.jadwal_reset_yes'), onPress: () => save.mutate('RESET') },
                    ])
                  }
                  className="flex-row items-center justify-center gap-2 py-3 mt-2"
                >
                  <RotateCcw size={14} color={nc('#525252')} />
                  <Text className="text-xs font-semibold text-neutral-600">{t('ministry.jadwal_reset')}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
            <View className="px-4 pt-2 pb-2 bg-card border-t border-neutral-100">
              <Button
                label={t('ministry.jadwal_simpan')}
                onPress={() => save.mutate('SAVE')}
                loading={save.isPending}
                disabled={!dirty && !(editing.kind === 'ibadah' && scope === 'DEFAULT')}
                fullWidth
                size="lg"
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function RoleChips({ roles, value, onChange }: { roles: JadwalRole[]; value: string; onChange: (id: string) => void }) {
  return (
    <View className="flex-row flex-wrap gap-1.5 mt-2 ml-12">
      {roles.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => onChange(r.id)}
          className={`px-2.5 py-1 rounded-full border ${r.id === value ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
        >
          <Text className={`text-[11px] font-semibold ${r.id === value ? 'text-white' : 'text-neutral-700'}`}>{r.nama}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MemberPicker({
  data,
  editing,
  tanggal,
  taken,
  onPick,
  onBack,
}: {
  data: MinistryJadwal;
  editing: Editing;
  tanggal: string;
  taken: Set<string>;
  onPick: (m: MinistryJadwal['members'][number]) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [semua, setSemua] = useState(false);
  const [roleId, setRoleId] = useState<string | null>(null);
  const editKey = editing.kind === 'ibadah' ? editing.item.key : `event:${editing.item.eventId}`;
  const bulan = tanggal.slice(0, 7);

  // Bentrok di tanggal yang sama & jumlah tugas bulan ini (dari data jadwal yang dimuat).
  const info = useMemo(() => {
    const m = new Map<string, { bentrok: string[]; bulanIni: number }>();
    const add = (jid: string, f: (e: { bentrok: string[]; bulanIni: number }) => void) => {
      const e = m.get(jid) ?? { bentrok: [], bulanIni: 0 };
      f(e);
      m.set(jid, e);
    };
    for (const x of data.ibadah) {
      for (const p of x.petugas) {
        if (x.tanggal.slice(0, 7) === bulan) add(p.jemaat.id, (e) => e.bulanIni++);
        if (x.tanggal === tanggal && x.key !== editKey) add(p.jemaat.id, (e) => e.bentrok.push(x.jamMulai));
      }
    }
    for (const ev of data.events) {
      for (const p of ev.petugas) {
        if (ev.tanggalMulai.slice(0, 7) === bulan) add(p.jemaat.id, (e) => e.bulanIni++);
        if (ev.tanggalMulai.slice(0, 10) === tanggal && `event:${ev.eventId}` !== editKey) add(p.jemaat.id, (e) => e.bentrok.push(ev.judul));
      }
    }
    return m;
  }, [data, tanggal, bulan, editKey]);

  const needle = search.trim().toLowerCase();
  const list = data.members.filter(
    (m) =>
      (semua || m.jemaat.cabang.id === data.cabangId) &&
      (!roleId || m.role.id === roleId) &&
      (!needle || m.jemaat.namaLengkap.toLowerCase().includes(needle)),
  );

  return (
    <View className="flex-1">
      <View className="px-4 pt-3 pb-2 bg-card border-b border-neutral-100">
        <Pressable onPress={onBack} className="flex-row items-center gap-1 mb-2 self-start">
          <ArrowLeft size={14} color={nc('#525252')} />
          <Text className="text-xs font-semibold text-neutral-600">{t('ministry.jadwal_kembali')}</Text>
        </Pressable>
        <View className="flex-row items-center border border-neutral-300 rounded-xl px-3">
          <Search size={16} color={nc('#A3A3A3')} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('ministry.jadwal_cari')}
            placeholderTextColor={nc('#A3A3A3')}
            autoFocus
            className="flex-1 py-2.5 px-2 text-sm text-neutral-900"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
          <Pressable
            onPress={() => setSemua((x) => !x)}
            className={`px-2.5 py-1 rounded-full border ${semua ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
          >
            <Text className={`text-[11px] font-semibold ${semua ? 'text-white' : 'text-neutral-700'}`}>{t('ministry.cabang_all')}</Text>
          </Pressable>
          {data.pelayanan.roles.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setRoleId(roleId === r.id ? null : r.id)}
              className={`px-2.5 py-1 rounded-full border ${roleId === r.id ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
            >
              <Text className={`text-[11px] font-semibold ${roleId === r.id ? 'text-white' : 'text-neutral-700'}`}>{r.nama}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {list.length === 0 ? (
          <Text className="text-sm text-neutral-500 text-center py-8">{t('ministry.jadwal_cari_kosong')}</Text>
        ) : (
          <View className="bg-card rounded-2xl border border-neutral-100">
            {list.map((m, idx) => {
              const inf = info.get(m.jemaat.id);
              const sudah = taken.has(m.jemaat.id);
              return (
                <Pressable
                  key={m.jemaat.id}
                  disabled={sudah}
                  onPress={() => onPick(m)}
                  className={`p-3 flex-row items-center gap-3 ${idx ? 'border-t border-neutral-100' : ''} ${sudah ? 'opacity-40' : ''}`}
                >
                  <Avatar name={m.jemaat.namaLengkap} fotoUrl={m.jemaat.fotoUrl ?? undefined} size={36} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                      {m.jemaat.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-500" numberOfLines={1}>
                      {m.role.nama}
                      {m.jemaat.cabang.id !== data.cabangId ? ` · ${m.jemaat.cabang.nama}` : ''}
                    </Text>
                  </View>
                  <View className="items-end">
                    {sudah ? (
                      <Text className="text-[11px] font-semibold text-neutral-500">{t('ministry.jadwal_sudah')}</Text>
                    ) : inf?.bentrok.length ? (
                      <Text className="text-[11px] font-semibold text-amber-700">{t('ministry.jadwal_bentrok', { jam: inf.bentrok.join(', ') })}</Text>
                    ) : (
                      <Text className="text-[11px] font-semibold text-emerald-700">{t('ministry.jadwal_tersedia')}</Text>
                    )}
                    {inf?.bulanIni ? (
                      <Text className="text-[10px] text-neutral-400">{t('ministry.jadwal_bulan_ini', { count: inf.bulanIni })}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
