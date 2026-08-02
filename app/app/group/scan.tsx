/**
 * QR scan untuk join private group.
 *
 * Flow:
 * 1. User scan QR yang contain kode 8-char (mis. "A3F7K9M2")
 *    atau URL deeplink `ecc://group/join?code=A3F7K9M2` (extract code)
 * 2. Extract code → POST /admin/group/join-by-code { code }
 * 3. Success → router.replace ke /group/:groupId (dari response.groupId)
 * 4. Error 404 → "Kode tidak valid / group tidak ditemukan"
 *
 * Manual input fallback: tap tombol "Input Manual" → prompt input 8-char kode.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'lucide-react-native';

import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { ManualInputModal } from '@/components/scanner/ManualInputModal';
import { useToast } from '@/components/ui/Toast';
import { useJoinGroupByCode } from '@/hooks/useGroup';
import { ApiError } from '@/types/api';

/** Extract 8-char code dari raw QR data.
 *  Support: plain code "A3F7K9M2", deeplink URL "ecc://group/join?code=A3F7K9M2" */
function extractCode(raw: string): string | null {
  const trimmed = raw.trim();
  // Plain code
  if (/^[A-Z0-9]{8}$/i.test(trimmed)) return trimmed.toUpperCase();
  // URL with ?code= param
  const match = trimmed.match(/[?&]code=([A-Z0-9]{8})/i);
  if (match) return match[1].toUpperCase();
  return null;
}

export default function GroupScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const [manualOpen, setManualOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  const joinMutation = useJoinGroupByCode();

  function handleCode(code: string) {
    setPaused(true);
    joinMutation.mutate(code, {
      onSuccess: (data) => {
        showToast(
          data.alreadyMember
            ? t('group.already_member')
            : t('group.join_success', { nama: data.groupNama }),
          'success',
        );
        // Redirect ke group detail
        router.replace(`/group/${data.groupId}` as never);
      },
      onError: (err) => {
        setPaused(false);
        if (err instanceof ApiError) {
          if (err.code === 'NOT_FOUND') {
            Alert.alert(
              t('group.scan_invalid_title'),
              t('group.scan_invalid_msg'),
              [{ text: 'OK' }],
            );
          } else {
            Alert.alert(
              t('common.error'),
              err.message,
              [{ text: 'OK' }],
            );
          }
        } else {
          Alert.alert(t('common.error'), t('error.network'));
        }
      },
    });
  }

  function handleScan(kode: string) {
    // ScannerCamera sudah validate 8-char alphanumeric, kita re-verify + extract
    const code = extractCode(kode);
    if (!code) return;
    handleCode(code);
  }

  function handleManualSubmit(code: string) {
    setManualOpen(false);
    const normalized = extractCode(code);
    if (!normalized) {
      Alert.alert(
        t('group.scan_invalid_title'),
        t('group.scan_invalid_format'),
      );
      return;
    }
    handleCode(normalized);
  }

  return (
    <View className="flex-1 bg-black">
      <ScannerCamera
        paused={paused || joinMutation.isPending}
        onScan={handleScan}
        onManualInput={() => setManualOpen(true)}
      />

      {/* Top overlay — back button + title */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <View className="flex-row items-center gap-2 px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-black/50"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="flex-1 bg-black/50 rounded-full px-4 py-2">
            <Text className="text-white font-bold text-sm text-center">
              {t('group.scan_title')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ManualInputModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={handleManualSubmit}
        title={t('group.scan_manual_title')}
        placeholder={t('group.scan_manual_placeholder')}
      />
    </View>
  );
}
