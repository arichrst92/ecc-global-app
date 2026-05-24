/**
 * Check App Update screen — manual trigger version check.
 * Per docs/backend-request-version-check.md.
 *
 * MVP placeholder: BE endpoint /admin/app-version belum ada. Untuk sementara
 * tampil informasi versi yang ter-install + tombol cek manual yang akan
 * call BE endpoint kalau sudah ready. Kalau BE 404, tampil notice "Fitur
 * cek update belum aktif di backend".
 *
 * Saat BE ready, hapus fallback notice + wire ke real endpoint.
 */
import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { ArrowLeft, AlertTriangle, CheckCircle2, Download, ExternalLink, RefreshCw } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { checkAppVersion } from '@/api/appVersion';
import { ApiError } from '@/types/api';

type CheckResult =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date'; current: string }
  | {
      status: 'available';
      current: string;
      latest: string;
      releaseNotes?: string;
      downloadUrl?: string;
      force: boolean;
    }
  | { status: 'not-implemented' }
  | { status: 'error'; message: string };

export default function CheckUpdateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [result, setResult] = useState<CheckResult>({ status: 'idle' });

  const currentVersion =
    (Constants.expoConfig?.version as string | undefined) ?? '0.0.0';

  async function handleCheck() {
    setResult({ status: 'checking' });
    try {
      // Per BE patch 22b — GET /public/app-version
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const info = await checkAppVersion({ platform, currentVersion });

      if (!info.latestVersion) {
        // Admin belum publish row di platform ini — no update available
        setResult({ status: 'up-to-date', current: currentVersion });
        return;
      }

      if (info.updateAvailable) {
        setResult({
          status: 'available',
          current: currentVersion,
          latest: info.latestVersion,
          releaseNotes: info.releaseNotes ?? undefined,
          downloadUrl: info.downloadUrl ?? undefined,
          force: info.forceUpdate,
        });
      } else {
        setResult({ status: 'up-to-date', current: currentVersion });
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('check_update.error_generic');
      setResult({ status: 'error', message: msg });
    }
  }

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
            {t('check_update.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Current version card */}
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center mb-4">
          <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-3">
            <Download size={32} color="#EA580C" />
          </View>
          <Text className="text-xs text-neutral-500 mb-1">
            {t('check_update.current_label')}
          </Text>
          <Text className="text-2xl font-bold text-neutral-900">v{currentVersion}</Text>
          <Text className="text-xs text-neutral-400 mt-1">
            Els App
          </Text>
        </View>

        {/* Result area */}
        {result.status === 'idle' ? (
          <Text className="text-xs text-neutral-500 text-center mb-4">
            {t('check_update.idle_hint')}
          </Text>
        ) : result.status === 'checking' ? (
          <View className="items-center py-4">
            <ActivityIndicator color="#F97316" />
            <Text className="text-xs text-neutral-500 mt-2">
              {t('check_update.checking')}
            </Text>
          </View>
        ) : result.status === 'up-to-date' ? (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex-row items-start gap-3">
            <CheckCircle2 size={20} color="#059669" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-emerald-700 mb-1">
                {t('check_update.up_to_date_title')}
              </Text>
              <Text className="text-xs text-emerald-700/80 leading-relaxed">
                {t('check_update.up_to_date_msg')}
              </Text>
            </View>
          </View>
        ) : result.status === 'available' ? (
          <View
            className={`rounded-2xl p-4 mb-4 border ${
              result.force
                ? 'bg-red-50 border-red-200'
                : 'bg-brand-50 border-brand-200'
            }`}
          >
            <View className="flex-row items-center gap-2 mb-2">
              {result.force ? (
                <AlertTriangle size={18} color="#DC2626" />
              ) : (
                <Download size={18} color="#EA580C" />
              )}
              <Text
                className={`text-sm font-bold flex-1 ${
                  result.force ? 'text-red-700' : 'text-brand-700'
                }`}
              >
                {result.force
                  ? t('check_update.force_title', { version: result.latest })
                  : t('check_update.available_title', { version: result.latest })}
              </Text>
            </View>
            {result.force ? (
              <Text className="text-xs text-red-700/80 leading-relaxed mb-2">
                {t('check_update.force_msg')}
              </Text>
            ) : null}
            {result.releaseNotes ? (
              <Text className="text-xs text-neutral-700 leading-relaxed mb-3">
                {result.releaseNotes}
              </Text>
            ) : null}
            <Pressable
              onPress={() =>
                result.downloadUrl ? Linking.openURL(result.downloadUrl) : undefined
              }
              disabled={!result.downloadUrl}
              className={`rounded-full py-2.5 flex-row items-center justify-center gap-2 ${
                result.force ? 'bg-red-500' : 'bg-brand-500'
              } ${!result.downloadUrl ? 'opacity-50' : ''}`}
            >
              <ExternalLink size={14} color="#fff" />
              <Text className="text-sm font-bold text-white">
                {t('check_update.update_btn')}
              </Text>
            </Pressable>
          </View>
        ) : result.status === 'not-implemented' ? null : (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-sm font-bold text-red-700 mb-1">
              {t('check_update.error_title')}
            </Text>
            <Text className="text-xs text-red-700/80 leading-relaxed">
              {result.message}
            </Text>
          </View>
        )}

        <Button
          label={t('check_update.check_btn')}
          onPress={handleCheck}
          loading={result.status === 'checking'}
          leftIcon={<RefreshCw size={16} color="#fff" />}
          fullWidth
          size="lg"
        />

        <Text className="text-[10px] text-neutral-400 text-center mt-4 leading-relaxed">
          {t('check_update.auto_check_hint')}
        </Text>
      </ScrollView>
    </View>
  );
}
