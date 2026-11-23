/**
 * Resolusi Tahunan — daftar per tahun, centang Done, tambah/ubah/hapus lewat
 * bottom sheet, ubah urutan dengan tombol naik/turun di sheet.
 */
import { appAlert } from '@/components/ui/AppDialog';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ChevronRight, HandHeart, Plus, Share2, X } from 'lucide-react-native';
import { VersePickerModal } from '@/components/bible/VersePickerModal';
import { verseRefWithVersion, verseText, verseWebLink, type VerseLink } from '@/components/bible/verseRef';
import { openShareCard } from '@/features/share/shareStore';
import { openGiving } from '@/utils/giving';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  RESOLUSI_KATEGORI,
  createResolusi,
  deleteResolusi,
  getResolusi,
  reorderResolusi,
  resolusiAyat,
  updateResolusi,
  type Resolusi,
  type ResolusiKategori,
  type ResolusiYear,
} from '@/api/prayer';
import { Chip, PillOption, fmtDate } from '@/components/doa/DoaBits';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { cekTeks, pertamaGagal } from '@/utils/inputRules';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';

type Sheet = { mode: 'add' } | { mode: 'edit'; item: Resolusi } | null;

/** asTab = dibuka dari menu bawah (tanpa tombol kembali). */
export function ResolusiScreen({ asTab = false }: { asTab?: boolean }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const thisYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(thisYear);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const key = ['resolusi', tahun];

  const q = useQuery({ queryKey: key, queryFn: () => getResolusi(tahun) });
  const d = q.data;
  const items = d?.items ?? [];

  const years = useMemo(() => {
    const set = new Set<number>([thisYear, tahun, ...extraYears, ...(d?.years ?? []).map((y) => y.tahun)]);
    return [...set].sort((a, b) => a - b);
  }, [d?.years, extraYears, tahun, thisYear]);
  const maxYear = years[years.length - 1] ?? thisYear;

  const onErr = (e: unknown) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
  const { branch } = useViewingBranch();

  // Centang Done — optimistic.
  const toggleMut = useMutation({
    mutationFn: (r: Resolusi) => updateResolusi(r.id, { isDone: !r.isDone }),
    onMutate: async (r) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ResolusiYear>(key);
      if (prev) {
        const next = prev.items.map((i) => (i.id === r.id ? { ...i, isDone: !r.isDone, doneAt: !r.isDone ? new Date().toISOString() : null } : i));
        qc.setQueryData<ResolusiYear>(key, {
          ...prev,
          items: next,
          progress: { done: next.filter((i) => i.isDone).length, total: next.length },
        });
      }
      return { prev };
    },
    onError: (e, _r, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      onErr(e);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['resolusi'] }),
  });

  const pct = d && d.progress.total ? Math.round((d.progress.done / d.progress.total) * 100) : 0;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          {asTab ? null : (
            <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color={nc('#171717')} />
            </Pressable>
          )}
          <View className={asTab ? 'flex-1 pl-1' : 'flex-1'}>
            <Text className="text-base font-bold text-neutral-900">{t('resolusi.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('resolusi.subtitle')}</Text>
          </View>
          <Pressable onPress={() => setSheet({ mode: 'add' })} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <Plus size={22} color="#EA580C" />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
          {years.map((y) => (
            <PillOption key={y} label={String(y)} on={tahun === y} onPress={() => setTahun(y)} />
          ))}
          <Pressable
            onPress={() => {
              const next = maxYear + 1;
              setExtraYears((cur) => [...cur, next]);
              setTahun(next);
            }}
            className="px-3 py-1.5 rounded-full border border-dashed border-neutral-300 flex-row items-center gap-1"
          >
            <Plus size={12} color={nc('#737373')} />
            <Text className="text-xs font-semibold text-neutral-500">{t('resolusi.add_year')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
        refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View className="items-center py-14 px-6">
            <ElsEmptyIcon size={56} className="mb-3" />
            <Text className="text-base font-bold text-neutral-900 text-center">{t('resolusi.empty_title', { tahun })}</Text>
            <Text className="text-sm text-neutral-500 text-center mt-1 mb-5">{t('resolusi.empty_body')}</Text>
            <Button label={t('resolusi.add')} onPress={() => setSheet({ mode: 'add' })} />
          </View>
        ) : (
          <>
            <View className="bg-card rounded-2xl p-4 border border-neutral-100 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-neutral-600">{t('resolusi.progress', { tahun })}</Text>
                <Text className="text-sm font-bold text-neutral-900">
                  {t('resolusi.progress_count', { done: d!.progress.done, total: d!.progress.total })}
                </Text>
              </View>
              <View className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <View {...gx('h-2 bg-brand-500 rounded-full', { width: `${pct}%` })}  />
              </View>
            </View>
            <View className="bg-card rounded-2xl border border-neutral-100 overflow-hidden">
              {items.map((r, idx) => {
                const ayatR = resolusiAyat(r);
                return (
                  // Satu kolom isi sejajar judul: judul + kategori → keterangan →
                  // baris tautan ayat / Bagikan → ajakan Beri (tercapai).
                  <View key={r.id} className={`flex-row items-start gap-3 px-4 py-3.5 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}>
                    <Pressable
                      onPress={() => toggleMut.mutate(r)}
                      hitSlop={10}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: r.isDone }}
                      className={`mt-0.5 w-6 h-6 rounded-md border-2 items-center justify-center ${
                        r.isDone ? 'bg-green-600 border-green-600' : 'border-neutral-300'
                      }`}
                    >
                      {r.isDone ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                    </Pressable>
                    <View className="flex-1 min-w-0 gap-2">
                      <Pressable onPress={() => setSheet({ mode: 'edit', item: r })} className="gap-0.5">
                        <View className="flex-row items-start gap-2">
                          <Text className={`flex-1 text-[15px] font-semibold leading-5 ${r.isDone ? 'text-neutral-500' : 'text-neutral-900'}`}>
                            {r.judul}
                          </Text>
                          <Chip label={t(`resolusi.kategori_${r.kategori}`)} muted />
                        </View>
                        {r.isDone && r.doneAt ? (
                          <Text className="text-xs text-green-700">{t('resolusi.done_at', { date: fmtDate(r.doneAt, i18n.language) })}</Text>
                        ) : r.catatan ? (
                          <Text className="text-xs text-neutral-500" numberOfLines={1}>
                            {r.catatan}
                          </Text>
                        ) : null}
                      </Pressable>
                      {ayatR || r.isDone ? (
                        <View className="flex-row items-center gap-3">
                          {ayatR ? (
                            // Tautan ayat → buka Alkitab di ayat & versi itu.
                            <Pressable
                              onPress={() => openVerse(router, ayatR)}
                              hitSlop={6}
                              accessibilityRole="link"
                              className="flex-1 min-w-0 flex-row items-center gap-1.5 active:opacity-70"
                            >
                              <BookOpen size={13} color="#EA580C" />
                              <Text className="flex-shrink text-xs font-semibold text-brand-700" numberOfLines={1}>
                                {verseRefWithVersion(ayatR)}
                              </Text>
                              <ChevronRight size={13} color="#EA580C" />
                            </Pressable>
                          ) : (
                            <View className="flex-1" />
                          )}
                          {r.isDone ? (
                            <Pressable
                              onPress={() => void shareResolusi(r, t)}
                              hitSlop={6}
                              accessibilityLabel={t('resolusi.share')}
                              className="flex-row items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 active:opacity-70"
                            >
                              <Share2 size={12} color={nc('#525252')} />
                              <Text className="text-xs font-semibold text-neutral-700">{t('common.share')}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                      {r.isDone ? (
                        // Tercapai → ajakan memberi (sama dengan di detail resolusi).
                        <Pressable
                          onPress={() => void openGiving(branch?.kode)}
                          className="flex-row items-center gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 active:opacity-80"
                        >
                          <HandHeart size={16} color="#D97706" />
                          <Text className="flex-1 text-xs font-medium text-amber-900 leading-4">{t('resolusi.give_thanks_cta')}</Text>
                          <ChevronRight size={15} color="#B45309" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
            <Button
              label={t('resolusi.add')}
              variant="secondary"
              leftIcon={<Plus size={16} color={nc('#171717')} />}
              onPress={() => setSheet({ mode: 'add' })}
            />
          </>
        )}
      </ScrollView>

      {sheet ? (
        <ResolusiSheet
          sheet={sheet}
          tahun={tahun}
          items={items}
          onClose={() => setSheet(null)}
          onErr={onErr}
        />
      ) : null}
    </View>
  );
}

function ResolusiSheet({
  sheet,
  tahun,
  items,
  onClose,
  onErr,
}: {
  sheet: NonNullable<Sheet>;
  tahun: number;
  items: Resolusi[];
  onClose: () => void;
  onErr: (e: unknown) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const editItem = sheet.mode === 'edit' ? sheet.item : null;
  const [judul, setJudul] = useState(editItem?.judul ?? '');
  const [kategori, setKategori] = useState<ResolusiKategori>(editItem?.kategori ?? 'SPIRITUAL');
  const [catatan, setCatatan] = useState(editItem?.catatan ?? '');
  const [isDone, setIsDone] = useState(editItem?.isDone ?? false);
  const [ayat, setAyat] = useState<VerseLink | null>(editItem ? resolusiAyat(editItem) : null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { branch } = useViewingBranch();
  const router = useRouter();
  const refresh = () => qc.invalidateQueries({ queryKey: ['resolusi'] });

  const saveMut = useMutation({
    mutationFn: async () => {
      const salah = pertamaGagal(cekTeks(judul, { wajib: true, label: t('resolusi.judul_label') }), cekTeks(catatan, { label: t('resolusi.catatan_label') }));
      if (salah) throw new ApiError({ code: 'VALIDATION_ERROR', message: salah }, 400);
      return editItem
        ? updateResolusi(editItem.id, { judul: judul.trim(), kategori, catatan: catatan.trim() || null, isDone, ayat })
        : createResolusi({ tahun, judul: judul.trim(), kategori, catatan: catatan.trim() || null, isDone, ayat });
    },
    onSuccess: () => {
      refresh();
      onClose();
    },
    onError: onErr,
  });
  const delMut = useMutation({
    mutationFn: () => deleteResolusi(editItem!.id),
    onSuccess: () => {
      refresh();
      onClose();
    },
    onError: onErr,
  });
  const moveMut = useMutation({
    mutationFn: (dir: -1 | 1) => {
      const ids = items.map((i) => i.id);
      const idx = ids.indexOf(editItem!.id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= ids.length) return Promise.resolve(null);
      [ids[idx], ids[j]] = [ids[j]!, ids[idx]!];
      return reorderResolusi(ids);
    },
    onSuccess: refresh,
    onError: onErr,
  });

  const idx = editItem ? items.findIndex((i) => i.id === editItem.id) : -1;
  const confirmDelete = () =>
    appAlert(t('resolusi.delete_title'), t('resolusi.delete_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('resolusi.delete'), style: 'destructive', onPress: () => delMut.mutate() },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => (pickerOpen ? setPickerOpen(false) : onClose())}>
      <KeyboardSafeView className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-card rounded-t-3xl" style={{ maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }} keyboardShouldPersistTaps="handled">
            <View className="w-10 h-1 rounded-full bg-neutral-300 self-center" />
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-neutral-900">
                {editItem ? t('resolusi.edit_title') : t('resolusi.add_title')} · {tahun}
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={nc('#737373')} />
              </Pressable>
            </View>
            <Text className="text-sm font-semibold text-neutral-800">{t('resolusi.judul_label')}</Text>
            <TextInput
              value={judul}
              onChangeText={setJudul}
              maxLength={200}
              placeholder={t('resolusi.judul_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
            />
            <Text className="text-sm font-semibold text-neutral-800">{t('resolusi.kategori_label')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {RESOLUSI_KATEGORI.map((k) => (
                <PillOption key={k} label={t(`resolusi.kategori_${k}`)} on={kategori === k} onPress={() => setKategori(k)} />
              ))}
            </View>
            <Text className="text-sm font-semibold text-neutral-800">{t('resolusi.catatan_label')}</Text>
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              multiline
              maxLength={2000}
              placeholder={t('resolusi.catatan_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            {/* Ayat yang ditautkan — pilih versi dulu, lalu cari ayat */}
            <Text className="text-sm font-semibold text-neutral-800">{t('resolusi.ayat_label')}</Text>
            {ayat ? (
              <View className="flex-row items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
                <BookOpen size={16} color="#EA580C" />
                <Pressable onPress={() => setPickerOpen(true)} className="flex-1">
                  <Text className="text-sm font-semibold text-brand-800">{verseRefWithVersion(ayat)}</Text>
                  <Text className="text-[11px] text-brand-700">{t('resolusi.ayat_change')}</Text>
                </Pressable>
                <Pressable onPress={() => setAyat(null)} hitSlop={10} accessibilityLabel={t('resolusi.ayat_remove')}>
                  <X size={16} color="#C2410C" />
                </Pressable>
              </View>
            ) : null}
            {ayat ? (
              <Pressable
                onPress={() => {
                  const a = ayat;
                  onClose();
                  setTimeout(() => openVerse(router, a), 300);
                }}
                accessibilityRole="link"
                className="self-start flex-row items-center gap-1 -mt-1"
                hitSlop={8}
              >
                <Text className="text-xs font-semibold text-brand-700 underline">{t('resolusi.ayat_open')}</Text>
                <ChevronRight size={13} color="#C2410C" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setPickerOpen(true)}
                className="flex-row items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 py-3"
              >
                <BookOpen size={16} color={nc('#737373')} />
                <Text className="flex-1 text-sm text-neutral-600">{t('resolusi.ayat_add')}</Text>
                <ChevronRight size={16} color={nc('#A3A3A3')} />
              </Pressable>
            )}
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-neutral-800">{t('resolusi.done_label')}</Text>
              <Switch value={isDone} onValueChange={setIsDone} trackColor={{ true: '#16A34A', false: nc('#D4D4D4') }} thumbColor="#fff" />
            </View>
            {editItem && items.length > 1 ? (
              <View className="flex-row gap-2">
                <Pressable
                  disabled={idx <= 0 || moveMut.isPending}
                  onPress={() => moveMut.mutate(-1)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 ${idx <= 0 ? 'opacity-40' : ''}`}
                >
                  <ArrowUp size={15} color={nc('#404040')} />
                  <Text className="text-sm text-neutral-700">{t('resolusi.move_up')}</Text>
                </Pressable>
                <Pressable
                  disabled={idx < 0 || idx >= items.length - 1 || moveMut.isPending}
                  onPress={() => moveMut.mutate(1)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 ${
                    idx >= items.length - 1 ? 'opacity-40' : ''
                  }`}
                >
                  <ArrowDown size={15} color={nc('#404040')} />
                  <Text className="text-sm text-neutral-700">{t('resolusi.move_down')}</Text>
                </Pressable>
              </View>
            ) : null}
            <Button
              label={t('resolusi.save')}
              loading={saveMut.isPending}
              disabled={!judul.trim()}
              onPress={() => saveMut.mutate()}
              fullWidth
              size="lg"
            />
            {/* Sudah tercapai: bagikan & ucapan syukur (Beri) */}
            {editItem?.isDone ? (
              <View className="gap-2">
                <Button
                  label={t('resolusi.share')}
                  variant="secondary"
                  leftIcon={<Share2 size={16} color={nc('#171717')} />}
                  onPress={() => {
                    onClose();
                    void shareResolusi({ ...editItem, ...ayatCols(ayat) }, t, 350);
                  }}
                  fullWidth
                />
                <Pressable
                  onPress={() => void openGiving(branch?.kode)}
                  className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 active:opacity-80"
                >
                  <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center">
                    <HandHeart size={18} color="#fff" />
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-amber-900 leading-5">{t('resolusi.give_thanks_cta')}</Text>
                  <ChevronRight size={18} color="#B45309" />
                </Pressable>
              </View>
            ) : null}
            {editItem ? (
              <Pressable onPress={confirmDelete} className="items-center py-2">
                <Text className="text-sm font-semibold text-red-600">{t('resolusi.delete')}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
          <SheetNavSpacer />
        </View>
        <VersePickerModal
          inline
          visible={pickerOpen}
          initial={ayat}
          onClose={() => setPickerOpen(false)}
          onPick={(v) => {
            setAyat(v);
            setPickerOpen(false);
          }}
        />
      </KeyboardSafeView>
    </Modal>
  );
}

/** Buka Alkitab di ayat pegangan (versi resolusi, ayat disorot). */
function openVerse(router: ReturnType<typeof useRouter>, a: VerseLink) {
  const end = a.selesai && a.selesai > a.mulai ? `&ayatEnd=${a.selesai}` : '';
  router.push(`/bible/${a.kitab}/${a.bab}?v=${encodeURIComponent(a.versi)}&ayat=${a.mulai}${end}` as never);
}

const ayatCols = (a: VerseLink | null) => ({
  ayatVersi: a?.versi ?? null,
  ayatKitab: a?.kitab ?? null,
  ayatBab: a?.bab ?? null,
  ayatMulai: a?.mulai ?? null,
  ayatSelesai: a?.selesai ?? null,
});

/** Ayat cadangan bila resolusi belum menautkan ayat (penomoran sama di BIMK & KJV). */
const FALLBACK_VERSES: Array<{ kitab: number; bab: number; mulai: number }> = [
  { kitab: 50, bab: 4, mulai: 13 }, // Filipi 4:13
  { kitab: 20, bab: 16, mulai: 3 }, // Amsal 16:3
  { kitab: 51, bab: 3, mulai: 23 }, // Kolose 3:23
  { kitab: 24, bab: 29, mulai: 11 }, // Yeremia 29:11
];

/** Bagikan resolusi yang tercapai sebagai gambar + ayat & tautannya. */
async function shareResolusi(r: Resolusi, t: TFunction, delayMs = 0) {
  const { useBibleStore } = await import('@/stores/bible.store');
  let a = resolusiAyat(r);
  if (!a) {
    let h = 0;
    for (let i = 0; i < r.id.length; i++) h = (h * 31 + r.id.charCodeAt(i)) >>> 0;
    const f = FALLBACK_VERSES[h % FALLBACK_VERSES.length]!;
    a = { versi: useBibleStore.getState().selectedVersionCode, ...f, selesai: null };
  }
  const teks = await verseText(a);
  const title = t('resolusi.share_card_title');
  openShareCard(
    {
      kind: 'achievement',
      title,
      label: t('resolusi.share_card_label', { tahun: r.tahun }),
      testimony: r.judul,
      verse: teks,
      reference: verseRefWithVersion(a),
      caption: `${title} 🎉\n\n${r.judul}\n\n${teks ? `"${teks}"\n` : ''}— ${verseRefWithVersion(a)}\n${verseWebLink(a)}\n\n${t('common.share_signature')}`,
    },
    delayMs,
  );
}
