/**
 * Pengingat melengkapi kontak: jemaat yang hanya punya nomor WhatsApp atau
 * hanya email tidak punya jalan masuk cadangan saat penyedia layanan
 * gangguan. Tidak memblokir — cukup tautan ke Edit Profil.
 */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ShieldAlert, X } from 'lucide-react-native';

import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '@/api/me';
import { useAuthStore } from '@/stores/auth.store';
import { storage } from '@/utils/storage';

const DISMISS_KEY = 'ecc.contactHintDismissedAt';
/** Versi Beranda yang ditutup muncul lagi setelah 30 hari. */
const DISMISS_DAYS = 30;

export function ContactHint({ className = '', dismissible = false }: { className?: string; dismissible?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [hidden, setHidden] = useState(dismissible);
  // Data login yang tersimpan bisa basi (kontak ditambah di Portal / perangkat
  // lain) → pakai profil terbaru bila sudah dimuat.
  const me = useQuery({
    queryKey: ['me', 'contact-hint'],
    queryFn: getMyProfile,
    enabled: !!user && !isGuest,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!dismissible) return;
    void storage.getItem(DISMISS_KEY).then((v) => {
      const at = v ? Number(v) : 0;
      setHidden(!!at && Date.now() - at < DISMISS_DAYS * 86_400_000);
    });
  }, [dismissible]);

  if (!user || isGuest || hidden) return null;
  // Tunggu profil terbaru supaya tidak berkedip / salah tampil.
  if (!me.data) return null;
  const missing = !me.data.email ? 'email' : !me.data.noHp ? 'wa' : null;
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
      {dismissible ? (
        <Pressable
          hitSlop={10}
          onPress={() => {
            setHidden(true);
            void storage.setItem(DISMISS_KEY, String(Date.now()));
          }}
          accessibilityLabel={t('common.close')}
        >
          <X size={16} color="#B45309" />
        </Pressable>
      ) : (
        <ChevronRight size={18} color="#B45309" />
      )}
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
