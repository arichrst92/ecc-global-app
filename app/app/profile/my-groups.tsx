/**
 * My Groups — list group yang current jemaat ikut.
 * Endpoint: `GET /admin/me/group-membership` — filter isActive=true membership + group.
 * Sorted by tanggalBergabung desc BE-side.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Lock, Plus, Users } from 'lucide-react-native';

import { useMyGroupMemberships } from '@/hooks/useGroup';
import { GROUP_JENIS_LABELS } from '@/types/group';
import type { GroupMembership } from '@/types/group';

export default function MyGroupsScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'id' | 'en';
  const router = useRouter();
  const query = useMyGroupMemberships();
  const memberships = query.data ?? [];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-1">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('group.my_groups_title')}
            </Text>
            <Text className="text-xs text-neutral-500">
              {t('group.my_groups_subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/group' as never)}
            className="w-10 h-10 items-center justify-center"
            hitSlop={8}
          >
            <Plus size={22} color="#EA580C" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 32,
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
        ) : memberships.length === 0 ? (
          <View className="items-center py-16 px-8">
            <Text className="text-5xl mb-4">👥</Text>
            <Text className="text-base font-bold text-neutral-900 text-center mb-2">
              {t('group.my_empty_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mb-6">
              {t('group.my_empty_body')}
            </Text>
            <Pressable
              onPress={() => router.push('/group' as never)}
              className="bg-brand-500 px-5 py-3 rounded-xl"
            >
              <Text className="text-sm font-bold text-white">
                {t('group.browse_cta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2.5">
            {memberships.map((m) => (
              <MembershipCard
                key={m.membershipId}
                membership={m}
                lang={lang}
                onPress={() => router.push(`/group/${m.group.id}` as never)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MembershipCard({
  membership,
  lang,
  onPress,
}: {
  membership: GroupMembership;
  lang: 'id' | 'en';
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { group } = membership;
  const jenisInfo = GROUP_JENIS_LABELS[group.jenis];

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 border border-neutral-100 active:bg-neutral-50"
    >
      <View className="flex-row items-start gap-3">
        <View className="w-11 h-11 rounded-xl bg-brand-50 items-center justify-center">
          <Text className="text-lg">{jenisInfo.emoji}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold text-neutral-900 flex-1" numberOfLines={1}>
              {group.nama}
            </Text>
            {!group.isPublic ? <Lock size={12} color="#737373" /> : null}
          </View>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Text className="text-xs text-neutral-500">
              {lang === 'id' ? jenisInfo.id : jenisInfo.en}
            </Text>
            <Text className="text-xs text-neutral-300">·</Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {group.cabang.nama}
            </Text>
          </View>

          <View className="flex-row items-center gap-3 mt-2">
            <View className="flex-row items-center gap-1">
              <Users size={11} color="#737373" />
              <Text className="text-xs text-neutral-500">
                {t('group.members_count', { count: group.memberCount })}
              </Text>
            </View>
            <Text className="text-xs text-neutral-300">·</Text>
            <Text className="text-xs text-neutral-500">
              {t('group.joined_at')}: {membership.tanggalBergabung.slice(0, 10)}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color="#A3A3A3" />
      </View>
    </Pressable>
  );
}
