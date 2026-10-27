/**
 * Section "Tamu hadir" di detail pertemuan homecell.
 * Kehadiran tamu dicatat TERPISAH dari anggota — tidak ikut progress /
 * % kehadiran. Tamu homecell yang belum hadir tampil sebagai chip (ketuk =
 * tandai hadir); "Tamu baru" mencatat tamu ke homecell lalu langsung hadir.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UserPlus, X } from 'lucide-react-native';

import { AddTamuModal } from '@/components/tamu/AddTamuModal';
import { useToast } from '@/components/ui/Toast';
import { useTamuHadir } from '@/hooks/useHomecellSchedules';
import { ApiError } from '@/types/api';
import type { HomecellScheduleDetail } from '@/types/homecellSchedule';
import { nc } from '@/theme/ThemeRoot';

export function ScheduleTamuSection({ homecellId, schedule }: { homecellId: string; schedule: HomecellScheduleDetail }) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const { mark, unmark } = useTamuHadir(homecellId, schedule.id);
  const [adding, setAdding] = useState(false);
  const hadir = schedule.tamuAttendances ?? [];
  const belum = schedule.tamuBelumHadir ?? [];
  const onErr = (e: unknown) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');

  const markOne = (id: string, name: string) =>
    mark.mutate([id], { onSuccess: () => showToast(t('hcj.tamu_marked', { name }), 'success'), onError: onErr });

  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {t('hcj.tamu_hadir_section', { count: hadir.length })}
        </Text>
        <Pressable onPress={() => setAdding(true)} className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50">
          <UserPlus size={13} color="#0D9488" />
          <Text className="text-[11px] font-bold text-teal-700">{t('hcj.tamu_new_hadir')}</Text>
        </Pressable>
      </View>
      <Text className="text-[11px] text-neutral-400 mb-2">{t('hcj.tamu_hadir_note')}</Text>

      {hadir.length === 0 ? (
        <Text className="text-sm text-neutral-500 mb-2">{t('hcj.tamu_hadir_empty')}</Text>
      ) : (
        <View className="gap-2 mb-2">
          {hadir.map((a) => (
            <View key={a.id} className="bg-card rounded-2xl p-3 flex-row items-center gap-3 border border-teal-100">
              <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center">
                <Text className="text-sm font-bold text-teal-700">{a.tamu.namaLengkap.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                  {a.tamu.namaLengkap}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">{a.tamu.noHp ?? '—'}</Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert(t('hcj.tamu_unmark_title'), t('hcj.tamu_unmark_body', { name: a.tamu.namaLengkap }), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.delete'), style: 'destructive', onPress: () => unmark.mutate(a.tamu.id, { onError: onErr }) },
                  ])
                }
                className="w-9 h-9 rounded-full items-center justify-center"
                accessibilityLabel={t('common.delete')}
              >
                <X size={16} color={nc('#DC2626')} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {belum.length > 0 ? (
        <>
          <Text className="text-[11px] font-semibold text-neutral-500 mt-1 mb-1.5">{t('hcj.tamu_belum_hadir')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {belum.map((g) => (
              <Pressable
                key={g.id}
                disabled={mark.isPending}
                onPress={() => markOne(g.id, g.namaLengkap)}
                className="flex-row items-center gap-1 pl-2 pr-3 py-1.5 rounded-full border border-teal-200 bg-card active:bg-teal-50"
              >
                <Plus size={13} color="#0D9488" />
                <Text className="text-xs font-semibold text-neutral-800" numberOfLines={1}>
                  {g.namaLengkap}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <AddTamuModal
        visible={adding}
        homecellId={homecellId}
        onClose={() => setAdding(false)}
        onAdded={(g) => {
          setAdding(false);
          markOne(g.id, g.namaLengkap);
        }}
      />
    </View>
  );
}
