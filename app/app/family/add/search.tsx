import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Info, Search, X, Hourglass } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { TipeRelasiPicker } from '@/components/family/TipeRelasiPicker';
import { useToast } from '@/components/ui/Toast';
import { useLinkById } from '@/hooks/useFamily';
import { searchFamily } from '@/api/family';
import { ApiError } from '@/types/api';
import type { FamilySearchItem } from '@/types/family';
import type { TipeRelasi } from '@/types/tipeRelasi';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

/**
 * Tambah keluarga — cari jemaat (2.4.6).
 * Nama cocok sebagian (min. 3 huruf); email & no HP harus lengkap/persis.
 * Hasil hanya nama, foto, kode & cabang (kontak tidak ditampilkan).
 */
export default function FamilyAddSearchScreen() {
  const kbH = useKeyboardHeight();
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const linkMutation = useLinkById();

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<FamilySearchItem | null>(null);
  const [tipe, setTipe] = useState<TipeRelasi | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 450);
    return () => clearTimeout(id);
  }, [q]);

  const isContact = debounced.includes('@') || /^\+?[\d\s\-().]{8,}$/.test(debounced);
  const enabled = isContact ? debounced.length >= 5 : debounced.length >= 3;
  const query = useQuery({
    queryKey: ['family', 'search', debounced],
    queryFn: () => searchFamily(debounced),
    enabled: enabled && !picked,
    staleTime: 60_000,
    retry: false,
  });
  const items = query.data?.items ?? [];

  function handleSubmit() {
    if (!picked || !tipe) return;
    linkMutation.mutate(
      { jemaatId: picked.id, tipeRelasiId: tipe.id },
      {
        onSuccess: (data) => {
          if (data.status === 'PENDING') {
            // 2.4.7 — menunggu persetujuan orangnya / walinya.
            showToast(data.message ?? t('family.request_sent'), 'success');
            router.replace('/family');
            return;
          }
          showToast(t('family.link_success', { name: data.target?.namaLengkap ?? picked.namaLengkap }), 'success');
          router.replace('/family');
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'CONFLICT') Alert.alert(err.message || t('family.already_linked'));
            else if (err.code === 'BAD_REQUEST' && /diri sendiri/i.test(err.message)) Alert.alert(t('family.cant_link_self'));
            else Alert.alert(err.message);
          } else {
            Alert.alert(t('error.network'));
          }
        },
      },
    );
  }

  const searchError =
    query.error instanceof ApiError && query.error.status === 429
      ? t('family.search_rate_limited')
      : query.isError
        ? t('error.generic')
        : null;

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
      <View className="flex-1">
        <View className="px-4 py-2 flex-row items-center border-b border-neutral-100">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('family.add_via_search')}</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: kbH + 24 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {picked ? (
            <>
              <Text className="text-xs font-semibold text-neutral-500 mb-2">{t('family.search_picked')}</Text>
              <View className="flex-row items-center gap-3 p-3 rounded-2xl border border-brand-200 bg-brand-50">
                <Avatar name={picked.namaLengkap} fotoUrl={picked.fotoUrl} size={44} />
                <View className="flex-1 min-w-0">
                  <Text className="font-semibold text-neutral-900" numberOfLines={1}>
                    {picked.namaLengkap}
                  </Text>
                  <Text className="text-xs text-neutral-500" numberOfLines={1}>
                    {[picked.kode, picked.cabang].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setPicked(null);
                    setTipe(null);
                  }}
                  disabled={linkMutation.isPending}
                  className="px-3 py-1.5 rounded-full bg-card border border-neutral-200"
                >
                  <Text className="text-xs font-semibold text-neutral-700">{t('family.search_change')}</Text>
                </Pressable>
              </View>
              <View className="mt-5">
                <TipeRelasiPicker value={tipe} onChange={setTipe} disabled={linkMutation.isPending} />
              </View>
            </>
          ) : (
            <>
              <Text className="text-sm text-neutral-600 mb-3 leading-relaxed">{t('family.search_intro')}</Text>
              <View className="flex-row items-center border border-neutral-300 rounded-xl px-3 bg-card">
                <Search size={18} color={nc('#A3A3A3')} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder={t('family.search_placeholder')}
                  placeholderTextColor={nc('#A3A3A3')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="search"
                  className="flex-1 py-3 px-2 text-base text-neutral-900"
                />
                {q ? (
                  <Pressable onPress={() => setQ('')} hitSlop={8}>
                    <X size={18} color={nc('#A3A3A3')} />
                  </Pressable>
                ) : null}
              </View>

              <View className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
                <Info size={16} color={nc('#92400e')} />
                <Text className="text-xs text-amber-800 flex-1">{t('family.search_notice')}</Text>
              </View>

              <View className="mt-4">
                {!enabled ? (
                  debounced.length > 0 ? (
                    <Text className="text-xs text-neutral-500 text-center py-4">{t('family.search_min')}</Text>
                  ) : null
                ) : query.isFetching ? (
                  <View className="items-center py-6">
                    <ActivityIndicator color="#F97316" />
                  </View>
                ) : searchError ? (
                  <Text className="text-sm text-red-600 text-center py-4">{searchError}</Text>
                ) : items.length === 0 ? (
                  <Text className="text-sm text-neutral-500 text-center py-6">
                    {query.data?.mode === 'nama' ? t('family.search_empty_nama') : t('family.search_empty_contact')}
                  </Text>
                ) : (
                  <View className="gap-2">
                    {items.map((it) => (
                      <Pressable
                        key={it.id}
                        disabled={it.alreadyLinked || !!it.pendingRequest}
                        onPress={() => setPicked(it)}
                        className={`flex-row items-center gap-3 p-3 rounded-2xl border border-neutral-100 bg-card ${it.alreadyLinked || it.pendingRequest ? 'opacity-50' : ''}`}
                      >
                        <Avatar name={it.namaLengkap} fotoUrl={it.fotoUrl} size={40} />
                        <View className="flex-1 min-w-0">
                          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
                            {it.namaLengkap}
                          </Text>
                          <Text className="text-xs text-neutral-500" numberOfLines={1}>
                            {[it.kode, it.cabang].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        {it.alreadyLinked ? (
                          <View className="flex-row items-center gap-1">
                            <Check size={14} color="#059669" />
                            <Text className="text-[11px] font-semibold text-emerald-700">{t('family.search_already')}</Text>
                          </View>
                        ) : it.pendingRequest ? (
                          <View className="flex-row items-center gap-1">
                            <Hourglass size={13} color="#B45309" />
                            <Text className="text-[11px] font-semibold text-amber-700">{t('family.search_pending')}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {picked ? (
          <View className="px-6 pt-3 pb-3 bg-card border-t border-neutral-100">
            <Button
              label={t('family.link_member')}
              onPress={handleSubmit}
              loading={linkMutation.isPending}
              disabled={!tipe}
              fullWidth
              size="lg"
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
