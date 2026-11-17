/**
 * Pengingat melengkapi kontak: jemaat yang hanya punya nomor WhatsApp atau
 * hanya email tidak punya jalan masuk cadangan saat penyedia layanan
 * gangguan. Tidak memblokir — cukup tautan ke Edit Profil.
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ShieldAlert } from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth.store';

export function ContactHint({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const missing = !user.email ? 'email' : !user.noHp ? 'wa' : null;
  if (!missing) return null;
  return (
    <Pressable
      onPress={() => router.push('/settings/edit-profile' as never)}
      className={`flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
      accessibilityRole="button"
    >
      <ShieldAlert size={20} color="#B45309" />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-amber-900">{t('profile.contact_hint_title')}</Text>
        <Text className="text-xs text-amber-900 mt-0.5 leading-4">
          {missing === 'email' ? t('profile.contact_hint_email') : t('profile.contact_hint_wa')}
        </Text>
      </View>
      <ChevronRight size={18} color="#B45309" />
    </Pressable>
  );
}

/** Label status kontak (Terverifikasi / Belum terverifikasi / Diinput wali / Diinput admin). */
export function ContactBadge({ source, verified }: { source?: string | null; verified: boolean }) {
  const { t } = useTranslation();
  const label =
    source === 'GUARDIAN'
      ? t('profile.badge_guardian')
      : source === 'ADMIN'
        ? t('profile.badge_admin')
        : verified
          ? t('profile.badge_verified')
          : t('profile.badge_unverified');
  const tone =
    source === 'GUARDIAN' || source === 'ADMIN'
      ? 'bg-neutral-100 text-neutral-600'
      : verified
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-amber-50 text-amber-800';
  return <Text className={`text-[10px] font-semibold px-2 py-0.5 rounded-full overflow-hidden ${tone}`}>{label}</Text>;
}
