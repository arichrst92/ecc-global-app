/**
 * Reservasi ibadah mandiri: pilih tanggal (≤ 30 hari ke depan) lalu centang
 * siapa saja (saya, keluarga, tamu). Yang sudah terdaftar bisa dibatalkan
 * sampai jam mulai ibadah.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, CheckCircle2, UserPlus, X } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { AddTamuModal } from '@/components/tamu/AddTamuModal';
import { cancelReservasiFor, getReservasiOptions, postReservasi, type ReservasiMember } from '@/api/ibadah';
import { formatDateWithDay } from '@/utils/date';
import { formatVenueRange } from '@/utils/time';
import { gx } from '@/theme/gradient';

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export function ReservasiModal({
  ibadahId,
  visible,
  onClose,
}: {
  ibadahId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();
  const [tanggal, setTanggal] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  const q = useQuery({
    queryKey: ['reservasi-options', ibadahId, tanggal],
    queryFn: () => getReservasiOptions(ibadahId, tanggal),
    enabled: visible,
    staleTime: 0,
  });
  const d = q.data;
  const current = d?.selected ?? null;

  // Tanggal default = pertemuan terdekat yang masih bisa direservasi.
  useEffect(() => {
    if (!visible) {
      setTanggal(null);
      setSelected([]);
    }
  }, [visible]);
  useEffect(() => {
    if (!d) return;
    const self = d.members.find((m) => m.isSelf && canPick(m));
    setSelected(self ? [self.id] : []);
  }, [d?.selected?.tanggal]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = () => {
    void q.refetch();
    void qc.invalidateQueries({ queryKey: ['my-reservasi'] });
  };

  const reserve = useMutation({
    mutationFn: () => postReservasi(ibadahId, current!.tanggal, selected),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => x.result === 'RESERVED').map((x) => x.namaLengkap);
      const failed = r.results.filter((x) => x.result === 'FAILED');
      if (ok.length) showToast(t('reservasi.success', { names: ok.join(', ') }), 'success');
      else if (failed.length) showToast(failed.map((f) => `${f.namaLengkap}: ${f.message ?? ''}`).join('\n'), 'error');
      else showToast(t('reservasi.already'), 'info');
      setSelected([]);
      refreshAll();
    },
    onError: (e) => showToast(errMsg(e, t('error.generic')), 'error'),
  });

  const cancel = useMutation({
    mutationFn: (ids: string[]) => cancelReservasiFor(ibadahId, current!.tanggal, ids),
    onSuccess: () => {
      showToast(t('reservasi.cancelled'), 'success');
      refreshAll();
    },
    onError: (e) => showToast(errMsg(e, t('error.generic')), 'error'),
  });

  function askCancel(m: ReservasiMember) {
    Alert.alert(t('reservasi.cancel_title'), t('reservasi.cancel_body', { name: m.namaLengkap }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('reservasi.cancel_confirm'), style: 'destructive', onPress: () => cancel.mutate([m.id]) },
    ]);
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const open = !!current?.open;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center mb-1">
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
              <CalendarPlus size={20} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-neutral-900">{t('reservasi.title')}</Text>
              {d ? (
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {d.ibadah.nama} · {formatVenueRange(current?.tanggal ?? null, d.ibadah.jamMulai, d.ibadah.jamSelesai, d.timezone, '–')}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} className="w-9 h-9 items-center justify-center">
              <X size={20} color="#737373" />
            </Pressable>
          </View>

          {q.isPending ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#F97316" />
            </View>
          ) : q.isError || !d ? (
            <View className="py-10 items-center">
              <Text className="text-sm text-red-600 mb-2">{errMsg(q.error, t('error.generic'))}</Text>
              <Pressable onPress={() => q.refetch()}>
                <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : d.occurrences.length === 0 ? (
            <Text className="text-sm text-neutral-500 text-center py-10">{t('reservasi.no_schedule')}</Text>
          ) : (
            <>
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-4 mb-2">
                {t('reservasi.pick_date')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {d.occurrences.map((o) => {
                  const on = current?.tanggal === o.tanggal;
                  return (
                    <Pressable
                      key={o.tanggal}
                      disabled={o.cancelled}
                      onPress={() => setTanggal(o.tanggal)}
                      {...gx(`px-3 py-2 rounded-xl border ${
                        o.cancelled
                          ? 'bg-neutral-50 border-neutral-200 opacity-50'
                          : on
                            ? 'bg-brand-500 border-brand-500'
                            : 'bg-white border-neutral-200'
                      }`)}
                    >
                      <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-800'}`}>
                        {formatDateWithDay(o.tanggal, i18n.language)}
                      </Text>
                      {o.cancelled ? (
                        <Text className="text-[10px] text-red-600">{t('reservasi.date_cancelled')}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-4 mb-2">
                {t('reservasi.who')}
              </Text>
              <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
                {d.members.map((m) => {
                  const reserved = m.status === 'RESERVE';
                  const joined = m.status === 'JOIN';
                  const blocked = !m.eligible;
                  const on = selected.includes(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      disabled={!open || !canPick(m)}
                      onPress={() => toggle(m.id)}
                      className={`flex-row items-center gap-3 p-3 rounded-2xl border ${
                        reserved || joined
                          ? 'bg-green-50 border-green-100'
                          : blocked
                            ? 'bg-neutral-50 border-neutral-200 opacity-60'
                            : on
                              ? 'bg-brand-50 border-brand-300'
                              : 'bg-white border-neutral-200'
                      }`}
                    >
                      <Avatar name={m.namaLengkap} fotoUrl={m.fotoUrl} size={36} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                          {m.namaLengkap}
                          {m.isSelf ? ` (${t('ibadah.self_checkin_me')})` : ''}
                        </Text>
                        <Text
                          className={`text-xs ${reserved || joined ? 'text-green-700' : blocked ? 'text-amber-700' : 'text-neutral-500'}`}
                          numberOfLines={1}
                        >
                          {joined
                            ? t('reservasi.status_joined')
                            : reserved
                              ? t('reservasi.status_reserved')
                              : blocked
                                ? t('reservasi.kids_only')
                                : (m.relasi ?? '')}
                        </Text>
                      </View>
                      {reserved && open ? (
                        <Pressable
                          onPress={() => askCancel(m)}
                          disabled={cancel.isPending}
                          className="px-2.5 py-1 rounded-full border border-red-200 bg-white"
                        >
                          <Text className="text-[11px] font-semibold text-red-600">{t('reservasi.cancel_btn')}</Text>
                        </Pressable>
                      ) : reserved || joined ? (
                        <CheckCircle2 size={20} color="#16A34A" />
                      ) : blocked ? null : (
                        <View
                          {...gx(`w-6 h-6 rounded-md border-2 items-center justify-center ${
                            on ? 'bg-brand-500 border-brand-500' : 'border-neutral-300'
                          }`)}
                        >
                          {on ? <Check size={14} color="#fff" /> : null}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {!d.ibadah.isKidsIbadah ? (
                <Pressable
                  onPress={() => setAddGuestOpen(true)}
                  className="flex-row items-center justify-center gap-1.5 py-2.5 mt-2 rounded-xl border border-dashed border-violet-300 bg-violet-50"
                >
                  <UserPlus size={15} color="#7C3AED" />
                  <Text className="text-sm font-semibold text-violet-700">{t('tamu.add_btn_long')}</Text>
                </Pressable>
              ) : null}

              <Text className="text-[11px] text-neutral-500 text-center mt-3">{t('reservasi.note')}</Text>

              <View className="mt-4">
                <Button
                  label={selected.length ? t('reservasi.submit_n', { count: selected.length }) : t('reservasi.submit')}
                  loading={reserve.isPending}
                  disabled={!open || selected.length === 0}
                  onPress={() => reserve.mutate()}
                  leftIcon={<CalendarPlus size={16} color="#fff" />}
                  fullWidth
                  singleLine
                  size="lg"
                />
              </View>
            </>
          )}
        </View>
      </View>
      <AddTamuModal
        visible={addGuestOpen}
        onClose={() => setAddGuestOpen(false)}
        onAdded={(g) => {
          setAddGuestOpen(false);
          void q.refetch().then(() => setSelected((s) => (s.includes(g.id) ? s : [...s, g.id])));
        }}
      />
    </Modal>
  );
}

const canPick = (m: ReservasiMember) => m.eligible && (m.status === 'NONE' || m.status === 'CANCEL');
