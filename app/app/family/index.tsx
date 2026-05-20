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
import { ArrowLeft, ChevronRight, Plus, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useMyFamily } from '@/hooks/useFamily';
import type { FamilyRelation, FamilyRole } from '@/types/family';
import { formatPhoneDisplay } from '@/utils/phone';

function roleLabel(role: FamilyRole, t: (k: string) => string): string {
  switch (role) {
    case 'SPOUSE':
      return t('family.role_spouse');
    case 'CHILD':
      return t('family.role_child');
    case 'PARENT':
      return t('family.role_parent');
    case 'SIBLING':
      return t('family.role_sibling');
  }
}

function roleColor(role: FamilyRole): { bg: string; text: string } {
  switch (role) {
    case 'SPOUSE':
      return { bg: 'bg-rose-100', text: 'text-rose-700' };
    case 'CHILD':
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'PARENT':
      return { bg: 'bg-amber-100', text: 'text-amber-700' };
    case 'SIBLING':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  }
}

export default function FamilyListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useMyFamily();
  const family = query.data ?? [];

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
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('family.title')}
            </Text>
            <Text className="text-xs text-neutral-500">
              {family.length} {t('family.members_count')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/family/add')}
            className="w-10 h-10 rounded-full bg-brand-500 items-center justify-center"
          >
            <Plus size={18} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
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
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={() => query.refetch()}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : family.length === 0 ? (
          <EmptyState onAdd={() => router.push('/family/add')} />
        ) : (
          <View className="gap-2">
            {family.map((f) => (
              <FamilyCard
                key={f.id}
                relation={f}
                onPress={() => router.push(`/family/${f.jemaat.id}`)}
              />
            ))}
          </View>
        )}

        {family.length > 0 ? (
          <Pressable
            onPress={() => router.push('/family/add')}
            className="mt-4 p-4 bg-white rounded-2xl border border-dashed border-brand-300 flex-row items-center justify-center gap-2"
          >
            <Plus size={18} color="#EA580C" />
            <Text className="text-sm font-semibold text-brand-600">
              {t('family.add_member')}
            </Text>
          </Pressable>
        ) : null}

        {/* Info card */}
        <View className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
          <Text className="text-xs text-blue-800 leading-relaxed">
            {t('family.info_notice')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function FamilyCard({
  relation,
  onPress,
}: {
  relation: FamilyRelation;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { jemaat, role } = relation;
  const color = roleColor(role);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
    >
      <Avatar name={jemaat.namaLengkap} fotoUrl={jemaat.fotoUrl ?? undefined} size={48} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
            {jemaat.namaLengkap}
          </Text>
          {jemaat.isDependent ? (
            <View className="bg-neutral-200 px-1.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-neutral-600">
                {t('family.dependent_badge')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-neutral-500 mt-0.5">
          {jemaat.noHp ? formatPhoneDisplay(jemaat.noHp) : jemaat.cabang.nama}
        </Text>
        <View className={`${color.bg} self-start px-2 py-0.5 rounded-full mt-1`}>
          <Text className={`text-[10px] font-bold ${color.text}`}>
            {roleLabel(role, t)}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-16 px-8">
      <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-4">
        <Users size={32} color="#A3A3A3" />
      </View>
      <Text className="text-lg font-semibold text-neutral-700">
        {t('family.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1 mb-4">
        {t('family.empty_msg')}
      </Text>
      <Pressable
        onPress={onAdd}
        className="px-4 py-2.5 bg-brand-500 rounded-xl flex-row items-center gap-2"
      >
        <Plus size={16} color="#fff" />
        <Text className="text-sm font-semibold text-white">
          {t('family.add_first')}
        </Text>
      </Pressable>
    </View>
  );
}
