import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, QrCode, RefreshCw } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { RolePicker } from '@/components/family/RolePicker';
import { useToast } from '@/components/ui/Toast';
import { useLinkByKode } from '@/hooks/useFamily';
import { ApiError } from '@/types/api';
import type { FamilyRole } from '@/types/family';

export default function FamilyScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedKode, setScannedKode] = useState<string | null>(null);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const showToast = useToast((s) => s.show);
  const linkMutation = useLinkByKode();

  function handleScan({ data }: { data: string }) {
    if (scannedKode) return; // already scanned
    // Normalize: BE expects 8 char alphanumeric uppercase
    const kode = data.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(kode)) {
      Alert.alert(t('family.scan_invalid_qr'));
      return;
    }
    setScannedKode(kode);
  }

  function handleSubmit() {
    if (!scannedKode || !role) return;
    linkMutation.mutate(
      { kode: scannedKode, role },
      {
        onSuccess: (data) => {
          showToast(
            t('family.link_success', { name: data.target?.namaLengkap ?? '' }),
            'success',
          );
          router.replace('/family');
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'NOT_FOUND') {
              Alert.alert(t('family.kode_not_found'));
              setScannedKode(null);
            } else if (err.code === 'BAD_REQUEST') {
              Alert.alert(t('family.cant_link_self'));
              setScannedKode(null);
            } else if (err.code === 'CONFLICT') {
              Alert.alert(t('family.already_linked'));
              setScannedKode(null);
            } else {
              Alert.alert(err.message);
            }
          } else {
            Alert.alert(t('error.network'));
          }
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
              {t('family.scan_title')}
            </Text>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-2xl bg-amber-50 items-center justify-center mb-4">
            <QrCode size={32} color="#D97706" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {t('family.camera_permission_title')}
          </Text>
          <Text className="text-sm text-neutral-500 text-center mt-1 mb-4">
            {t('family.camera_permission_msg')}
          </Text>
          <Button
            label={t('family.allow_camera')}
            onPress={requestPermission}
            fullWidth={false}
            size="md"
          />
        </View>
      </View>
    );
  }

  // Permission granted — show camera or review screen
  if (scannedKode) {
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
              {t('family.scan_review_title')}
            </Text>
          </View>
        </SafeAreaView>

        <View className="flex-1 px-5 pt-5">
          <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
            <Text className="text-xs text-neutral-500 mb-1">{t('family.kode_label')}</Text>
            <Text className="text-2xl font-mono font-bold text-neutral-900 tracking-widest">
              {scannedKode}
            </Text>
          </View>

          <RolePicker value={role} onChange={setRole} disabled={linkMutation.isPending} />

          <Pressable
            onPress={() => setScannedKode(null)}
            className="mt-4 p-3 border border-neutral-200 rounded-xl flex-row items-center justify-center gap-2"
          >
            <RefreshCw size={14} color="#525252" />
            <Text className="text-sm font-medium text-neutral-700">
              {t('family.scan_again')}
            </Text>
          </Pressable>
        </View>

        <View className="bg-white border-t border-neutral-100 px-5 py-3">
          <SafeAreaView edges={['bottom']}>
            <Button
              label={t('family.link_member')}
              onPress={handleSubmit}
              loading={linkMutation.isPending}
              disabled={!role}
              fullWidth
              size="lg"
            />
          </SafeAreaView>
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
        onBarcodeScanned={handleScan}
      />
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-white text-center mr-10">
            {t('family.scan_title')}
          </Text>
        </View>
      </SafeAreaView>

      {/* Frame overlay */}
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View
          className="border-2 border-white/70 rounded-2xl"
          style={{ width: 260, height: 260 }}
        />
        <Text className="text-white text-sm mt-4 px-8 text-center">
          {t('family.scan_hint')}
        </Text>
      </View>
    </View>
  );
}
