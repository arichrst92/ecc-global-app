import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Copy,
  HandHeart,
  HeartHandshake,
  QrCode,
  Sparkles,
} from 'lucide-react-native';

import { GuestModeBanner } from '@/components/GuestModeBanner';
import { Picker } from '@/components/ui/Picker';
import { SafeImage } from '@/components/ui/SafeImage';
import { useToast } from '@/components/ui/Toast';
import { useBranches } from '@/hooks/useBranches';
import { usePublicRekening } from '@/hooks/usePublicGuest';
import { useAuthStore } from '@/stores/auth.store';

function purposeIcon(purpose: string): React.ReactNode {
  const p = purpose.toLowerCase();
  if (p.includes('pembangunan') || p.includes('building'))
    return <Building2 size={20} color="#fff" />;
  if (p.includes('diakonia') || p.includes('charity'))
    return <HeartHandshake size={20} color="#fff" />;
  if (p.includes('misi') || p.includes('mission')) return <Sparkles size={20} color="#fff" />;
  return <HandHeart size={20} color="#fff" />;
}

/**
 * Persembahan tab untuk guest — read-only rekening info.
 * Endpoint /public/cabang/:id/rekening (filter is_active).
 *
 * Beda dari PersembahanTabAuthenticated:
 * - Pakai cabang picker manual (guest tidak punya home branch)
 * - Tampil rekening + QRIS untuk transfer
 * - No upload bukti / no riwayat giving — replace dengan CTA daftar
 */
export function GuestPersembahanView() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);

  const [cabangId, setCabangId] = useState<string>('');
  const branchesQuery = useBranches();
  const rekeningQuery = usePublicRekening(cabangId || null);

  // Auto-set first cabang sebagai default kalau user belum pilih
  useEffect(() => {
    if (!cabangId && branchesQuery.data && branchesQuery.data.length > 0) {
      setCabangId(branchesQuery.data[0].id);
    }
  }, [cabangId, branchesQuery.data]);

  const branchOptions = (branchesQuery.data ?? []).map((b) => ({
    value: b.id,
    label: b.nama,
    sub: b.alamat,
  }));

  const rekening = rekeningQuery.data?.rekening ?? [];

  async function copyAccount(noRek: string) {
    await Clipboard.setStringAsync(noRek);
    showToast(t('common.copied'), 'success');
  }

  async function promptSignup() {
    await exitGuestMode();
    router.replace('/(auth)/welcome');
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-6">
            <Text className="text-white text-lg font-bold">{t('nav.persembahan')}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={rekeningQuery.isFetching}
            onRefresh={() => rekeningQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
      >
        <GuestModeBanner compact />

        <View className="bg-white rounded-2xl p-3 border border-neutral-100 mb-3">
          <Picker
            label={t('signup.branch')}
            placeholder={
              branchesQuery.isPending ? t('common.loading') : t('signup.branch_placeholder')
            }
            value={cabangId}
            options={branchOptions}
            onChange={setCabangId}
            modalTitle={t('signup.branch_modal_title')}
          />
        </View>

        {rekeningQuery.isPending ? (
          <ActivityIndicator className="mt-8" color="#EA580C" />
        ) : null}

        {rekening.length === 0 && !rekeningQuery.isPending && cabangId ? (
          <View className="items-center py-12">
            <HandHeart size={36} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 mt-3">{t('persembahan.empty_msg')}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          {rekening.map((r) => (
            <View key={r.id} className="bg-white rounded-2xl border border-neutral-100 p-4">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-10 h-10 rounded-xl bg-brand-500 items-center justify-center">
                  {purposeIcon(r.purpose)}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900">{r.purpose}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{r.bankNama}</Text>
                </View>
              </View>

              <View className="bg-neutral-50 rounded-xl p-3 flex-row items-center gap-2">
                <View className="flex-1">
                  <Text className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    {t('common.account_number')}
                  </Text>
                  <Text className="text-base font-bold text-neutral-900 mt-0.5">
                    {r.bankNomor}
                  </Text>
                  <Text className="text-xs text-neutral-600 mt-1">a/n {r.bankAtasNama}</Text>
                </View>
                <Pressable
                  onPress={() => copyAccount(r.bankNomor)}
                  className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center"
                >
                  <Copy size={18} color="#EA580C" />
                </Pressable>
              </View>

              {r.qrisImageUrl ? (
                <View className="mt-3 items-center">
                  <SafeImage
                    uri={r.qrisImageUrl}
                    style={{ width: 160, height: 160 }}
                    resizeMode="contain"
                  />
                  <View className="flex-row items-center gap-1 mt-1">
                    <QrCode size={12} color="#737373" />
                    <Text className="text-[11px] text-neutral-500">QRIS</Text>
                  </View>
                </View>
              ) : null}

              {r.catatan ? (
                <Text className="text-xs text-neutral-600 mt-3 italic">{r.catatan}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* CTA daftar untuk upload bukti + riwayat */}
        {rekening.length > 0 ? (
          <Pressable
            onPress={promptSignup}
            className="mt-4 bg-white rounded-2xl border border-brand-200 p-4"
          >
            <Text className="text-sm font-semibold text-brand-700 text-center">
              {t('guest.cta_signup_to_giving_history')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
