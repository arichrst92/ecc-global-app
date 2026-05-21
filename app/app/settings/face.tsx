import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, ScanFace, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react-native';

import {
  deleteFaceProfile,
  enrollFace,
  getFaceProfile,
  updateFaceProfile,
} from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';
import { FaceCapture } from '@/components/face/FaceCapture';
import { isFaceDescriptorReady } from '@/services/faceDescriptor';
import {
  FACE_CONSENT_VERSION,
  FACE_MODEL_VERSION,
  type FaceEnrollPayload,
} from '@/types/auth';
import { ApiError } from '@/types/api';

/**
 * Settings → Login Wajah.
 *
 * - Cek status enrollment via GET /auth/me/face-profile
 * - Kalau belum: tombol "Aktifkan Login Wajah" → consent → capture → enroll
 * - Kalau sudah: status info + tombol "Update Wajah" (PUT) + "Hapus Data" (DELETE)
 */
export default function FaceSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();
  const setFaceEnrolledHint = useAuthStore((s) => s.setFaceEnrolledHint);

  const [captureOpen, setCaptureOpen] = useState<false | 'enroll' | 'update'>(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  // Poll face engine readiness — kalau false (di Expo Go) tampilkan banner
  useEffect(() => {
    setEngineReady(isFaceDescriptorReady());
    const id = setInterval(() => setEngineReady(isFaceDescriptorReady()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusQuery = useQuery({
    queryKey: ['face-profile-status'],
    queryFn: getFaceProfile,
  });

  const enrollMutation = useMutation({
    mutationFn: (payload: FaceEnrollPayload) =>
      captureOpen === 'update' ? updateFaceProfile(payload) : enrollFace(payload),
    onSuccess: async () => {
      showToast(t('face.enroll_success'), 'success');
      await setFaceEnrolledHint(true);
      await qc.invalidateQueries({ queryKey: ['face-profile-status'] });
      setCaptureOpen(false);
      setConsentChecked(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        showToast(t(`face.error_${err.code.toLowerCase()}`, { defaultValue: err.message }), 'error');
      } else {
        showToast(t('error.network'), 'error');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaceProfile,
    onSuccess: async () => {
      showToast(t('face.delete_success'), 'success');
      await setFaceEnrolledHint(false);
      await qc.invalidateQueries({ queryKey: ['face-profile-status'] });
      setConfirmDeleteOpen(false);
    },
    onError: () => showToast(t('error.network'), 'error'),
  });

  async function handleDescriptor(descriptor: number[]) {
    const payload: FaceEnrollPayload = {
      descriptor,
      modelVersion: FACE_MODEL_VERSION,
      metadata: {
        consentVersion: FACE_CONSENT_VERSION,
        platform: (Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web'),
      },
    };
    enrollMutation.mutate(payload);
  }

  const status = statusQuery.data;
  const enrolled = !!status?.enrolled;

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
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {t('face.settings_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Engine not-ready warning (Expo Go atau model belum di-bundle) */}
        {!engineReady ? (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-start gap-3 mb-4">
            <AlertTriangle size={18} color="#D97706" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-amber-800 mb-1">
                {t('face.engine_not_ready_title')}
              </Text>
              <Text className="text-xs text-amber-700 leading-relaxed">
                {t('face.engine_not_ready_body')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Hero card */}
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center mb-4">
          <View
            className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${
              enrolled ? 'bg-brand-50' : 'bg-neutral-100'
            }`}
          >
            <ScanFace size={32} color={enrolled ? '#EA580C' : '#737373'} />
          </View>
          <Text className="text-lg font-bold text-neutral-900 mb-1">
            {t('face.settings_hero_title')}
          </Text>
          <Text className="text-sm text-neutral-500 text-center leading-relaxed">
            {enrolled
              ? t('face.settings_hero_enrolled', {
                  date: status?.enrolledAt
                    ? new Date(status.enrolledAt).toLocaleDateString('id-ID')
                    : '',
                })
              : t('face.settings_hero_not_enrolled')}
          </Text>
        </View>

        {/* Privacy note */}
        <View className="bg-emerald-50 rounded-2xl p-4 flex-row items-start gap-3 mb-4">
          <ShieldCheck size={18} color="#059669" />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-emerald-800 mb-1">
              {t('face.privacy_title')}
            </Text>
            <Text className="text-xs text-emerald-700 leading-relaxed">
              {t('face.privacy_body')}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {!enrolled ? (
          <View>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('face.consent_section')}
            </Text>
            <Pressable
              onPress={() => setConsentChecked((v) => !v)}
              className="bg-white rounded-2xl p-4 flex-row gap-3 border border-neutral-100 mb-3"
            >
              <View
                className={`w-5 h-5 rounded border-2 items-center justify-center ${
                  consentChecked ? 'bg-brand-500 border-brand-500' : 'border-neutral-300'
                }`}
              >
                {consentChecked ? <Text className="text-white text-xs">✓</Text> : null}
              </View>
              <Text className="text-xs text-neutral-700 flex-1 leading-relaxed">
                {t('face.consent_body')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCaptureOpen('enroll')}
              disabled={!consentChecked || !engineReady}
              className={`py-4 rounded-2xl items-center ${
                consentChecked && engineReady ? 'bg-brand-500' : 'bg-neutral-300'
              }`}
            >
              <Text className="text-base font-bold text-white">
                {t('face.enroll_cta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2">
            <Pressable
              onPress={() => setCaptureOpen('update')}
              className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center"
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">
                  {t('face.update_cta')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('face.update_sub')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setConfirmDeleteOpen(true)}
              className="bg-white rounded-2xl p-4 border border-red-100 flex-row items-center"
            >
              <Trash2 size={18} color="#DC2626" />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-red-600">
                  {t('face.delete_cta')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('face.delete_sub')}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <View className="mt-6 bg-amber-50 rounded-2xl p-4 flex-row items-start gap-3">
          <ShieldOff size={18} color="#D97706" />
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            {t('face.fallback_note')}
          </Text>
        </View>
      </ScrollView>

      {/* Capture modal */}
      <Modal visible={!!captureOpen} animationType="slide" onRequestClose={() => setCaptureOpen(false)}>
        {captureOpen ? (
          <FaceCapture
            onSuccess={handleDescriptor}
            onCancel={() => setCaptureOpen(false)}
          />
        ) : null}
      </Modal>

      {/* Confirm delete modal */}
      <Modal
        visible={confirmDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteOpen(false)}
      >
        <Pressable
          onPress={() => setConfirmDeleteOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <Text className="text-lg font-bold text-neutral-900 mb-2">
              {t('face.delete_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('face.delete_confirm_body')}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setConfirmDeleteOpen(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-100 items-center"
              >
                <Text className="font-semibold text-neutral-700">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-red-600 items-center"
              >
                <Text className="font-semibold text-white">
                  {deleteMutation.isPending ? t('common.loading') : t('face.delete_cta')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
