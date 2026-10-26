/**
 * Kartu group dengan hero image + detail ber-ikon. Dipakai di
 * "Jelajahi Group" (app/group/index.tsx) dan "Group Saya"
 * (app/profile/my-groups.tsx) supaya tampilannya seragam.
 */
import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Building2, CalendarCheck, Clock, Crown, Globe, Lock, MapPin, ChevronRight, Tag, Users } from 'lucide-react-native';

import { groupImageHref } from '@/components/group/GroupHero';
import { GROUP_JENIS_LABELS, type GroupJenis } from '@/types/group';
import { formatDate } from '@/utils/date';
import { gx } from '@/theme/gradient';

export type GroupListCardData = {
  nama: string;
  jenis: GroupJenis;
  isPublic: boolean;
  heroImageUrl?: string | null;
  cabang: { nama: string };
  picJemaat: { namaLengkap: string } | null;
  memberCount: number;
  hari?: string | null;
  jam?: string | null;
  alamat?: string | null;
};

export function GroupListCard({
  group,
  onPress,
  isPic,
  joinedAt,
}: {
  group: GroupListCardData;
  onPress: () => void;
  /** Saya PIC group ini (badge mahkota). */
  isPic?: boolean;
  /** Tanggal saya bergabung (Group Saya). */
  joinedAt?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'id';
  const jenisInfo = GROUP_JENIS_LABELS[group.jenis];
  const jadwal = [group.hari, group.jam].filter(Boolean).join(' · ');

  return (
    <Pressable onPress={onPress} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden active:opacity-90">
      {/* Hero */}
      <View style={{ aspectRatio: 16 / 7 }} className="bg-brand-100">
        {group.heroImageUrl ? (
          <Image
            source={{ uri: groupImageHref(group.heroImageUrl) }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center">
            <Text style={{ fontSize: 44 }}>{jenisInfo.emoji}</Text>
          </View>
        )}
        <View className="absolute top-2.5 left-2.5 right-2.5 flex-row items-center gap-1.5">
          <View className="flex-row items-center gap-1 bg-white/95 px-2 py-1 rounded-full">
            <Tag size={11} color="#C2410C" />
            <Text className="text-[11px] font-semibold text-brand-700">{lang === 'id' ? jenisInfo.id : jenisInfo.en}</Text>
          </View>
          <View className="flex-1" />
          {isPic ? (
            <View {...gx('flex-row items-center gap-1 bg-brand-500 px-2 py-1 rounded-full')}>
              <Crown size={11} color="#fff" />
              <Text className="text-[11px] font-bold text-white">PIC</Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1 bg-black/55 px-2 py-1 rounded-full">
            {group.isPublic ? <Globe size={11} color="#fff" /> : <Lock size={11} color="#fff" />}
            <Text className="text-[11px] font-semibold text-white">
              {group.isPublic ? t('group.my_card_public') : t('group.my_card_private')}
            </Text>
          </View>
        </View>
      </View>

      {/* Detail */}
      <View className="p-4">
        <View className="flex-row items-start gap-2">
          <Text className="flex-1 text-base font-bold text-neutral-900" numberOfLines={2}>
            {group.nama}
          </Text>
          <ChevronRight size={18} color="#A3A3A3" style={{ marginTop: 2 }} />
        </View>

        <View className="mt-3 gap-2">
          <Detail icon={<Building2 size={14} color="#737373" />} text={group.cabang.nama} />
          {group.picJemaat ? (
            <Detail icon={<Crown size={14} color="#737373" />} text={`${t('group.my_card_pic')}: ${group.picJemaat.namaLengkap}`} />
          ) : null}
          {group.alamat ? <Detail icon={<MapPin size={14} color="#737373" />} text={group.alamat} /> : null}
        </View>

        <View className="flex-row mt-3 pt-3 border-t border-neutral-100">
          <Stat
            icon={<Users size={15} color="#7C3AED" />}
            bg="bg-violet-50"
            value={String(group.memberCount)}
            label={t('group.my_card_members')}
          />
          {joinedAt ? (
            <Stat
              icon={<CalendarCheck size={15} color="#059669" />}
              bg="bg-emerald-50"
              value={formatDate(joinedAt, lang)}
              label={t('group.joined_at')}
            />
          ) : jadwal ? (
            <Stat icon={<Clock size={15} color="#0369A1" />} bg="bg-sky-50" value={jadwal} label={t('group.my_card_schedule')} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function Detail({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <View style={{ marginTop: 1 }}>{icon}</View>
      <Text className="flex-1 text-xs text-neutral-600" numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

function Stat({ icon, bg, value, label }: { icon: ReactNode; bg: string; value: string; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-2">
      <View className={`w-8 h-8 rounded-lg items-center justify-center ${bg}`}>{icon}</View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
          {value}
        </Text>
        <Text className="text-[11px] text-neutral-500">{label}</Text>
      </View>
    </View>
  );
}
