/**
 * CKids Tab — parent view untuk anak point + katalog hadiah + history.
 *
 * Layout:
 * 1. Anak selector (kalau multi anak) — dropdown
 * 2. Point balance card besar (per cabang)
 * 3. Tombol "Tunjukkan QR ke Stall"
 * 4. Katalog grid hadiah cabang (3-kolom)
 * 5. History redeem list
 *
 * Redeem di mobile → TIDAK ada. Anak harus datang fisik ke stall di
 * subdomain ckids.eccchurch.global.
 *
 * Per BE notice ckids-mobile-tab 2026-08-01.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { formatInstantDate } from '@/utils/time';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  Check,
  ChevronDown,
  Church,
  Gift,
  History,
  Info,
  QrCode,
  ShoppingBag,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/NotificationBell';
import {
  useHadiahKatalog,
  useMyChildren,
  useMyChildrenGroupedBalances,
  useChildRedeemHistory,
} from '@/hooks/useCKids';
import { useCKidsSelectionStore } from '@/stores/ckids-selection.store';
import type { ChildGroupedBalance, HadiahKatalog, HadiahRedeem } from '@/types/ckids';
import { env } from '@/config/env';
import { ageInYears, ckidsMaxAge } from '@/utils/ckidsAge';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { GuestTabPrompt } from '@/components/guest/GuestTabPrompt';
import { useAuthStore } from '@/stores/auth.store';
import { useViewingBranch } from '@/hooks/useViewingBranch';

export default function CKidsTabScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();

  const { children: myChildren, isPending: childrenPending, isEmpty } = useMyChildren();
  const isGuest = useAuthStore((st) => st.isGuest);
  /** "8 tahun" dari tanggal lahir; null kalau belum diisi. */
  const ageText = (tgl: string | null | undefined) => {
    const a = ageInYears(tgl);
    return a === null ? null : t('ckids.age_years', { count: a });
  };
  const balancesQuery = useMyChildrenGroupedBalances();

  const selectedAnakId = useCKidsSelectionStore((s) => s.selectedAnakId);
  const setSelectedAnakId = useCKidsSelectionStore((s) => s.setSelectedAnakId);
  const ensureDefault = useCKidsSelectionStore((s) => s.ensureDefault);
  const hydrate = useCKidsSelectionStore((s) => s.hydrate);
  const isHydrating = useCKidsSelectionStore((s) => s.isHydrating);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [cabangPickerOpen, setCabangPickerOpen] = useState(false);
  const [selectedCabangId, setSelectedCabangId] = useState<string | null>(null);
  const [hadiahDetail, setHadiahDetail] = useState<HadiahKatalog | null>(null);
  /** Katalog & riwayat dalam tab — tidak perlu scroll panjang. */
  const [listTab, setListTab] = useState<'katalog' | 'history'>('katalog');
  // Cabang aktif app (pemilih cabang di Beranda) → default cabang CKids.
  const { branch: activeBranch } = useViewingBranch();

  // Hydrate selection store on mount (parallel dgn other stores at app boot)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Merged list: semua anak dari family relations + balance data (kalau ada).
  // Fix M50: anak baru yg belum earn point tetap muncul di selector — BE
  // /me/children-points skip anak tanpa balance (design intent).
  const anakSelectorList = useMemo(() => {
    return myChildren.map((rel) => {
      const balance = balancesQuery.data.find((b) => b.anak.id === rel.jemaat.id);
      return {
        anak: {
          id: rel.jemaat.id,
          namaLengkap: rel.jemaat.namaLengkap,
          fotoUrl: rel.jemaat.fotoUrl,
          kode: rel.jemaat.kode,
          cabang: rel.jemaat.cabang,
          tanggalLahir: rel.jemaat.tanggalLahir ?? null,
        },
        balance: balance ?? null, // null = anak belum earn point
      };
    });
  }, [myChildren, balancesQuery.data]);

  // Auto-select first anak kalau belum ada selection + list ready
  useEffect(() => {
    if (!isHydrating && !selectedAnakId && anakSelectorList.length > 0) {
      ensureDefault(anakSelectorList[0].anak.id);
    }
  }, [isHydrating, selectedAnakId, anakSelectorList, ensureDefault]);

  const selectedEntry = useMemo(() => {
    if (anakSelectorList.length === 0) return null;
    if (!selectedAnakId) return anakSelectorList[0];
    return anakSelectorList.find((e) => e.anak.id === selectedAnakId) ?? anakSelectorList[0];
  }, [selectedAnakId, anakSelectorList]);

  const selected: ChildGroupedBalance | null = selectedEntry?.balance ?? null;

  // List cabang available untuk anak yg dipilih.
  // Includes: (1) cabang tempat anak punya balance + (2) cabang home anak
  // dari family relations (kalau berbeda dgn balance cabang).
  const availableCabangList = useMemo(() => {
    const list: { id: string; nama: string }[] = [];
    const seen = new Set<string>();
    if (selected) {
      for (const b of selected.balances) {
        if (!seen.has(b.cabang.id)) {
          list.push({ id: b.cabang.id, nama: b.cabang.nama });
          seen.add(b.cabang.id);
        }
      }
    }
    // Kalau cabang home anak belum masuk (mis. baru add anak, belum earn point)
    const homeCabang = selectedEntry?.anak.cabang;
    if (homeCabang && !seen.has(homeCabang.id)) {
      list.push({ id: homeCabang.id, nama: homeCabang.nama });
      seen.add(homeCabang.id);
    }
    // Cabang aktif app selalu bisa dipilih (paling depan).
    if (activeBranch && !seen.has(activeBranch.id)) {
      list.unshift({ id: activeBranch.id, nama: activeBranch.nama });
    }
    return list;
  }, [selected, selectedEntry, activeBranch]);

  // Cabang aktif app berganti → ikuti cabang aktif (lepas pilihan manual).
  useEffect(() => {
    setSelectedCabangId(null);
  }, [activeBranch?.id]);

  // Reset cabang selection saat anak berganti — auto-pick sesuai priority
  useEffect(() => {
    if (!selectedEntry) return;
    // Kalau selectedCabangId tidak valid untuk anak baru → reset
    if (selectedCabangId && !availableCabangList.find((c) => c.id === selectedCabangId)) {
      setSelectedCabangId(null);
    }
  }, [selectedEntry?.anak.id, availableCabangList, selectedCabangId, selectedEntry]);

  // Cabang yang ditampilkan: pilihan manual → cabang aktif app → cabang dgn
  // poin terbesar → cabang home anak. Poin & katalog mengikuti cabang ini.
  const cabangId =
    selectedCabangId ??
    activeBranch?.id ??
    (selected?.balances.length
      ? selected.balances.reduce((max, curr) => (curr.balance > max.balance ? curr : max), selected.balances[0]!).cabang.id
      : undefined) ??
    selectedEntry?.anak.cabang?.id;

  // Poin di cabang yang ditampilkan (null = belum punya poin di cabang ini).
  const primaryBalance = useMemo(
    () => (selected && cabangId ? (selected.balances.find((b) => b.cabang.id === cabangId) ?? null) : null),
    [selected, cabangId],
  );

  const activeCabangNama = useMemo(() => {
    if (!cabangId) return null;
    const found =
      availableCabangList.find((c) => c.id === cabangId) ??
      (selectedEntry?.anak.cabang?.id === cabangId
        ? selectedEntry.anak.cabang
        : null);
    return found?.nama ?? null;
  }, [cabangId, availableCabangList, selectedEntry]);
  const katalogQuery = useHadiahKatalog(cabangId);
  // Post BE response 2026-08-03: dedicated endpoint scope by JemaatRelasi
  // (cabangId tidak dipakai — BE filter by jemaatId + parent guard)
  const historyQuery = useChildRedeemHistory(selectedEntry?.anak.id, 50);
  // Riwayat di cabang yang ditampilkan (data lama tanpa cabang tetap tampil).
  const historyItems = (historyQuery.data ?? []).filter((r) => !r.cabang || !cabangId || r.cabang.id === cabangId);

  // Spinner hanya saat ditarik (refetch otomatis tidak menggeser konten).
  const { refreshing: isRefreshing, onRefresh: refresh } = usePullToRefresh(() =>
    Promise.all([katalogQuery.refetch(), historyQuery.refetch()]),
  );

  // Mode tamu → ajakan daftar (CKids memakai data Keluarga di akun).
  if (isGuest) return <GuestTabPrompt title={t('ckids.guest_title')} body={t('ckids.guest_body')} />;

  // Tab CKids selalu tampil. Belum ada anak ≤ ckidsMaxAge() tahun (atau tanggal
  // lahirnya belum diisi) → jelaskan cara menambahkan anak di Keluarga.
  if (!childrenPending && isEmpty) {
    return (
      <SafeAreaView className="flex-1 bg-card" edges={['top']}>
        <View className="px-5 pt-3 pb-2.5 border-b border-neutral-100">
          <Text className="text-lg font-bold text-neutral-900">CKids</Text>
          <Text className="text-xs text-neutral-500">{t('ckids.tab_sub')}</Text>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32 }}>
          <ElsEmptyIcon size={80} className="mb-4" />
          <Text className="text-lg font-bold text-neutral-900 text-center mb-2">{t('ckids.empty_title')}</Text>
          <Text className="text-sm text-neutral-500 text-center leading-5 mb-6">
            {t('ckids.empty_body', { max: ckidsMaxAge() })}
          </Text>
          <Button label={t('ckids.add_child_cta')} onPress={() => router.push('/family/add' as never)} />
          <Text className="text-xs text-neutral-400 text-center leading-4 mt-4">{t('ckids.empty_dob_hint')}</Text>
          <Pressable onPress={() => router.push('/family' as never)} hitSlop={8} className="mt-3">
            <Text className="text-xs font-semibold text-brand-600">{t('ckids.empty_open_family')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (childrenPending || balancesQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-card items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#F97316" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-3 flex-row items-center gap-2">
          <Baby size={22} color="#F97316" />
          <Text className="text-lg font-bold text-neutral-900 flex-1">
            {t('ckids.tab_title')}
          </Text>
          <NotificationBell variant="dark" badgeBorderColor="#FFFFFF" />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        {/* Info batas usia CKids */}
        <View className="mx-4 mt-3 mb-1 flex-row items-start gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
          <Info size={14} color={nc('#0369A1')} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-xs text-sky-800 leading-4">{t('ckids.age_rule_info', { max: ckidsMaxAge() })}</Text>
        </View>

        {/* Anak selector — tampil kalau multi anak. Selector kini source
            dari useMyChildren (family list), bukan cuma anak yg punya balance. */}
        {anakSelectorList.length > 1 ? (
          <View className="bg-card px-4 py-3 border-b border-neutral-100">
            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">
              {t('ckids.selected_anak')}
            </Text>
            <Pressable
              onPress={() => setSelectorOpen(true)}
              className="flex-row items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200"
            >
              {selectedEntry ? (
                <>
                  <Avatar
                    size={40}
                    name={selectedEntry.anak.namaLengkap}
                    fotoUrl={selectedEntry.anak.fotoUrl}
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-neutral-900">
                      {selectedEntry.anak.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {[ageText(selectedEntry.anak.tanggalLahir), selectedEntry.anak.cabang?.nama].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text className="flex-1 text-sm text-neutral-500">
                  {t('ckids.no_selection')}
                </Text>
              )}
              <ChevronDown size={18} color={nc('#737373')} />
            </Pressable>
          </View>
        ) : null}

        {/* Cabang picker — tampil kalau anak punya balance di 2+ cabang,
            atau kalau cabang home berbeda dari cabang balance (multi-branch). */}
        {availableCabangList.length > 1 && activeCabangNama ? (
          <View className="bg-card px-4 py-3 border-b border-neutral-100">
            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">
              {t('ckids.cabang_label')}
            </Text>
            <Pressable
              onPress={() => setCabangPickerOpen(true)}
              className="flex-row items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200"
            >
              <View className="w-9 h-9 rounded-lg bg-brand-100 items-center justify-center">
                <Church size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-neutral-900">
                  {activeCabangNama}
                </Text>
                <Text className="text-xs text-neutral-500">
                  {t('ckids.cabang_hint', { total: availableCabangList.length })}
                </Text>
              </View>
              <ChevronDown size={18} color={nc('#737373')} />
            </Pressable>
          </View>
        ) : null}

        {/* Point balance card — kalau anak punya balance, tampil pink card.
            Kalau belum earn point → empty state (anak baru add). */}
        {selectedEntry ? (
          <View className="bg-card mt-2 p-5">
            <View className="rounded-3xl overflow-hidden">
              <View {...gx('bg-brand-500 p-5')}>
                <Text className="text-xs font-bold text-white/80 uppercase">
                  {t('ckids.balance_label')}
                </Text>
                <View className="flex-row items-baseline gap-2 mt-1">
                  <Text className="text-5xl font-bold text-white">
                    {primaryBalance?.balance ?? 0}
                  </Text>
                  <Text className="text-lg font-semibold text-white/80">
                    {t('ckids.points_unit')}
                  </Text>
                </View>
                <Text className="text-xs text-white/70 mt-1">
                  {selectedEntry.anak.namaLengkap}
                  {ageText(selectedEntry.anak.tanggalLahir) ? ` · ${ageText(selectedEntry.anak.tanggalLahir)}` : ''}
                  {primaryBalance ? ` · ${primaryBalance.cabang.nama}` : ''}
                </Text>
                {selected && selected.balances.length > 1 ? (
                  <Text className="text-[10px] text-white/70 mt-2">
                    +{selected.balances.length - 1} {t('ckids.other_branches')}
                  </Text>
                ) : !primaryBalance ? (
                  <Text className="text-[10px] text-white/70 mt-2">
                    {t('ckids.balance_empty_hint')}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => router.push('/ckids/qr' as never)}
                className="bg-card flex-row items-center justify-center gap-2 py-4 border-t-2 border-brand-100 active:bg-brand-50"
              >
                <QrCode size={20} color="#F97316" />
                <Text className="text-sm font-bold text-brand-700">
                  {t('ckids.show_qr_cta')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Info card: redeem hanya di stall */}
        <View className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
          <Info size={14} color={nc('#92400e')} style={{ marginTop: 1 }} />
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            {t('ckids.stall_info')}
          </Text>
        </View>

        {/* Katalog hadiah / Riwayat tukar — tab supaya halaman tidak terlalu panjang */}
        <View className="mx-4 mt-3 flex-row bg-neutral-100 rounded-xl p-1">
          {(
            [
              ['katalog', t('ckids.katalog_title'), katalogQuery.data?.length ?? 0],
              ['history', t('ckids.history_title'), historyItems.length],
            ] as const
          ).map(([k, label, n]) => (
            <Pressable
              key={k}
              onPress={() => setListTab(k)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${listTab === k ? 'bg-card' : ''}`}
            >
              {k === 'katalog' ? (
                <ShoppingBag size={14} color={listTab === k ? '#F97316' : nc('#737373')} />
              ) : (
                <History size={14} color={listTab === k ? '#F97316' : nc('#737373')} />
              )}
              <Text className={`text-xs font-bold ${listTab === k ? 'text-neutral-900' : 'text-neutral-500'}`} numberOfLines={1}>
                {label}
                {n ? ` (${n})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Katalog hadiah — grid 2 kolom (foto, poin, judul). Deskripsi &
            stok hanya di detail modal saat item di-tap. */}
        {listTab === 'katalog' ? (
        <View className="bg-card mt-3 p-4">
          {katalogQuery.isPending && !!cabangId ? (
            <ActivityIndicator color="#F97316" style={{ marginVertical: 24 }} />
          ) : katalogQuery.isError ? (
            // Jangan tampil "katalog kosong" kalau sebenarnya gagal dimuat.
            <View className="items-center py-8">
              <Gift size={32} color="#FCA5A5" />
              <Text className="text-xs text-neutral-500 mt-2 text-center">{t('ckids.katalog_error')}</Text>
              <Pressable onPress={() => katalogQuery.refetch()} {...gx('mt-3 px-4 py-2 bg-brand-500 rounded-lg')}>
                <Text className="text-white font-semibold text-xs">{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : katalogQuery.data && katalogQuery.data.length > 0 ? (
            // Grid 2 kolom pakai baris biasa (bukan FlatList numColumns):
            // FlatList bersarang di ScrollView + numColumns tidak tampil di
            // sebagian HP Android.
            <View style={{ gap: 10 }}>
              {chunkPairs(katalogQuery.data).map((pair) => (
                <View key={pair[0]!.id} style={{ flexDirection: 'row', gap: 10 }}>
                  {pair.map((item) => (
                    <HadiahTile
                      key={item.id}
                      item={item}
                      currentBalance={primaryBalance?.balance ?? 0}
                      onPress={() => setHadiahDetail(item)}
                    />
                  ))}
                  {/* Baris ganjil → spacer supaya lebar kartu tetap setengah */}
                  {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-8">
              <ElsEmptyIcon size={56} />
              <Text className="text-xs text-neutral-500 mt-2">
                {t('ckids.katalog_empty')}
              </Text>
            </View>
          )}
        </View>
        ) : null}

        {/* History redeem */}
        {listTab === 'history' ? (
        <View className="bg-card mt-3 p-4">
          {historyQuery.isPending ? (
            <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />
          ) : historyItems.length > 0 ? (
            <View className="gap-2">
              {historyItems.map((r) => (
                <RedeemRow key={r.id} item={r} lang={lang} />
              ))}
            </View>
          ) : (
            <Text className="text-xs text-neutral-500 text-center py-4">
              {t('ckids.history_empty')}
            </Text>
          )}
        </View>
        ) : null}
      </ScrollView>

      {/* Anak selector modal */}
      <Modal
        visible={selectorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorOpen(false)}
      >
        <View className="flex-1 justify-end">
<Pressable onPress={() => setSelectorOpen(false)} className="absolute inset-0 bg-black/60" />
          <View className="bg-card rounded-t-3xl p-5" style={{ maxHeight: '90%' }}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="items-center mb-3">
              <View className="w-10 h-1 bg-neutral-300 rounded-full" />
            </View>
            <Text className="text-base font-bold text-neutral-900 mb-4">
              {t('ckids.select_anak_title')}
            </Text>
            <View className="gap-2">
              {anakSelectorList.map((entry) => {
                const total = entry.balance?.totalBalance ?? 0;
                const branchCount = entry.balance?.balances.length ?? 0;
                return (
                  <Pressable
                    key={entry.anak.id}
                    onPress={() => {
                      setSelectedAnakId(entry.anak.id);
                      setSelectorOpen(false);
                    }}
                    className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                      entry.anak.id === selectedAnakId
                        ? 'bg-brand-50 border-brand-300'
                        : 'bg-card border-neutral-200'
                    }`}
                  >
                    <Avatar size={40} name={entry.anak.namaLengkap} fotoUrl={entry.anak.fotoUrl} />
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-neutral-900">
                        {entry.anak.namaLengkap}
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        {ageText(entry.anak.tanggalLahir) ? `${ageText(entry.anak.tanggalLahir)} · ` : ''}
                        {total} {t('ckids.points_unit')}
                        {branchCount > 0
                          ? ` · ${branchCount} ${
                              branchCount === 1
                                ? t('ckids.branch_singular')
                                : t('ckids.branch_plural')
                            }`
                          : ` · ${t('ckids.balance_empty_short')}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            </ScrollView>
            <SheetNavSpacer />
          </View>
        </View>
      </Modal>

      {/* Cabang picker modal — pilih cabang aktif untuk balance + katalog view */}
      <Modal
        visible={cabangPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCabangPickerOpen(false)}
      >
        <View className="flex-1 justify-end">
<Pressable onPress={() => setCabangPickerOpen(false)} className="absolute inset-0 bg-black/60" />
          <View className="bg-card rounded-t-3xl p-5" style={{ maxHeight: '90%' }}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="items-center mb-3">
              <View className="w-10 h-1 bg-neutral-300 rounded-full" />
            </View>
            <Text className="text-base font-bold text-neutral-900 mb-1">
              {t('ckids.cabang_picker_title')}
            </Text>
            <Text className="text-xs text-neutral-500 mb-4">
              {t('ckids.cabang_picker_sub')}
            </Text>
            <View className="gap-2">
              {availableCabangList.map((c) => {
                const isSelected = cabangId === c.id;
                const balance =
                  selected?.balances.find((b) => b.cabang.id === c.id)?.balance ?? 0;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setSelectedCabangId(c.id);
                      setCabangPickerOpen(false);
                    }}
                    className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                      isSelected
                        ? 'bg-brand-50 border-brand-300'
                        : 'bg-card border-neutral-200'
                    }`}
                  >
                    <View className={`w-9 h-9 rounded-lg items-center justify-center ${isSelected ? 'bg-brand-100' : 'bg-neutral-100'}`}>
                      <Church size={18} color={isSelected ? '#EA580C' : nc('#737373')} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-neutral-900">
                        {c.nama}
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        {balance} {t('ckids.points_unit')}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View {...gx('w-6 h-6 rounded-full bg-brand-500 items-center justify-center')}>
                        <Check size={14} color="#fff" strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            </ScrollView>
            <SheetNavSpacer />
          </View>
        </View>
      </Modal>

      {/* Hadiah detail modal — tap katalog item → info lengkap */}
      <HadiahDetailModal
        item={hadiahDetail}
        currentBalance={primaryBalance?.balance ?? 0}
        onClose={() => setHadiahDetail(null)}
      />
    </View>
  );
}

/** [a,b,c,d,e] → [[a,b],[c,d],[e]] */
function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

/* ==============================================================
 * HADIAH TILE — kartu grid 2 kolom: foto, poin, judul. Tap → detail.
 * ============================================================== */
function HadiahTile({
  item,
  currentBalance,
  onPress,
}: {
  item: HadiahKatalog;
  currentBalance: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const available = currentBalance >= item.pointCost && item.stock > 0;

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1 }}
      className={`bg-card rounded-xl overflow-hidden border active:opacity-80 ${
        available ? 'border-brand-200' : 'border-neutral-200'
      }`}
    >
      <View style={{ width: '100%', aspectRatio: 1 }} className="bg-neutral-100 items-center justify-center">
        {item.fotoUrl ? (
          <Image
            source={{
              uri: item.fotoUrl.startsWith('http')
                ? item.fotoUrl
                : `${env.apiBaseUrl}${item.fotoUrl}`,
            }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Gift size={32} color={nc('#A3A3A3')} />
        )}
      </View>
      <View className="px-2.5 py-2">
        <View className="flex-row items-baseline gap-1">
          <Text
            className={`text-base font-bold ${
              currentBalance >= item.pointCost ? 'text-brand-600' : 'text-neutral-500'
            }`}
          >
            {item.pointCost}
          </Text>
          <Text className="text-[11px] text-neutral-500">{t('ckids.points_unit')}</Text>
        </View>
        <Text className="text-xs font-semibold text-neutral-900 mt-0.5" numberOfLines={2}>
          {item.nama}
        </Text>
      </View>
    </Pressable>
  );
}

/* ==============================================================
 * HADIAH DETAIL MODAL — tap katalog row → full info popup.
 * ============================================================== */
function HadiahDetailModal({
  item,
  currentBalance,
  onClose,
}: {
  item: HadiahKatalog | null;
  currentBalance: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // Foto dibatasi tingginya supaya di layar lebar (HP fold dibuka, tablet) foto
  // persegi tidak memenuhi seluruh lembar.
  const { width: winW, height: winH } = useWindowDimensions();
  const fotoH = Math.min(winW - 40, winH * 0.38, 320);
  if (!item) return null;
  const canAfford = currentBalance >= item.pointCost;
  const inStock = item.stock > 0;
  const shortage = item.pointCost - currentBalance;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
<Pressable onPress={onClose} className="absolute inset-0 bg-black/60" />
        <View
          className="bg-card rounded-t-3xl"
          style={{ maxHeight: '85%' }}
        >
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-neutral-300 rounded-full" />
          </View>

          <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 24 }} style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            {/* Foto besar */}
            <View className="rounded-2xl bg-neutral-100 items-center justify-center overflow-hidden mb-4" style={{ width: '100%', height: fotoH }}>
              {item.fotoUrl ? (
                <Image
                  source={{
                    uri: item.fotoUrl.startsWith('http')
                      ? item.fotoUrl
                      : `${env.apiBaseUrl}${item.fotoUrl}`,
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Gift size={64} color={nc('#D4D4D4')} />
              )}
            </View>

            <Text className="text-xl font-bold text-neutral-900">{item.nama}</Text>
            <Text className="text-xs text-neutral-500 mt-1">
              {item.cabang.nama}
            </Text>

            {/* Point + stock badges */}
            <View className="flex-row items-center gap-2 mt-4">
              <View className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex-1">
                <Text className="text-xs text-brand-700 uppercase font-bold">
                  {t('ckids.detail_cost_label')}
                </Text>
                <View className="flex-row items-baseline gap-1 mt-1">
                  <Text className="text-2xl font-bold text-brand-600">
                    {item.pointCost}
                  </Text>
                  <Text className="text-sm text-brand-700">{t('ckids.points_unit')}</Text>
                </View>
              </View>
              <View
                className={`border rounded-xl px-4 py-3 flex-1 ${
                  !inStock
                    ? 'bg-red-50 border-red-200'
                    : item.stock < 5
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <Text
                  className={`text-xs uppercase font-bold ${
                    !inStock ? 'text-red-700' : item.stock < 5 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {t('ckids.detail_stock_label')}
                </Text>
                <Text
                  className={`text-2xl font-bold mt-1 ${
                    !inStock ? 'text-red-600' : item.stock < 5 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {item.stock}
                </Text>
              </View>
            </View>

            {/* Deskripsi */}
            {item.deskripsi ? (
              <View className="mt-5">
                <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">
                  {t('ckids.detail_description')}
                </Text>
                <Text className="text-sm text-neutral-700 leading-relaxed">
                  {item.deskripsi}
                </Text>
              </View>
            ) : null}

            {/* Status badge — bisa afford atau tidak */}
            <View
              className={`mt-5 p-3 rounded-xl border ${
                canAfford && inStock
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  canAfford && inStock ? 'text-emerald-700' : 'text-neutral-700'
                }`}
              >
                {!inStock
                  ? t('ckids.detail_status_out_of_stock')
                  : canAfford
                  ? t('ckids.detail_status_can_afford')
                  : t('ckids.detail_status_short', { shortage })}
              </Text>
            </View>

            {/* Redeem info — di stall only */}
            <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
              <Info size={14} color={nc('#92400e')} style={{ marginTop: 1 }} />
              <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
                {t('ckids.detail_redeem_stall')}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="mt-5 mb-2 py-3 rounded-xl bg-neutral-100 items-center"
            >
              <Text className="text-sm font-bold text-neutral-700">
                {t('common.close')}
              </Text>
            </Pressable>
          </ScrollView>
          <SheetNavSpacer />
        </View>
      </View>
    </Modal>
  );
}

/* ==============================================================
 * REDEEM ROW
 * ============================================================== */
function RedeemRow({ item, lang }: { item: HadiahRedeem; lang: string }) {
  return (
    <View className="flex-row items-center gap-3 py-2 border-b border-neutral-100">
      <View className="w-10 h-10 rounded-lg bg-neutral-100 items-center justify-center overflow-hidden">
        {item.hadiahFotoUrl ? (
          <Image
            source={{
              uri: item.hadiahFotoUrl.startsWith('http')
                ? item.hadiahFotoUrl
                : `${env.apiBaseUrl}${item.hadiahFotoUrl}`,
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Gift size={16} color={nc('#A3A3A3')} />
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
          {item.hadiahNama}
        </Text>
        <Text className="text-xs text-neutral-500">
          {formatInstantDate(item.processedAt, lang)}
          {item.processedBy ? ` · ${item.processedBy.namaLengkap}` : ''}
        </Text>
      </View>
      <Text className="text-sm font-bold text-red-600">-{item.pointDeducted}</Text>
    </View>
  );
}
