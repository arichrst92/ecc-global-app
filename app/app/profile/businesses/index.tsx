/**
 * My Businesses — owner list page.
 * Accessible dari Profile menu. Shows semua bisnis user (incl nonaktif),
 * dengan "+" button untuk create baru.
 */
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Handshake, Plus, Store } from 'lucide-react-native';

import { BusinessRow } from '@/components/market/BusinessRow';
import { useBusinessInvitations, useMyBusinesses, useRespondInvitation } from '@/hooks/useLocalBusiness';
import { useToast } from '@/components/ui/Toast';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';

export default function MyBusinessesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const query = useMyBusinesses();
  const invQ = useBusinessInvitations();
  const respond = useRespondInvitation();
  const showToast = useToast((s) => s.show);
  function answer(id: string, accept: boolean) {
    respond.mutate(
      { id, accept },
      {
        onSuccess: () => showToast(t(accept ? 'partner.accepted_toast' : 'partner.rejected_toast'), 'success'),
        onError: (e) => showToast(e instanceof Error ? e.message : t('error.generic'), 'error'),
      },
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('my_business.title')}
          </Text>
          <Pressable
            onPress={() => router.push('/profile/businesses/new' as never)}
            {...gx('bg-brand-500 rounded-full px-3 py-2 flex-row items-center gap-1.5')}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-bold text-white">
              {t('my_business.add_btn')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <PullRefreshControl
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {/* Undangan partner (2.4.7) */}
        {(invQ.data ?? []).length > 0 ? (
          <View className="mb-4 gap-2.5">
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('partner.invitations_title')}</Text>
            {(invQ.data ?? []).map((inv) => (
              <View key={inv.id} className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Handshake size={16} color="#EA580C" />
                  <Text className="text-sm font-bold text-neutral-900 flex-1" numberOfLines={1}>
                    {inv.business.nama}
                  </Text>
                </View>
                <Text className="text-xs text-neutral-600 leading-relaxed mb-3">
                  {t('partner.invitation_body', { name: inv.invitedBy.namaLengkap })}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    disabled={respond.isPending}
                    onPress={() => answer(inv.id, false)}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-300 bg-card items-center"
                  >
                    <Text className="text-sm font-semibold text-neutral-700">{t('partner.reject')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={respond.isPending}
                    onPress={() => answer(inv.id, true)}
                    {...gx('flex-1 py-2.5 rounded-xl bg-brand-500 items-center')}
                  >
                    <Text className="text-sm font-bold text-white">{t('partner.accept')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {query.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-12 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">
              {t('error.generic')}
            </Text>
            <Pressable
              onPress={() => query.refetch()}
              {...gx('bg-brand-500 rounded-full px-4 py-2')}
            >
              <Text className="text-sm font-bold text-white">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (query.data?.length ?? 0) === 0 && (invQ.data ?? []).length === 0 ? (
          <EmptyState onAdd={() => router.push('/profile/businesses/new' as never)} />
        ) : (
          <View className="gap-2.5">
            {(query.data ?? []).map((biz) => (
              <View key={biz.id}>
                <BusinessRow
                  business={biz}
                  variant="owner"
                  onPress={() => router.push(`/profile/businesses/${biz.id}` as never)}
                />
                {biz.myRole === 'PARTNER' ? (
                  <View className="absolute top-2 right-2 bg-violet-100 rounded-full px-2 py-0.5 flex-row items-center gap-1">
                    <Handshake size={10} color="#6D28D9" />
                    <Text className="text-[10px] font-bold text-violet-700">{t('partner.badge')}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-16 px-8">
      <View className="w-20 h-20 rounded-2xl bg-brand-50 items-center justify-center mb-3">
        <Store size={36} color="#EA580C" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 text-center">
        {t('my_business.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1 mb-4 leading-relaxed">
        {t('my_business.empty_msg')}
      </Text>
      <Pressable
        onPress={onAdd}
        {...gx('bg-brand-500 rounded-full px-5 py-3 flex-row items-center gap-2')}
      >
        <Plus size={16} color="#fff" />
        <Text className="text-sm font-bold text-white">
          {t('my_business.add_first_btn')}
        </Text>
      </Pressable>
    </View>
  );
}
