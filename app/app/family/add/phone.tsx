import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { RolePicker } from '@/components/family/RolePicker';
import { useToast } from '@/components/ui/Toast';
import { useLinkByPhone } from '@/hooks/useFamily';
import { normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';
import type { FamilyRole } from '@/types/family';

export default function FamilyAddPhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const showToast = useToast((s) => s.show);
  const linkMutation = useLinkByPhone();

  function handleSubmit() {
    setPhoneError(null);
    const e164 = normalizePhone(phone);
    if (!e164) {
      setPhoneError(t('auth.error_invalid_phone'));
      return;
    }
    if (!role) return;
    linkMutation.mutate(
      { noHp: e164, role },
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
              Alert.alert(t('family.phone_not_found_title'), t('family.phone_not_found_msg'));
            } else if (err.code === 'BAD_REQUEST') {
              Alert.alert(t('family.cant_link_self'));
            } else if (err.code === 'CONFLICT') {
              Alert.alert(t('family.already_linked'));
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

  const submitDisabled = !role || phone.length < 8;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-4 py-2 flex-row items-center border-b border-neutral-100">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('family.add_via_phone')}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-sm text-neutral-600 mb-4 leading-relaxed">
            {t('family.add_phone_intro')}
          </Text>

          <PhoneInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError(null);
            }}
            label={t('family.phone_label')}
            placeholder="821 1234 5678"
            error={phoneError ?? undefined}
            editable={!linkMutation.isPending}
          />

          <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
            <Info size={16} color="#92400e" />
            <Text className="text-xs text-amber-800 flex-1">{t('family.phone_notice')}</Text>
          </View>

          <View className="mt-5">
            <RolePicker value={role} onChange={setRole} disabled={linkMutation.isPending} />
          </View>
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('family.link_member')}
            onPress={handleSubmit}
            loading={linkMutation.isPending}
            disabled={submitDisabled}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
