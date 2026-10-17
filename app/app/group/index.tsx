/**
 * Browse Group screen — list group per cabang + filter jenis + search.
 *
 * Filter defaults:
 * - Cabang: user's home cabang (kalau ada, else all)
 * - Jenis: semua
 *
 * Endpoint: `GET /admin/group?cabangId=X&jenis=Y&search=Z&limit=50`
 *
 * Private group tidak muncul di sini (BE filter). Untuk join private, user
 * pakai QR scan (link ke /group/scan) atau input manual code (via Join by Code screen).
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, QrCode, Search } from 'lucide-react-native';

import { Picker } from '@/components/ui/Picker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useGroups } from '@/hooks/useGroup';
import { useBranches } from '@/hooks/useBranches';
import { useAuthStore } from '@/stores/auth.store';
import type { Group, GroupJenis } from '@/types/group';
import { goBack } from '@/utils/nav';
import { GroupListCard } from '@/components/group/GroupListCard';

const JENIS_FILTER_OPTIONS: Array<{ value: '' | GroupJenis; labelKey: string }> = [
  { value: '', labelKey: 'group.filter_all' },
  { value: 'FAMILY', labelKey: 'group.jenis_family' },
  { value: 'MINISTRY', labelKey: 'group.jenis_ministry' },
  { value: 'COMMUNITY', labelKey: 'group.jenis_community' },
  { value: 'HOMECELL_STYLE', labelKey: 'group.jenis_homecell_style' },
];

export default function GroupListScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedCabangId, setSelectedCabangId] = useState<string>(''); // '' = semua
  const [selectedJenis, setSelectedJenis] = useState<'' | GroupJenis>('');

  const branchesQuery = useBranches();
  const cabangOptions = useMemo(() => {
    const items = branchesQuery.data ?? [];
    return [
      { value: '', label: t('group.filter_all_cabang') },
      ...items.map((b) => ({ value: b.id, label: b.nama })),
    ];
  }, [branchesQuery.data, t]);

  // Build query params — undefined kalau kosong (jangan kirim empty string)
  const query = useGroups({
    cabangId: selectedCabangId || undefined,
    jenis: selectedJenis || undefined,
    search: search.trim() || undefined,
    limit: 50,
  });

  const groups = query.data?.data ?? [];

  function handleGroupPress(group: Group) {
    router.push(`/group/${group.id}` as never);
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-1">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('group.browse_title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('group.browse_subtitle')}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/group/scan' as never)}
            className="w-10 h-10 items-center justify-center"
            hitSlop={8}
          >
            <QrCode size={22} color="#EA580C" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/group/new' as never)}
            className="w-10 h-10 items-center justify-center"
            hitSlop={8}
          >
            <Plus size={22} color="#EA580C" />
          </Pressable>
        </View>

        {/* Search + filter row */}
        <View className="px-4 pb-3 gap-2.5">
          <View className="flex-row items-center bg-neutral-100 rounded-xl px-3 gap-2">
            <Search size={16} color="#737373" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('group.search_placeholder')}
              placeholderTextColor="#A3A3A3"
              className="flex-1 py-2.5 text-sm text-neutral-900"
              returnKeyType="search"
            />
          </View>
          <Picker
            label=""
            placeholder={t('group.filter_cabang')}
            value={selectedCabangId}
            options={cabangOptions}
            onChange={setSelectedCabangId}
            modalTitle={t('group.filter_cabang_modal')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            {JENIS_FILTER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value || 'all'}
                onPress={() => setSelectedJenis(opt.value)}
                className={`px-4 py-1.5 rounded-full border ${
                  selectedJenis === opt.value
                    ? 'bg-brand-500 border-brand-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedJenis === opt.value ? 'text-white' : 'text-neutral-700'
                  }`}
                >
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          paddingBottom: insets.bottom + 32,
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {query.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">
              {t('error.generic')}
            </Text>
            <Pressable onPress={() => query.refetch()}>
              <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : groups.length === 0 ? (
          <View className="items-center py-16 px-8">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-sm font-semibold text-neutral-900 text-center mb-1">
              {t('group.empty_title')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center">
              {t('group.empty_body')}
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-xs text-neutral-500 -mb-2">
              {t('group.result_count', { count: groups.length })}
            </Text>
            {groups.map((group) => (
              <GroupListCard key={group.id} group={group} onPress={() => handleGroupPress(group)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
