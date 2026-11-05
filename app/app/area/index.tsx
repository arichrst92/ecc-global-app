import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPinned,
  UserCog,
  Users,
  Pencil,
  FileText,
} from 'lucide-react-native';

import { useAreaHomecells, useManagedAreas, useMyZona } from '@/hooks/useHomecell';
import type { MyZona } from '@/api/homecell';
import { Avatar } from '@/components/ui/Avatar';
import type { AreaHomecellRow, PicArea } from '@/types/homecell';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { ATTENDANCE_TIERS, attendanceTier } from '@/utils/homecellSegmen';
import { SegmenBadges } from '@/components/homecell/HomecellListCard';
import { ReportSheet } from '@/components/homecell/ReportSheet';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';

/**
 * Zona — daftar zona yang user-nya PIC atau pastor (pastor bisa punya
 * beberapa zona; semuanya tampil di sini, tanpa tombol ubah zona).
 *
 * Pakai data dari /admin/me/homecell-area-managed (PIC area) + /admin/me/
 * homecell-managed (PIC homecell user). Untuk setiap area yang user PIC,
 * tampil sebagai section header, lalu list homecell di area itu yang user
 * juga PIC homecell-nya (subset).
 *
 * Tap homecell row → /homecell/[id] (detail homecell).
 *
 * PIC name per homecell saat ini = current user (karena BE return hanya
 * homecells yang user PIC-nya). Saat BE expose /admin/homecell-area/:id/
 * homecells, list jadi lengkap dengan PIC info per homecell.
 */
