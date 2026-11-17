/**
 * Tambah / ubah / verifikasi email sendiri: 1) masukkan email → kode 6 digit
 * dikirim ke email itu, 2) masukkan kode → email tersimpan & terverifikasi.
 * Email terverifikasi bisa dipakai untuk masuk saat WhatsApp gangguan.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Mail, X } from 'lucide-react-native';

import { TextField } from '@/components/ui/TextField';
import { OtpInput } from '@/components/ui/OtpInput';
import { Button } from '@/components/ui/Button';
import { SpamHint } from '@/components/auth/SpamHint';
import { requestEmailChangeOtp, verifyEmailChange } from '@/api/me';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ChangeEmailModal({
  visible,
  currentEmail,
  verifyOnly,
  onClose,
  onChanged,
}: {
  visible: boolean;
  currentEmail: string | null;
  /** Email sekarang belum terverifikasi → langsung kirim kode ke email itu. */
  verifyOnly?: boolean;
  onClose: () => void;
  onChanged: (email: string) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [raw, setRaw] = useState(verifyOnly && currentEmail ? currentEmail : '');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);

  const reset = () => {
    setStep('email');
    setRaw(verifyOnly && currentEmail ? currentEmail : '');
    setTarget('');
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.network'));

  const request = useMutation({
    mutationFn: async () => {
      const email = (target || raw).trim().toLowerCase();
      if (!EMAIL_RE.test(email)) {
        throw new ApiError({ code: 'VALIDATION_ERROR', message: t('signup.email_invalid') }, 400);
      }
      await requestEmailChangeOtp(email);
      return email;
    },
    onSuccess: (email) => {
      setTarget(email);
      setError(null);
      setStep('otp');
      setOtpKey((k) => k + 1);
    },
    onError: (e) => setError(msg(e)),
  });

  const verify = useMutation({
    mutationFn: (kode: string) => verifyEmailChange(target, kode),
    onSuccess: (r) => {
      onChanged(r.email);
      reset();
    },
    onError: (e) => {
      setError(msg(e));
      setOtpKey((k) => k + 1);
    },
  });

  const title = verifyOnly ? t('change_email.title_verify') : currentEmail ? t('change_email.title_change') : t('change_email.title_add');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardSafeView style={{ flex: 1 }}>
        <View className="flex-1 justify-end">
          <Pressable onPress={close} className="absolute inset-0 bg-black/50" />
          <View className="bg-card rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: '90%' }}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
                  <Mail size={18} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900">{title}</Text>
                  {currentEmail ? (
                    <Text className="text-xs text-neutral-500">{t('change_email.current', { email: currentEmail })}</Text>
                  ) : null}
                </View>
                <Pressable onPress={close} hitSlop={8} className="p-1">
                  <X size={20} color={nc('#737373')} />
                </Pressable>
              </View>

              {step === 'email' ? (
                <>
                  <TextField
                    label={t('change_email.new_label')}
                    placeholder="nama@email.com"
                    value={raw}
                    onChangeText={(v) => {
                      setRaw(v);
                      setTarget('');
                      setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    helper={!error ? t('change_email.new_helper') : undefined}
                    error={error ?? undefined}
                    editable={!verifyOnly}
                    autoFocus={!verifyOnly}
                  />
                  <View className="mt-5">
                    <Button
                      label={t('change_email.send_code')}
                      onPress={() => request.mutate()}
                      loading={request.isPending}
                      disabled={raw.trim().length < 5}
                      fullWidth
                      size="lg"
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-sm text-neutral-700 mb-3 leading-relaxed">{t('change_email.otp_hint', { email: target })}</Text>
                  <SpamHint className="mb-4" />
                  <OtpInput key={otpKey} onComplete={(c) => verify.mutate(c)} disabled={verify.isPending} />
                  {verify.isPending ? <ActivityIndicator color="#F97316" style={{ marginTop: 12 }} /> : null}
                  {error ? <Text className="text-xs text-red-600 mt-3 text-center">{error}</Text> : null}
                  <View className="flex-row justify-between mt-5">
                    {!verifyOnly ? (
                      <Pressable
                        onPress={() => {
                          setStep('email');
                          setTarget('');
                          setError(null);
                        }}
                        hitSlop={8}
                      >
                        <Text className="text-sm text-neutral-600">{t('change_email.change_address')}</Text>
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    <Pressable onPress={() => request.mutate()} disabled={request.isPending} hitSlop={8}>
                      <Text className="text-sm font-semibold text-brand-600">
                        {request.isPending ? t('common.loading') : t('change_phone.resend')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
            <SheetNavSpacer />
          </View>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}
