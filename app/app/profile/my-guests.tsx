/**
 * Tamu Saya — teman yang pernah saya undang ke ibadah / event, beserta
 * status tindak lanjutnya (diperbarui tim ECC di portal):
 *   Diundang · Sudah terlibat event/ibadah · Sedang di-follow-up ECC · Sudah terdaftar di ECC
 * Tamu bisa dihapus dari daftar saya (data kehadiran tetap tersimpan).
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Church, Phone, Ticket, Trash2, UserCheck, UserPlus, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { AddTamuModal } from '@/components/tamu/AddTamuModal';
import { listMyTamu, removeMyTamu, type Tamu, type TamuStatus } from '@/api/tamu';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatInstantDate } from '@/utils/time';
import { formatDateWithDay } from '@/utils/date';
import { formatPhoneDisplay } from '@/utils/phone';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';

const STATUS_STYLE: Record<TamuStatus, { bg: string; fg: string }> = {
  DIUNDANG: { bg: 'bg-neutral-100', fg: 'text-neutral-700' },
  TERLIBAT: { bg: 'bg-sky-100', fg: 'text-sky-700' },
  FOLLOWUP: { bg: 'bg-amber-100', fg: 'text-amber-800' },
  TERDAFTAR: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
};
const ORDER: TamuStatus[] = ['DIUNDANG', 'TERLIBAT', 'FOLLOWUP', 'TERDAFTAR'];

export default function MyGuestsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [adding, setAdding] = useState(false);

  const q = useQuery({ queryKey: ['tamu', 'mine'], queryFn: listMyTamu });
  useRefetchOnFocus(() => q.refetch());
  const rows = q.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => removeMyTamu(id),
    onSuccess: () => {
      showToast(t('guests.removed'), 'success');
      void qc.invalidateQueries({ queryKey: ['tamu', 'mine'] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : t('error.generic'), 'error'),
  });

  function askRemove(g: Tamu) {
    Alert.alert(t('guests.remove_title'), t('guests.remove_body', { name: g.namaLengkap }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('guests.remove_confirm'), style: 'destructive', onPress: () => remove.mutate(g.id) },
    ]);
  }

  const counts = ORDER.map((s) => ({ s, n: rows.filter((r) => (r.status ?? 'DIUNDANG') === s).length }));

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('guests.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('guests.subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : q.isError ? (
          <View className="py-16 items-center">
            <Text className="text-sm text-red-600 mb-2">{t('error.generic')}</Text>
            <Pressable onPress={() => q.refetch()}>
              <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : rows.length === 0 ? (
          <View className="py-16 items-center px-6">
            <View className="w-16 h-16 rounded-2xl bg-violet-50 items-center justify-center mb-3">
              <Users size={28} color="#7C3AED" />
            </View>
            <Text className="text-sm font-bold text-neutral-900 text-center mb-1">{t('guests.empty_title')}</Text>
            <Text className="text-xs text-neutral-500 text-center">{t('guests.empty_body')}</Text>
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {counts
                .filter((c) => c.n > 0)
                .map((c) => (
                  <View key={c.s} className={`px-2.5 py-1 rounded-full ${STATUS_STYLE[c.s].bg}`}>
                    <Text className={`text-[11px] font-semibold ${STATUS_STYLE[c.s].fg}`}>
                      {t(`guests.status_${c.s}`)}: {c.n}
                    </Text>
                  </View>
                ))}
            </View>
            <View className="gap-2">
              {rows.map((g) => {
                const st = g.status ?? 'DIUNDANG';
                return (
                  <View key={g.id} className="bg-card rounded-2xl border border-neutral-100 p-4">
                    <View className="flex-row gap-3">
                      <Avatar size={40} name={g.namaLengkap} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-bold text-neutral-900">{g.namaLengkap}</Text>
                        {g.noHp ? (
                          <View className="flex-row items-center gap-1.5 mt-1">
                            <Phone size={12} color={nc('#737373')} />
                            <Text className="text-xs text-neutral-600">{formatPhoneDisplay(g.noHp)}</Text>
                          </View>
                        ) : null}
                        {g.addedAt ? (
                          <View className="flex-row items-center gap-1.5 mt-1">
                            <UserPlus size={12} color={nc('#737373')} />
                            <Text className="text-xs text-neutral-600">
                              {t('guests.invited_on', { date: formatInstantDate(g.addedAt, i18n.language) })}
                            </Text>
                          </View>
                        ) : null}
                        <View className={`self-start px-2 py-0.5 rounded-full mt-2 ${STATUS_STYLE[st].bg}`}>
                          <Text className={`text-[11px] font-bold ${STATUS_STYLE[st].fg}`}>{t(`guests.status_${st}`)}</Text>
                        </View>
                        {g.followupBy ? (
                          <View className="flex-row items-start gap-1.5 mt-2">
                            <UserCheck size={12} color={nc('#B45309')} style={{ marginTop: 2 }} />
                            <Text className="flex-1 text-xs text-amber-800">
                              {t('guests.followup_by', { name: g.followupBy.namaLengkap })}
                              {g.followupSejak ? ` · ${t('guests.since', { date: formatInstantDate(g.followupSejak, i18n.language) })}` : ''}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => askRemove(g)}
                        disabled={remove.isPending}
                        hitSlop={8}
                        className="w-9 h-9 rounded-full items-center justify-center active:bg-red-50"
                        accessibilityLabel={t('guests.remove_confirm')}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </Pressable>
                    </View>

                    {/* Kehadiran terakhir */}
                    <View className="mt-3 rounded-xl bg-neutral-50 px-3 py-2.5 flex-row gap-2.5">
                      {g.terakhirAcara?.jenis === 'EVENT' ? (
                        <Ticket size={16} color="#7C3AED" style={{ marginTop: 1 }} />
                      ) : (
                        <Church size={16} color={g.terakhirAcara ? '#EA580C' : nc('#A3A3A3')} style={{ marginTop: 1 }} />
                      )}
                      <View className="flex-1 min-w-0">
                        {g.terakhirAcara ? (
                          <>
                            <Text className="text-[11px] text-neutral-500">
                              {t(g.terakhirAcara.jenis === 'EVENT' ? 'guests.last_event' : 'guests.last_ibadah')}
                            </Text>
                            <Text className="text-sm font-semibold text-neutral-900">{g.terakhirAcara.nama}</Text>
                            <Text className="text-xs text-neutral-600 mt-0.5">
                              {g.terakhirAcara.jenis === 'EVENT'
                                ? formatInstantDate(g.terakhirAcara.tanggal, i18n.language)
                                : formatDateWithDay(g.terakhirAcara.tanggal, i18n.language)}
                              {g.kehadiran ? ` · ${t('guests.attended_total', { count: g.kehadiran })}` : ''}
                            </Text>
                          </>
                        ) : (
                          <Text className="text-xs text-neutral-500">{t('guests.not_attended')}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            <Text className="text-[11px] text-neutral-400 mt-4 leading-4">{t('guests.footnote')}</Text>
          </>
        )}
      </ScrollView>

      <View className="absolute left-0 right-0 bottom-0 bg-card border-t border-neutral-100 px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button label={t('tamu.add_btn_long')} onPress={() => setAdding(true)} leftIcon={<UserPlus size={16} color="#fff" />} fullWidth />
      </View>

      <AddTamuModal visible={adding} onClose={() => setAdding(false)} onAdded={() => setAdding(false)} />
    </View>
  );
}
