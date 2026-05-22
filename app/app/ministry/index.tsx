/**
 * Ministry list page — diakses dari Quick Access tile "Ministry" di dashboard
 * dan dari MinistryCard di profile (CTA "Belum terlibat ministry").
 *
 * BE endpoint `/admin/ministry` belum tersedia — pending request di
 * docs/backend-request-ministry-endpoints.md.
 *
 * Untuk sementara halaman ini tampil:
 * - User's own ministries (dari /admin/me.ministries kalau BE sudah kirim)
 * - Placeholder "Daftar lengkap ministry akan tersedia setelah BE siap"
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, HeartHandshake } from 'lucide-react-native';

import { getMyProfile } from '@/api/me';

export default function MinistryListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me', 'ministry-list'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });
  const myMinistries = meQuery.data?.ministries ?? [];

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
            {t('ministry.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Section: Pelayanan Saya */}
        {myMinistries.length > 0 ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('ministry.my_section')}
            </Text>
            <View className="bg-white rounded-2xl border border-neutral-100 mb-6">
              {myMinistries.map((m, idx) => (
                <View
                  key={m.id}
                  className={`p-4 flex-row items-center gap-3 ${
                    idx > 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                    <HeartHandshake size={18} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {m.nama}
                    </Text>
                    {m.posisi ? (
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {m.posisi}
                        {m.cabang ? ` · ${m.cabang.nama}` : ''}
                      </Text>
                    ) : m.cabang ? (
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {m.cabang.nama}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Section: All ministries (BE pending) */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('ministry.all_section')}
        </Text>
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
          <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-3">
            <HeartHandshake size={28} color="#EA580C" />
          </View>
          <Text className="text-sm font-semibold text-neutral-900 text-center">
            {t('ministry.coming_soon_title')}
          </Text>
          <Text className="text-xs text-neutral-500 text-center mt-1 leading-relaxed">
            {t('ministry.coming_soon_msg')}
          </Text>
        </View>

        {/* Notice info */}
        <View className="bg-amber-50 rounded-2xl p-3 border border-amber-100 mt-4">
          <Text className="text-xs text-amber-800 leading-relaxed">
            {t('ministry.be_pending_notice')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
