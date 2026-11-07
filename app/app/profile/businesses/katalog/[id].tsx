/**
 * Kelola katalog produk/jasa (pemilik bisnis) — 2.4.7.
 *
 * Daftar item urut (naik/turun), aktif/nonaktif, tambah (dibatasi batas
 * global dari Portal), ketuk item untuk ubah.
 */
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowUp, EyeOff, Plus, ShoppingBag } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { useToast } from '@/components/ui/Toast';
import { useMyBusinessDetail, useMyItems, useReorderItems, useToggleItem } from '@/hooks/useLocalBusiness';
import { ApiError } from '@/types/api';
import { hargaLabel, type LocalItem } from '@/types/localBusiness';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export default function KatalogOwnerScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const biz = useMyBusinessDetail(id).data;
  const query = useMyItems(id);
  const items = query.data?.items ?? [];
  const max = query.data?.max ?? 0;
  const full = max > 0 && items.length >= max;
  const reorder = useReorderItems(id ?? '');
  const toggle = useToggleItem(id ?? '');

  const onErr = (err: unknown) => showToast(err instanceof ApiError ? err.message : t('error.network'), 'error');

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length || reorder.isPending) return;
    const ids = items.map((i) => i.id);
    [ids[idx], ids[j]] = [ids[j]!, ids[idx]!];
    reorder.mutate(ids, { onError: onErr });
  }

  function add() {
    if (full) {
      Alert.alert(t('katalog.limit_title'), t('katalog.limit_msg', { max }));
      return;
    }
    router.push(`/profile/businesses/katalog/item?bizId=${id}` as never);
  }

  const harga = (it: LocalItem) => hargaLabel(it, t('katalog.harga_nego'), t('katalog.harga_mulai'));

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
              {t('katalog.manage_title')}
            </Text>
            {biz ? (
              <Text className="text-xs text-neutral-500" numberOfLines={1}>
                {biz.nama}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={add}
            {...gx(`rounded-full px-3 py-2 flex-row items-center gap-1.5 ${full ? 'bg-neutral-300' : 'bg-brand-500'}`)}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-bold text-white">{t('katalog.add')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {query.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<PullRefreshControl onRefresh={() => query.refetch()} />}
        >
          {max > 0 ? (
            <Text className="text-xs text-neutral-500 mb-3">
              {t('katalog.count', { n: items.length, max })}
            </Text>
          ) : null}

          {items.length === 0 ? (
            <View className="bg-card rounded-2xl p-8 border border-neutral-100 items-center">
              <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-3">
                <ShoppingBag size={24} color="#EA580C" />
              </View>
              <Text className="text-sm font-semibold text-neutral-900 text-center">{t('katalog.empty_owner')}</Text>
              <Text className="text-xs text-neutral-500 text-center mt-1">{t('katalog.empty_owner_sub')}</Text>
            </View>
          ) : (
            items.map((it, idx) => (
              <Pressable
                key={it.id}
                onPress={() => router.push(`/profile/businesses/katalog/item?bizId=${id}&itemId=${it.id}` as never)}
                className={`bg-card rounded-2xl border border-neutral-100 mb-2.5 p-2.5 flex-row items-center gap-3 ${
                  it.isActive && !it.isHiddenByAdmin ? '' : 'opacity-60'
                }`}
              >
                <HeroImage
                  url={it.fotoUrls[0]}
                  fallbackEmoji={it.jenis === 'JASA' ? '🛠️' : '📦'}
                  emojiSize={24}
                  style={{ width: 84, aspectRatio: 1.5, borderRadius: 10, overflow: 'hidden' }}
                />
                <View className="flex-1 min-w-0">
                  <Text className="text-[10px] font-bold uppercase text-neutral-400">
                    {it.jenis === 'JASA' ? t('katalog.jenis_jasa') : t('katalog.jenis_produk')}
                  </Text>
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {it.nama}
                  </Text>
                  <Text
                    className={`text-xs font-semibold mt-0.5 ${it.hargaTipe === 'NEGO' ? 'text-neutral-500' : 'text-brand-600'}`}
                    numberOfLines={1}
                  >
                    {harga(it)}
                  </Text>
                  {it.isHiddenByAdmin ? (
                    <View className="flex-row items-center gap-1 mt-1">
                      <EyeOff size={11} color="#DC2626" />
                      <Text className="text-[10px] font-semibold text-red-600">{t('katalog.hidden_by_admin')}</Text>
                    </View>
                  ) : null}
                </View>
                <View className="items-center gap-1">
                  <Pressable
                    onPress={() => toggle.mutate({ itemId: it.id, isActive: !it.isActive }, { onError: onErr })}
                    hitSlop={6}
                    className={`w-10 h-5 rounded-full justify-center px-0.5 ${
                      it.isActive ? 'bg-emerald-500 items-end' : 'bg-neutral-300 items-start'
                    }`}
                  >
                    <View className="w-4 h-4 rounded-full bg-card" />
                  </Pressable>
                  <View className="flex-row">
                    <Pressable onPress={() => move(idx, -1)} disabled={idx === 0} hitSlop={4} className="p-1">
                      <ArrowUp size={14} color={idx === 0 ? nc('#D4D4D4') : nc('#525252')} />
                    </Pressable>
                    <Pressable
                      onPress={() => move(idx, 1)}
                      disabled={idx === items.length - 1}
                      hitSlop={4}
                      className="p-1"
                    >
                      <ArrowDown size={14} color={idx === items.length - 1 ? nc('#D4D4D4') : nc('#525252')} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
