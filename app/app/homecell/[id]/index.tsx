import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Clock,
  Info,
  MapPin,
  UserPlus,
  Users,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useManagedHomecells } from '@/hooks/useHomecell';

export default function HomecellDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useManagedHomecells();
  const homecell = query.data?.find((h) => h.id === id);

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!homecell) {
    return (
      <View className="flex-1 bg-neutral-50">
        <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#171717" />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">
            {t('homecell.detail_not_found')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-cyan-600 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white">
              {t('homecell.detail_title')}
            </Text>
          </View>
          <View className="px-5 pb-6 pt-2">
            <View className="bg-white/20 self-start px-2.5 py-1 rounded-full mb-2">
              <Text className="text-[10px] font-bold text-white tracking-wider">
                {t('homecell.pic_badge')}
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold">{homecell.nama}</Text>
            <Text className="text-white/80 text-sm mt-1">
              {homecell.area.nama} · {homecell.area.cabang.nama}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Stat */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100 items-center">
            <Users size={20} color="#0891b2" />
            <Text className="text-2xl font-bold text-neutral-900 mt-2">
              {homecell.memberCount}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {t('homecell.members_count')}
            </Text>
          </View>
        </View>

        {/* Schedule */}
        {homecell.hari || homecell.alamat ? (
          <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 gap-3">
            {homecell.hari ? (
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
                  <Clock size={18} color="#0891b2" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-neutral-500">{t('homecell.schedule')}</Text>
                  <Text className="text-sm font-semibold text-neutral-900">
                    {homecell.hari}
                    {homecell.jam ? ` · ${homecell.jam}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}
            {homecell.alamat ? (
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
                  <MapPin size={18} color="#0891b2" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-neutral-500">{t('homecell.address')}</Text>
                  <Text className="text-sm font-semibold text-neutral-900">
                    {homecell.alamat}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Add member action */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('homecell.actions_section')}
        </Text>
        <Pressable
          onPress={() => router.push(`/homecell/${id}/add-member`)}
          className="bg-cyan-600 rounded-2xl p-4 flex-row items-center gap-3 mb-3"
        >
          <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
            <UserPlus size={22} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-white">{t('homecell.add_member_btn')}</Text>
            <Text className="text-xs text-white/80 mt-0.5">
              {t('homecell.add_member_sub')}
            </Text>
          </View>
        </Pressable>

        {/* Members list — defer sampai BE expose endpoint detail */}
        <View className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mt-4 flex-row gap-2">
          <Info size={16} color="#92400e" style={{ marginTop: 2 }} />
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            {t('homecell.member_list_pending')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
