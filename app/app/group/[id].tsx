/**
 * Group Detail screen — info group + members list + actions.
 *
 * Actions berdasarkan role:
 * - Non-member (public group): tombol "Join Grup"
 * - Non-member (private group): 404 (BE hide)
 * - Member: tombol "Keluar Grup" + list members
 * - PIC: extra actions — Add Member, Regenerate Code (private only), Dismiss
 *
 * Endpoint: `GET /admin/group/:id` — return detail + members + children.
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Info,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  Settings,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useDismissGroup,
  useGroupDetail,
  useJoinGroup,
  useLeaveGroup,
  useRegenerateGroupCode,
  useRemoveGroupMember,
} from '@/hooks/useGroup';
import { useAuthStore } from '@/stores/auth.store';
import { GROUP_JENIS_LABELS } from '@/types/group';
import type { GroupMember } from '@/types/group';
import { ApiError } from '@/types/api';

export default function GroupDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'id' | 'en';
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const query = useGroupDetail(id);
  const group = query.data;

  const isPIC = !!(group && user && group.picJemaatId === user.jemaatId);
  const isMember = useMemo(() => {
    if (!group || !user) return false;
    return group.members.some(
      (m) => m.jemaatId === user.jemaatId && m.isActive,
    );
  }, [group, user]);

  const joinMutation = useJoinGroup(id);
  const leaveMutation = useLeaveGroup(id);
  const dismissMutation = useDismissGroup(id);
  const regenerateMutation = useRegenerateGroupCode(id);

  function handleJoin() {
    joinMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.alreadyMember) {
          showToast(t('group.already_member'), 'info');
        } else {
          showToast(t('group.join_success', { nama: group?.nama ?? '' }), 'success');
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          if (err.code === 'FORBIDDEN') {
            Alert.alert(
              t('group.join_error_private_title'),
              t('group.join_error_private_msg'),
              [
                {
                  text: t('group.scan_qr'),
                  onPress: () => router.push('/group/scan' as never),
                },
                { text: t('common.cancel'), style: 'cancel' },
              ],
            );
          } else {
            Alert.alert(t('common.error'), err.message);
          }
        }
      },
    });
  }

  function handleLeave() {
    Alert.alert(
      t('group.leave_confirm_title'),
      t('group.leave_confirm_msg', { nama: group?.nama ?? '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('group.leave_confirm_ok'),
          style: 'destructive',
          onPress: () => {
            leaveMutation.mutate(undefined, {
              onSuccess: () => {
                showToast(t('group.leave_success'), 'success');
              },
              onError: (err) => {
                Alert.alert(
                  t('common.error'),
                  err instanceof ApiError ? err.message : t('error.network'),
                );
              },
            });
          },
        },
      ],
    );
  }

  function handleDismiss() {
    Alert.alert(
      t('group.dismiss_confirm_title'),
      t('group.dismiss_confirm_msg', { nama: group?.nama ?? '', count: group?.memberCount ?? 0 }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('group.dismiss_confirm_ok'),
          style: 'destructive',
          onPress: () => {
            dismissMutation.mutate(undefined, {
              onSuccess: () => {
                showToast(t('group.dismiss_success'), 'success');
                router.back();
              },
              onError: (err) => {
                Alert.alert(
                  t('common.error'),
                  err instanceof ApiError ? err.message : t('error.network'),
                );
              },
            });
          },
        },
      ],
    );
  }

  function handleRegenerateCode() {
    Alert.alert(
      t('group.regen_confirm_title'),
      t('group.regen_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('group.regen_confirm_ok'),
          onPress: () => {
            regenerateMutation.mutate(undefined, {
              onSuccess: (data) => {
                showToast(
                  t('group.regen_success', { code: data.joinCode }),
                  'success',
                );
              },
              onError: (err) => {
                Alert.alert(
                  t('common.error'),
                  err instanceof ApiError ? err.message : t('error.network'),
                );
              },
            });
          },
        },
      ],
    );
  }

  if (query.isPending) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (query.isError || !group) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="px-4 py-2">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-bold text-neutral-900 mb-2">
            {t('group.not_found_title')}
          </Text>
          <Text className="text-sm text-neutral-500 text-center">
            {t('group.not_found_body')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const jenisInfo = GROUP_JENIS_LABELS[group.jenis];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
              {group.nama}
            </Text>
            <Text className="text-xs text-neutral-500">
              {lang === 'id' ? jenisInfo.id : jenisInfo.en}
              {' · '}
              {group.isPublic ? t('group.visibility_public') : t('group.visibility_private')}
            </Text>
          </View>
          {isPIC ? (
            <Pressable
              onPress={() => router.push(`/group/${id}/edit` as never)}
              className="w-10 h-10 items-center justify-center"
              hitSlop={8}
            >
              <Settings size={20} color="#737373" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {/* Hero */}
        <View className="bg-brand-50 items-center py-8">
          <Text className="text-5xl mb-2">{jenisInfo.emoji}</Text>
          <Text className="text-lg font-bold text-brand-800">{group.nama}</Text>
          {!group.isPublic ? (
            <View className="flex-row items-center gap-1 mt-2 bg-white/60 px-3 py-1 rounded-full">
              <Lock size={12} color="#C2410C" />
              <Text className="text-xs font-semibold text-brand-700">
                {t('group.visibility_private')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Meta info */}
        <View className="bg-white p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <MapPin size={16} color="#737373" />
            <Text className="text-sm text-neutral-700 flex-1">{group.cabang.nama}</Text>
          </View>
          {group.hari || group.jam ? (
            <View className="flex-row items-center gap-3">
              <Calendar size={16} color="#737373" />
              <Text className="text-sm text-neutral-700 flex-1">
                {[group.hari, group.jam].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
          {group.alamat ? (
            <View className="flex-row items-start gap-3">
              <MapPin size={16} color="#737373" style={{ marginTop: 2 }} />
              <Text className="text-sm text-neutral-700 flex-1">{group.alamat}</Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-3">
            <Users size={16} color="#737373" />
            <Text className="text-sm text-neutral-700">
              {t('group.members_count', { count: group.memberCount })}
            </Text>
          </View>
        </View>

        {/* PIC card */}
        {group.picJemaat ? (
          <View className="bg-white mt-2 p-4 flex-row items-center gap-3">
            <Avatar
              size={40}
              name={group.picJemaat.namaLengkap}
              fotoUrl={group.picJemaat.fotoUrl}
            />
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">{t('group.pic_label')}</Text>
              <Text className="text-sm font-semibold text-neutral-900">
                {group.picJemaat.namaLengkap}
              </Text>
            </View>
            {isPIC ? (
              <View className="bg-brand-50 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-bold text-brand-700">{t('group.you_are_pic')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
        {group.deskripsi ? (
          <View className="bg-white mt-2 p-4">
            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">
              {t('group.about')}
            </Text>
            <Text className="text-sm text-neutral-700 leading-relaxed">{group.deskripsi}</Text>
          </View>
        ) : null}

        {/* PIC-only: joinCode + QR */}
        {isPIC && !group.isPublic && group.joinCode ? (
          <View className="bg-white mt-2 p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-neutral-500 uppercase">
                {t('group.invitation_code')}
              </Text>
              <Pressable
                onPress={() => router.push(`/group/${id}/qr` as never)}
                className="flex-row items-center gap-1 px-2.5 py-1 bg-brand-50 rounded-full"
              >
                <QrCode size={12} color="#C2410C" />
                <Text className="text-xs font-bold text-brand-700">
                  {t('group.show_qr')}
                </Text>
              </Pressable>
            </View>
            <View className="bg-neutral-50 rounded-xl p-3 flex-row items-center justify-between">
              <Text className="text-xl font-bold tracking-widest text-neutral-900">
                {group.joinCode}
              </Text>
              <Pressable
                onPress={handleRegenerateCode}
                disabled={regenerateMutation.isPending}
                className="flex-row items-center gap-1 px-2 py-1"
                hitSlop={8}
              >
                <RefreshCw size={14} color="#737373" />
                <Text className="text-xs text-neutral-600">{t('group.regen_action')}</Text>
              </Pressable>
            </View>
            <Text className="text-xs text-neutral-500 mt-2">{t('group.invitation_hint')}</Text>
          </View>
        ) : null}

        {/* Members list */}
        <View className="bg-white mt-2 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold text-neutral-500 uppercase">
              {t('group.members_title', { count: group.memberCount })}
            </Text>
            {isPIC ? (
              <Pressable
                onPress={() => router.push(`/group/${id}/add-member` as never)}
                className="flex-row items-center gap-1 px-2.5 py-1 bg-brand-50 rounded-full"
              >
                <UserPlus size={12} color="#C2410C" />
                <Text className="text-xs font-bold text-brand-700">{t('group.add_member')}</Text>
              </Pressable>
            ) : null}
          </View>
          {group.members.length === 0 ? (
            <Text className="text-sm text-neutral-500 text-center py-6">
              {t('group.no_members')}
            </Text>
          ) : (
            <View className="gap-2">
              {group.members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  groupId={id}
                  isSelf={m.jemaatId === user?.jemaatId}
                  canRemove={isPIC && m.jemaatId !== user?.jemaatId}
                />
              ))}
            </View>
          )}
        </View>

        {/* Children groups (kalau ada) */}
        {group.children.length > 0 ? (
          <View className="bg-white mt-2 p-4">
            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">
              {t('group.subgroups', { count: group.children.length })}
            </Text>
            <View className="gap-2">
              {group.children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => router.push(`/group/${child.id}` as never)}
                  className="flex-row items-center gap-2 p-2 rounded-lg active:bg-neutral-50"
                >
                  <Text className="text-sm text-neutral-800 flex-1">{child.nama}</Text>
                  <Text className="text-xs text-neutral-500">
                    {t('group.members_count', { count: child._count.members })}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bottom info kalau non-member private */}
        {!isMember && !group.isPublic && !isPIC ? (
          <View className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
            <Info size={16} color="#92400e" />
            <Text className="text-xs text-amber-800 flex-1">
              {t('group.private_info')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky footer — Join / Leave / Dismiss */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-neutral-100">
        <View className="px-4 py-3 gap-2">
          {isMember ? (
            <>
              {isPIC ? (
                <Button
                  label={t('group.dismiss')}
                  onPress={handleDismiss}
                  loading={dismissMutation.isPending}
                  variant="danger"
                  fullWidth
                  leftIcon={<X size={18} color="#fff" />}
                />
              ) : (
                <Button
                  label={t('group.leave')}
                  onPress={handleLeave}
                  loading={leaveMutation.isPending}
                  variant="secondary"
                  fullWidth
                  leftIcon={<LogOut size={18} color="#171717" />}
                />
              )}
            </>
          ) : group.isPublic ? (
            <Button
              label={t('group.join')}
              onPress={handleJoin}
              loading={joinMutation.isPending}
              fullWidth
              leftIcon={<LogIn size={18} color="#fff" />}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ==============================================================
 * MEMBER ROW
 * ============================================================== */
function MemberRow({
  member,
  groupId,
  isSelf,
  canRemove,
}: {
  member: GroupMember;
  groupId: string;
  isSelf: boolean;
  canRemove: boolean;
}) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const removeMutation = useRemoveGroupMember(groupId);

  function handleRemove() {
    Alert.alert(
      t('group.remove_member_confirm_title'),
      t('group.remove_member_confirm_msg', { nama: member.jemaat.namaLengkap }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('group.remove_member_confirm_ok'),
          style: 'destructive',
          onPress: () => {
            removeMutation.mutate(member.jemaatId, {
              onSuccess: () => {
                showToast(t('group.remove_member_success'), 'success');
              },
              onError: (err) => {
                Alert.alert(
                  t('common.error'),
                  err instanceof ApiError ? err.message : t('error.network'),
                );
              },
            });
          },
        },
      ],
    );
  }

  return (
    <View className="flex-row items-center gap-3 py-2">
      <Avatar
        size={36}
        name={member.jemaat.namaLengkap}
        fotoUrl={member.jemaat.fotoUrl}
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
            {member.jemaat.namaLengkap}
          </Text>
          {isSelf ? (
            <View className="bg-brand-100 px-1.5 py-0.5 rounded">
              <Text className="text-[10px] font-bold text-brand-700">
                {t('group.you')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-neutral-500">
          {t('group.joined_at')}: {member.tanggalBergabung.slice(0, 10)}
        </Text>
      </View>
      {canRemove ? (
        <Pressable
          onPress={handleRemove}
          disabled={removeMutation.isPending}
          className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
          hitSlop={4}
        >
          <UserMinus size={16} color="#DC2626" />
        </Pressable>
      ) : null}
    </View>
  );
}
