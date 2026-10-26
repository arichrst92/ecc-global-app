/**
 * Homecell Spotlight — kartu utama di beranda (ECC berfokus pada homecell).
 *
 * Tampil tepat di bawah header, menyesuaikan status jemaat:
 *  - Pemimpin : homecell yang dipimpin + pertemuan berikutnya + permintaan bergabung
 *  - Anggota  : homecell saya + pertemuan berikutnya + pemimpin
 *  - Belum    : ajakan bergabung + "Cari homecell terdekat"
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LastAttendanceText } from '@/components/homecell/LastAttendanceText';
import { Bell, CalendarDays, ChevronRight, Hourglass, Locate, MapPin, Plus, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { jadwalLabel } from '@/components/homecell/HomecellListCard';
import { useMyHomecellOverview } from '@/hooks/useHomecell';
import type { HomecellListItem, HomecellNextSchedule } from '@/types/homecell';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export function HomecellSpotlight() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useMyHomecellOverview();

  if (q.isPending) {
    return (
      <View className="mx-5 -mt-5 bg-card rounded-3xl p-6 items-center border border-neutral-100">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }
  if (q.isError || !q.data) return null;

  const { managed, memberships, pendingRequests } = q.data;

  // ---- Pemimpin ----
  if (managed.length > 0) {
    const h = managed[0]!;
    const totalReq = managed.reduce((a, x) => a + (x.pendingJoinCount ?? 0), 0);
    return (
      <SpotCard
        label={t('hcj.spot_label_leader')}
        item={h}
        next={h.nextSchedule ?? null}
        onPress={() => router.push(`/homecell/${h.id}`)}
        footer={
          <View className="flex-row items-center gap-2 mt-3 flex-wrap">
            {totalReq > 0 ? (
              <Pressable
                onPress={() => router.push('/homecell/requests' as never)}
                className="flex-row items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-full"
              >
                <Bell size={13} color={nc('#B45309')} />
                <Text className="text-xs font-bold text-amber-800">{t('hcj.spot_requests', { count: totalReq })}</Text>
              </Pressable>
            ) : null}
            {!h.nextSchedule ? (
              <Pressable
                onPress={() => router.push(`/homecell/${h.id}/schedule/new` as never)}
                {...gx('flex-row items-center gap-1.5 bg-brand-500 px-3 py-1.5 rounded-full')}
              >
                <Plus size={13} color="#fff" />
                <Text className="text-xs font-bold text-white">{t('hcj.spot_create_schedule')}</Text>
              </Pressable>
            ) : null}
            {managed.length > 1 ? (
              <Pressable onPress={() => router.push('/homecell')} className="px-2 py-1.5">
                <Text className="text-xs font-semibold text-brand-600">
                  {t('hcj.spot_more', { count: managed.length - 1 })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    );
  }

  // ---- Anggota ----
  if (memberships.length > 0) {
    const h = memberships[0]!.homecell;
    return (
      <SpotCard
        label={t('hcj.spot_label_member')}
        item={h}
        next={h.nextSchedule ?? null}
        onPress={() => router.push(`/homecell/view/${h.id}` as never)}
        footer={
          h.picJemaat ? (
            <View className="flex-row items-center gap-2 mt-3">
              <Avatar name={h.picJemaat.namaLengkap} fotoUrl={h.picJemaat.fotoUrl} size={24} />
              <Text className="text-xs text-neutral-600 flex-1" numberOfLines={1}>
                {t('hcj.leader', { name: h.picJemaat.namaLengkap })}
              </Text>
              <View className="flex-row items-center gap-1">
                <Users size={12} color="#EA580C" />
                <Text className="text-xs font-semibold text-brand-700">{h.memberCount}</Text>
              </View>
            </View>
          ) : null
        }
      />
    );
  }

  // ---- Belum punya homecell ----
  const pending = pendingRequests[0];
  return (
    <View
      className="mx-5 -mt-5 bg-card rounded-3xl p-5 overflow-hidden border border-neutral-100"
      style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
    >
      {/* aksen dekoratif */}
      <View className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-100" />
      <View className="absolute right-10 -bottom-12 w-28 h-28 rounded-full bg-brand-50" />

      <View {...gx('w-11 h-11 rounded-2xl bg-brand-500 items-center justify-center mb-3')}>
        <Users size={22} color="#fff" />
      </View>
      <Text className="text-lg font-bold text-neutral-900">{t('hcj.spot_none_title')}</Text>
      <Text className="text-sm text-neutral-600 mt-1 leading-5">{t('hcj.spot_none_body')}</Text>

      {pending ? (
        <Pressable
          onPress={() => router.push(`/homecell/view/${pending.homecell.id}` as never)}
          className="mt-4 flex-row items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl p-3"
        >
          <Hourglass size={16} color={nc('#B45309')} />
          <Text className="flex-1 text-xs text-amber-900">{t('hcj.spot_pending', { name: pending.homecell.nama })}</Text>
          <ChevronRight size={14} color={nc('#B45309')} />
        </Pressable>
      ) : (
        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={() => router.push('/homecell?nearest=1' as never)}
            {...gx('flex-1 flex-row items-center justify-center gap-2 bg-brand-500 rounded-2xl py-3')}
          >
            <Locate size={16} color="#fff" />
            <Text className="text-sm font-bold text-white">{t('hcj.spot_find')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/homecell')}
            className="px-4 items-center justify-center rounded-2xl border border-brand-200 bg-card"
          >
            <Text className="text-sm font-semibold text-brand-700">{t('hcj.spot_browse')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function SpotCard({
  label,
  item,
  next,
  onPress,
  footer,
}: {
  label: string;
  item: HomecellListItem;
  next: HomecellNextSchedule;
  onPress: () => void;
  footer?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const routine = jadwalLabel(item);
  const nextDate = next
    ? new Date(next.tanggal.slice(0, 10) + 'T00:00:00').toLocaleDateString(
        i18n.language === 'en' ? 'en-US' : 'id-ID',
        { weekday: 'long', day: 'numeric', month: 'long' },
      )
    : null;

  return (
    <Pressable
      onPress={onPress}
      className="mx-5 -mt-5 bg-card rounded-3xl p-5 border border-neutral-100"
      style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
    >
      <View className="flex-row items-center gap-3">
        <View {...gx('w-11 h-11 rounded-2xl bg-brand-500 items-center justify-center')}>
          <Users size={22} color="#fff" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">{label}</Text>
          <Text className="text-lg font-bold text-neutral-900" numberOfLines={1}>
            {item.nama}
          </Text>
          <LastAttendanceText variant="homecell" date={item.lastMeetingAt} daysAgo={item.lastMeetingDaysAgo} />
        </View>
        <ChevronRight size={18} color={nc('#A3A3A3')} />
      </View>

      <View className="mt-4 bg-brand-50 rounded-2xl p-3.5 flex-row gap-3">
        <CalendarDays size={18} color="#EA580C" />
        <View className="flex-1">
          <Text className="text-[11px] text-brand-700 font-semibold">{t('hcj.spot_next')}</Text>
          {next ? (
            <>
              <Text className="text-sm font-bold text-neutral-900 mt-0.5">
                {nextDate}
                {item.jam ? ` · ${item.jam}` : ''}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <MapPin size={11} color={nc('#737373')} />
                <Text className="text-xs text-neutral-600 flex-1" numberOfLines={1}>
                  {next.lokasi}
                </Text>
              </View>
            </>
          ) : (
            <Text className="text-sm text-neutral-700 mt-0.5">
              {routine ? t('hcj.spot_routine', { jadwal: routine }) : t('hcj.spot_no_schedule')}
            </Text>
          )}
        </View>
      </View>

      {footer}
    </Pressable>
  );
}
