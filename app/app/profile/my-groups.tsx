/**
 * My Groups — list group yang current jemaat ikut.
 * Endpoint: `GET /admin/me/group-membership` — filter isActive=true membership + group.
 * Sorted by tanggalBergabung desc BE-side.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import {
  Image,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { groupImageHref } from '@/components/group/GroupHero';
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  ChevronRight,
  Crown,
  Globe,
  Lock,
  Plus,
  Tag,
  Users,
} from 'lucide-react-native';

import { useMyGroupMemberships } from '@/hooks/useGroup';
import { GROUP_JENIS_LABELS } from '@/types/group';
import type { GroupMembership } from '@/types/group';
import { goBack } from '@/utils/nav';
import { formatDate } from '@/utils/date';

export default function MyGroupsScreen() {
  const insets = useSafeAreaInsets();
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
            onPress={() => goBack(router)}
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
          <View className="gap-4">
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
      className="bg-white rounded-2xl border border-neutral-100 overflow-hidden active:opacity-90"
    >
      {/* Hero */}
      <View style={{ aspectRatio: 16 / 7 }} className="bg-brand-50 justify-end">
        {group.heroImageUrl ? (
          <Image
            source={{ uri: groupImageHref(group.heroImageUrl) }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-brand-100">
            <Text style={{ fontSize: 44 }}>{jenisInfo.emoji}</Text>
          </View>
        )}
        {/* Badge di atas hero */}
        <View className="absolute top-2.5 left-2.5 right-2.5 flex-row items-center gap-1.5">
          <View className="flex-row items-center gap-1 bg-white/95 px-2 py-1 rounded-full">
            <Tag size={11} color="#C2410C" />
            <Text className="text-[11px] font-semibold text-brand-700">{lang === 'id' ? jenisInfo.id : jenisInfo.en}</Text>
          </View>
          <View className="flex-1" />
          {membership.isPic ? (
            <View className="flex-row items-center gap-1 bg-brand-500 px-2 py-1 rounded-full">
              <Crown size={11} color="#fff" />
              <Text className="text-[11px] font-bold text-white">PIC</Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1 bg-black/55 px-2 py-1 rounded-full">
            {group.isPublic ? <Globe size={11} color="#fff" /> : <Lock size={11} color="#fff" />}
            <Text className="text-[11px] font-semibold text-white">
              {group.isPublic ? t('group.my_card_public') : t('group.my_card_private')}
            </Text>
          </View>
        </View>
      </View>

      {/* Detail */}
      <View className="p-4">
        <View className="flex-row items-start gap-2">
          <Text className="flex-1 text-base font-bold text-neutral-900" numberOfLines={2}>
            {group.nama}
          </Text>
          <ChevronRight size={18} color="#A3A3A3" style={{ marginTop: 2 }} />
        </View>

        <View className="mt-3 gap-2">
          <Detail icon={<Building2 size={14} color="#737373" />} text={group.cabang.nama} />
          {group.picJemaat ? (
            <Detail
              icon={<Crown size={14} color="#737373" />}
              text={`${t('group.my_card_pic')}: ${group.picJemaat.namaLengkap}`}
            />
          ) : null}
        </View>

        <View className="flex-row mt-3 pt-3 border-t border-neutral-100">
          <View className="flex-1 flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-lg bg-violet-50 items-center justify-center">
              <Users size={15} color="#7C3AED" />
            </View>
            <View>
              <Text className="text-sm font-bold text-neutral-900">{group.memberCount}</Text>
              <Text className="text-[11px] text-neutral-500">{t('group.my_card_members')}</Text>
            </View>
          </View>
          <View className="flex-1 flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center">
              <CalendarCheck size={15} color="#059669" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                {formatDate(membership.tanggalBergabung, lang)}
              </Text>
              <Text className="text-[11px] text-neutral-500">{t('group.joined_at')}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className="flex-1 text-xs text-neutral-600" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
