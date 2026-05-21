import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LogOut, AlertTriangle, ChevronRight, QrCode, ScanLine } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { usePreferencesStore } from '@/stores/preferences.store';
import { useLogout } from '@/hooks/useLogout';
import { useScannerEvents, useScannerIbadah } from '@/hooks/useScanner';
import { formatPhoneDisplay } from '@/utils/phone';

export default function ProfileTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const logoutMutation = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const language = usePreferencesStore((s) => s.language);
  const languageLabel = language === 'id' ? 'Bahasa Indonesia' : 'English';
  const faceEnrolledHint = useAuthStore((s) => s.faceEnrolledHint);

  // Scanner mode visible kalau user authorized untuk minimal 1 event ATAU ibadah
  const scannerEventsQuery = useScannerEvents();
  const scannerIbadahQuery = useScannerIbadah();
  const isScannerAuthorized =
    (scannerEventsQuery.data?.length ?? 0) > 0 ||
    (scannerIbadahQuery.data?.length ?? 0) > 0;

  function confirmLogout() {
    setConfirmOpen(false);
    logoutMutation.mutate();
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />
      {/* Header */}
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-8">
            <Text className="text-white text-lg font-bold mb-4">{t('profile.title')}</Text>
            <View className="flex-row items-center gap-4">
              <Avatar
                name={user.namaLengkap}
                fotoUrl={user.fotoUrl}
                size={72}
                className="bg-white/20"
              />
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">{user.namaLengkap}</Text>
                <Text className="text-white/80 text-sm">{formatPhoneDisplay(user.noHp)}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Member code card — no negative margin, sits below header dengan jarak normal */}
        <Pressable className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100 mb-4">
          <View className="w-14 h-14 rounded-xl bg-brand-500 items-center justify-center">
            <QrCode size={26} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('home.member_code')}</Text>
            <Text className="text-lg font-bold tracking-widest text-neutral-900">{user.kode}</Text>
          </View>
          <ChevronRight size={20} color="#A3A3A3" />
        </Pressable>

        {/* Quick Access dipindah ke Dashboard. Scanner Mode tetap di sini
            karena merupakan akses penting volunteer. */}

        {/* Scanner Mode — only show kalau user authorized */}
        {isScannerAuthorized ? (
          <Pressable
            onPress={() => router.push('/scanner')}
            className="bg-brand-500 rounded-2xl p-4 flex-row items-center gap-3 mb-4"
          >
            <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
              <ScanLine size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white">{t('profile.scanner_mode')}</Text>
              <Text className="text-xs text-white/80 mt-0.5">
                {t('profile.scanner_mode_sub')}
              </Text>
            </View>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        ) : null}

        {/* Settings menu */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('profile.settings_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <MenuRow label={t('profile.edit_profile')} />
          <MenuRow
            label={t('profile.change_branch')}
            onPress={() => router.push('/settings/change-branch')}
          />
          <MenuRow
            label={t('profile.language')}
            sub={languageLabel}
            onPress={() => router.push('/settings/language')}
          />
          <MenuRow
            label={t('face.settings_label')}
            sub={faceEnrolledHint ? t('face.settings_on') : t('face.settings_off')}
            onPress={() => router.push('/settings/face' as never)}
          />
          <MenuRow
            label={t('profile.about')}
            sub="v0.1.0"
            onPress={() => router.push('/settings/about')}
            isLast
          />
        </View>

        <View className="mt-6">
          <Button
            label={t('auth.logout')}
            variant="danger"
            onPress={() => setConfirmOpen(true)}
            loading={logoutMutation.isPending}
            leftIcon={<LogOut size={16} color="#fff" />}
            fullWidth
          />
        </View>

        <Text className="text-xs text-neutral-400 text-center mt-4">
          ECC Global App v0.1.0
        </Text>
      </ScrollView>

      {/* Confirm logout modal */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable
          onPress={() => setConfirmOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('auth.logout_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('auth.logout_confirm_msg')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmOpen(false)}
                  fullWidth
                  disabled={logoutMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('auth.logout')}
                  variant="danger"
                  onPress={confirmLogout}
                  fullWidth
                  loading={logoutMutation.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({
  label,
  sub,
  isLast,
  onPress,
}: {
  label: string;
  sub?: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="p-4 flex-row items-center gap-3">
      <View className="flex-1">
        <Text className="text-sm font-medium text-neutral-900">{label}</Text>
        {sub ? <Text className="text-xs text-neutral-500 mt-0.5">{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
