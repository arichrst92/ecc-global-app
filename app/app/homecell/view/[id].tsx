/**
 * Detail homecell read-only.
 * - Calon anggota: info + "Minta bergabung" (pesan opsional) / batalkan.
 * - Anggota: info + jadwal berikutnya + daftar anggota + chat pemimpin.
 * - Pemimpin: + atur lokasi Google Maps (untuk "Cari homecell terdekat").
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  MessageCircle,
  Navigation,
  Settings2,
  Users,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { jadwalLabel } from '@/components/homecell/HomecellListCard';
import {
  useCancelJoinHomecell,
  useHomecellPublic,
  useRequestJoinHomecell,
  useSetHomecellLokasi,
} from '@/hooks/useHomecell';
import { ApiError } from '@/types/api';

export default function HomecellViewScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);

  const q = useHomecellPublic(id);
  const hc = q.data;
  const joinMut = useRequestJoinHomecell();
  const cancelMut = useCancelJoinHomecell();
  const lokasiMut = useSetHomecellLokasi();
  const [pesan, setPesan] = useState('');
  const [lokasiOpen, setLokasiOpen] = useState(false);
  const [lokasiInput, setLokasiInput] = useState('');

  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.generic'));
  const fmtDate = (d: string) =>
    new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  function openMaps() {
    if (!hc) return;
    const url =
      hc.latitude != null && hc.longitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${hc.latitude},${hc.longitude}`
        : hc.mapsUrl;
    if (url) Linking.openURL(url).catch(() => {});
  }

  function chatLeader() {
    const no = hc?.picJemaat?.noHp?.replace(/\D/g, '');
    if (no) Linking.openURL(`https://wa.me/${no}`).catch(() => {});
  }

  function join() {
    if (!hc) return;
    Alert.alert(t('hcj.join_btn'), t('hcj.join_confirm', { name: hc.nama }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('hcj.join_btn'),
        onPress: () =>
          joinMut.mutate(
            { homecellId: hc.id, pesan: pesan.trim() || undefined },
            {
              onSuccess: () => {
                setPesan('');
                showToast(t('hcj.join_sent'), 'success');
              },
              onError: (e) => showToast(errMsg(e), 'error'),
            },
          ),
      },
    ]);
  }

  function cancel() {
    if (!hc) return;
    Alert.alert(t('hcj.cancel_request'), t('hcj.cancel_confirm', { name: hc.nama }), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('hcj.cancel_request'),
        style: 'destructive',
        onPress: () =>
          cancelMut.mutate(hc.id, {
            onSuccess: () => showToast(t('hcj.cancelled'), 'success'),
            onError: (e) => showToast(errMsg(e), 'error'),
          }),
      },
    ]);
  }

  function saveLokasi(value: string | null) {
    if (!hc) return;
    lokasiMut.mutate(
      { homecellId: hc.id, mapsUrl: value },
      {
        onSuccess: () => {
          setLokasiOpen(false);
          showToast(value ? t('hcj.location_saved') : t('hcj.location_removed'), 'success');
        },
        onError: (e) => showToast(errMsg(e), 'error'),
      },
    );
  }

  const jadwal = hc ? jadwalLabel(hc) : null;
  const hasMap = !!hc && (hc.hasLocation || !!hc.mapsUrl);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900" numberOfLines={1}>
            {hc?.nama ?? t('hcj.title')}
          </Text>
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : !hc ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">{t('homecell.detail_not_found')}</Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}
        >
          {/* Info utama */}
          <View className="bg-white rounded-2xl p-5 border border-neutral-100">
            <Text className="text-xl font-bold text-neutral-900">{hc.nama}</Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {hc.area.nama} · {hc.area.cabang.nama}
            </Text>
            {hc.deskripsi ? <Text className="text-sm text-neutral-700 mt-3">{hc.deskripsi}</Text> : null}

            <View className="mt-4 gap-2.5">
              {jadwal ? (
                <InfoRow icon={<Clock size={15} color="#737373" />} label={t('hcj.schedule_label')} value={jadwal} />
              ) : null}
              {hc.alamat ? (
                <InfoRow icon={<MapPin size={15} color="#737373" />} label={t('hcj.address_label')} value={hc.alamat} />
              ) : null}
              <InfoRow
                icon={<Users size={15} color="#737373" />}
                label={t('homecell.members_count')}
                value={t('hcj.members', { count: hc.memberCount })}
              />
            </View>

            {hasMap ? (
              <Pressable
                onPress={openMaps}
                className="mt-4 flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50"
              >
                <Navigation size={15} color="#2563EB" />
                <Text className="text-sm font-semibold text-blue-700">{t('hcj.open_maps')}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Pemimpin */}
          {hc.picJemaat ? (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3">
              <Avatar name={hc.picJemaat.namaLengkap} fotoUrl={hc.picJemaat.fotoUrl} size={44} />
              <View className="flex-1 min-w-0">
                <Text className="text-xs text-neutral-500">{t('homecell.pic_role_label')}</Text>
                <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                  {hc.picJemaat.namaLengkap}
                </Text>
              </View>
              {hc.picJemaat.noHp && hc.myStatus === 'MEMBER' ? (
                <Pressable
                  onPress={chatLeader}
                  className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50"
                >
                  <MessageCircle size={14} color="#059669" />
                  <Text className="text-xs font-semibold text-emerald-700">{t('hcj.chat_leader')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Status / aksi */}
          {hc.myStatus === 'MEMBER' ? (
            <StatusNote icon={<CheckCircle2 size={18} color="#059669" />} tone="emerald" text={t('hcj.you_are_member')} />
          ) : hc.myStatus === 'LEADER' ? (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 gap-3">
              <StatusNote icon={<CheckCircle2 size={18} color="#EA580C" />} tone="brand" text={t('hcj.you_are_leader')} />
              <Text className="text-xs text-neutral-500">
                {hc.hasLocation ? t('hcj.location_set') : t('hcj.location_not_set')}
              </Text>
              <Button
                label={t('hcj.set_location')}
                variant="secondary"
                leftIcon={<Settings2 size={16} color="#EA580C" />}
                onPress={() => {
                  setLokasiInput(hc.mapsUrl ?? '');
                  setLokasiOpen(true);
                }}
              />
              <Button label={t('hcj.manage')} variant="ghost" onPress={() => router.push(`/homecell/${hc.id}`)} />
            </View>
          ) : hc.myStatus === 'PENDING' ? (
            <View className="gap-2">
              <StatusNote icon={<Hourglass size={18} color="#B45309" />} tone="amber" text={t('hcj.waiting')} />
              <Button label={t('hcj.cancel_request')} variant="danger" loading={cancelMut.isPending} onPress={cancel} />
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 gap-3">
              <Text className="text-sm font-semibold text-neutral-800">{t('hcj.join_message_label')}</Text>
              <TextInput
                value={pesan}
                onChangeText={setPesan}
                placeholder={t('hcj.join_message_placeholder')}
                placeholderTextColor="#A3A3A3"
                multiline
                maxLength={500}
                className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
                style={{ minHeight: 70, textAlignVertical: 'top' }}
              />
              <Button label={t('hcj.join_btn')} loading={joinMut.isPending} onPress={join} />
            </View>
          )}

          {/* Pertemuan berikutnya */}
          <View className="bg-white rounded-2xl p-4 border border-neutral-100">
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
              {t('hcj.upcoming_section')}
            </Text>
            {hc.upcomingSchedules.length === 0 ? (
              <Text className="text-sm text-neutral-500">{t('hcj.upcoming_empty')}</Text>
            ) : (
              <View className="gap-3">
                {hc.upcomingSchedules.map((s) => (
                  <View key={s.id} className="flex-row gap-3">
                    <CalendarDays size={16} color="#EA580C" />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-neutral-900">{fmtDate(s.tanggal)}</Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">{s.lokasi}</Text>
                      {s.catatan ? <Text className="text-xs text-neutral-500 mt-0.5">{s.catatan}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Anggota (hanya untuk anggota / pemimpin) */}
          {hc.members.length > 0 ? (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100">
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                {t('hcj.members_section', { count: hc.members.length })}
              </Text>
              <View className="gap-2.5">
                {hc.members.map((m) => (
                  <View key={m.id} className="flex-row items-center gap-3">
                    <Avatar name={m.namaLengkap} fotoUrl={m.fotoUrl} size={32} />
                    <Text className="text-sm text-neutral-800 flex-1" numberOfLines={1}>
                      {m.namaLengkap}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Modal atur lokasi (pemimpin) */}
      <Modal visible={lokasiOpen} transparent animationType="fade" onRequestClose={() => setLokasiOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-5 w-full" style={{ maxWidth: 420 }}>
            <Text className="text-base font-bold text-neutral-900">{t('hcj.location_title')}</Text>
            <Text className="text-xs text-neutral-500 mt-1 mb-3">{t('hcj.location_help')}</Text>
            <TextInput
              value={lokasiInput}
              onChangeText={setLokasiInput}
              placeholder={t('hcj.location_placeholder')}
              placeholderTextColor="#A3A3A3"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
            />
            <View className="gap-2 mt-4">
              <Button
                label={t('common.save')}
                loading={lokasiMut.isPending}
                disabled={!lokasiInput.trim()}
                onPress={() => saveLokasi(lokasiInput.trim())}
              />
              {hc?.hasLocation ? (
                <Button label={t('hcj.location_remove')} variant="ghost" onPress={() => saveLokasi(null)} />
              ) : null}
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setLokasiOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text className="text-[11px] text-neutral-500">{label}</Text>
        <Text className="text-sm text-neutral-800">{value}</Text>
      </View>
    </View>
  );
}

function StatusNote({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: 'emerald' | 'amber' | 'brand';
}) {
  const bg = { emerald: 'bg-emerald-50', amber: 'bg-amber-50', brand: 'bg-brand-50' }[tone];
  const fg = { emerald: 'text-emerald-800', amber: 'text-amber-900', brand: 'text-brand-800' }[tone];
  return (
    <View className={`rounded-2xl p-4 flex-row items-center gap-3 ${bg}`}>
      {icon}
      <Text className={`flex-1 text-sm font-semibold ${fg}`}>{text}</Text>
    </View>
  );
}
