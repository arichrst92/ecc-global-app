/**
 * Ministry detail page — per BE patch 2026-05-22a.
 *
 * Shows ministry info, leader, members list, and current user's membership.
 * "Join" button → WA leader (Phase 1 — POST /admin/ministry/:id/join deferred
 * to Phase 2).
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Users,
  X,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useJoinMinistry,
  useMinistryDetail,
  useMinistrySchedule,
} from '@/hooks/useMinistry';
import { useAuthStore } from '@/stores/auth.store';
import type { MinistryMember, MinistryRole } from '@/types/ministry';
import { ApiError } from '@/types/api';
import { formatDateWithDay } from '@/utils/date';

export default function MinistryDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);
  const currentUser = useAuthStore((s) => s.user);

  const query = useMinistryDetail(id);
  const ministry = query.data;
  const joinMutation = useJoinMinistry(id);
  // Jadwal 4 minggu ke depan — BE endpoint mungkin belum di-deploy, hook
  // graceful fallback ke [] (lihat useMinistry.ts / api/ministry.ts). Section
  // silently hide kalau data kosong, tidak show error state.
  const scheduleQuery = useMinistrySchedule(id);
  const schedules = scheduleQuery.data ?? [];

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [motivasi, setMotivasi] = useState('');

  function submitJoin(payload: { roleId?: string; motivasi?: string }) {
    if (!ministry) return;
    joinMutation.mutate(payload, {
      onSuccess: (data) => {
        setShowJoinModal(false);
        setSelectedRoleId(null);
        setMotivasi('');
        showToast(
          t('ministry.join_success', {
            ministry: ministry.nama,
            posisi: data.posisi,
          }),
          'success',
        );
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          // BE returns code 'CONFLICT' or explicit 'ALREADY_MEMBER' string in message
          const isAlreadyMember =
            err.status === 409 ||
            /already/i.test(err.message ?? '') ||
            /sudah/i.test(err.message ?? '');
          if (isAlreadyMember) {
            showToast(t('ministry.join_already_member'), 'info');
            return;
          }
          showToast(err.message || t('ministry.join_error'), 'error');
        } else {
          showToast(t('ministry.join_error'), 'error');
        }
      },
    });
  }

  function handleJoinPress() {
    if (!ministry) return;
    // Backward compat — kalau ministry tidak punya role list, langsung join
    // dengan empty payload (BE auto-assign role level terendah).
    if (!ministry.roles || ministry.roles.length === 0) {
      submitJoin({});
      return;
    }
    // Default select role dengan level terendah — paling umum untuk anggota baru.
    const lowestLevelRole = [...ministry.roles].sort(
      (a, b) => a.level - b.level,
    )[0];
    setSelectedRoleId(lowestLevelRole?.id ?? null);
    setMotivasi('');
    setShowJoinModal(true);
  }

  function handleConfirmJoin() {
    submitJoin({
      roleId: selectedRoleId ?? undefined,
      motivasi: motivasi.trim() || undefined,
    });
  }

  // Group members by posisi (role pelayanan). Order group by level DESC
  // (leader/senior dulu), members dalam group by sinceDate ASC.
  type GroupedRow = {
    posisi: string;
    posisiLevel: number;
    members: MinistryMember[];
  };
  const groupedMembers = useMemo<GroupedRow[]>(() => {
    if (!ministry) return [];
    const groups = new Map<string, { posisiLevel: number; members: MinistryMember[] }>();
    for (const m of ministry.members) {
      const key = m.posisi ?? t('ministry.posisi_unassigned');
      if (!groups.has(key)) {
        groups.set(key, { posisiLevel: m.posisiLevel ?? 0, members: [] });
      }
      groups.get(key)!.members.push(m);
    }
    // Sort dalam tiap group: by sinceDate ASC
    for (const g of groups.values()) {
      g.members.sort((a, b) => a.sinceDate.localeCompare(b.sinceDate));
    }
    // Sort groups: posisiLevel DESC (senior dulu), tie-break alfabetik
    return Array.from(groups.entries())
      .map(([posisi, g]) => ({ posisi, posisiLevel: g.posisiLevel, members: g.members }))
      .sort((a, b) => {
        if (a.posisiLevel !== b.posisiLevel) return b.posisiLevel - a.posisiLevel;
        return a.posisi.localeCompare(b.posisi);
      });
  }, [ministry, t]);

  function openWhatsApp(noHp: string, ministryName: string, contactName: string) {
    const num = noHp.replace(/^\+/, '').replace(/\D/g, '');
    // Pre-filled message biar leader paham konteks
    const msg = t('ministry.wa_message', {
      ministry: ministryName,
      name: contactName,
    });
    const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      showToast(t('error.generic'), 'error');
    });
  }

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!ministry) {
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
          <Text className="text-sm text-neutral-500 text-center">
            {t('ministry.detail_not_found')}
          </Text>
        </View>
      </View>
    );
  }

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
            <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
              {t('ministry.title')}
            </Text>
          </View>
          <View className="items-center pb-6 pt-2 px-5">
            <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-2">
              <HeartHandshake size={32} color="#fff" />
            </View>
            <Text className="text-white text-xl font-bold text-center">
              {ministry.nama}
            </Text>
            <View className="flex-row items-center gap-3 mt-2">
              <View className="flex-row items-center gap-1">
                <Users size={12} color="#fff" />
                <Text className="text-xs text-white/80">
                  {ministry.memberCount} {t('ministry.member_label')}
                </Text>
              </View>
              {ministry.myMembership ? (
                <View className="bg-white/20 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <CheckCircle2 size={10} color="#fff" />
                  <Text className="text-[10px] font-bold text-white">
                    {t('ministry.youre_member')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {/* Deskripsi */}
        {ministry.deskripsi ? (
          <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('ministry.about_section')}
            </Text>
            <Text className="text-sm text-neutral-700 leading-relaxed">
              {ministry.deskripsi}
            </Text>
          </View>
        ) : null}

        {/* My membership info */}
        {ministry.myMembership ? (
          <View className="bg-brand-50 rounded-2xl p-4 border border-brand-100 mb-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-brand-500 items-center justify-center">
              <CheckCircle2 size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-brand-700">
                {t('ministry.my_role_label')}
              </Text>
              <Text className="text-xs text-brand-700/80 mt-0.5">
                {ministry.myMembership.posisi || '—'}
                {' · '}
                {t('ministry.since_label')}{' '}
                {new Date(ministry.myMembership.sinceDate).toLocaleDateString('id-ID')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Jadwal 4 Minggu Ke Depan — per docs/backend-request-ministry-schedule-roster.md.
            BE endpoint belum di-deploy; scheduleQuery gracefully resolve ke []
            kalau 404, jadi section ini hide entirely (silent) sampai BE ready. */}
        {schedules.length > 0 ? (
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {t('ministry.schedule_title')}
              </Text>
              <Text className="text-[11px] text-neutral-400">
                · {t('ministry.schedule_upcoming')}
              </Text>
            </View>
            <View className="gap-3">
              {schedules.map((s) => (
                <View
                  key={s.id}
                  className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                >
                  <View className="p-3.5 border-b border-neutral-100">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {formatDateWithDay(s.tanggal, i18n.language)}
                    </Text>
                    <View className="flex-row items-center gap-3 mt-1.5">
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} color="#737373" />
                        <Text className="text-xs text-neutral-500">
                          {s.ibadahJamMulai}
                          {s.ibadahJamSelesai ? ` - ${s.ibadahJamSelesai}` : ''}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1 flex-1">
                        <MapPin size={12} color="#737373" />
                        <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
                          {s.ibadahLokasi}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-brand-600 font-medium flex-1" numberOfLines={1}>
                        {s.ibadahNama}
                      </Text>
                      <Text className="text-[10px] text-neutral-400 ml-2">
                        {t('ministry.schedule_assignments', { count: s.assignments.length })}
                      </Text>
                    </View>
                    {s.catatan ? (
                      <Text className="text-xs text-neutral-500 mt-1.5 italic" numberOfLines={2}>
                        {s.catatan}
                      </Text>
                    ) : null}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ padding: 12, gap: 12 }}
                  >
                    {s.assignments.map((a) => {
                      const isMe = !!currentUser && a.jemaatId === currentUser.jemaatId;
                      return (
                        <View key={a.id} className="items-center" style={{ width: 68 }}>
                          <Avatar
                            name={a.jemaatNama}
                            fotoUrl={a.jemaatFotoUrl ?? undefined}
                            size={44}
                            className={isMe ? 'bg-brand-500' : undefined}
                          />
                          <Text
                            className={`text-[11px] mt-1 text-center ${
                              isMe ? 'font-bold text-brand-600' : 'font-medium text-neutral-700'
                            }`}
                            numberOfLines={1}
                          >
                            {a.jemaatNama}
                          </Text>
                          <Text
                            className={`text-[10px] text-center ${
                              isMe ? 'font-semibold text-brand-500' : 'text-neutral-400'
                            }`}
                            numberOfLines={1}
                          >
                            {a.posisi}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Members list — grouped by posisi (role pelayanan) */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('ministry.members_section', { count: ministry.memberCount })}
        </Text>
        {groupedMembers.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
            <Text className="text-sm text-neutral-500 text-center">
              {t('ministry.members_empty')}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {groupedMembers.map((group) => (
              <View key={group.posisi}>
                {/* Group header */}
                <View className="flex-row items-center gap-2 mb-1.5">
                  <Text className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                    {group.posisi}
                  </Text>
                  <View className="bg-brand-50 px-1.5 py-0.5 rounded">
                    <Text className="text-[10px] font-semibold text-brand-700">
                      {group.members.length}
                    </Text>
                  </View>
                  <View className="flex-1 h-px bg-neutral-200" />
                </View>
                <View className="bg-white rounded-2xl border border-neutral-100">
                  {group.members.map((m, idx) => {
                    const isLeader = ministry.leader?.jemaat.id === m.jemaat.id;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => router.push(`/jemaat/${m.jemaat.id}` as never)}
                        className={`p-3 flex-row items-center gap-3 ${
                          idx > 0 ? 'border-t border-neutral-100' : ''
                        }`}
                      >
                        <Avatar
                          name={m.jemaat.namaLengkap}
                          fotoUrl={m.jemaat.fotoUrl ?? undefined}
                          size={40}
                        />
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-2">
                            <Text
                              className="text-sm font-semibold text-neutral-900 flex-1"
                              numberOfLines={1}
                            >
                              {m.jemaat.namaLengkap}
                            </Text>
                            {isLeader ? (
                              <View className="bg-brand-100 px-1.5 py-0.5 rounded">
                                <Text className="text-[9px] font-bold text-brand-700">
                                  {t('ministry.leader_badge')}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {m.jemaat.cabang ? (
                            <Text className="text-xs text-neutral-500 mt-0.5">
                              {m.jemaat.cabang.nama}
                            </Text>
                          ) : null}
                        </View>
                        {/* WhatsApp button — kalau ada noHp dari BE */}
                        {m.jemaat.noHp ? (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              openWhatsApp(m.jemaat.noHp!, ministry.nama, m.jemaat.namaLengkap);
                            }}
                            className="w-9 h-9 rounded-full bg-green-50 items-center justify-center"
                            accessibilityLabel={t('ministry.member_whatsapp')}
                          >
                            <MessageCircle size={14} color="#16A34A" />
                          </Pressable>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Join button — Phase 2 (POST /admin/ministry/:id/join live 2026-08-03) */}
        {!ministry.myMembership && ministry.isOpen ? (
          <View className="mt-6">
            <Button
              onPress={handleJoinPress}
              disabled={joinMutation.isPending}
              loading={joinMutation.isPending}
              label={t('ministry.join_cta')}
              variant="primary"
              fullWidth
            />
            <Text className="text-[11px] text-neutral-500 text-center mt-2 leading-relaxed">
              {t('ministry.join_notice')}
            </Text>
          </View>
        ) : null}

        {/* Closed ministry notice */}
        {!ministry.myMembership && !ministry.isOpen ? (
          <View className="bg-neutral-100 rounded-2xl p-3 mt-4">
            <Text className="text-xs text-neutral-600 leading-relaxed text-center">
              {t('ministry.closed_notice')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Join role picker modal — slide-up sheet, pattern konsisten dengan
          event detail modal (app/event/[id].tsx). */}
      <JoinMinistryModal
        visible={showJoinModal}
        roles={ministry.roles ?? []}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
        motivasi={motivasi}
        onChangeMotivasi={setMotivasi}
        submitting={joinMutation.isPending}
        onClose={() => setShowJoinModal(false)}
        onConfirm={handleConfirmJoin}
      />
    </View>
  );
}

function JoinMinistryModal({
  visible,
  roles,
  selectedRoleId,
  onSelectRole,
  motivasi,
  onChangeMotivasi,
  submitting,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  roles: MinistryRole[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string | null) => void;
  motivasi: string;
  onChangeMotivasi: (value: string) => void;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* Tap backdrop untuk close */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
          <View className="bg-white rounded-t-3xl overflow-hidden">
            {/* Handle bar */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-neutral-300" />
            </View>

            {/* Header */}
            <View className="px-5 pt-2 pb-3 flex-row items-center justify-between border-b border-neutral-100">
              <Text className="text-lg font-bold text-neutral-900">
                {t('ministry.join_modal_title')}
              </Text>
              <Pressable
                onPress={onClose}
                className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
                accessibilityLabel={t('common.close') ?? 'Close'}
              >
                <X size={18} color="#171717" />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: '70%' }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
            >
              {/* Role list */}
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                {t('ministry.join_role_label')}
              </Text>
              <View className="bg-white rounded-2xl border border-neutral-100 mb-1">
                {roles.map((role, idx) => {
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <Pressable
                      key={role.id}
                      onPress={() => onSelectRole(role.id)}
                      className={`p-3 flex-row items-center gap-3 ${
                        idx > 0 ? 'border-t border-neutral-100' : ''
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 size={20} color="#F97316" />
                      ) : (
                        <Circle size={20} color="#D4D4D4" />
                      )}
                      <Text
                        className={`text-sm flex-1 ${
                          isSelected
                            ? 'font-semibold text-neutral-900'
                            : 'text-neutral-700'
                        }`}
                      >
                        {role.nama}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-[11px] text-neutral-500 mb-4 leading-relaxed">
                {t('ministry.join_role_hint')}
              </Text>

              {/* Motivasi */}
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                {t('ministry.join_motivasi_label')}
              </Text>
              <TextInput
                value={motivasi}
                onChangeText={onChangeMotivasi}
                placeholder={t('ministry.join_motivasi_placeholder') ?? ''}
                placeholderTextColor="#A3A3A3"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-white rounded-2xl border border-neutral-200 px-3 py-3 text-sm text-neutral-900 mb-4"
                style={{ minHeight: 80 }}
              />
            </ScrollView>

            {/* Actions */}
            <View className="px-5 pb-5 pt-2 border-t border-neutral-100 flex-row gap-3">
              <View className="flex-1">
                <Button
                  onPress={onClose}
                  label={t('ministry.join_cancel')}
                  variant="secondary"
                  fullWidth
                  disabled={submitting}
                />
              </View>
              <View className="flex-1">
                <Button
                  onPress={onConfirm}
                  label={t('ministry.join_confirm')}
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  disabled={submitting}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
