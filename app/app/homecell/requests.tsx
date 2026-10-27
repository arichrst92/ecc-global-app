/**
 * [Pemimpin homecell] Permintaan bergabung — terima (otomatis jadi anggota)
 * atau tolak dengan alasan. Jemaat mendapat notifikasi.
 * Juga permintaan dari MODE TAMU (tanpa akun): diterima → dicatat sebagai
 * tamu homecell; tamu melihat alamat & kontak pemimpin di app.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Inbox, MapPin, MessageSquareQuote, Phone, UserRound } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useApproveHomecellGuest,
  useApproveHomecellJoin,
  useHomecellGuestRequests,
  useHomecellJoinRequests,
  useRejectHomecellGuest,
  useRejectHomecellJoin,
} from '@/hooks/useHomecell';
import { formatPhoneDisplay } from '@/utils/phone';
import { ApiError } from '@/types/api';
import type { HomecellGuestRequestRow, HomecellJoinRequestRow } from '@/types/homecell';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function HomecellRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const q = useHomecellJoinRequests();
  const approveMut = useApproveHomecellJoin();
  const rejectMut = useRejectHomecellJoin();
  const gq = useHomecellGuestRequests();
  const approveGuestMut = useApproveHomecellGuest();
  const rejectGuestMut = useRejectHomecellGuest();
  const [rejecting, setRejecting] = useState<{ kind: 'member' | 'guest'; id: string; nama: string } | null>(null);
  const [reason, setReason] = useState('');

  const rows = q.data ?? [];
  const guestRows = gq.data ?? [];
  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.generic'));
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  function approve(r: HomecellJoinRequestRow) {
    Alert.alert(
      t('hcj.approve'),
      t('hcj.approve_confirm', { name: r.jemaat.namaLengkap, homecell: r.homecell.nama }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('hcj.approve'),
          onPress: () =>
            approveMut.mutate(r.id, {
              onSuccess: () => showToast(t('hcj.approved', { name: r.jemaat.namaLengkap }), 'success'),
              onError: (e) => showToast(errMsg(e), 'error'),
            }),
        },
      ],
    );
  }

  function approveGuest(r: HomecellGuestRequestRow) {
    Alert.alert(t('hcj.approve'), t('hcg.leader_approve_confirm', { name: r.nama, homecell: r.homecell.nama }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('hcj.approve'),
        onPress: () =>
          approveGuestMut.mutate(r.id, {
            onSuccess: () => showToast(t('hcg.leader_approved', { name: r.nama }), 'success'),
            onError: (e) => showToast(errMsg(e), 'error'),
          }),
      },
    ]);
  }

  function submitReject() {
    if (!rejecting) return;
    (rejecting.kind === 'guest' ? rejectGuestMut : rejectMut).mutate(
      { requestId: rejecting.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setRejecting(null);
          setReason('');
          showToast(t('hcj.rejected'), 'success');
        },
        onError: (e) => showToast(errMsg(e), 'error'),
      },
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('hcj.requests_title')}</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching || gq.isRefetching}
            onRefresh={() => {
              void q.refetch();
              void gq.refetch();
            }}
            tintColor="#F97316"
          />
        }
      >
        {q.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : rows.length === 0 && guestRows.length === 0 ? (
          <View className="items-center py-16 px-8">
            <Inbox size={32} color={nc('#A3A3A3')} />
            <Text className="text-sm text-neutral-500 text-center mt-2">{t('hcj.requests_empty')}</Text>
          </View>
        ) : (
          rows.map((r) => (
            <View key={r.id} className="bg-card rounded-2xl p-4 border border-neutral-100">
              <View className="flex-row items-center gap-3">
                <Avatar name={r.jemaat.namaLengkap} fotoUrl={r.jemaat.fotoUrl} size={44} />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                    {r.jemaat.namaLengkap}
                  </Text>
                  <Text className="text-xs text-neutral-500" numberOfLines={1}>
                    {r.homecell.nama} · {t('hcj.requested_at', { date: fmt(r.createdAt) })}
                  </Text>
                </View>
              </View>

              <View className="mt-3 gap-1.5">
                {r.jemaat.noHp ? (
                  <Detail icon={<Phone size={13} color={nc('#737373')} />} text={formatPhoneDisplay(r.jemaat.noHp)} />
                ) : null}
                {r.jemaat.alamat ? <Detail icon={<MapPin size={13} color={nc('#737373')} />} text={r.jemaat.alamat} /> : null}
                {r.pesan ? (
                  <Detail icon={<MessageSquareQuote size={13} color={nc('#737373')} />} text={`“${r.pesan}”`} />
                ) : null}
              </View>

              <View className="flex-row gap-2 mt-4">
                <View className="flex-1">
                  <Button
                    label={t('hcj.reject')}
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setReason('');
                      setRejecting({ kind: 'member', id: r.id, nama: r.jemaat.namaLengkap });
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={t('hcj.approve')}
                    size="sm"
                    loading={approveMut.isPending && approveMut.variables === r.id}
                    onPress={() => approve(r)}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        {/* Dari mode tamu (tanpa akun) */}
        {guestRows.length > 0 ? (
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2">
            {t('hcg.leader_section', { count: guestRows.length })}
          </Text>
        ) : null}
        {guestRows.map((r) => (
          <View key={r.id} className="bg-card rounded-2xl p-4 border border-violet-100">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-full bg-violet-100 items-center justify-center">
                <UserRound size={20} color="#7C3AED" />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm font-bold text-neutral-900 flex-shrink" numberOfLines={1}>
                    {r.nama}
                  </Text>
                  <View className="px-1.5 py-0.5 rounded-full bg-violet-100">
                    <Text className="text-[9px] font-bold text-violet-700">{t('hcg.leader_badge')}</Text>
                  </View>
                </View>
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {r.homecell.nama} · {t('hcj.requested_at', { date: fmt(r.createdAt) })}
                </Text>
              </View>
            </View>
            <View className="mt-3 gap-1.5">
              <Detail icon={<Phone size={13} color={nc('#737373')} />} text={formatPhoneDisplay(r.noHp)} />
              {r.jenisKelamin || r.usia != null ? (
                <Detail
                  icon={<UserRound size={13} color={nc('#737373')} />}
                  text={[
                    r.jenisKelamin ? (r.jenisKelamin === 'L' ? t('hcg.male') : t('hcg.female')) : null,
                    r.usia != null ? t('hcg.age_years', { n: r.usia }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ) : null}
              {r.pesan ? <Detail icon={<MessageSquareQuote size={13} color={nc('#737373')} />} text={`“${r.pesan}”`} /> : null}
            </View>
            <View className="flex-row gap-2 mt-4">
              <View className="flex-1">
                <Button
                  label={t('hcj.reject')}
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setReason('');
                    setRejecting({ kind: 'guest', id: r.id, nama: r.nama });
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('hcj.approve')}
                  size="sm"
                  loading={approveGuestMut.isPending && approveGuestMut.variables === r.id}
                  onPress={() => approveGuest(r)}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-card rounded-2xl p-5 w-full" style={{ maxWidth: 420 }}>
            <Text className="text-base font-bold text-neutral-900 mb-3">
              {t('hcj.reject_title', { name: rejecting?.nama ?? '' })}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t('hcj.reject_reason_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              multiline
              maxLength={300}
              className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View className="flex-row gap-2 mt-4">
              <View className="flex-1">
                <Button label={t('common.cancel')} variant="secondary" onPress={() => setRejecting(null)} />
              </View>
              <View className="flex-1">
                <Button label={t('hcj.reject')} variant="danger" loading={rejectMut.isPending || rejectGuestMut.isPending} onPress={submitReject} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <View className="mt-0.5">{icon}</View>
      <Text className="flex-1 text-sm text-neutral-700">{text}</Text>
    </View>
  );
}
