import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Camera, Check, Copy, Home, RefreshCw, Send } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useEventDetail } from '@/hooks/useEvents';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { uploadBukti } from '@/api/event';
import { env } from '@/config/env';
import { ApiError } from '@/types/api';

type PickedImage = {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
};

export default function EventPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);

  const eventQuery = useEventDetail(id);
  const event = eventQuery.data;
  const queryClient = useQueryClient();

  // Cek participation dari persistent store
  const participation = useEventFlowStore((s) =>
    event ? s.getParticipation(event.id) : null,
  );
  const updateStatus = useEventFlowStore((s) => s.updateParticipationStatus);
  const resetFlow = useEventFlowStore((s) => s.resetFlow);

  // State untuk image preview (sebelum submit)
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!event || !participation || !pickedImage) throw new Error('Missing context');
      return uploadBukti(event.id, participation.participationId, {
        uri: pickedImage.uri,
        name: pickedImage.name,
        type: pickedImage.type,
      });
    },
    onSuccess: async (data) => {
      const url = data.buktiTransferUrl
        ? `${env.apiBaseUrl}${data.buktiTransferUrl}`
        : null;
      setUploadedUrl(url);
      // Update status di persistent store → MENUNGGU_VERIFIKASI
      if (event) {
        await updateStatus(event.id, 'MENUNGGU_VERIFIKASI');
      }
      // Invalidate event queries supaya myParticipation.status di detail ke-update
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'my-participation', id] });
      showToast(t('event.uploaded_waiting'), 'success');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      Alert.alert(t('error.generic'), msg);
    },
  });

  async function pickImage() {
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
    // + application/octet-stream. iOS HEIC Live Photo auto-convert ke WebP di server.
    setPickedImage({
      uri: asset.uri,
      name: asset.fileName ?? `bukti-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    });
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('event.camera_permission_denied'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPickedImage({
      uri: asset.uri,
      name: asset.fileName ?? `bukti-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
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

  // Untuk NOMINAL_BEBAS, nominal yang dibayar = nominalBayar yang user input
  // saat register. Source priority:
  //   1. BE myParticipation.nominalBayar (truth setelah refetch)
  //   2. Local store participation.nominalBayar (instant fallback sebelum refetch)
  //   3. event.nominal (fixed value untuk NOMINAL_TETAP, atau 0 untuk BEBAS)
  const isBebas = event.tipeBayar === 'NOMINAL_BEBAS';
  const beNominal = event.myParticipation?.nominalBayar
    ? Number(event.myParticipation.nominalBayar)
    : null;
  const localNominal = participation?.nominalBayar ?? null;
  const nominal = isBebas
    ? beNominal ?? localNominal ?? Number(event.nominal)
    : Number(event.nominal);
  const isUploaded = !!uploadedUrl;

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
            <Text className="text-white text-xs font-bold">{isUploaded ? '2' : '1'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-amber-900">
              {isUploaded ? t('event.status_menunggu') : t('event.status_daftar')}
              {' → '}
              {isUploaded ? t('event.status_bayar') : t('event.status_menunggu')}
            </Text>
            <Text className="text-xs text-amber-700 mt-0.5">
              {isUploaded ? t('event.waiting_admin_verification') : t('event.transfer_then_upload')}
            </Text>
          </View>
        </View>

        {/* Bank info — tetap tampil meskipun sudah uploaded, untuk reference */}
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
                  <Text className="text-xs text-neutral-500">{t('common.account_name')}</Text>
                  <Text className="font-semibold text-neutral-900">{event.bankAtasNama}</Text>
                </View>
              </View>

              <View className="mt-3 pt-3 border-t border-neutral-100">
                <Text className="text-xs text-neutral-500">{t('common.account_number')}</Text>
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

        {/* Upload bukti section */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('event.proof_section')}
        </Text>

        {isUploaded ? (
          // Sudah ter-submit ke BE — preview server-side image
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
                <Check size={20} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-emerald-900 text-sm">
                  {t('event.uploaded_waiting')}
                </Text>
                <Text className="text-xs text-emerald-700 mt-0.5">
                  {t('event.waiting_admin_verification')}
                </Text>
              </View>
            </View>
            {uploadedUrl ? (
              <Image
                source={{ uri: uploadedUrl }}
                style={{ width: '100%', height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : null}
          </View>
        ) : pickedImage ? (
          // Image picked, belum submit — preview + actions
          <View className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <Image
              source={{ uri: pickedImage.uri }}
              style={{ width: '100%', height: 280 }}
              resizeMode="cover"
            />
            <View className="p-3 flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('event.replace_photo')}
                  variant="secondary"
                  onPress={pickImage}
                  loading={false}
                  leftIcon={<RefreshCw size={14} color="#404040" />}
                  size="md"
                  fullWidth
                  disabled={uploadMutation.isPending}
                />
              </View>
            </View>
          </View>
        ) : (
          // Belum pick image — show 2 options: gallery + camera
          <View className="bg-white rounded-2xl border border-neutral-100 p-4 gap-2">
            <Pressable
              onPress={pickImage}
              className="p-4 border-2 border-dashed border-brand-300 rounded-xl items-center gap-2"
            >
              <View className="w-12 h-12 rounded-xl bg-brand-100 items-center justify-center">
                <Camera size={20} color="#EA580C" />
              </View>
              <Text className="font-semibold text-sm text-neutral-900">
                {t('event.pick_from_gallery')}
              </Text>
              <Text className="text-xs text-neutral-500">{t('event.upload_proof_subtitle')}</Text>
            </Pressable>
            <Pressable
              onPress={takePhoto}
              className="p-3 border border-neutral-200 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Camera size={16} color="#525252" />
              <Text className="text-sm font-medium text-neutral-700">
                {t('event.take_photo')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom action — submit button atau back home */}
      <View className="bg-white border-t border-neutral-100 px-5 py-3">
        <SafeAreaView edges={['bottom']}>
          {isUploaded ? (
            <Button
              label={t('event.back_to_home')}
              onPress={handleDone}
              leftIcon={<Home size={16} color="#fff" />}
              fullWidth
              size="lg"
            />
          ) : pickedImage ? (
            <Button
              label={t('event.submit_payment')}
              onPress={() => uploadMutation.mutate()}
              loading={uploadMutation.isPending}
              leftIcon={<Send size={16} color="#fff" />}
              fullWidth
              size="lg"
            />
          ) : (
            // Belum pick image — disabled submit button sebagai cue
            <Button
              label={t('event.submit_payment')}
              onPress={() => {}}
              disabled
              leftIcon={<Send size={16} color="#fff" />}
              fullWidth
              size="lg"
            />
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}
