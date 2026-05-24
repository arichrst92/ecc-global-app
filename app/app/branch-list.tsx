import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, MapPin } from 'lucide-react-native';

import { useBranches } from '@/hooks/useBranches';

/**
 * Branch list screen — public, accessible untuk guest mode.
 *
 * Pakai existing useBranches() hook yang fetch `/auth/cabang` (skipAuth API,
 * tidak butuh JWT). Tampilkan list cabang aktif dengan info kontak.
 *
 * Tujuan: jemaat potential (guest) bisa lihat cabang terdekat sebelum daftar.
 */
export default function BranchListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const branchesQuery = useBranches();

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
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('branch_list.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
      >
        <Text className="text-xs text-neutral-500 mb-3 px-1">
          {t('branch_list.subtitle')}
        </Text>

        {branchesQuery.isPending ? (
          <Text className="text-sm text-neutral-400 text-center py-8">
            {t('common.loading')}
          </Text>
        ) : null}

        {branchesQuery.isError ? (
          <View className="bg-red-50 border border-red-100 rounded-xl p-4">
            <Text className="text-sm text-red-700 mb-2">{t('branch_list.error')}</Text>
            <Pressable onPress={() => branchesQuery.refetch()}>
              <Text className="text-sm text-brand-600 font-semibold">
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="gap-2">
          {(branchesQuery.data ?? []).map((b) => (
            <View key={b.id} className="bg-white rounded-2xl p-4 border border-neutral-100">
              <View className="flex-row items-start gap-3 mb-2">
                <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                  <Building2 size={20} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900">{b.nama}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{b.kode}</Text>
                </View>
              </View>

              {b.alamat ? (
                <View className="flex-row items-start gap-2 mt-2">
                  <MapPin size={14} color="#737373" style={{ marginTop: 2 }} />
                  <Text className="text-xs text-neutral-700 flex-1 leading-relaxed">
                    {b.alamat}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {branchesQuery.data && branchesQuery.data.length === 0 ? (
          <Text className="text-sm text-neutral-400 text-center py-8">
            {t('branch_list.empty')}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
