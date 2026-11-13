import i18n from '@/i18n';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LastAttendanceText } from '@/components/homecell/LastAttendanceText';
import { ChevronRight, Clock, MapPin, Navigation, User, Users } from 'lucide-react-native';

import type { HomecellListItem } from '@/types/homecell';
import { nc } from '@/theme/ThemeRoot';
import { homecellKategoriLabel, homecellUsiaLabel } from '@/utils/homecellSegmen';
import { hariLabel as hariDay } from '@/utils/hari';

/** "SENIN" → "Senin" */
export function hariLabel(hari: string | null): string | null {
  return hari ? hariDay(hari) : null;
}

export function jadwalLabel(h: { hari: string | null; jam: string | null }): string | null {
  const hari = hariLabel(h.hari);
  if (!hari && !h.jam) return null;
  return [hari, h.jam].filter(Boolean).join(' · ');
}

export function StatusBadge({ status }: { status: HomecellListItem['myStatus'] }) {
  const { t } = useTranslation();
  if (!status) return null;
  const cfg = {
    MEMBER: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: t('hcj.status_member') },
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: t('hcj.status_pending') },
    LEADER: { bg: 'bg-brand-50', text: 'text-brand-700', label: t('hcj.status_leader') },
  }[status];
  return (
    <View className={`px-2 py-0.5 rounded-full ${cfg.bg}`}>
      <Text className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</Text>
    </View>
  );
}

/** Kartu homecell untuk daftar (browse / homecell saya). */
/**
 * Badge kategori (Single/Couple/Umum) + rentang usia (atau "Semua usia").
 * Selalu tampil supaya pencari homecell tahu segmennya.
 */
export function SegmenBadges({
  kategori,
  usiaMin,
  usiaMax,
}: {
  kategori?: 'SINGLE' | 'COUPLE' | null;
  usiaMin?: number | null;
  usiaMax?: number | null;
}) {
  const kat = homecellKategoriLabel(kategori) ?? i18n.t('hcj.kategori_umum');
  const usia = homecellUsiaLabel(usiaMin, usiaMax) ?? i18n.t('hcj.usia_semua');
  const tone =
    kategori === 'COUPLE' ? ['bg-pink-100', 'text-pink-700'] : kategori === 'SINGLE' ? ['bg-sky-100', 'text-sky-700'] : ['bg-emerald-100', 'text-emerald-700'];
  return (
    <View className="flex-row items-center gap-1.5 mt-1">
      <View className={`px-2 py-0.5 rounded-full ${tone[0]}`}>
        <Text className={`text-[10px] font-bold ${tone[1]}`}>{kat}</Text>
      </View>
      <View className="px-2 py-0.5 rounded-full bg-neutral-100">
        <Text className="text-[10px] font-semibold text-neutral-600">{usia}</Text>
      </View>
    </View>
  );
}

export function HomecellListCard({ item, onPress }: { item: HomecellListItem; onPress: () => void }) {
  const { t } = useTranslation();
  const jadwal = jadwalLabel(item);
  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-12 h-12 rounded-xl bg-brand-100 items-center justify-center">
        <Users size={20} color="#EA580C" />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="font-bold text-neutral-900 flex-shrink" numberOfLines={1}>
            {item.nama}
          </Text>
          <StatusBadge status={item.myStatus} />
        </View>
        <SegmenBadges kategori={item.kategori} usiaMin={item.usiaMin} usiaMax={item.usiaMax} />
        <LastAttendanceText variant="homecell" date={item.lastMeetingAt} daysAgo={item.lastMeetingDaysAgo} />
        <View className="flex-row items-center gap-1 mt-1">
          <MapPin size={11} color={nc('#A3A3A3')} />
          <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
            {item.area.nama}
            {item.alamat ? ` · ${item.alamat}` : ''}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-1 flex-wrap">
          {item.distanceKm != null ? (
            <View className="flex-row items-center gap-1">
              <Navigation size={11} color="#2563EB" />
              <Text className="text-xs font-semibold text-blue-700">
                {t('hcj.km', { km: item.distanceKm.toLocaleString('id-ID') })}
              </Text>
            </View>
          ) : null}
          {jadwal ? (
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={nc('#A3A3A3')} />
              <Text className="text-xs text-neutral-500">{jadwal}</Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1">
            <Users size={11} color="#EA580C" />
            <Text className="text-xs text-brand-700">{t('hcj.members', { count: item.memberCount })}</Text>
          </View>
        </View>
        {item.picJemaat ? (
          <View className="flex-row items-center gap-1 mt-1">
            <User size={11} color={nc('#A3A3A3')} />
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {t('hcj.leader', { name: item.picJemaat.namaLengkap })}
            </Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={16} color={nc('#A3A3A3')} />
    </Pressable>
  );
}
