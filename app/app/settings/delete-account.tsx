/**
 * Delete Account screen — soft delete (set isActive=false di BE).
 * Per docs/backend-request-delete-account.md.
 *
 * Compliance: Apple App Store Guideline 5.1.1(v) — apps yang ada account
 * creation HARUS punya delete-account dalam app.
 *
 * Flow:
 * 1. Disclosure: apa yang dihapus vs preserved
 * 2. Optional reason textarea
 * 3. Type-to-confirm "HAPUS AKUN SAYA" exact text
 * 4. Submit → logout + clear local storage + redirect ke welcome
 */
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Trash2, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { deleteMyAccount } from '@/api/me';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';

const CONFIRM_PHRASE = 'HAPUS AKUN SAYA';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const logout = useAuthStore((s) => s.logout);

  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => deleteMyAccount({ confirmText, reason: reason.trim() || undefined }),
    onSuccess: async () => {
      showToast(t('delete_account.success'), 'success');
      // Logout + clear local storage. router.replace ke welcome.
      await logout();
      router.replace('/(auth)/welcome' as never);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      Alert.alert(t('delete_account.error_title'), msg);
    },
  });

  const isMatch = confirmText.trim() === CONFIRM_PHRASE;

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
            {t('delete_account.title')}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 100,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning hero */}
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-start gap-3">
            <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center">
              <AlertTriangle size={20} color="#DC2626" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-red-700 mb-1">
                {t('delete_account.warning_title')}
              </Text>
              <Text className="text-xs text-red-700/80 leading-relaxed">
                {t('delete_account.warning_msg')}
              </Text>
            </View>
          </View>

          {/* Disclosure: apa yang dihapus vs disimpan */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('delete_account.what_happens')}
          </Text>
          <View className="bg-white rounded-2xl border border-neutral-100 mb-4">
            <DisclosureRow
              icon={<X size={14} color="#DC2626" />}
              iconBg="bg-red-50"
              text={t('delete_account.removed_access')}
            />
            <DisclosureRow
              icon={<X size={14} color="#DC2626" />}
              iconBg="bg-red-50"
              text={t('delete_account.removed_login')}
            />
            <DisclosureRow
              icon={<X size={14} color="#DC2626" />}
              iconBg="bg-red-50"
              text={t('delete_account.removed_market')}
            />
            <View className="h-px bg-neutral-100 mx-4" />
            <DisclosureRow
              icon={<Check size={14} color="#059669" />}
              iconBg="bg-emerald-50"
              text={t('delete_account.preserved_attendance')}
            />
            <DisclosureRow
              icon={<Check size={14} color="#059669" />}
              iconBg="bg-emerald-50"
              text={t('delete_account.preserved_events')}
            />
            <DisclosureRow
              icon={<Check size={14} color="#059669" />}
              iconBg="bg-emerald-50"
              text={t('delete_account.preserved_family')}
              isLast
            />
          </View>

          {/* Reactivation hint */}
          <View className="bg-amber-50 rounded-2xl p-3 border border-amber-100 mb-4">
            <Text className="text-xs text-amber-800 leading-relaxed">
              {t('delete_account.reactivation_hint')}
            </Text>
          </View>

          {/* Reason (optional) */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('delete_account.reason_label')}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t('delete_account.reason_placeholder')}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
            className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-sm text-neutral-900 mb-4 min-h-[80px]"
          />

          {/* Confirm text input */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('delete_account.confirm_label')}
          </Text>
          <Text className="text-xs text-neutral-500 mb-2 leading-relaxed">
            {t('delete_account.confirm_helper', { phrase: CONFIRM_PHRASE })}
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_PHRASE}
            autoCapitalize="characters"
            autoCorrect={false}
            className={`bg-white rounded-xl px-4 py-3 border text-base font-mono tracking-wider text-neutral-900 ${
              isMatch ? 'border-red-500' : 'border-neutral-200'
            }`}
          />
        </ScrollView>

        {/* Submit btn — sticky */}
        <View className="px-5 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('delete_account.submit_btn')}
            variant="danger"
            onPress={() =>
              Alert.alert(
                t('delete_account.final_confirm_title'),
                t('delete_account.final_confirm_msg'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('delete_account.submit_btn'),
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(),
                  },
                ],
              )
            }
            disabled={!isMatch || deleteMutation.isPending}
            loading={deleteMutation.isPending}
            leftIcon={<Trash2 size={16} color="#fff" />}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function DisclosureRow({
  icon,
  iconBg,
  text,
  isLast,
}: {
  icon: React.ReactNode;
  iconBg: string;
  text: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-start gap-3 p-3 ${
        isLast ? '' : 'border-b border-neutral-100'
      }`}
    >
      <View
        className={`w-7 h-7 rounded-full items-center justify-center ${iconBg}`}
      >
        {icon}
      </View>
      <Text className="text-sm text-neutral-700 flex-1 leading-relaxed pt-1">
        {text}
      </Text>
    </View>
  );
}
