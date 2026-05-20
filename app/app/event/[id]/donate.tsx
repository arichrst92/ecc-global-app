import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  HandHeart,
  RefreshCw,
  Send,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useEventDetail } from '@/hooks/useEvents';
import { createDonation, uploadDonationBukti } from '@/api/event';
import { env } from '@/config/env';
import { ApiError } from '@/types/api';

type PickedImage = { uri: string; name: string; type: string };

/**
 * Donation form screen — untuk NOMINAL_BEBAS:
 * - Input nominal (kalau belum di-set)
 * - Show bank info untuk transfer
 * - Upload bukti transfer → POST /donations + POST /donations/:id/bukti
 *
 * Untuk donasi pertama OR donasi tambahan (multi-donation).
 */
export default function EventDonateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);

  const eventQuery = useEventDetail(id);
  const event = eventQuery.data;

  const [nominalInput, setNominalInput] = useState('');
  const [nominalError, setNominalError] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [createdDonationId, setCreatedDonationId] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  function parseNominal(s: string): number | null {
    const digits = s.replace(/\D/g, '');
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  // Step 1: Create donation row di BE
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('Missing event');
      const nominal = parseNominal(nominalInput);
      if (nominal === null || nominal < 1000) {
        throw new Error('NOMINAL_INVALID');
      }
      return createDonation(event.id, { nominalBayar: nominal });
    },
    onSuccess: (donation) => {
      setCreatedDonationId(donation.id);
      // Invalidate donations list supaya event detail update
      queryClient.invalidateQueries({ queryKey: ['event', 'my-donations', id] });
      queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'NOMINAL_INVALID') {
        setNominalError(t('event.nominal_bebas_min'));
        return;
      }
      const msg = err instanceof ApiError ? err.message : t('error.network');
      Alert.alert(t('error.generic'), msg);
    },
  });

  // Step 2: Upload bukti ke donation yang baru di-create
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!event || !createdDonationId || !pickedImage) throw new Error('Missing');
      return uploadDonationBukti(event.id, createdDonationId, pickedImage);
    },
    onSuccess: async (donation) => {
      const url = donation.buktiTransferUrl
        ? `${env.apiBaseUrl}${donation.buktiTransferUrl}`
        : null;
      setUploadedUrl(url);
      await queryClient.invalidateQueries({ queryKey: ['event', 'my-donations', id] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
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
    setPickedImage({
      uri: asset.uri,
      name: asset.fileName ?? `bukti-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
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
    });
  }

  async function copyAccountNumber(nomor: string) {
    await Clipboard.setStringAsync(nomor);
    showToast(t('common.copied'), 'success');
  }

  function handleSubmitNominal() {
    setNominalError(null);
    const parsed = parseNominal(nominalInput);
    if (parsed === null) {
      setNominalError(t('event.nominal_bebas_required'));
      return;
    }
    if (parsed < 1000) {
      setNominalError(t('event.nominal_bebas_min'));
      return;
    }
    createMutation.mutate();
  }

  if (!event) return null;

  const parsedNominal = parseNominal(nominalInput);
  const previewAmount =
    parsedNominal !== null ? `Rp ${parsedNominal.toLocaleString('id-ID')}` : '';
  const isStepNominal = !createdDonationId;
  const isStepBukti = !!createdDonationId && !uploadedUrl;
  const isStepDone = !!uploadedUrl;

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
            {t('event.donate_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Event title */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-xl bg-blue-100 items-center justify-center">
            <HandHeart size={22} color="#1d4ed8" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('event.donate_for')}</Text>
            <Text className="font-bold text-neutral-900" numberOfLines={2}>
              {event.judul}
            </Text>
          </View>
        </View>

        {/* Step 1: Input nominal */}
        {isStepNominal ? (
          <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
            <Text className="text-sm font-semibold text-blue-900 mb-1">
              {t('event.nominal_bebas_label')}
            </Text>
            <Text className="text-xs text-blue-700 mb-3 leading-relaxed">
              {t('event.nominal_bebas_hint')}
            </Text>
            <View
              className={`flex-row items-center bg-white border rounded-xl ${
                nominalError ? 'border-red-400' : 'border-neutral-200'
              }`}
              style={{ height: 52 }}
            >
              <Text className="text-base font-semibold text-neutral-500 pl-3 pr-1">Rp</Text>
              <TextInput
                placeholder="0"
                value={nominalInput}
                onChangeText={(v) => {
                  setNominalInput(v);
                  setNominalError(null);
                }}
                keyboardType="numeric"
                editable={!createMutation.isPending}
                placeholderTextColor="#A3A3A3"
                className="flex-1 px-2 text-base font-semibold text-neutral-900"
                style={{
                  height: '100%',
                  textAlignVertical: 'center',
                  ...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {}),
                  ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
                }}
              />
            </View>
            {nominalError ? (
              <Text className="text-xs text-red-600 mt-1.5">{nominalError}</Text>
            ) : previewAmount ? (
              <Text className="text-xs text-blue-700 mt-1.5">
                {t('event.nominal_bebas_preview')}: {previewAmount}
              </Text>
            ) : null}
            <View className="flex-row gap-2 mt-3 flex-wrap">
              {[20000, 50000, 100000, 200000, 500000].map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => {
                    setNominalInput(String(preset));
                    setNominalError(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-blue-200 rounded-full"
                >
                  <Text className="text-xs font-semibold text-blue-700">
                    {preset / 1000}rb
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bank info — selalu tampil setelah confirm nominal */}
        {!isStepNominal && event.bankNama && event.bankNomor ? (
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
                <Text className="text-sm text-neutral-500">{t('event.donate_amount')}</Text>
                <Text className="text-xl font-bold text-blue-600">{previewAmount}</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* QRIS */}
        {!isStepNominal && event.qrisImageUrl ? (
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
            </View>
          </>
        ) : null}

        {/* Upload bukti */}
        {isStepBukti || isStepDone ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('event.proof_section')}
            </Text>
            {isStepDone ? (
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
              <View className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                <Image
                  source={{ uri: pickedImage.uri }}
                  style={{ width: '100%', height: 280 }}
                  resizeMode="cover"
                />
                <View className="p-3">
                  <Button
                    label={t('event.replace_photo')}
                    variant="secondary"
                    onPress={pickImage}
                    leftIcon={<RefreshCw size={14} color="#404040" />}
                    fullWidth
                    disabled={uploadMutation.isPending}
                  />
                </View>
              </View>
            ) : (
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
          </>
        ) : null}
      </ScrollView>

      {/* Bottom action */}
      <View className="bg-white border-t border-neutral-100 px-5 py-3">
        <SafeAreaView edges={['bottom']}>
          {isStepNominal ? (
            <Button
              label={t('event.donate_next')}
              onPress={handleSubmitNominal}
              loading={createMutation.isPending}
              disabled={parsedNominal === null || parsedNominal < 1000}
              fullWidth
              size="lg"
            />
          ) : isStepDone ? (
            <Button
              label={t('event.back_to_event')}
              onPress={() => router.replace(`/event/${id}`)}
              fullWidth
              size="lg"
            />
          ) : (
            <Button
              label={t('event.submit_payment')}
              onPress={() => uploadMutation.mutate()}
              loading={uploadMutation.isPending}
              disabled={!pickedImage}
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
