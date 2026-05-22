/**
 * Visit scan screen — scan QR jemaat lain → input judul + lokasi → create visit.
 * Per BE handoff doc 2026-05-22.
 *
 * Flow:
 * 1. Request camera permission
 * 2. CameraView dengan QR scanner overlay
 * 3. Scan → modal input judul + lokasi → submit → redirect ke detail
 *
 * Error handling:
 * - 404 kode → reset scanner
 * - 400 (self-scan) → toast + reset
 * - 400 (target nonaktif) → toast + reset
 */
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, Handshake, MapPin, QrCode } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCreateVisit } from '@/hooks/useVisit';
import { useNotificationsStore } from '@/stores/notifications.store';
import { ApiError } from '@/types/api';

export default function VisitScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedKode, setScannedKode] = useState<string | null>(null);
  const [judul, setJudul] = useState('');
  const [lokasi, setLokasi] = useState('');

  const createMutation = useCreateVisit();
  const addNotification = useNotificationsStore((s) => s.add);

  function handleScan({ data }: { data: string }) {
    if (scannedKode || createMutation.isPending) return;
    const kode = data.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(kode)) {
      Alert.alert(t('visit.scan_invalid_qr'));
      return;
    }
    setScannedKode(kode);
  }

  function resetScanner() {
    setScannedKode(null);
    setJudul('');
    setLokasi('');
  }

  function handleSubmit() {
    if (!scannedKode || !judul.trim()) return;
    createMutation.mutate(
      {
        targetKode: scannedKode,
        judul: judul.trim(),
        lokasi: lokasi.trim() || undefined,
      },
      {
        onSuccess: (visit) => {
          showToast(
            t('visit.created_success', { name: visit.lawan.namaLengkap }),
            'success',
          );
          addNotification({
            category: 'system',
            title: t('notif.visit_created_title'),
            body: t('notif.visit_created_body', {
              name: visit.lawan.namaLengkap,
              judul: visit.judul,
            }),
            deepLink: `/visit/${visit.id}`,
          });
          router.replace(`/visit/${visit.id}` as never);
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'NOT_FOUND') {
              Alert.alert(t('visit.kode_not_found'));
            } else if (err.code === 'BAD_REQUEST') {
              // Could be self-scan or target nonaktif. Use BE message.
              Alert.alert(err.message || t('visit.scan_error_generic'));
            } else {
              Alert.alert(err.message);
            }
          } else {
            Alert.alert(t('error.network'));
          }
          resetScanner();
        },
      },
    );
  }

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
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
              {t('visit.scan_title')}
            </Text>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-2xl bg-amber-50 items-center justify-center mb-4">
            <QrCode size={32} color="#D97706" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {t('visit.camera_permission_title')}
          </Text>
          <Text className="text-sm text-neutral-500 text-center mt-1 mb-4">
            {t('visit.camera_permission_msg')}
          </Text>
          <Button
            label={t('visit.allow_camera')}
            onPress={requestPermission}
            fullWidth
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scannedKode ? undefined : handleScan}
      >
        <SafeAreaView edges={['top']} className="bg-black/50">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white text-center mr-10">
              {t('visit.scan_title')}
            </Text>
          </View>
        </SafeAreaView>

        {/* Overlay viewfinder */}
        <View className="flex-1 items-center justify-center">
          <View className="w-64 h-64 border-2 border-white rounded-2xl" />
          <Text className="text-white text-sm mt-4 text-center px-8">
            {t('visit.scan_hint')}
          </Text>
        </View>
      </CameraView>

      {/* Modal input judul + lokasi setelah scan */}
      <Modal
        visible={!!scannedKode}
        transparent
        animationType="fade"
        onRequestClose={resetScanner}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <Pressable
            onPress={resetScanner}
            className="flex-1 bg-black/50 items-center justify-end"
          >
            <Pressable
              onPress={() => {}}
              className="bg-white w-full rounded-t-3xl p-5 pb-8"
            >
              <View className="w-12 h-12 rounded-2xl bg-brand-50 items-center justify-center mb-3 self-start">
                <Handshake size={24} color="#EA580C" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 mb-1">
                {t('visit.create_modal_title')}
              </Text>
              <Text className="text-xs text-neutral-500 mb-4">
                {t('visit.create_modal_sub', { kode: scannedKode ?? '' })}
              </Text>

              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('visit.judul_label')} *
              </Text>
              <TextInput
                value={judul}
                onChangeText={setJudul}
                placeholder={t('visit.judul_placeholder')}
                autoFocus
                maxLength={255}
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-3"
              />

              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('visit.lokasi_label')}
              </Text>
              <View className="bg-neutral-50 rounded-xl border border-neutral-200 flex-row items-center px-3 mb-4">
                <MapPin size={16} color="#737373" />
                <TextInput
                  value={lokasi}
                  onChangeText={setLokasi}
                  placeholder={t('visit.lokasi_placeholder')}
                  maxLength={500}
                  className="flex-1 py-3 px-2 text-base text-neutral-900"
                />
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label={t('common.cancel')}
                    variant="secondary"
                    onPress={resetScanner}
                    fullWidth
                    disabled={createMutation.isPending}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={t('visit.submit_btn')}
                    onPress={handleSubmit}
                    fullWidth
                    loading={createMutation.isPending}
                    disabled={!judul.trim()}
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
