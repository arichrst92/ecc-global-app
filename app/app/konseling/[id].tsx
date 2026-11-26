/**
 * Detail konseling (2.5.1).
 *   /konseling/:id              → pemohon: status, konselor, jadwal, batalkan
 *   /konseling/:id?as=konselor  → konselor: data jemaat, kontak (WA/telepon/email),
 *                                 tetapkan jadwal, tandai selesai, kembalikan ke admin
 */
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarClock, Lock, Mail, MessageCircle, Phone, UserCheck } from 'lucide-react-native';

import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { appAlert } from '@/components/ui/AppDialog';
import { DateTimeField, KonselingStatusBadge, fmtWhen } from '@/components/konseling/KonselingBits';
import {
  cancelMyKonseling,
  doneKonseling,
  getAssignedKonseling,
  getMyKonseling,
  releaseKonseling,
  scheduleKonseling,
  type AssignedKonseling,
  type Konseling,
} from '@/api/konseling';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function KonselingDetailScreen() {
  const { id, as } = useLocalSearchParams<{ id: string; as?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const asKonselor = as === 'konselor';
  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{asKonselor ? t('konseling.assigned_title') : t('konseling.detail_title')}</Text>
        </View>
      </SafeAreaView>
      {asKonselor ? <KonselorView id={id} /> : <OwnerView id={id} />}
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-[11px] font-semibold text-neutral-500 uppercase">{title}</Text>
      {children}
    </View>
  );
}

function Loading({ q }: { q: { isPending: boolean; isError: boolean; error: unknown } }) {
  const { t } = useTranslation();
  if (q.isPending) return <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />;
  return <Text className="text-sm text-red-600 text-center p-8">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>;
}

function RequestCard({ d }: { d: Konseling | AssignedKonseling }) {
  const { t, i18n } = useTranslation();
  return (
    <View className="bg-card rounded-2xl border border-neutral-100 p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-[11px] text-neutral-400 flex-1">{fmtWhen(d.createdAt, i18n.language)}</Text>
        <KonselingStatusBadge status={d.status} />
      </View>
      <Block title={t('konseling.pokok_label')}>
        <Text className="text-sm text-neutral-900">{d.pokokMasalah}</Text>
      </Block>
      <Block title={t('konseling.harapan_label')}>
        <Text className="text-sm text-neutral-900">{d.harapan}</Text>
      </Block>
      <Block title={t('konseling.jadwal_label')}>
        <Text className="text-sm text-neutral-900">{d.jadwalUsulan ? fmtWhen(d.jadwalUsulan, i18n.language) : t('konseling.no_proposal')}</Text>
        {d.catatanJadwal ? <Text className="text-xs text-neutral-500">{d.catatanJadwal}</Text> : null}
      </Block>
      <Block title={t('konseling.pref_label')}>
        <Text className="text-sm text-neutral-900">{t(`konseling.pref_${d.preferensiGender}`)}</Text>
      </Block>
    </View>
  );
}

function ScheduleBox({ d, lang }: { d: { status: string; jadwalFinal: string | null; catatanKonselor: string | null }; lang: string }) {
  const { t } = useTranslation();
  if (!d.jadwalFinal && !d.catatanKonselor) return null;
  return (
    <View className="bg-violet-50 border border-violet-200 rounded-2xl p-4 gap-1">
      {d.jadwalFinal ? (
        <View className="flex-row items-center gap-2">
          <CalendarClock size={16} color="#7C3AED" />
          <Text className="text-sm font-bold text-violet-800">{fmtWhen(d.jadwalFinal, lang)}</Text>
        </View>
      ) : null}
      {d.catatanKonselor ? (
        <Text className="text-xs text-violet-900">
          {t('konseling.counselor_note')}: {d.catatanKonselor}
        </Text>
      ) : null}
    </View>
  );
}

