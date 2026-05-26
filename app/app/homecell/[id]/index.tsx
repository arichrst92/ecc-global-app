import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Calendar as CalendarIcon,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth.store';
import {
  useHomecellDetail,
  useRemoveHomecellMember,
} from '@/hooks/useHomecell';
import { useHomecellSchedules } from '@/hooks/useHomecellSchedules';
import { ApiError } from '@/types/api';
import type { HomecellMember } from '@/types/homecell';
import type { HomecellSchedule } from '@/types/homecellSchedule';
import { formatDateWithDay } from '@/utils/date';

export default function HomecellDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);
  const user = useAuthStore((s) => s.user);

  const detailQuery = useHomecellDetail(id);
  const removeMutation = useRemoveHomecellMember(id);
  const homecell = detailQuery.data;
  // Schedules — PIC only feature. Query enabled selalu, gated render via canRemove.
  // BE endpoint masih pending — query 404 → empty state graceful.
  const schedulesQuery = useHomecellSchedules(id);

  const [confirmRemove, setConfirmRemove] = useState<HomecellMember | null>(null);

  // PIC privileges: tampil tombol Remove hanya kalau current user adalah PIC
  // homecell ini (atau PIC area parent). Backend tetap enforce, ini cuma UI guard.
  const isPicHomecell = !!user && homecell?.picJemaatId === user.jemaatId;
  const isPicArea = !!user && homecell?.area.picJemaatId === user.jemaatId;
  const canRemove = isPicHomecell || isPicArea;

  function handleRemove() {
    if (!confirmRemove) return;
    removeMutation.mutate(confirmRemove.jemaatId, {
      onSuccess: ({ alreadyRemoved }) => {
        setConfirmRemove(null);
        showToast(
          alreadyRemoved
            ? t('homecell.member_already_removed')
            : t('homecell.member_removed', { name: confirmRemove.jemaat.namaLengkap }),
          'success',
        );
      },
      onError: (err) => {
        setConfirmRemove(null);
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
      },
    });
  }

  if (detailQuery.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (detailQuery.isError || !homecell) {
    return (
      <View className="flex-1 bg-neutral-50">
        <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#171717" />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center mb-3">
            {t('homecell.detail_not_found')}
          </Text>
          <Pressable
            onPress={() => detailQuery.refetch()}
            className="px-4 py-2 bg-brand-500 rounded-lg"
          >
            <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Sort members: aktif dulu, lalu by tanggal bergabung desc
  const activeMembers = homecell.members
    .filter((m) => m.isActive)
    .sort((a, b) => b.tanggalBergabung.localeCompare(a.tanggalBergabung));
  const inactiveMembers = homecell.members
    .filter((m) => !m.isActive)
    .sort((a, b) => b.tanggalBergabung.localeCompare(a.tanggalBergabung));

  // PIC homecell — cari di list members yang jemaat.id match picJemaatId.
  // Kalau PIC bukan member homecell (rare case), pakai sebagai fallback id only.
  const picMember = homecell.picJemaatId
    ? homecell.members.find(
        (m) => (m.jemaat.id ?? m.jemaatId) === homecell.picJemaatId,
      )
    : null;

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white">
              {t('homecell.detail_title')}
            </Text>
          </View>
          <View className="px-5 pb-6 pt-2">
            <View className="bg-white/20 self-start px-2.5 py-1 rounded-full mb-2">
              <Text className="text-[10px] font-bold text-white tracking-wider">
                {isPicHomecell ? t('homecell.pic_badge') : t('homecell.area_pic_badge')}
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold">{homecell.nama}</Text>
            <Text className="text-white/80 text-sm mt-1">
              {homecell.area.nama} · {homecell.area.cabang.nama}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Stat + schedule */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-12 h-12 rounded-xl bg-brand-100 items-center justify-center">
              <Users size={22} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-neutral-900">
                {activeMembers.length}
              </Text>
              <Text className="text-xs text-neutral-500">
                {t('homecell.members_count')}
              </Text>
            </View>
          </View>
          {homecell.hari ? (
            <View className="flex-row items-center gap-2 pt-3 border-t border-neutral-100">
              <Clock size={14} color="#737373" />
              <Text className="text-sm text-neutral-700">
                {homecell.hari}
                {homecell.jam ? ` · ${homecell.jam}` : ''}
              </Text>
            </View>
          ) : null}
          {homecell.alamat ? (
            <View className="flex-row items-center gap-2 mt-1">
              <MapPin size={14} color="#737373" />
              <Text className="text-sm text-neutral-700" numberOfLines={2}>
                {homecell.alamat}
              </Text>
            </View>
          ) : null}
        </View>

        {/* PIC profile card — tampil profil PIC homecell ini */}
        {picMember ? (
          <View className="mb-4">
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('homecell.pic_section')}
            </Text>
            <Pressable
              onPress={() =>
                router.push(
                  `/jemaat/${picMember.jemaat.id ?? picMember.jemaatId}` as never,
                )
              }
              className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
            >
              <View className="relative">
                <Avatar
                  name={picMember.jemaat.namaLengkap}
                  fotoUrl={picMember.jemaat.fotoUrl ?? undefined}
                  size={48}
                />
                <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-500 items-center justify-center border-2 border-white">
                  <Text className="text-[8px] font-bold text-white">PIC</Text>
                </View>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                  {picMember.jemaat.namaLengkap}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('homecell.pic_role_label')}
                </Text>
              </View>
              {picMember.jemaat.noHp ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    const num = picMember.jemaat.noHp!.replace(/^\+/, '');
                    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
                  }}
                  className="w-10 h-10 rounded-full bg-green-50 items-center justify-center"
                  accessibilityLabel={t('homecell.member_whatsapp')}
                >
                  <MessageCircle size={16} color="#16A34A" />
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        {/* Add member action */}
        {canRemove ? (
          <Pressable
            onPress={() => router.push(`/homecell/${id}/add-member`)}
            className="bg-brand-500 rounded-2xl p-4 flex-row items-center gap-3 mb-4"
          >
            <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
              <UserPlus size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white">{t('homecell.add_member_btn')}</Text>
              <Text className="text-xs text-white/80 mt-0.5">
                {t('homecell.add_member_sub')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Jadwal Pertemuan section — PIC only.
            Tampil walau BE endpoint belum deploy (query 404 → empty state). */}
        {canRemove ? (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {t('homecell.schedules_section', {
                  count: schedulesQuery.data?.length ?? 0,
                })}
              </Text>
              <Pressable
                onPress={() => router.push(`/homecell/${id}/schedule/new`)}
                className="flex-row items-center gap-1"
              >
                <CalendarPlus size={14} color="#EA580C" />
                <Text className="text-xs font-semibold text-brand-600">
                  {t('homecell.schedules_create_btn')}
                </Text>
              </Pressable>
            </View>
            {schedulesQuery.data && schedulesQuery.data.length > 0 ? (
              <View className="gap-2">
                {schedulesQuery.data.slice(0, 5).map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    memberCount={activeMembers.length}
                    onPress={() =>
                      router.push(`/homecell/${id}/schedule/${s.id}`)
                    }
                  />
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-5 border border-dashed border-neutral-300 items-center">
                <CalendarIcon size={28} color="#A3A3A3" />
                <Text className="text-sm text-neutral-500 text-center mt-2">
                  {t('homecell.schedules_empty')}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Active members */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('homecell.members_section', { count: activeMembers.length })}
        </Text>
        {activeMembers.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 border border-dashed border-neutral-300 items-center">
            <Users size={28} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 text-center mt-2">
              {t('homecell.members_empty')}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {activeMembers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canRemove={canRemove}
                onRemove={() => setConfirmRemove(m)}
                onPress={() => router.push(`/jemaat/${m.jemaat.id ?? m.jemaatId}` as never)}
              />
            ))}
          </View>
        )}

        {/* Inactive members (collapsed) */}
        {inactiveMembers.length > 0 ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-6 mb-2">
              {t('homecell.inactive_section', { count: inactiveMembers.length })}
            </Text>
            <View className="gap-2">
              {inactiveMembers.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  canRemove={false}
                  onPress={() => router.push(`/jemaat/${m.jemaat.id ?? m.jemaatId}` as never)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Remove confirm modal */}
      <Modal
        visible={!!confirmRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmRemove(null)}
      >
        <Pressable
          onPress={() => setConfirmRemove(null)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('homecell.remove_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('homecell.remove_confirm_msg', {
                name: confirmRemove?.jemaat.namaLengkap ?? '',
              })}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmRemove(null)}
                  fullWidth
                  disabled={removeMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('homecell.confirm_remove')}
                  variant="danger"
                  onPress={handleRemove}
                  loading={removeMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MemberRow({
  member,
  canRemove,
  onRemove,
  onPress,
}: {
  member: HomecellMember;
  canRemove: boolean;
  onRemove?: () => void;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const isInactive = !member.isActive;

  function openWhatsApp() {
    if (!member.jemaat.noHp) return;
    // E.164 (+62...) → strip "+" untuk wa.me
    const num = member.jemaat.noHp.replace(/^\+/, '');
    const url = `https://wa.me/${num}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Pressable
      onPress={onPress}
      className={`bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100 ${
        isInactive ? 'opacity-60' : ''
      }`}
    >
      <Avatar
        name={member.jemaat.namaLengkap}
        fotoUrl={member.jemaat.fotoUrl ?? undefined}
        size={40}
      />
      <View className="flex-1 min-w-0">
        <Text
          className={`font-semibold text-neutral-900 ${
            isInactive ? 'line-through' : ''
          }`}
          numberOfLines={1}
        >
          {member.jemaat.namaLengkap}
        </Text>
        {isInactive ? (
          <Text className="text-[10px] text-red-600 mt-0.5 font-semibold">
            {t('homecell.member_inactive')}
            {member.tanggalKeluar
              ? ` · ${new Date(member.tanggalKeluar).toLocaleDateString('id-ID')}`
              : ''}
          </Text>
        ) : null}
      </View>
      {/* WhatsApp button — only kalau active + ada noHp */}
      {member.isActive && member.jemaat.noHp ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            openWhatsApp();
          }}
          className="w-9 h-9 rounded-full bg-green-50 items-center justify-center"
          accessibilityLabel={t('homecell.member_whatsapp')}
        >
          <MessageCircle size={14} color="#16A34A" />
        </Pressable>
      ) : null}
      {canRemove && member.isActive ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
        >
          <Trash2 size={14} color="#DC2626" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function ScheduleRow({
  schedule,
  memberCount,
  onPress,
}: {
  schedule: HomecellSchedule;
  memberCount: number;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
        <CalendarIcon size={18} color="#D97706" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
          {formatDateWithDay(schedule.tanggal, lang)}
        </Text>
        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
          {schedule.lokasi}
        </Text>
        <Text className="text-[11px] text-brand-600 font-semibold mt-1">
          {t('homecell.schedule_progress', {
            attended: schedule.attendanceCount,
            total: memberCount,
          })}
        </Text>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
