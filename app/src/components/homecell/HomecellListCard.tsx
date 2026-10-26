import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LastAttendanceText } from '@/components/homecell/LastAttendanceText';
import { ChevronRight, Clock, MapPin, Navigation, User, Users } from 'lucide-react-native';

import type { HomecellListItem } from '@/types/homecell';
import { nc } from '@/theme/ThemeRoot';

/** "SENIN" → "Senin" */
export function hariLabel(hari: string | null): string | null {
  if (!hari) return null;
  return hari.charAt(0) + hari.slice(1).toLowerCase();
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