function OwnerView({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const q = useQuery({ queryKey: ['konseling', 'mine', id], queryFn: () => getMyKonseling(id) });
  const cancel = useMutation({
    mutationFn: () => cancelMyKonseling(id, null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['konseling'] });
      showToast(t('konseling.cancelled'), 'success');
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const d = q.data;
  if (!d) return <Loading q={q} />;
  const statusText =
    d.status === 'BARU'
      ? t('konseling.info_BARU')
      : d.status === 'DITUGASKAN'
        ? t('konseling.info_DITUGASKAN', { name: d.konselor?.namaLengkap ?? '' })
        : d.status === 'DIJADWALKAN'
          ? t('konseling.info_DIJADWALKAN', { name: d.konselor?.namaLengkap ?? '' })
          : d.status === 'SELESAI'
            ? t('konseling.info_SELESAI')
            : d.dibatalkanOleh === 'JEMAAT'
              ? t('konseling.info_cancel_self')
              : t('konseling.info_cancel_admin') + (d.alasanBatal ? ` ${d.alasanBatal}` : '');
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 12 }}>
      <View className="bg-card rounded-2xl border border-neutral-100 p-4 flex-row gap-3 items-center">
        {d.konselor ? <Avatar fotoUrl={d.konselor.fotoUrl} name={d.konselor.namaLengkap} size={44} /> : <View className="w-11 h-11 rounded-full bg-amber-50 items-center justify-center"><UserCheck size={20} color="#B45309" /></View>}
        <View className="flex-1">
          {d.konselor ? <Text className="text-sm font-bold text-neutral-900">{d.konselor.namaLengkap}</Text> : null}
          <Text className="text-xs text-neutral-600">{statusText}</Text>
        </View>
      </View>
      <ScheduleBox d={d} lang={i18n.language} />
      <RequestCard d={d} />
      <View className="flex-row items-start gap-2 px-1">
        <Lock size={12} color={nc('#A3A3A3')} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11px] text-neutral-500">
          {t('konseling.shared_contact', { contact: [d.kontakNoHp, d.kontakEmail].filter(Boolean).join(' · ') })}
        </Text>
      </View>
      {d.canCancel ? (
        <Button
          label={t('konseling.cancel')}
          variant="secondary"
          loading={cancel.isPending}
          onPress={() =>
            appAlert(t('konseling.cancel_title'), t('konseling.cancel_body'), [
              { text: t('common.back'), style: 'cancel' },
              { text: t('konseling.cancel'), style: 'destructive', onPress: () => cancel.mutate() },
            ])
          }
          fullWidth
        />
      ) : null}
    </ScrollView>
  );
}

