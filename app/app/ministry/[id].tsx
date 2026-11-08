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
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  DoorOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Crown,
  Hourglass,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useApproveJoinRequest,
  useCancelMyJoinRequest,
  useJoinMinistry,
  useMinistryDetail,
  useMinistryJoinRequests,
  useMinistrySchedule,
  useRejectJoinRequest,
} from '@/hooks/useMinistry';
import { useAuthStore } from '@/stores/auth.store';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { MinistryIcon, ministryWarna, taglineOf } from '@/components/ministry/MinistryIcon';
import { PendaftaranSheet } from '@/components/ministry/PendaftaranSheet';
import type { MinistryJoinRequest, MinistryMember, MinistryRole } from '@/types/ministry';
import { ApiError } from '@/types/api';
import { formatDateWithDay, parseLocalDate } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc, isDark } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';
import { HeroStatusBar, useHeroScroll } from '@/components/ui/HeroStatusBar';

export default function MinistryDetailScreen() {
  const hero = useHeroScroll();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);
  const currentUser = useAuthStore((s) => s.user);

  const query = useMinistryDetail(id);
  const ministry = query.data;
  // 2.4.6 — anggota default hanya cabang yang sedang dibuka; bisa pilih cabang lain / semua.
  const { viewingCabangId } = useViewingBranch();
  const [cabangPick, setCabangPick] = useState<string | null>(null); // null = ikut cabang dibuka; 'ALL' = semua
  const cabangOptions = useMemo(() => {
    const m = new Map<string, { id: string; nama: string; count: number }>();
    for (const x of ministry?.members ?? []) {
      const c = x.jemaat.cabang;
      if (!c) continue;
      const e = m.get(c.id) ?? { ...c, count: 0 };
      e.count++;
      m.set(c.id, e);
    }
    return [...m.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [ministry]);
  // Cabang yang dibuka tidak punya anggota di pelayanan ini → tampilkan semua (bukan daftar kosong tanpa chip aktif).
  const activeCabang =
    cabangPick ?? (viewingCabangId && cabangOptions.some((c) => c.id === viewingCabangId) ? viewingCabangId : 'ALL');
  const cabangNama = useMemo(() => new Map(cabangOptions.map((c) => [c.id, c.nama])), [cabangOptions]);
  const visibleMembers = useMemo(
    () => (ministry?.members ?? []).filter((m) => activeCabang === 'ALL' || m.jemaat.cabang?.id === activeCabang),
    [ministry, activeCabang],
  );
  const joinMutation = useJoinMinistry(id);
  // Jadwal 4 minggu ke depan — BE endpoint mungkin belum di-deploy, hook
  // graceful fallback ke [] (lihat useMinistry.ts / api/ministry.ts). Section
  // silently hide kalau data kosong, tidak show error state.
  const scheduleQuery = useMinistrySchedule(id);
  const schedules = scheduleQuery.data ?? [];

  // Approval flow (docs/backend-request-ministry-join-approval.md). Field
  // `canManageRequests` hanya ada di BE versi baru → selama BE lama, UI
  // tetap direct-join dan section leader tidak tampil.
  const approvalEnabled = !!ministry && ministry.canManageRequests !== undefined;
  const canManage = !!ministry?.canManageRequests;
  const myRequest = ministry?.myJoinRequest ?? null;
  const isPendingRequest = myRequest?.status === 'PENDING';
  const joinRequestsQuery = useMinistryJoinRequests(id, canManage);
  const joinRequests = joinRequestsQuery.data ?? [];
  const cancelRequestMutation = useCancelMyJoinRequest(id);
  const [reviewing, setReviewing] = useState<MinistryJoinRequest | null>(null);

  const [tab, setTab] = useState<'ANGGOTA' | 'JADWAL' | 'TENTANG'>('ANGGOTA');
  const [pendOpen, setPendOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
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
        if (data.status === 'PENDING') {
          showToast(t('ministry.join_requested', { ministry: ministry.nama }), 'success');
          return;
        }
        showToast(
          t('ministry.join_success', {
            ministry: ministry.nama,
            posisi: data.posisi,
          }),
          'success',
        );
      },
      onError: (err) => {
        if (err instanceof ApiError && /ditutup|closed/i.test(err.message ?? '')) {
          // 2.4.6 — pendaftaran cabang ditutup
          showToast(err.message, 'info');
          query.refetch();
          return;
        }
        if (err instanceof ApiError) {
          // BE returns code 'CONFLICT' or explicit 'ALREADY_MEMBER' string in message
          const isAlreadyMember =
            err.status === 409 ||
            /already/i.test(err.message ?? '') ||
            /sudah/i.test(err.message ?? '');
          if (isAlreadyMember) {
            // BE baru: 409 juga untuk request yang masih PENDING
            const isPending = /menunggu|pending/i.test(err.message ?? '');
            showToast(
              isPending ? t('ministry.join_already_pending') : t('ministry.join_already_member'),
              'info',
            );
            query.refetch();
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
    for (const m of visibleMembers) {
      const key = m.posisi ?? t('ministry.posisi_unassigned');
      if (!groups.has(key)) {
        groups.set(key, { posisiLevel: m.posisiLevel ?? 0, members: [] });
      }
      groups.get(key)!.members.push(m);
    }
    // Sort dalam tiap group: by sinceDate ASC
    for (const g of groups.values()) {
      g.members.sort((a, b) => (a.sinceDate ?? '').localeCompare(b.sinceDate ?? ''));
    }
    // Sort groups: posisiLevel DESC (senior dulu), tie-break alfabetik
    return Array.from(groups.entries())
      .map(([posisi, g]) => ({ posisi, posisiLevel: g.posisiLevel, members: g.members }))
      .sort((a, b) => {
        if (a.posisiLevel !== b.posisiLevel) return b.posisiLevel - a.posisiLevel;
        return a.posisi.localeCompare(b.posisi);
      });
  }, [ministry, visibleMembers, t]);

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
        <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => goBack(router)}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color={nc('#171717')} />
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

  // Koordinator (pemegang otoritas) — badge per anggota untuk cabang yang dilihat.
  const coordinators = ministry.coordinators ?? [];
  const coordIdsFor = (cabangId: string | null | undefined) =>
    new Set(coordinators.filter((c) => !cabangId || c.cabangIds.includes(cabangId)).map((c) => c.jemaat.id));
  const coordForView = coordinators.find(
    (c) => (activeCabang === 'ALL' ? c.cabangIds.includes(viewingCabangId ?? '') : c.cabangIds.includes(activeCabang)) && c.jemaat.noHp,
  );
  const w = ministryWarna(ministry.warna);
  const topLevel = Math.max(0, ...(ministry.roles ?? []).map((r) => r.level));
  const tagline = taglineOf(ministry.deskripsi);

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView onScroll={hero.onScroll} scrollEventThrottle={16}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<PullRefreshControl onRefresh={() => query.refetch()} tintColor="#F97316" />}
      >
      <View {...gx('bg-brand-500 rounded-b-3xl')}>
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
              {t('ministry.title')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 px-5 pt-1 pb-4">
            <MinistryIcon ikon={ministry.ikon} warna={ministry.warna} size={56} onHero />
            <View className="flex-1 min-w-0">
              <Text className="text-white text-xl font-bold" numberOfLines={2}>
                {ministry.nama}
              </Text>
              {tagline ? (
                <Text className="text-white/85 text-xs mt-0.5" numberOfLines={2}>
                  {tagline}
                </Text>
              ) : null}
              {ministry.myMembership ? (
                <View className="self-start mt-1.5 bg-white px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <CheckCircle2 size={11} color="#C2410C" />
                  <Text className="text-[10px] font-bold text-brand-700">
                    {t('ministry.serving_as', { posisi: ministry.myMembership.posisi || '—' })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
        {/* Statistik */}
        <View className="mx-4 mb-4 bg-white/15 rounded-2xl flex-row py-2.5">
          {[
            { n: ministry.memberCount, l: t('ministry.stat_anggota') },
            { n: cabangOptions.length, l: t('ministry.stat_cabang') },
            { n: ministry.roles?.length ?? 0, l: t('ministry.stat_peran') },
          ].map((x, i) => (
            <View key={x.l} className={`flex-1 items-center ${i ? 'border-l border-white/25' : ''}`}>
              <Text className="text-lg font-bold text-white">{x.n}</Text>
              <Text className="text-[11px] text-white/80">{x.l}</Text>
            </View>
          ))}
        </View>

      </View>

        <View className="px-4 pt-4">
        {/* Aksi cepat */}
        {canManage || coordForView ? (
          <View className="flex-row gap-2 mb-3">
            {canManage ? (
              <QuickAction
                icon={<CalendarDays size={18} color={w.fg} />}
                bg={w.bg}
                label={t('ministry.qa_jadwal')}
                onPress={() => router.push(`/ministry/${id}/jadwal` as never)}
              />
            ) : null}
            {canManage ? (
              <QuickAction
                icon={<UserPlus size={18} color={w.fg} />}
                bg={w.bg}
                label={t('ministry.qa_permintaan')}
                badge={joinRequests.length || undefined}
                onPress={() => {
                  if (joinRequests.length === 0) {
                    showToast(t('ministry.requests_none'), 'info');
                    return;
                  }
                  setReqOpen(true);
                }}
              />
            ) : null}
            {canManage ? (
              <QuickAction
                icon={<DoorOpen size={18} color={w.fg} />}
                bg={w.bg}
                label={t('ministry.qa_pendaftaran')}
                onPress={() => setPendOpen(true)}
              />
            ) : null}
            {coordForView ? (
              <QuickAction
                icon={<MessageCircle size={18} color="#16A34A" />}
                bg={isDark() ? "rgba(34,197,94,0.2)" : "#DCFCE7"}
                label={t('ministry.qa_chat_koordinator')}
                onPress={() => openWhatsApp(coordForView.jemaat.noHp!, ministry.nama, coordForView.jemaat.namaLengkap)}
              />
            ) : null}
          </View>
        ) : null}

        {/* Status permintaan join milik user (approval flow) */}
        {!ministry.myMembership && isPendingRequest && myRequest ? (
          <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center">
                <Hourglass size={20} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-amber-900">{t('ministry.pending_title')}</Text>
                <Text className="text-xs text-amber-800 mt-0.5">
                  {t('ministry.pending_body', {
                    role: myRequest.requestedRole?.nama ?? t('ministry.requested_role_none'),
                    date: new Date(myRequest.createdAt).toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US'),
                  })}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() =>
                cancelRequestMutation.mutate(undefined, {
                  onSuccess: () => showToast(t('ministry.pending_cancelled'), 'success'),
                  onError: (err) => showToast(err instanceof ApiError ? err.message : t('error.network'), 'error'),
                })
              }
              disabled={cancelRequestMutation.isPending}
              className="mt-3 self-start px-3 py-1.5 rounded-lg bg-card border border-amber-200"
            >
              <Text className="text-xs font-semibold text-amber-800">
                {cancelRequestMutation.isPending ? t('common.loading') : t('ministry.pending_cancel')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!ministry.myMembership && myRequest?.status === 'REJECTED' ? (
          <View className="bg-neutral-100 rounded-2xl p-4 mb-3 flex-row gap-3">
            <XCircle size={20} color={nc('#737373')} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-800">{t('ministry.rejected_title')}</Text>
              {myRequest.rejectReason ? (
                <Text className="text-xs text-neutral-600 mt-0.5">{t('ministry.rejected_reason', { reason: myRequest.rejectReason })}</Text>
              ) : null}
              <Text className="text-xs text-neutral-500 mt-0.5">{t('ministry.rejected_retry_hint')}</Text>
            </View>
          </View>
        ) : null}

        {/* Ajakan bergabung (bukan anggota) */}
        {!ministry.myMembership && !isPendingRequest && ministry.isOpen ? (
          <View className="bg-card rounded-2xl border p-4 mb-3" style={{ borderColor: w.bg }}>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-neutral-900 flex-1">{t('ministry.join_invite_title')}</Text>
              {ministry.pendaftaran?.status === 'BUKA' ? (
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-emerald-800">{t('ministry.pend_status_buka')}</Text>
                </View>
              ) : null}
            </View>
            {ministry.pendaftaran?.status === 'BUKA' && ministry.pendaftaran.catatan ? (
              <Text className="text-xs text-neutral-800 mt-1.5">“{ministry.pendaftaran.catatan}”</Text>
            ) : null}
            <Text className="text-xs text-neutral-500 mt-0.5 mb-3">
              {approvalEnabled ? t('ministry.join_notice_approval') : t('ministry.join_notice')}
            </Text>
            <Button
              onPress={handleJoinPress}
              disabled={joinMutation.isPending}
              loading={joinMutation.isPending}
              label={t('ministry.join_cta')}
              variant="primary"
              fullWidth
            />
          </View>
        ) : null}
        {!ministry.myMembership && !ministry.isOpen ? (
          <View className="bg-neutral-100 rounded-2xl p-3 mb-3">
            <Text className="text-xs text-neutral-600 leading-relaxed text-center">
              {ministry.pendaftaran?.status === 'TUTUP'
                ? t('ministry.pend_closed_notice', { cabang: ministry.pendaftaran.cabangNama ?? '' })
                : t('ministry.closed_notice')}
            </Text>
          </View>
        ) : null}

        {/* Tab */}
        <View className="flex-row bg-neutral-100 rounded-xl p-1 mb-3">
          {(['ANGGOTA', 'JADWAL', 'TENTANG'] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} className={`flex-1 py-2 rounded-lg items-center ${tab === k ? 'bg-card' : ''}`}>
              <Text className={`text-xs font-bold ${tab === k ? 'text-brand-700' : 'text-neutral-500'}`}>
                {k === 'ANGGOTA' ? t('ministry.tab_anggota') : k === 'JADWAL' ? t('ministry.tab_jadwal') : t('ministry.tab_tentang')}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'ANGGOTA' ? (
          <>
            {/* Koordinator: permintaan bergabung yang menunggu */}
            {canManage && joinRequests.length > 0 ? (
              <View className="mb-4">
                <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  {t('ministry.requests_section', { count: joinRequests.length })}
                </Text>
                <View className="bg-card rounded-2xl border border-amber-200">
                  {joinRequests.map((r, idx) => (
                    <Pressable
                      key={r.id}
                      onPress={() => setReviewing(r)}
                      className={`p-3 flex-row items-center gap-3 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}
                    >
                      <Avatar name={r.jemaat.namaLengkap} fotoUrl={r.jemaat.fotoUrl ?? undefined} size={40} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                          {r.jemaat.namaLengkap}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                          {r.requestedRole?.nama ?? t('ministry.requested_role_none')}
                          {r.jemaat.cabang ? ` · ${r.jemaat.cabang.nama}` : ''}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-[11px] font-semibold text-amber-700">{t('ministry.requests_tap_hint')}</Text>
                        <ChevronRight size={14} color={nc('#B45309')} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {cabangOptions.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-1" contentContainerStyle={{ paddingHorizontal: 4, gap: 6 }}>
                {[{ id: 'ALL', nama: t('ministry.cabang_all'), count: ministry.members.length }, ...cabangOptions].map((c) => {
                  const on = activeCabang === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCabangPick(c.id)}
                      {...gx(`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`)}
                    >
                      <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>
                        {c.nama} ({c.count})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {groupedMembers.length === 0 ? (
              <View className="bg-card rounded-2xl p-5 border border-neutral-100 items-center">
                <Text className="text-sm text-neutral-500 text-center">
                  {ministry.members.length > 0 ? t('ministry.members_empty_cabang') : t('ministry.members_empty')}
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {groupedMembers.map((group, gi) => (
                  <View key={group.posisi}>
                    <View className="flex-row items-center gap-2 mb-1.5">
                      {gi === 0 && group.posisiLevel > 0 && group.posisiLevel >= topLevel ? <Crown size={12} color="#D97706" /> : null}
                      <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: w.fg }}>
                        {group.posisi}
                      </Text>
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: w.bg }}>
                        <Text className="text-[10px] font-semibold" style={{ color: w.fg }}>
                          {group.members.length}
                        </Text>
                      </View>
                      <View className="flex-1 h-px bg-neutral-200" />
                    </View>
                    <View className="bg-card rounded-2xl border border-neutral-100">
                      {group.members.map((m, idx) => {
                        const isCoord = coordIdsFor(m.jemaat.cabang?.id ?? null).has(m.jemaat.id);
                        return (
                          <Pressable
                            key={m.id}
                            onPress={() => router.push(`/jemaat/${m.jemaat.id}` as never)}
                            className={`p-3 flex-row items-center gap-3 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}
                          >
                            <Avatar name={m.jemaat.namaLengkap} fotoUrl={m.jemaat.fotoUrl ?? undefined} size={40} />
                            <View className="flex-1 min-w-0">
                              <View className="flex-row items-center gap-1.5">
                                <Text className="text-sm font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
                                  {m.jemaat.namaLengkap}
                                </Text>
                                {isCoord ? (
                                  <View className="bg-emerald-50 px-1.5 py-0.5 rounded flex-row items-center gap-0.5">
                                    <ShieldCheck size={9} color="#047857" />
                                    <Text className="text-[9px] font-bold text-emerald-700">{t('ministry.koordinator_badge')}</Text>
                                  </View>
                                ) : null}
                              </View>
                              {m.jemaat.cabang ? <Text className="text-xs text-neutral-500 mt-0.5">{m.jemaat.cabang.nama}</Text> : null}
                            </View>
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
          </>
        ) : null}

        {tab === 'JADWAL' ? (
          schedules.length > 0 ? (
            <View className="gap-3">
              {schedules.map((s) => (
                <View key={s.id} className="bg-card rounded-2xl border border-neutral-100 overflow-hidden">
                  <View className="p-3.5 border-b border-neutral-100">
                    <Text className="text-sm font-semibold text-neutral-900">{formatDateWithDay(s.tanggal, i18n.language)}</Text>
                    <View className="flex-row items-center gap-3 mt-1.5">
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} color={nc('#737373')} />
                        <Text className="text-xs text-neutral-500">
                          {s.ibadahJamMulai}
                          {s.ibadahJamSelesai ? ` - ${s.ibadahJamSelesai}` : ''}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1 flex-1">
                        <MapPin size={12} color={nc('#737373')} />
                        <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
                          {s.ibadahLokasi}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-brand-600 font-medium mt-1" numberOfLines={1}>
                      {s.ibadahNama} · {t('ministry.schedule_assignments', { count: s.assignments.length })}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 12 }}>
                    {s.assignments.map((a) => {
                      const isMe = !!currentUser && a.jemaatId === currentUser.jemaatId;
                      return (
                        <View key={a.id} className="items-center" style={{ width: 68 }}>
                          <Avatar name={a.jemaatNama} fotoUrl={a.jemaatFotoUrl ?? undefined} size={44} className={isMe ? 'bg-brand-500' : undefined} />
                          <Text className={`text-[11px] mt-1 text-center ${isMe ? 'font-bold text-brand-600' : 'font-medium text-neutral-700'}`} numberOfLines={1}>
                            {a.jemaatNama}
                          </Text>
                          <Text className={`text-[10px] text-center ${isMe ? 'font-semibold text-brand-500' : 'text-neutral-400'}`} numberOfLines={1}>
                            {a.posisi}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-card rounded-2xl p-5 border border-neutral-100 items-center">
              <CalendarDays size={24} color={nc('#A3A3A3')} />
              <Text className="text-sm text-neutral-500 text-center mt-2">{t('ministry.jadwal_tab_empty')}</Text>
              {ministry.myMembership ? (
                <Pressable onPress={() => router.push('/profile/my-service' as never)} className="mt-3 px-3 py-1.5 rounded-full border border-brand-200 bg-brand-50">
                  <Text className="text-xs font-semibold text-brand-700">{t('ministry.jadwal_tab_mine')}</Text>
                </Pressable>
              ) : null}
              {canManage ? (
                <Pressable onPress={() => router.push(`/ministry/${id}/jadwal` as never)} className="mt-2 px-3 py-1.5 rounded-full border border-brand-200">
                  <Text className="text-xs font-semibold text-brand-700">{t('ministry.jadwal_btn')}</Text>
                </Pressable>
              ) : null}
            </View>
          )
        ) : null}

        {tab === 'TENTANG' ? (
          <View className="gap-3">
            <View className="bg-card rounded-2xl p-4 border border-neutral-100">
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('ministry.about_section')}</Text>
              <Text className="text-sm text-neutral-700 leading-relaxed">{ministry.deskripsi || t('ministry.about_empty')}</Text>
            </View>
            {ministry.roles?.length ? (
              <View className="bg-card rounded-2xl p-4 border border-neutral-100">
                <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('ministry.roles_section')}</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {[...ministry.roles].sort((a, b) => b.level - a.level).map((r) => (
                    <View key={r.id} className="px-2.5 py-1 rounded-full" style={{ backgroundColor: w.bg }}>
                      <Text className="text-[11px] font-semibold" style={{ color: w.fg }}>
                        {r.nama}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {coordinators.length ? (
              <View className="bg-card rounded-2xl p-4 border border-neutral-100">
                <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('ministry.koordinator_section')}</Text>
                {coordinators.map((c) => (
                  <Pressable key={c.jemaat.id} onPress={() => router.push(`/jemaat/${c.jemaat.id}` as never)} className="flex-row items-center gap-3 py-1.5">
                    <Avatar name={c.jemaat.namaLengkap} fotoUrl={c.jemaat.fotoUrl ?? undefined} size={32} />
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                        {c.jemaat.namaLengkap}
                      </Text>
                      <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                        {c.cabangIds.map((cid) => cabangNama.get(cid) ?? '').filter(Boolean).join(', ') || t('ministry.koordinator_badge')}
                      </Text>
                    </View>
                    {c.jemaat.noHp ? (
                      <Pressable
                        onPress={() => openWhatsApp(c.jemaat.noHp!, ministry.nama, c.jemaat.namaLengkap)}
                        className="w-9 h-9 rounded-full bg-green-50 items-center justify-center"
                      >
                        <MessageCircle size={14} color="#16A34A" />
                      </Pressable>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            {ministry.myMembership ? (
              <View className="rounded-2xl p-4 flex-row items-center gap-3" style={{ backgroundColor: w.bg }}>
                <CheckCircle2 size={20} color={w.fg} />
                <Text className="text-xs flex-1" style={{ color: w.fg }}>
                  {ministry.myMembership.posisi || '—'} · {t('ministry.since_label')}{' '}
                  {parseLocalDate(ministry.myMembership.sinceDate).toLocaleDateString('id-ID')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        </View>
      </ScrollView>
      <HeroStatusBar scrolled={hero.scrolled} />

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
        confirmLabel={approvalEnabled ? t('ministry.join_confirm_request') : undefined}
      />

      {canManage ? <PendaftaranSheet ministryId={id} visible={pendOpen} onClose={() => setPendOpen(false)} /> : null}

      {/* Daftar permintaan bergabung (aksi cepat "Permintaan") */}
      <Modal visible={reqOpen} animationType="slide" transparent onRequestClose={() => setReqOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-card rounded-t-3xl max-h-[80%] pb-8">
            <View className="flex-row items-center px-5 pt-4 pb-2">
              <Text className="flex-1 text-base font-bold text-neutral-900">
                {t('ministry.requests_section', { count: joinRequests.length })}
              </Text>
              <Pressable onPress={() => setReqOpen(false)} className="w-9 h-9 items-center justify-center">
                <X size={20} color={nc('#525252')} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {joinRequests.length === 0 ? (
                <Text className="text-sm text-neutral-500 text-center py-8">{t('ministry.requests_none')}</Text>
              ) : (
                joinRequests.map((r, idx) => (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      // Tutup lembar ini dulu supaya modal tinjauan bisa tampil (iOS: satu modal sekaligus).
                      setReqOpen(false);
                      setTimeout(() => setReviewing(r), 350);
                    }}
                    className={`p-3 flex-row items-center gap-3 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}
                  >
                    <Avatar name={r.jemaat.namaLengkap} fotoUrl={r.jemaat.fotoUrl ?? undefined} size={40} />
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                        {r.jemaat.namaLengkap}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {r.requestedRole?.nama ?? t('ministry.requested_role_none')}
                        {r.jemaat.cabang ? ` · ${r.jemaat.cabang.nama}` : ''}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-amber-700">{t('ministry.requests_tap_hint')}</Text>
                    <ChevronRight size={14} color={nc('#B45309')} />
                  </Pressable>
                ))
              )}
            </ScrollView>
            <SheetNavSpacer />
          </View>
        </View>
      </Modal>

      {/* Leader: popup tinjau permintaan + tetapkan peran */}
      {reviewing ? (
        <ReviewJoinRequestModal
          ministryId={id}
          request={reviewing}
          roles={ministry.roles ?? []}
          onClose={() => setReviewing(null)}
        />
      ) : null}
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
  confirmLabel,
}: {
  confirmLabel?: string;
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
      <KeyboardSafeView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* Tap backdrop untuk close */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: isDark() ? '#1C1C1E' : '#fff' }}>
          <View className="bg-card rounded-t-3xl overflow-hidden">
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
                <X size={18} color={nc('#171717')} />
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
              <View className="bg-card rounded-2xl border border-neutral-100 mb-1">
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
                        <Circle size={20} color={nc('#D4D4D4')} />
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
                placeholderTextColor={nc('#A3A3A3')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-card rounded-2xl border border-neutral-200 px-3 py-3 text-sm text-neutral-900 mb-4"
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
                  label={confirmLabel ?? t('ministry.join_confirm')}
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  disabled={submitting}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardSafeView>
    </Modal>
  );
}

/* ==============================================================
 * REVIEW JOIN REQUEST — popup leader: data pemohon, motivasi,
 * tetapkan peran pelayanan, lalu Setujui / Tolak (alasan opsional).
 * Per docs/backend-request-ministry-join-approval.md.
 * ============================================================== */
function ReviewJoinRequestModal({
  ministryId,
  request,
  roles,
  onClose,
}: {
  ministryId: string;
  request: MinistryJoinRequest;
  roles: MinistryRole[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();
  const approveMutation = useApproveJoinRequest(ministryId);
  const rejectMutation = useRejectJoinRequest(ministryId);

  const sortedRoles = useMemo(() => [...roles].sort((a, b) => b.level - a.level), [roles]);
  const defaultRoleId =
    request.requestedRole?.id ??
    [...roles].sort((a, b) => a.level - b.level)[0]?.id ??
    null;
  const [roleId, setRoleId] = useState<string | null>(defaultRoleId);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const busy = approveMutation.isPending || rejectMutation.isPending;
  const nama = request.jemaat.namaLengkap;

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      showToast(t('ministry.review_already_processed'), 'info');
      qc.invalidateQueries({ queryKey: ['ministry'] });
      onClose();
      return;
    }
    showToast(err instanceof ApiError ? err.message : t('error.network'), 'error');
  }

  function approve() {
    if (!roleId) return;
    const roleNama = roles.find((r) => r.id === roleId)?.nama ?? '';
    approveMutation.mutate(
      { requestId: request.id, roleId },
      {
        onSuccess: () => {
          showToast(t('ministry.review_approved_toast', { nama, role: roleNama }), 'success');
          onClose();
        },
        onError: handleError,
      },
    );
  }

  function reject() {
    rejectMutation.mutate(
      { requestId: request.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          showToast(t('ministry.review_rejected_toast', { nama }), 'success');
          onClose();
        },
        onError: handleError,
      },
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardSafeView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable style={{ flex: 1 }} onPress={busy ? undefined : onClose} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: isDark() ? '#1C1C1E' : '#fff' }}>
          <View className="bg-card rounded-t-3xl overflow-hidden">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-neutral-300" />
            </View>
            <View className="px-5 pt-2 pb-3 flex-row items-center justify-between border-b border-neutral-100">
              <Text className="text-lg font-bold text-neutral-900">
                {t('ministry.review_title')}
              </Text>
              <Pressable
                onPress={onClose}
                disabled={busy}
                className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
                accessibilityLabel={t('common.close') ?? 'Close'}
              >
                <X size={18} color={nc('#171717')} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Pemohon — ketuk untuk melihat profil (popup ditutup dulu) */}
              <Pressable
                onPress={() => {
                  if (busy) return;
                  onClose();
                  router.push(`/jemaat/${request.jemaat.id}` as never);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('ministry.review_view_profile')}
                className="flex-row items-center gap-3 mb-4 bg-neutral-50 rounded-2xl p-3 border border-neutral-100"
              >
                <Avatar name={nama} fotoUrl={request.jemaat.fotoUrl ?? undefined} size={52} />
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                    {nama}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                    {[request.jemaat.cabang?.nama, request.jemaat.kode].filter(Boolean).join(' · ')}
                  </Text>
                  <Text className="text-[11px] text-neutral-400 mt-0.5">
                    {new Date(request.createdAt).toLocaleDateString(
                      i18n.language === 'id' ? 'id-ID' : 'en-US',
                      { day: 'numeric', month: 'short', year: 'numeric' },
                    )}
                  </Text>
                  <Text className="text-xs font-semibold text-brand-600 mt-1">{t('ministry.review_view_profile')} ›</Text>
                </View>
                <ChevronRight size={18} color={nc('#A3A3A3')} />
              </Pressable>

              <View className="bg-neutral-50 rounded-2xl p-3 mb-4 gap-2">
                <View>
                  <Text className="text-[10px] font-bold text-neutral-500 uppercase">
                    {t('ministry.review_requested_role')}
                  </Text>
                  <Text className="text-sm text-neutral-900 mt-0.5">
                    {request.requestedRole?.nama ?? t('ministry.requested_role_none')}
                  </Text>
                </View>
                {request.motivasi ? (
                  <View>
                    <Text className="text-[10px] font-bold text-neutral-500 uppercase">
                      {t('ministry.review_motivasi')}
                    </Text>
                    <Text className="text-sm text-neutral-700 mt-0.5 leading-relaxed">
                      {request.motivasi}
                    </Text>
                  </View>
                ) : null}
              </View>

              {rejectMode ? (
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder={t('ministry.review_reject_reason_placeholder') ?? ''}
                  placeholderTextColor={nc('#A3A3A3')}
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                  editable={!busy}
                  className="bg-card rounded-2xl border border-neutral-200 px-3 py-3 text-sm text-neutral-900 mb-2"
                  style={{ minHeight: 80 }}
                />
              ) : (
                <>
                  <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    {t('ministry.review_assign_role')}
                  </Text>
                  {sortedRoles.length === 0 ? (
                    <Text className="text-xs text-red-600 mb-2">{t('ministry.review_no_roles')}</Text>
                  ) : (
                    <View className="bg-card rounded-2xl border border-neutral-100 mb-2">
                      {sortedRoles.map((role, idx) => {
                        const selected = roleId === role.id;
                        const isRequested = request.requestedRole?.id === role.id;
                        return (
                          <Pressable
                            key={role.id}
                            onPress={() => setRoleId(role.id)}
                            disabled={busy}
                            className={`p-3 flex-row items-center gap-3 ${
                              idx > 0 ? 'border-t border-neutral-100' : ''
                            }`}
                          >
                            {selected ? (
                              <CheckCircle2 size={20} color="#F97316" />
                            ) : (
                              <Circle size={20} color={nc('#D4D4D4')} />
                            )}
                            <Text
                              className={`text-sm flex-1 ${
                                selected ? 'font-semibold text-neutral-900' : 'text-neutral-700'
                              }`}
                            >
                              {role.nama}
                            </Text>
                            {isRequested ? (
                              <View className="bg-amber-50 px-1.5 py-0.5 rounded">
                                <Text className="text-[9px] font-bold text-amber-700">
                                  {t('ministry.review_requested_role')}
                                </Text>
                              </View>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View className="px-5 pb-5 pt-2 border-t border-neutral-100 flex-row gap-3">
              {rejectMode ? (
                <>
                  <View className="flex-1">
                    <Button
                      label={t('common.cancel')}
                      variant="secondary"
                      onPress={() => setRejectMode(false)}
                      fullWidth
                      disabled={busy}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label={t('ministry.review_reject_confirm')}
                      variant="danger"
                      onPress={reject}
                      loading={rejectMutation.isPending}
                      disabled={busy}
                      fullWidth
                    />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-1">
                    <Button
                      label={t('ministry.review_reject')}
                      variant="secondary"
                      onPress={() => setRejectMode(true)}
                      fullWidth
                      disabled={busy}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label={t('ministry.review_approve')}
                      onPress={approve}
                      loading={approveMutation.isPending}
                      disabled={busy || !roleId}
                      fullWidth
                      leftIcon={<UserPlus size={16} color="#fff" />}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </KeyboardSafeView>
    </Modal>
  );
}

/** Tombol aksi cepat di bawah statistik. */
function QuickAction({ icon, bg, label, badge, onPress }: { icon: React.ReactNode; bg: string; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 bg-card rounded-2xl border border-neutral-100 py-3 items-center">
      <View style={{ backgroundColor: bg }} className="w-9 h-9 rounded-xl items-center justify-center">
        {icon}
      </View>
      <Text className="text-[11px] font-semibold text-neutral-800 mt-1.5 text-center" numberOfLines={1}>
        {label}
      </Text>
      {badge ? (
        <View className="absolute top-2 right-3 bg-red-500 rounded-full px-1.5">
          <Text className="text-[10px] font-bold text-white">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
