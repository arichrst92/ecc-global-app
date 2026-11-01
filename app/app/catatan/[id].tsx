/** Catatan saya — tampilan baca (pribadi). */
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, CalendarDays, Lock, Mic, Pencil, Share2, Trash2 } from 'lucide-react-native';

import { CatatanRender } from '@/components/catatan/CatatanRender';
import { useToast } from '@/components/ui/Toast';
import { CATATAN_KEY, deleteCatatan, getCatatan } from '@/api/catatan';
import { parseBibleRef } from '@/utils/bibleRef';
import { plainText } from '@/utils/catatanMarkdown';
import { formatDateWithDay } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function CatatanDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: [...CATATAN_KEY, 'detail', id], queryFn: () => getCatatan(id!), enabled: !!id });
  const n = q.data;

  const del = useMutation({
    mutationFn: () => deleteCatatan(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATATAN_KEY });
      showToast(t('catatan.deleted'), 'success');
      goBack(router, '/catatan');
    },
    onError: () => showToast(t('error.generic'), 'error'),
  });

  function confirmDelete() {
    Alert.alert(t('catatan.delete_title'), t('catatan.delete_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => del.mutate() },
    ]);
  }

  function share() {
    if (!n) return;
    const meta = [formatDateWithDay(n.tanggal, i18n.language), n.pengkhotbah].filter(Boolean).join(' · ');
    const lines = [n.judul, meta, n.ayat.length ? n.ayat.join(', ') : '', '', plainText(n.isi)].filter((l, i) => i === 3 || l);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  }

  function openAyat(r: string) {
    const p = parseBibleRef(r);
    if (p) router.push(`/bible/${p.book.id}/${p.bab}` as never);
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-2 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/catatan')} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.back')}>
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1 flex-row items-center gap-1.5">
            <Lock size={12} color={nc('#737373')} />
            <Text className="text-xs font-semibold text-neutral-500">{t('catatan.private_badge')}</Text>
          </View>
          {n ? (
            <>
              <Pressable onPress={share} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.share')}>
                <Share2 size={18} color={nc('#404040')} />
              </Pressable>
              <Pressable onPress={confirmDelete} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.delete')}>
                <Trash2 size={18} color="#DC2626" />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/catatan/edit?id=${n.id}` as never)}
                className="ml-1 flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-brand-500"
              >
                <Pencil size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">{t('common.edit')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#EA580C" style={{ marginTop: 40 }} />
      ) : !n ? (
        <Text className="text-sm text-neutral-500 text-center mt-10">{t('error.generic')}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Text className="text-2xl font-bold text-neutral-900">{n.judul}</Text>
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <View className="flex-row items-center gap-1">
              <CalendarDays size={13} color={nc('#737373')} />
              <Text className="text-xs text-neutral-500">{formatDateWithDay(n.tanggal, i18n.language)}</Text>
            </View>
            {n.pengkhotbah ? (
              <View className="flex-row items-center gap-1">
                <Mic size={13} color={nc('#737373')} />
                <Text className="text-xs text-neutral-500">{n.pengkhotbah}</Text>
              </View>
            ) : null}
          </View>
          {n.ayat.length ? (
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {n.ayat.map((r) => (
                <Pressable key={r} onPress={() => openAyat(r)} className="flex-row items-center gap-1 bg-brand-50 border border-brand-200 rounded-full px-2.5 py-1">
                  <BookOpen size={12} color="#C2410C" />
                  <Text className="text-xs font-semibold text-brand-700">{r}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="h-px bg-neutral-200 my-4" />
          {n.isi.trim() ? <CatatanRender text={n.isi} /> : <Text className="text-sm text-neutral-400">{t('catatan.preview_empty')}</Text>}
        </ScrollView>
      )}
    </View>
  );
}
