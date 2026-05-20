import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Copy, Home, Upload } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useEventDetail } from '@/hooks/useEvents';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { uploadBukti } from '@/api/event';
import { env } from '@/config/env';
import { ApiError } from '@/types/api';

export default function EventPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);
  const participationId = useEventFlowStore((s) => s.currentParticipationId);
  const resetFlow = useEventFlowStore((s) => s.reset);

  const eventQuery = useEventDetail(id);
  const event = eventQuery.data;

  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string }) => {
      if (!event || !participationId) throw new Error('Missing context');
      return uploadBukti(event.id, participationId, file);
    },
    onSuccess: (data) => {
      const url = data.buktiTransferUrl
        ? `${env.apiBaseUrl}${data.buktiTransferUrl}`
        : null;
      setUploadedUrl(url);
      showToast(t('event.uploaded_waiting'), 'success');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      Alert.alert(t('error.generic'), msg);
    },
  });

  async function pickAndUpload() {
    // Request permission
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('event.permission_denied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Per BE patch 2026-05-21f flexImageUpload: BE accept jpeg/png/webp/heic/heif/gif
    // + application/octet-stream (Android camera kadang tidak set MIME).
    // iOS HEIC Live Photo auto-convert ke WebP di server. Mobile passthrough saja.
    const fileName = asset.fileName ?? `bukti-${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';

    uploadMutation.mutate({
      uri: asset.uri,
      name: fileName,
      type,
    });
  }

  async function copyAccountNumber(nomor: string) {
    await Clipboard.setStringAsync(nomor);
    showToast(t('common.copied'), 'success');
  }

  function handleDone() {
    resetFlow();
    router.replace('/(tabs)');
  }

  if (!event) return null;

  const nominal = Number(event.nominal);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('event.payment_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Status pill */}
        <View className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4 flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full bg-amber-500 items-center justify-center">
            <Text className="text-white text-xs font-bold">1</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-amber-900">
              {t('event.status_daftar')} → {t('event.status_menunggu')}
            </Text>
            <Text className="text-xs text-amber-700 mt-0.5">
              Transfer & upload bukti untuk lanjut ke verifikasi
            </Text>
          </View>
        </View>

        {/* Bank info */}
        {event.bankNama && event.bankNomor ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('event.transfer_to')}
            </Text>
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center">
                  <Text className="font-bold text-blue-600 text-sm">{event.bankNama}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-neutral-500">{t('common.account_name') || 'Atas Nama'}</Text>
                  <Text className="font-semibold text-neutral-900">{event.bankAtasNama}</Text>
                </View>
              </View>

              <View className="mt-3 pt-3 border-t border-neutral-100">
                <Text className="text-xs text-neutral-500">{t('common.account_number') || 'Nomor Rekening'}</Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="font-mono text-lg font-bold text-neutral-900">
                    {event.bankNomor}
                  </Text>
                  <Pressable
                    onPress={() => copyAccountNumber(event.bankNomor!)}
                    className="flex-row items-center gap-1 px-3 py-1.5 bg-brand-50 rounded-lg"
                  >
                    <Copy size={14} color="#EA580C" />
                    <Text className="text-xs font-semibold text-brand-600">{t('common.copy')}</Text>
                  </Pressable>
                </View>
              </View>

              <View className="mt-3 pt-3 border-t border-neutral-100 flex-row items-baseline justify-between">
                <Text className="text-sm text-neutral-500">Nominal</Text>
                <Text className="text-xl font-bold text-brand-600">
                  Rp {nominal.toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {/* QRIS */}
        {event.qrisImageUrl ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('event.or_qris')}
            </Text>
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 items-center">
              <Image
                source={{ uri: `${env.apiBaseUrl}${event.qrisImageUrl}` }}
                style={{ width: 200, height: 200 }}
                resizeMode="contain"
              />
              <Text className="text-xs text-neutral-500 mt-2">QRIS (semua bank)</Text>
            </View>
          </>
        ) : null}

        {/* Upload bukti */}
        {uploadedUrl ? (
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
              <Check size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-emerald-900 text-sm">
                {t('event.uploaded_waiting')}
              </Text>
              <Text className="text-xs text-emerald-700 mt-0.5">
                Admin akan verifikasi dalam 1-24 jam
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={pickAndUpload}
            disabled={uploadMutation.isPending}
            className={`p-5 border-2 border-dashed rounded-2xl items-center gap-2 ${
              uploadMutation.isPending ? 'border-neutral-300 bg-neutral-50' : 'border-brand-300 bg-brand-50/50'
            }`}
          >
            <View className="w-12 h-12 rounded-xl bg-brand-100 items-center justify-center">
              <Upload size={20} color="#EA580C" />
            </View>
            <Text className="font-semibold text-sm text-neutral-900">
              {uploadMutation.isPending ? 'Mengupload...' : t('event.upload_proof')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('event.upload_proof_subtitle')}</Text>
          </Pressable>
        )}
      </ScrollView>

      {uploadedUrl ? (
        <View className="bg-white border-t border-neutral-100 px-5 py-3">
          <SafeAreaView edges={['bottom']}>
            <Button
              label={t('event.back_to_home')}
              onPress={handleDone}
              leftIcon={<Home size={16} color="#fff" />}
              fullWidth
              size="lg"
            />
          </SafeAreaView>
        </View>
      ) : null}
    </View>
  );
}
