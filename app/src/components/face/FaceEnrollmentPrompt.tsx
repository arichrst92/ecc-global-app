import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScanFace, ShieldCheck, X } from 'lucide-react-native';
import { useMutation, useQuery } from '@tanstack/react-query';

import { getFaceProfile } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { storage } from '@/utils/storage';

/**
 * One-time prompt setelah fresh login: "Aktifkan Login Wajah?"
 *
 * Cek BE status via GET /auth/me/face-profile. Kalau belum enrolled +
 * user belum pernah skip prompt → tampil modal. User Aktifkan → push ke
 * /settings/face-enroll. User Nanti → set "skipped" flag (one-time, sampai
 * user fresh login lagi).
 */

const SKIP_KEY = 'ecc.faceEnrollmentPromptSkipped';

export function FaceEnrollmentPrompt() {
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setFaceEnrolledHint = useAuthStore((s) => s.setFaceEnrolledHint);
  const [skipped, setSkipped] = useState(true); // default true, sampai cek
  const [visible, setVisible] = useState(false);

  // Cek apakah user pernah skip prompt sebelumnya
  useEffect(() => {
    if (!isAuthenticated) return;
    storage.getItem(SKIP_KEY).then((v) => setSkipped(v === '1'));
  }, [isAuthenticated]);

  const statusQuery = useQuery({
    queryKey: ['face-profile-status'],
    queryFn: getFaceProfile,
    enabled: isAuthenticated && !skipped,
    staleTime: 60_000,
    retry: false,
  });

  // Sync cached hint dengan BE status — kapan saja status returned
  useEffect(() => {
    if (statusQuery.data) {
      setFaceEnrolledHint(statusQuery.data.enrolled);
    }
  }, [statusQuery.data, setFaceEnrolledHint]);

  // Show modal kalau belum enrolled
  useEffect(() => {
    if (statusQuery.data && !statusQuery.data.enrolled && !skipped) {
      setVisible(true);
    }
  }, [statusQuery.data, skipped]);

  const skipMutation = useMutation({
    mutationFn: async () => {
      await storage.setItem(SKIP_KEY, '1');
    },
    onSuccess: () => {
      setSkipped(true);
      setVisible(false);
    },
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => skipMutation.mutate()}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <View className="flex-row justify-end">
            <Pressable
              onPress={() => skipMutation.mutate()}
              className="w-8 h-8 items-center justify-center"
            >
              <X size={18} color="#A3A3A3" />
            </Pressable>
          </View>
          <View className="items-center mt-2 mb-4">
            <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <ScanFace size={32} color="#EA580C" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 text-center mb-1">
              {t('face.enroll_prompt_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center">
              {t('face.enroll_prompt_subtitle')}
            </Text>
          </View>

          <View className="bg-emerald-50 rounded-xl p-3 mb-4 flex-row items-start gap-2">
            <ShieldCheck size={16} color="#059669" />
            <Text className="text-xs text-emerald-700 flex-1 leading-relaxed">
              {t('face.enroll_prompt_privacy')}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              setVisible(false);
              skipMutation.mutate();
              router.push('/settings/face' as never);
            }}
            className="py-3 rounded-xl items-center bg-brand-500"
          >
            <Text className="text-base font-bold text-white">
              {t('face.enroll_prompt_cta')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => skipMutation.mutate()}
            className="py-3 mt-2 items-center"
          >
            <Text className="text-sm font-semibold text-neutral-500">
              {t('face.enroll_prompt_later')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
