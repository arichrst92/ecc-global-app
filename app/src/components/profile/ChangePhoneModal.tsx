/**
 * Ganti nomor HP sendiri: 1) masukkan nomor baru → kode dikirim via WhatsApp
 * ke nomor BARU, 2) masukkan kode → nomor diganti. Login berikutnya pakai
 * nomor baru.
 */
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Phone, X } from 'lucide-react-native';

import { PhoneInput } from '@/components/ui/PhoneInput';
import { OtpInput } from '@/components/ui/OtpInput';
import { Button } from '@/components/ui/Button';
import { requestPhoneChangeOtp, verifyPhoneChange } from '@/api/me';
import { ApiError } from '@/types/api';
import { formatPhoneDisplay, invalidPhoneMessage, normalizePhone } from '@/utils/phone';
import { nc } from '@/theme/ThemeRoot';

export function ChangePhoneModal({
  visible,
  currentNoHp,
  onClose,
  onChanged,
}: {
  visible: boolean;
  currentNoHp: string | null;
  onClose: () => void;
  onChanged: (noHp: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [raw, setRaw] = useState('');
  const [noHp, setNoHp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);

  const reset = () => {
    setStep('phone');
    setRaw('');
    setNoHp('');
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.network'));

  const request = useMutation({
    mutationFn: async () => {
      const target = noHp || normalizePhone(raw.trim());
      if (!target) {
        throw new ApiError(
          { code: 'VALIDATION_ERROR', message: invalidPhoneMessage(raw.trim(), i18n.language === 'en' ? 'en' : 'id') },
          400,
        );
      }
      await requestPhoneChangeOtp(target);
      return target;
    },
    onSuccess: (n) => {
      setNoHp(n);
      setError(null);
      setStep('otp');
      setOtpKey((k) => k + 1);
    },
    onError: (e) => setError(msg(e)),
  });

  const verify = useMutation({
    mutationFn: (kode: string) => verifyPhoneChange(noHp, kode),
    onSuccess: (r) => {
      onChanged(r.noHp);
      reset();
    },
    onError: (e) => {
      setError(msg(e));
      setOtpKey((k) => k + 1);
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={close} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={() => {}} className="bg-card rounded-t-3xl px-5 pt-4 pb-8">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
                <Phone size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-neutral-900">{t('change_phone.title')}</Text>
                <Text className="text-xs text-neutral-500">
                  {t('change_phone.current', { noHp: currentNoHp ? formatPhoneDisplay(currentNoHp) : '—' })}
                </Text>
              </View>
              <Pressable onPress={close} hitSlop={8} className="p-1">
                <X size={20} color={nc('#737373')} />
              </Pressable>
            </View>

            {step === 'phone' ? (
              <>
                <PhoneInput
                  value={raw}
                  onChangeText={(v) => {
                    setRaw(v);
                    setNoHp('');
                    setError(null);
                  }}
                  label={t('change_phone.new_label')}
                  helper={t('change_phone.new_helper')}
                  autoFocus
                />
                {error ? <Text className="text-xs text-red-600 mt-2">{error}</Text> : null}
                <View className="mt-5">
                  <Button
                    label={t('change_phone.send_code')}
                    onPress={() => request.mutate()}
                    loading={request.isPending}
                    disabled={!raw.trim()}
                    fullWidth
                    size="lg"
                  />
                </View>
              </>
            ) : (
              <>
                <Text className="text-sm text-neutral-700 mb-4 leading-relaxed">
                  {t('change_phone.otp_hint', { noHp: formatPhoneDisplay(noHp) })}
                </Text>
                <OtpInput key={otpKey} onComplete={(c) => verify.mutate(c)} disabled={verify.isPending} />
                {verify.isPending ? <ActivityIndicator color="#F97316" style={{ marginTop: 12 }} /> : null}
                {error ? <Text className="text-xs text-red-600 mt-3 text-center">{error}</Text> : null}
                <View className="flex-row justify-between mt-5">
                  <Pressable
                    onPress={() => {
                      setStep('phone');
                      setNoHp('');
                      setError(null);
                    }}
                    hitSlop={8}
                  >
                    <Text className="text-sm text-neutral-600">{t('change_phone.change_number')}</Text>
                  </Pressable>
                  <Pressable onPress={() => request.mutate()} disabled={request.isPending} hitSlop={8}>
                    <Text className="text-sm font-semibold text-brand-600">
                      {request.isPending ? t('common.loading') : t('change_phone.resend')}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