export default function AreaListScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const areasQuery = useManagedAreas();
  // 2.4.6 — semua jemaat: zona dari homecell yang diikuti (hanya lihat).
  const myZonaQuery = useMyZona();
  const isLoading = areasQuery.isPending || myZonaQuery.isPending;
  const areas = areasQuery.data ?? [];
  const managedIds = new Set(areas.map((a) => a.id));
  const myZona = (myZonaQuery.data ?? []).filter((z) => !managedIds.has(z.id));

  const refresh = () => {
    void areasQuery.refetch();
    void myZonaQuery.refetch();
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('area.title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('area.subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <PullRefreshControl onRefresh={refresh} />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : areasQuery.isError && myZonaQuery.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={refresh}
              {...gx('px-4 py-2 bg-brand-500 rounded-lg')}
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : areas.length === 0 && myZona.length === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <MapPinned size={32} color={nc('#A3A3A3')} />
            </View>
            <Text className="text-lg font-semibold text-neutral-700 text-center">
              {t('area.none_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('area.none_msg')}
            </Text>
            <Pressable onPress={() => router.push('/homecell' as never)} {...gx('mt-4 px-4 py-2 bg-brand-500 rounded-lg')}>
              <Text className="text-white font-semibold text-sm">{t('area.find_homecell')}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-5">
            {areas.map((area) => (
              <AreaSection
                key={area.id}
                area={area}
                defaultOpen={areas.length + myZona.length === 1}
                onHomecellPress={(hid) => router.push(`/homecell/${hid}`)}
              />
            ))}
            {myZona.length > 0 && areas.length > 0 ? (
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider -mb-2">{t('area.my_zona_header')}</Text>
            ) : null}
            {myZona.map((z) => (
              <MyZonaSection key={z.id} zona={z} defaultOpen={areas.length + myZona.length === 1} onHomecellPress={(hid) => router.push(`/homecell/view/${hid}` as never)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** Baris buka/tutup daftar homecell di kartu zona (2.4.6). */
function ExpandToggle({ open, count }: { open: boolean; count: number }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-center gap-1 mt-3 pt-2.5 border-t border-white/20">
      <Text className="text-white text-xs font-bold">
        {open ? t('area.hide_homecells') : t('area.show_homecells', { count })}
      </Text>
      {open ? <ChevronUp size={14} color="#fff" /> : <ChevronDown size={14} color="#fff" />}
    </View>
  );
}

/** Zona dari homecell yang saya ikuti — hanya lihat (tanpa laporan / ubah). */
function MyZonaSection({
  zona,
  onHomecellPress,
  defaultOpen,
}: {
  zona: MyZona;
  onHomecellPress: (id: string) => void;
  defaultOpen: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const pastor = zona.pastors.map((p) => p.namaLengkap).join(', ');
  return (
    <View>
      <Pressable onPress={() => setOpen((x) => !x)} {...gx('bg-brand-500 rounded-2xl p-4 mb-2')}>
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
            <MapPinned size={18} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">{zona.nama}</Text>
            <Text className="text-white/80 text-xs mt-0.5">
              {zona.cabang.nama} · {zona.homecellCount} {t('area.homecells_count')}
            </Text>
          </View>
        </View>
        {zona.deskripsi ? (
          <Text className="text-white/80 text-xs mt-2" numberOfLines={3}>
            {zona.deskripsi}
          </Text>
        ) : null}
        <View className="mt-3 gap-1.5">
          <View className="flex-row items-center gap-2">
            {zona.picJemaat ? <Avatar name={zona.picJemaat.namaLengkap} fotoUrl={zona.picJemaat.fotoUrl} size={22} /> : null}
            <Text className="text-white text-xs flex-1" numberOfLines={1}>
              <Text className="font-bold">{t('area.zone_leader')}: </Text>
              {zona.picJemaat?.namaLengkap ?? t('area.pic_unassigned')}
            </Text>
          </View>
          {pastor ? (
            <Text className="text-white text-xs" numberOfLines={2}>
              <Text className="font-bold">{t('area.pastor_label')}: </Text>
              {pastor}
            </Text>
          ) : null}
        </View>
        {zona.homecells.length ? <ExpandToggle open={open} count={zona.homecells.length} /> : null}
      </Pressable>
      {open ? (
      <View className="gap-2">
        {zona.homecells.map((h) => (
          <Pressable
            key={h.id}
            onPress={() => onHomecellPress(h.id)}
            className={`bg-card rounded-2xl p-3 flex-row items-center gap-3 border ${h.isMine ? 'border-brand-300' : 'border-neutral-100'}`}
          >
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <Users size={18} color="#EA580C" />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
                  {h.nama}
                </Text>
                {h.isMine ? (
                  <View className="px-1.5 py-0.5 rounded-full bg-brand-100">
                    <Text className="text-[10px] font-bold text-brand-700">{t('area.my_homecell_badge')}</Text>
                  </View>
                ) : null}
              </View>
              <SegmenBadges kategori={h.kategori} usiaMin={h.usiaMin} usiaMax={h.usiaMax} />
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                {t('area.pic_label')}: {h.picJemaat?.namaLengkap ?? t('area.pic_unassigned')} · {h.memberCount} {t('homecell.members_count')}
              </Text>
            </View>
            <ChevronRight size={16} color={nc('#A3A3A3')} />
          </Pressable>
        ))}
      </View>
      ) : null}
    </View>
  );
}

function AreaSection({
  area,
  onHomecellPress,
  defaultOpen,
}: {
  area: PicArea;
  onHomecellPress: (id: string) => void;
  defaultOpen: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  // Kartu zona bisa dibuka/tutup — daftar homecell baru dimuat saat dibuka.
  const [open, setOpen] = useState(defaultOpen);
  const query = useAreaHomecells(area.id, open);
  const homecells = query.data ?? [];

  return (
    <View>
      {/* Area header — ketuk untuk buka/tutup daftar homecell */}
      <Pressable onPress={() => setOpen((x) => !x)} {...gx('bg-brand-500 rounded-2xl p-4 mb-2')}>
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
          <MapPinned size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-white font-bold text-base flex-shrink" numberOfLines={1}>
              {area.nama}
            </Text>
            {area.myRole ? (
              <View className="bg-white/25 px-1.5 py-0.5 rounded-full">
                <Text className="text-[9px] font-bold text-white">
                  {area.myRole === 'PASTOR' ? t('area.role_pastor') : t('area.role_pic')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-white/80 text-xs mt-0.5">
            {area.cabang.nama} · {area.homecellCount} {t('area.homecells_count')}
          </Text>
          {area.deskripsi ? (
            <Text className="text-white/80 text-xs mt-1" numberOfLines={2}>
              {area.deskripsi}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setReportOpen(true)}
          className="bg-white px-2.5 py-1 rounded-full flex-row items-center gap-1 mr-1.5"
          accessibilityLabel={t('hcj.report_btn')}
        >
          <FileText size={11} color="#C2410C" />
          <Text className="text-[11px] font-bold text-brand-700">{t('hcj.report_btn')}</Text>
        </Pressable>
        {area.myRole !== 'PASTOR' ? (
        <Pressable
          onPress={() => router.push(`/area/edit?id=${area.id}` as never)}
          className="bg-white px-2.5 py-1 rounded-full flex-row items-center gap-1"
          accessibilityLabel={t('hcj.segmen_edit')}
        >
          <Pencil size={11} color="#C2410C" />
          <Text className="text-[11px] font-bold text-brand-700">{t('hcj.segmen_edit')}</Text>
        </Pressable>
        ) : null}
      </View>
      <ExpandToggle open={open} count={area.homecellCount} />
      </Pressable>

      {open ? (
      <>
      {/* Keterangan indikator rata² hadir */}
      {homecells.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-1.5 mb-2 px-1">
          <Text className="text-[10px] text-neutral-500">{t('area.attendance_legend')}</Text>
          {ATTENDANCE_TIERS.map((x) => (
            <View key={x.key} className={`px-1.5 py-0.5 rounded-full ${x.bg}`}>
              <Text className={`text-[10px] font-semibold ${x.fg}`}>{x.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Homecells in area */}
      {query.isPending ? (
        <View className="bg-card rounded-2xl p-6 items-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : homecells.length === 0 ? (
        <View className="bg-card rounded-2xl p-4 border border-dashed border-neutral-300 items-center">
          <Text className="text-xs text-neutral-500 text-center">
            {t('area.no_homecells_in_area')}
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {homecells.map((h) => (
            <HomecellRow
              key={h.id}
              homecell={h}
              onPress={() => onHomecellPress(h.id)}
            />
          ))}
        </View>
      )}
      </>
      ) : null}
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} kind="area" id={area.id} title={area.nama} />
    </View>
  );
}

/** Badge rata² hadir berwarna; "—" bila belum ada data. */
function AttendanceBadge({ pct }: { pct?: number | null }) {
  if (pct == null) {
    return (
      <View className="px-2 py-0.5 rounded-full bg-neutral-100">
        <Text className="text-[10px] font-semibold text-neutral-500">—</Text>
      </View>
    );
  }
  const tier = attendanceTier(pct);
  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${tier.bg}`}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tier.dot }} />
      <Text className={`text-[10px] font-bold ${tier.fg}`}>{pct}%</Text>
    </View>
  );
}

function HomecellRow({
  homecell,
  onPress,
}: {
  homecell: AreaHomecellRow;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const picName = homecell.picJemaat?.namaLengkap ?? t('area.pic_unassigned');
  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
        <Users size={18} color="#EA580C" />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
            {homecell.nama}
          </Text>
          <AttendanceBadge pct={homecell.avgAttendancePercent} />
        </View>
        <SegmenBadges kategori={homecell.kategori} usiaMin={homecell.usiaMin} usiaMax={homecell.usiaMax} />
        <View className="flex-row items-center gap-1 mt-0.5">
          <UserCog size={11} color={nc('#737373')} />
          <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
            {t('area.pic_label')}: {picName}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-1">
          <View className="flex-row items-center gap-1">
            <Users size={11} color="#EA580C" />
            <Text className="text-xs font-semibold text-brand-700">
              {homecell.memberCount} {t('homecell.members_count')}
            </Text>
          </View>
          {homecell.hari ? (
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={nc('#A3A3A3')} />
              <Text className="text-xs text-neutral-500">
                {homecell.hari}
                {homecell.jam ? ` · ${homecell.jam}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color={nc('#A3A3A3')} />
    </Pressable>
  );
}
