import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bell, LogOut, Construction, AlertTriangle } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/useLogout';
import { formatPhoneDisplay } from '@/utils/phone';

export default function HomePlaceholder() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function confirmLogout() {
    setConfirmOpen(false);
    logoutMutation.mutate();
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View className="bg-brand-500 pb-8 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
            <View className="flex-row items-center gap-3">
              <Avatar
                name={user.namaLengkap}
                fotoUrl={user.fotoUrl}
                size={44}
                className="bg-white/20"
              />
              <View>
                <Text className="text-white/80 text-xs">{t('home.greeting')}</Text>
                <Text className="text-white font-semibold">{user.namaLengkap.split(' ')[0]}</Text>
              </View>
            </View>
            <View className="bg-white/15 rounded-full p-2">
              <Bell size={20} color="#fff" />
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        {/* Placeholder card */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-neutral-100">
          <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mb-3">
            <Construction size={24} color="#D97706" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 mb-1">
            {t('home.placeholder_title')}
          </Text>
          <Text className="text-sm text-neutral-500 leading-relaxed">
            {t('home.placeholder_msg')}
          </Text>
        </View>

        {/* User info card */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-100">
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
            {t('home.user_info')}
          </Text>
          <InfoRow label={t('home.member_code')} value={user.kode} mono />
          <InfoRow label={t('auth.phone_label')} value={formatPhoneDisplay(user.noHp)} />
          <InfoRow label={t('home.full_name')} value={user.namaLengkap} />
          <InfoRow
            label={t('home.role')}
            value={user.isFulltimer ? 'Fulltimer' : 'Jemaat'}
            isLast
          />
        </View>

        {/* Next milestones hint */}
        <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
          <Text className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
            {t('home.next_steps')}
          </Text>
          <Text className="text-sm text-blue-900 leading-relaxed">
            {t('home.next_steps_msg')}
          </Text>
        </View>

        <Button
          label={t('auth.logout')}
          variant="danger"
          onPress={() => setConfirmOpen(true)}
          loading={logoutMutation.isPending}
          leftIcon={<LogOut size={16} color="#fff" />}
          fullWidth
        />
      </ScrollView>

      {/* Confirm modal — cross-platform reliable (vs Alert.alert) */}
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
          <Pressable onPress={() => { /* prevent close saat tap card */ }} className="bg-white rounded-2xl p-5 w-full max-w-sm">
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

function InfoRow({
  label,
  value,
  mono,
  isLast,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-2.5 ${
        isLast ? '' : 'border-b border-neutral-100'
      }`}
    >
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text
        className={`text-sm font-semibold text-neutral-900 ${mono ? 'tracking-widest' : ''}`}
      >
        {value}
      </Text>
    </View>
  );
}
