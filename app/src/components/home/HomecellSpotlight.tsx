/**
 * Homecell Spotlight — kartu utama di beranda (ECC berfokus pada homecell).
 *
 * Tampil tepat di bawah header, menyesuaikan status jemaat. Satu carousel
 * (geser ke samping) berisi, berurutan:
 *  - Homecell yang dipimpin (semua) — atau homecell saya bila bukan pemimpin
 *  - Zona yang dipimpin (Zone Leader) / digembalakan (Pastor) — ringkasan zona
 * Hanya 1 kartu → tampil penuh tanpa geser. Tidak ada sama sekali →
 * ajakan bergabung + "Cari homecell terdekat".
 */
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LastAttendanceText } from '@/components/homecell/LastAttendanceText';
import { AlertTriangle, Bell, CalendarDays, CalendarX, CheckCircle2, ChevronRight, Hourglass, Locate, MapPin, MapPinned, Plus, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { jadwalLabel } from '@/components/homecell/HomecellListCard';
import { useManagedAreas, useMyHomecellOverview } from '@/hooks/useHomecell';
import type { HomecellListItem, HomecellNextSchedule, PicArea } from '@/types/homecell';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { jamRange } from '@/utils/jamRange';
import { useKeepPage } from '@/hooks/useFoldSafe';
import { SegmenBadges } from '@/components/homecell/HomecellListCard';
import { HomecellMaterialRow } from '@/components/home/HomecellMaterialRow';

const SHADOW = { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 } as const;
/** Lebar kartu berikutnya yang terlihat di tepi kanan (tanda bisa digeser). */
const PEEK = 28;
const GAP = 10;

type Card = { key: string; kind: 'hc' | 'zone'; render: (style: StyleProp<ViewStyle>) => ReactNode };

export function HomecellSpotlight() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useMyHomecellOverview();
  const zonesQ = useManagedAreas();

  if (q.isPending) {
    return (
      <View className="mx-5 -mt-5 bg-card rounded-3xl p-6 items-center border border-neutral-100">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }
  const zones: PicArea[] = zonesQ.data ?? [];
  if ((q.isError || !q.data) && !zones.length) return null;

  const managed = q.data?.managed ?? [];
  const memberships = q.data?.memberships ?? [];
  const pendingRequests = q.data?.pendingRequests ?? [];
  const cards: Card[] = [];

  // ---- Homecell yang dipimpin (semua) ----
  for (const h of managed) {
    const req = (h.pendingJoinCount ?? 0) + (h.pendingGuestCount ?? 0);
    cards.push({
      key: `hc-${h.id}`,
      kind: 'hc',
      render: (style) => (
        <SpotCard
          style={style}
          label={t('hcj.spot_label_leader')}
          item={h}
          next={h.nextSchedule ?? null}
          onPress={() => router.push(`/homecell/${h.id}`)}
          footer={
            <>
            {req > 0 || !h.nextSchedule ? (
              <View className="flex-row items-center gap-2 mt-3 flex-wrap">
                {req > 0 ? (
                  <Pressable
                    onPress={() => router.push('/homecell/requests' as never)}
                    className="flex-row items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-full"
                  >
                    <Bell size={13} color={nc('#B45309')} />
                    <Text className="text-xs font-bold text-amber-800">{t('hcj.spot_requests', { count: req })}</Text>
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
              </View>
            ) : null}
            {/* Materi homecell dari Portal (pemimpin saja). */}
            <HomecellMaterialRow />
            </>
          }
        />
      ),
    });
  }

  // ---- Homecell saya (bukan pemimpin) ----
  if (!managed.length && memberships.length > 0) {
    const h = memberships[0]!.homecell;
    cards.push({
      key: `hcm-${h.id}`,
      kind: 'hc',
      render: (style) => (
        <SpotCard
          style={style}
          label={t('hcj.spot_label_member')}
          item={h}
          next={h.nextSchedule ?? null}
          onPress={() => router.push(`/homecell/view/${h.id}` as never)}
          footer={
            <>
            {h.picJemaat ? (
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
            ) : null}
            {/* Asisten tampil sebagai anggota — tetap dapat materi. */}
            <HomecellMaterialRow />
            </>
          }
        />
      ),
    });
  }

  // ---- Zona: Zone Leader dulu, lalu Pastor ----
  const sortedZones = [...zones].sort((x, y) => (x.myRole === 'PASTOR' ? 1 : 0) - (y.myRole === 'PASTOR' ? 1 : 0));
  for (const z of sortedZones) {
    cards.push({ key: `zone-${z.id}`, kind: 'zone', render: (style) => <ZoneCard style={style} zone={z} onPress={() => router.push('/area' as never)} /> });
  }

  if (cards.length === 1) return <View className="mx-5 -mt-5">{cards[0]!.render(SHADOW)}</View>;
  if (cards.length > 1) return <SpotCarousel cards={cards} />;

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
  style,
}: {
  label: string;
  item: HomecellListItem;
  next: HomecellNextSchedule;
  onPress: () => void;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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
    <Pressable onPress={onPress} className="bg-card rounded-3xl p-5 border border-neutral-100" style={style}>
      <View className="flex-row items-center gap-3">
        <View {...gx('w-11 h-11 rounded-2xl bg-brand-500 items-center justify-center')}>
          <Users size={22} color="#fff" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">{label}</Text>
          <Text className="text-lg font-bold text-neutral-900" numberOfLines={1}>
            {item.nama}
          </Text>
          <SegmenBadges kategori={item.kategori} usiaMin={item.usiaMin} usiaMax={item.usiaMax} />
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
                {next.jamMulai ? ` · ${jamRange(next.jamMulai, next.jamSelesai)}` : item.jam ? ` · ${item.jam}` : ''}
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

/** Carousel kartu homecell & zona — geser ke samping, kartu berikutnya mengintip. */
function SpotCarousel({ cards }: { cards: Card[] }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const cardW = Math.max(240, width - 40 - PEEK);
  const step = cardW + GAP;
  const scRef = useRef<ScrollView>(null);
  useKeepPage(scRef, step, index);
  return (
    <View className="-mt-5" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          ref={scRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10, gap: GAP }}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / step);
            if (i !== index) setIndex(Math.max(0, Math.min(cards.length - 1, i)));
          }}
          accessibilityHint={t('hcj.spot_carousel_hint', { count: cards.length - 1 })}
        >
          {cards.map((c) => (
            <View key={c.key} style={{ width: cardW }}>
              {c.render([SHADOW, { flex: 1 }])}
            </View>
          ))}
        </ScrollView>
      ) : null}
      {/* Titik penanda: oranye = homecell, oranye muda = zona; yang aktif memanjang. */}
      <View className="flex-row justify-center items-center gap-1.5 -mt-0.5">
        {cards.map((c, i) => (
          <View
            key={c.key}
            style={{
              width: i === index ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? '#F97316' : c.kind === 'zone' ? '#FDBA74' : nc('#D4D4D4'),
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Kartu zona — Zone Leader (zona yang dipimpin) / Pastor (zona yang digembalakan). */
function ZoneCard({ zone, onPress, style }: { zone: PicArea; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const pastor = zone.myRole === 'PASTOR';
  const st = zone.stats;
  return (
    <Pressable onPress={onPress} className="bg-card rounded-3xl p-5 border border-neutral-100" style={style}>
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#9A3412' }}>
          <MapPinned size={22} color="#fff" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9A3412' }} numberOfLines={1}>
            {pastor ? t('hcj.spot_label_zone_pastor') : t('hcj.spot_label_zone_leader')}
          </Text>
          <Text className="text-lg font-bold text-neutral-900" numberOfLines={1}>
            {zone.nama}
          </Text>
          <Text className="text-xs text-neutral-500" numberOfLines={1}>
            {zone.cabang?.nama}
          </Text>
        </View>
        <ChevronRight size={18} color={nc('#A3A3A3')} />
      </View>

      <View className="flex-row gap-2 mt-4">
        <ZoneStat value={String(st?.homecells ?? zone.homecellCount)} label={t('hcj.zone_stat_homecells')} />
        <ZoneStat value={st ? String(st.members) : '—'} label={t('hcj.zone_stat_members')} />
        <ZoneStat value={st ? `${st.met7}/${st.homecells}` : '—'} label={t('hcj.zone_stat_met7')} />
      </View>

      {st ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {st.notMet14 > 0 ? (
            <View className="flex-row items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full">
              <AlertTriangle size={12} color="#B91C1C" />
              <Text className="text-xs font-bold text-red-800">{t('hcj.zone_not_met', { count: st.notMet14 })}</Text>
            </View>
          ) : null}
          {st.noSchedule > 0 ? (
            <View className="flex-row items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-full">
              <CalendarX size={12} color={nc('#525252')} />
              <Text className="text-xs font-semibold text-neutral-700">{t('hcj.zone_no_schedule', { count: st.noSchedule })}</Text>
            </View>
          ) : null}
          {st.notMet14 === 0 && st.noSchedule === 0 && st.homecells > 0 ? (
            <View className="flex-row items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} color="#047857" />
              <Text className="text-xs font-semibold text-emerald-800">{t('hcj.zone_all_good')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {pastor && zone.zoneLeader ? (
        <View className="flex-row items-center gap-2 mt-3">
          <Avatar name={zone.zoneLeader.namaLengkap} fotoUrl={zone.zoneLeader.fotoUrl} size={22} />
          <Text className="text-xs text-neutral-600 flex-1" numberOfLines={1}>
            {t('hcj.zone_leader', { name: zone.zoneLeader.namaLengkap })}
          </Text>
        </View>
      ) : null}

      <HomecellMaterialRow variant="zone" />
    </Pressable>
  );
}

function ZoneStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 bg-neutral-50 rounded-xl py-2 px-1 items-center">
      <Text className="text-base font-bold text-neutral-900">{value}</Text>
      <Text className="text-[10px] text-neutral-500 text-center" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
