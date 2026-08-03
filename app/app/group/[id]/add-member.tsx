/**
 * PIC — Add member ke group via scan QR jemaat.
 *
 * Live 2026-08-03: BE endpoint `POST /admin/group/:id/members/by-kode`
 * (lookup jemaat by kode 8-char → add member). Idempotent + trigger notif WA.
 *
 * Flow:
 * 1. Buka scanner kamera (reuse ScannerCamera)
 * 2. User scan QR jemaat → kode 8-char terbaca
 * 3. POST /admin/group/:id/members/by-kode { kode }
 * 4. Response 200/201 → toast + back ke Group Detail
 *
 * Manual input fallback: tap "Input Manual" → prompt 8-char kode.
 *
 * Per BE response `backend-request-group-add-member-by-kode.md`.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';

import { ManualInputModal } from '@/components/scanner/ManualInputModal';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { useToast } from '@/components/ui/Toast';
import { useAddGroupMemberByKode } from '@/hooks/useGroup';
import { ApiError } from '@/types/api';

export default function AddGroupMemberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [manualOpen, setManualOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  const addMutation = useAddGroupMemberByKode(id);

  function submitKode(kode: string) {
    setPaused(true);
    addMutation.mutate(
      { kode },
      {
        onSuccess: (data) => {
          setManualOpen(false);
          showToast(
            data.alreadyMember
              ? t('group.add_member_already')
              : t('group.add_member_success_nama', {
                  nama: data.jemaat.namaLengkap,
                }),
            'success',
          );
          router.back();
        },
        onError: (err) => {
          setPaused(false);
          if (err instanceof ApiError) {
            if (err.code === 'NOT_FOUND') {
              Alert.alert(
                t('group.add_member_error_not_found_title'),
                t('group.add_member_error_not_found_msg'),
              );
            } else if (err.code === 'FORBIDDEN') {
              Alert.alert(
                t('common.error'),
                t('group.add_member_error_forbidden'),
              );
            } else {
              Alert.alert(t('common.error'), err.message);
            }
          } else {
            Alert.alert(t('common.error'), t('error.network'));
          }
        },
      },
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScannerCamera
        paused={paused || addMutation.isPending || manualOpen}
        onScan={submitKode}
        onManualInput={() => setManualOpen(true)}
      />

      {/* Top overlay */}
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
              {t('group.add_member_scan_title')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ManualInputModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={submitKode}
        loading={addMutation.isPending}
        title={t('group.add_member_manual_title')}
        placeholder="ABC23XYZ"
      />
    </View>
  );
}
