import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LogOut, AlertTriangle, ChevronRight, BookOpen, Bell, QrCode, Printer, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/useLogout';
import { formatPhoneDisplay } from '@/utils/phone';

export default function ProfileTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const logoutMutation = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);

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

        {/* Quick access tiles */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('profile.quick_access')}
        </Text>
        <View className="flex-row gap-2 mb-4">
          <QuickTile
            icon={<Users size={20} color="#059669" />}
            bg="bg-emerald-50"
            label={t('profile.family')}
            onPress={() => router.push('/family')}
          />
          <QuickTile
            icon={<BookOpen size={20} color="#D97706" />}
            bg="bg-amber-50"
            label={t('profile.bible')}
          />
          <QuickTile
            icon={<Bell size={20} color="#EA580C" />}
            bg="bg-brand-50"
            label={t('profile.notifications')}
          />
          <QuickTile
            icon={<Printer size={20} color="#1d4ed8" />}
            bg="bg-blue-50"
            label={t('profile.printer')}
          />
        </View>

        {/* Settings menu */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('profile.settings_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <MenuRow label={t('profile.edit_profile')} />
          <MenuRow label={t('profile.family')} onPress={() => router.push('/family')} />
          <MenuRow label={t('profile.change_branch')} />
          <MenuRow label={t('profile.language')} sub="Bahasa Indonesia" />
          <MenuRow label={t('profile.about')} sub="v0.1.0" isLast />
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

function QuickTile({
  icon,
  bg,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-white rounded-2xl p-3 items-center gap-1.5 border border-neutral-100"
    >
      <View className={`w-10 h-10 rounded-xl ${bg} items-center justify-center`}>{icon}</View>
      <Text className="text-[11px] font-semibold text-neutral-700 text-center" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