function KonselorView({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const q = useQuery({ queryKey: ['konseling', 'assigned', 'detail', id], queryFn: () => getAssignedKonseling(id) });
  /** undefined = belum diubah → pakai jadwal final / usulan jemaat. */
  const [jadwal, setJadwal] = useState<string | null | undefined>(undefined);
  const [catatan, setCatatan] = useState('');
  const [editing, setEditing] = useState(false);
  const onErr = (e: unknown) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
  const refresh = () => qc.invalidateQueries({ queryKey: ['konseling'] });
  const schedule = useMutation({
    mutationFn: () => scheduleKonseling(id, pickedJadwal!, catatan.trim() || null),
    onSuccess: () => {
      refresh();
      setEditing(false);
      showToast(t('konseling.schedule_saved'), 'success');
    },
    onError: onErr,
  });
  const done = useMutation({
    mutationFn: () => doneKonseling(id, null),
    onSuccess: () => {
      refresh();
      showToast(t('konseling.marked_done'), 'success');
    },
    onError: onErr,
  });
  const release = useMutation({
    mutationFn: () => releaseKonseling(id, null),
    onSuccess: () => {
      refresh();
      showToast(t('konseling.released'), 'success');
      goBack(router);
    },
    onError: onErr,
  });

  const d = q.data;
  if (!d) return <Loading q={q} />;
  const open = d.status === 'DITUGASKAN' || d.status === 'DIJADWALKAN';
  const wa = d.kontak.noHp ? d.kontak.noHp.replace(/[^\d]/g, '') : null;
  const j = d.jemaat;
  const showForm = open && (editing || d.status === 'DITUGASKAN');
  const prefill = d.jadwalFinal ?? (d.jadwalUsulan && new Date(d.jadwalUsulan).getTime() > Date.now() ? d.jadwalUsulan : null);
  const pickedJadwal = jadwal === undefined ? prefill : jadwal;

  return (
    <KeyboardSafeView className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View className="bg-card rounded-2xl border border-neutral-100 p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <Avatar fotoUrl={j?.fotoUrl ?? null} name={j?.namaLengkap ?? '?'} size={48} />
            <View className="flex-1 min-w-0">
              <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                {j?.namaLengkap ?? '—'}
              </Text>
              <Text className="text-xs text-neutral-500">
                {[j?.jenisKelamin === 'L' ? t('konseling.male') : j?.jenisKelamin === 'P' ? t('konseling.female') : null, j?.usia != null ? t('konseling.age', { n: j.usia }) : null, j?.cabang]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            {wa ? (
              <ContactBtn icon={<MessageCircle size={16} color="#16A34A" />} label="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${wa}`).catch(() => {})} />
            ) : null}
            {d.kontak.noHp ? <ContactBtn icon={<Phone size={16} color="#2563EB" />} label={t('konseling.call')} onPress={() => Linking.openURL(`tel:${d.kontak.noHp}`).catch(() => {})} /> : null}
            {d.kontak.email ? <ContactBtn icon={<Mail size={16} color="#EA580C" />} label="Email" onPress={() => Linking.openURL(`mailto:${d.kontak.email}`).catch(() => {})} /> : null}
          </View>
          <Text className="text-[11px] text-neutral-500">
            {[d.kontak.noHp, d.kontak.email].filter(Boolean).join(' · ')} — {t('konseling.consented_at', { date: fmtWhen(d.kontak.disetujuiAt, i18n.language) })}
          </Text>
        </View>

        {!showForm ? <ScheduleBox d={d} lang={i18n.language} /> : null}
        <RequestCard d={d} />

        {showForm ? (
          <View className="bg-card rounded-2xl border border-neutral-100 p-4 gap-3">
            <Text className="text-sm font-bold text-neutral-900">{t('konseling.set_schedule')}</Text>
            <DateTimeField value={prefill} onChange={setJadwal} />
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              multiline
              maxLength={2000}
              placeholder={t('konseling.schedule_note_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              className="bg-card rounded-xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            <Button
              label={t('konseling.save_schedule')}
              loading={schedule.isPending}
              disabled={!pickedJadwal}
              onPress={() => schedule.mutate()}
              fullWidth
            />
            {jadwal === undefined && prefill && d.status === 'DITUGASKAN' ? <Text className="text-[11px] text-neutral-500">{t('konseling.pick_to_confirm')}</Text> : null}
          </View>
        ) : null}

        {open ? (
          <View className="gap-2">
            {d.status === 'DIJADWALKAN' && !editing ? (
              <Button
                label={t('konseling.reschedule')}
                variant="secondary"
                onPress={() => {
                  setCatatan(d.catatanKonselor ?? '');
                  setEditing(true);
                }}
                fullWidth
              />
            ) : null}
            <Button
              label={t('konseling.mark_done')}
              variant="secondary"
              loading={done.isPending}
              onPress={() =>
                appAlert(t('konseling.done_title'), t('konseling.done_body'), [
                  { text: t('common.back'), style: 'cancel' },
                  { text: t('konseling.mark_done'), onPress: () => done.mutate() },
                ])
              }
              fullWidth
            />
            <Pressable
              disabled={release.isPending}
              onPress={() =>
                appAlert(t('konseling.release_title'), t('konseling.release_body'), [
                  { text: t('common.back'), style: 'cancel' },
                  { text: t('konseling.release'), style: 'destructive', onPress: () => release.mutate() },
                ])
              }
              className="py-3 items-center"
            >
              <Text className="text-sm font-semibold text-red-600">{t('konseling.release')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardSafeView>
  );
}

function ContactBtn({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    // Ikon di atas label: 3 tombol tetap muat di HP 320–360dp.
    <Pressable onPress={onPress} className="flex-1 items-center justify-center gap-1 border border-neutral-200 rounded-xl py-2 px-1 active:opacity-70">
      {icon}
      <Text className="text-xs font-semibold text-neutral-800" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
