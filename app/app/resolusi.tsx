/**
 * Resolusi Tahunan — daftar per tahun, centang Done, tambah/ubah/hapus lewat
 * bottom sheet, ubah urutan dengan tombol naik/turun di sheet.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Plus, Target, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  RESOLUSI_KATEGORI,
  createResolusi,
  deleteResolusi,
  getResolusi,
  reorderResolusi,
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

type Sheet = { mode: 'add' } | { mode: 'edit'; item: Resolusi } | null;

export default function ResolusiScreen() {
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
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
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
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View className="items-center py-14 px-6">
            <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <Target size={26} color="#EA580C" />
            </View>
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
              {items.map((r, idx) => (
                <View key={r.id} className={`flex-row items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}>
                  <Pressable
                    onPress={() => toggleMut.mutate(r)}
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: r.isDone }}
                    className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                      r.isDone ? 'bg-green-600 border-green-600' : 'border-neutral-300'
                    }`}
                  >
                    {r.isDone ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                  </Pressable>
                  <Pressable onPress={() => setSheet({ mode: 'edit', item: r })} className="flex-1 min-w-0 gap-0.5">
                    <Text className={`text-sm ${r.isDone ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{r.judul}</Text>
                    {r.isDone && r.doneAt ? (
                      <Text className="text-[11px] text-green-700">
                        {t('resolusi.done_at', { date: fmtDate(r.doneAt, i18n.language) })}
                      </Text>
                    ) : r.catatan ? (
                      <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                        {r.catatan}
                      </Text>
                    ) : null}
                  </Pressable>
                  <Chip label={t(`resolusi.kategori_${r.kategori}`)} muted />
                </View>
              ))}
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
  const refresh = () => qc.invalidateQueries({ queryKey: ['resolusi'] });

  const saveMut = useMutation({
    mutationFn: () =>
      editItem
        ? updateResolusi(editItem.id, { judul: judul.trim(), kategori, catatan: catatan.trim() || null, isDone })
        : createResolusi({ tahun, judul: judul.trim(), kategori, catatan: catatan.trim() || null, isDone }),
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
    Alert.alert(t('resolusi.delete_title'), t('resolusi.delete_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('resolusi.delete'), style: 'destructive', onPress: () => delMut.mutate() },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
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
            {editItem ? (
              <Pressable onPress={confirmDelete} className="items-center py-2">
                <Text className="text-sm font-semibold text-red-600">{t('resolusi.delete')}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
