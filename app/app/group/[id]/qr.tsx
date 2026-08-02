/**
 * PIC — QR display screen untuk share invitation kode private group.
 *
 * Show:
 * - QR code besar (240x240) berisi kode 8-char
 * - Kode text di bawah QR
 * - Copy button (untuk copy ke clipboard)
 * - Regenerate button (rotate kode via BE)
 *
 * Format QR: plain kode 8-char (paling universal). Scanner mobile also
 * support URL scheme `ecc://group/join?code=X` — bisa dipilih toggle.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Copy, Link2, QrCode, RefreshCw } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useGroupDetail, useRegenerateGroupCode } from '@/hooks/useGroup';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';

export default function GroupQrScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const query = useGroupDetail(id);
  const group = query.data;
  const regenerate = useRegenerateGroupCode(id);

  // Toggle: plain code (default) atau deeplink URL
  const [useDeeplink, setUseDeeplink] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPIC = !!(group && user && group.picJemaatId === user.jemaatId);

  // Access guard — hanya PIC / kode owner boleh lihat
  if (query.isPending) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <QrCode size={32} color="#F97316" />
      </View>
    );
  }
  if (!group || !group.joinCode || !isPIC) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="px-4 py-2">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-bold text-neutral-900 mb-2">
            {t('group.qr_not_available_title')}
          </Text>
          <Text className="text-sm text-neutral-500 text-center">
            {t('group.qr_not_available_body')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const code = group.joinCode;
  const qrValue = useDeeplink ? `ecc://group/join?code=${code}` : code;

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    showToast(t('group.code_copied'), 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRegenerate() {
    Alert.alert(
      t('group.regen_confirm_title'),
      t('group.regen_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('group.regen_confirm_ok'),
          onPress: () => {
            regenerate.mutate(undefined, {
              onSuccess: (data) => {
                showToast(t('group.regen_success', { code: data.joinCode }), 'success');
              },
              onError: (err) => {
                Alert.alert(
                  t('common.error'),
                  err instanceof ApiError ? err.message : t('error.network'),
                );
              },
            });
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
              {group.nama}
            </Text>
            <Text className="text-xs text-neutral-500">{t('group.qr_screen_subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 32 }}
      >
        <Text className="text-sm text-neutral-600 text-center mb-6">
          {t('group.qr_instruction')}
        </Text>

        {/* QR card */}
        <View className="bg-white rounded-3xl p-6 items-center" style={{ elevation: 8 }}>
          <QRCode value={qrValue} size={240} color="#0A0A0A" backgroundColor="#FFFFFF" />
          <Text className="text-3xl font-bold tracking-widest text-neutral-900 mt-6">
            {code}
          </Text>
          <Text className="text-xs text-neutral-500 mt-1">{t('group.code_label')}</Text>
        </View>

        {/* Toggle format */}
        <View className="flex-row items-center justify-center gap-2 mt-4">
          <Pressable
            onPress={() => setUseDeeplink(false)}
            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
              !useDeeplink ? 'bg-brand-500' : 'bg-neutral-200'
            }`}
          >
            <QrCode size={12} color={!useDeeplink ? '#fff' : '#525252'} />
            <Text
              className={`text-xs font-semibold ${
                !useDeeplink ? 'text-white' : 'text-neutral-700'
              }`}
            >
              {t('group.qr_format_code')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setUseDeeplink(true)}
            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
              useDeeplink ? 'bg-brand-500' : 'bg-neutral-200'
            }`}
          >
            <Link2 size={12} color={useDeeplink ? '#fff' : '#525252'} />
            <Text
              className={`text-xs font-semibold ${
                useDeeplink ? 'text-white' : 'text-neutral-700'
              }`}
            >
              {t('group.qr_format_deeplink')}
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View className="gap-2.5 mt-6">
          <Button
            label={copied ? t('group.code_copied') : t('group.copy_code')}
            onPress={handleCopy}
            variant="secondary"
            fullWidth
            leftIcon={
              copied ? <Check size={18} color="#059669" /> : <Copy size={18} color="#171717" />
            }
          />
          <Button
            label={t('group.regen_action')}
            onPress={handleRegenerate}
            loading={regenerate.isPending}
            variant="ghost"
            fullWidth
            leftIcon={<RefreshCw size={18} color="#EA580C" />}
          />
        </View>

        {/* Hint */}
        <View className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <Text className="text-xs text-amber-800 leading-relaxed">
            💡 {t('group.qr_hint_privacy')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
