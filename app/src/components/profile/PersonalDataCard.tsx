/**
 * Ringkasan "Data Diri" di Profil: email, jenis kelamin, tanggal lahir,
 * alamat, pekerjaan, pernikahan — plus siapa yang bisa melihat tiap data
 * (sesuai pengaturan Privasi). Tap → Edit Profil.
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Briefcase, Cake, ChevronRight, Eye, Heart, Mail, MapPin, Pencil, User } from 'lucide-react-native';

import { getMyProfile } from '@/api/me';
import { getMyPrivacy, type PrivacyAudience, type PrivacyField } from '@/api/privacy';
import { formatDate } from '@/utils/date';
import { nc } from '@/theme/ThemeRoot';

type Row = {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string | null;
  privacy?: PrivacyField;
};

export function PersonalDataCard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language;
  const meQ = useQuery({ queryKey: ['me', 'profile-tab'], queryFn: getMyProfile, staleTime: 5 * 60_000 });
  const privQ = useQuery({ queryKey: ['me', 'privacy'], queryFn: getMyPrivacy, staleTime: 5 * 60_000 });
  const me = meQ.data;
  const settings = privQ.data?.settings;

  const audience = (f: PrivacyField): string | null => {
    const a = settings?.[f];
    if (!a) return null;
    if (a.length === 0) return t('privacy.only_me');
    if (a.includes('SEMUA')) return t('privacy.aud_SEMUA');
    return a.map((x: PrivacyAudience) => t(`privacy.aud_${x}`)).join(', ');
  };

  const gender = me?.jenisKelamin === 'L' ? t('signup.gender_male') : me?.jenisKelamin === 'P' ? t('signup.gender_female') : null;
  const pekerjaan = [
    me?.statusPekerjaan ? t(`edit_profile.job_opt.${me.statusPekerjaan}`, { defaultValue: me.statusPekerjaan }) : null,
    me?.namaKantor,
  ]
    .filter(Boolean)
    .join(' · ');
  const pernikahan = me?.statusPernikahan
    ? [
        t(`edit_profile.marriage_opt.${me.statusPernikahan}`, { defaultValue: me.statusPernikahan }),
        me.tanggalPernikahan ? formatDate(me.tanggalPernikahan, lang) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const rows: Row[] = [
    { key: 'email', icon: <Mail size={15} color="#2563EB" />, label: t('edit_profile.email'), value: me?.email ?? null, privacy: 'email' },
    { key: 'gender', icon: <User size={15} color="#7C3AED" />, label: t('signup.gender'), value: gender },
    {
      key: 'dob',
      icon: <Cake size={15} color="#DB2777" />,
      label: t('edit_profile.dob'),
      value: me?.tanggalLahir ? formatDate(me.tanggalLahir, lang) : null,
      privacy: 'tanggalLahir',
    },
    { key: 'alamat', icon: <MapPin size={15} color="#059669" />, label: t('signup.address'), value: me?.alamat ?? null, privacy: 'alamat' },
    { key: 'job', icon: <Briefcase size={15} color={nc('#B45309')} />, label: t('edit_profile.job'), value: pekerjaan || null, privacy: 'pekerjaan' },
    { key: 'marriage', icon: <Heart size={15} color="#E11D48" />, label: t('edit_profile.marriage'), value: pernikahan, privacy: 'pernikahan' },
  ];

  return (
    <View className="bg-card rounded-2xl border border-neutral-100 mb-4 overflow-hidden">
      <Pressable
        onPress={() => router.push('/settings/edit-profile' as never)}
        className="flex-row items-center justify-between px-4 pt-4 pb-2 active:opacity-80"
      >
        <Text className="text-sm font-semibold text-neutral-900">{t('personal_data.title')}</Text>
        <View className="flex-row items-center gap-1">
          <Pencil size={12} color="#EA580C" />
          <Text className="text-xs font-semibold text-brand-600">{t('personal_data.edit')}</Text>
        </View>
      </Pressable>
      {rows.map((r) => {
        const aud = r.privacy ? audience(r.privacy) : null;
        return (
          <View key={r.key} className="flex-row gap-3 px-4 py-2.5 border-t border-neutral-50">
            <View className="w-7 h-7 rounded-lg bg-neutral-50 items-center justify-center mt-0.5">{r.icon}</View>
            <View className="flex-1 min-w-0">
              <Text className="text-[11px] text-neutral-500">{r.label}</Text>
              <Text className={`text-sm ${r.value ? 'text-neutral-900' : 'text-neutral-400 italic'}`}>
                {r.value ?? t('personal_data.empty')}
              </Text>
              {aud ? (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Eye size={11} color={nc('#A3A3A3')} />
                  <Text className="text-[10px] text-neutral-400 flex-1" numberOfLines={2}>
                    {t('personal_data.visible_to', { who: aud })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      <Pressable
        onPress={() => router.push('/settings/privacy' as never)}
        className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-100 active:bg-neutral-50"
      >
        <Text className="text-xs text-neutral-600">{t('personal_data.privacy_link')}</Text>
        <ChevronRight size={14} color={nc('#A3A3A3')} />
      </Pressable>
    </View>
  );
}
