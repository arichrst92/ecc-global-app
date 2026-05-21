import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fingerprint, ScanFace, ShieldCheck, X } from 'lucide-react-native';

import {
  authenticate,
  getBiometricSupport,
  type BiometricSupport,
} from '@/services/biometric';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';

/**
 * One-time prompt setelah fresh OTP login: "Aktifkan biometric?"
 *
 * Mount di tabs layout root. Tampil kalau pendingBiometricEnrollment=true
 * dan device support biometric. Dismiss → clear flag (skip).
 * Aktifkan → trigger biometric auth → kalau success, set flag.
 */
export function BiometricEnrollmentModal() {
  const { t } = useTranslation();
  const pending = useAuthStore((s) => s.pendingBiometricEnrollment);
  const clearPending = useAuthStore((s) => s.clearPendingEnrollment);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const showToast = useToast((s) => s.show);

  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pending) return;
    let mounted = true;
    (async () => {
      const s = await getBiometricSupport();
      if (!mounted) return;
      if (!s.isAvailable) {
        // Device tidak support — silently skip
        clearPending();
        return;
      }
      setSupport(s);
    })();
    return () => {
      mounted = false;
    };
  }, [pending, clearPending]);

  const visible = pending && support?.isAvailable === true;

  async function handleEnable() {
    if (!support) return;
    setSubmitting(true);
    try {
      const result = await authenticate(
        t('biometric.prompt_enroll', { method: support.label }),
      );
      if (result.success) {
        await setBiometricEnabled(true);
        showToast(t('biometric.enrolled_success', { method: support.label }), 'success');
        clearPending();
      } else if (result.reason === 'cancel' || result.reason === 'fallback') {
        // user batal, keep modal open
      } else {
        showToast(t('biometric.enroll_failed'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    clearPending();
  }

  if (!visible || !support) return null;

  const Icon = support.primaryType === 'face' ? ScanFace : Fingerprint;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleSkip}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <View className="flex-row justify-end">
            <Pressable
              onPress={handleSkip}
              className="w-8 h-8 items-center justify-center"
            >
              <X size={18} color="#A3A3A3" />
            </Pressable>
          </View>
          <View className="items-center mt-2 mb-4">
            <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <Icon size={32} color="#EA580C" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 text-center mb-1">
              {t('biometric.enroll_title', { method: support.label })}
            </Text>
            <Text className="text-sm text-neutral-500 text-center">
              {t('biometric.enroll_subtitle')}
            </Text>
          </View>

          <View className="bg-emerald-50 rounded-xl p-3 mb-4 flex-row items-start gap-2">
            <ShieldCheck size={16} color="#059669" />
            <Text className="text-xs text-emerald-700 flex-1 leading-relaxed">
              {t('biometric.enroll_security_note')}
            </Text>
          </View>

          <Pressable
            onPress={handleEnable}
            disabled={submitting}
            className={`py-3 rounded-xl items-center ${
              submitting ? 'bg-neutral-300' : 'bg-brand-500'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {submitting
                ? t('common.loading')
                : t('biometric.enroll_cta', { method: support.label })}
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip} className="py-3 mt-2 items-center">
            <Text className="text-sm font-semibold text-neutral-500">
              {t('biometric.enroll_later')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
