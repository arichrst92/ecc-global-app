/**
 * Section "Tamu" di halaman homecell (pemimpin / PIC area): daftar tamu yang
 * berkunjung, tambah tamu, hubungi via WhatsApp, hapus dari daftar homecell.
 * Tamu juga tampil di menu Tamu portal (sumber: homecell).
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Trash2, UserPlus } from 'lucide-react-native';

import { listHomecellTamu, removeHomecellTamu } from '@/api/tamu';
import { AddTamuModal } from '@/components/tamu/AddTamuModal';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { formatDateWithDay } from '@/utils/date';
import { nc } from '@/theme/ThemeRoot';

const STATUS_STYLE: Record<string, [string, string]> = {
  DIUNDANG: ['bg-neutral-100', 'text-neutral-600'],
  TERLIBAT: ['bg-blue-100', 'text-blue-700'],
  FOLLOWUP: ['bg-amber-100', 'text-amber-800'],
  TERDAFTAR: ['bg-emerald-100', 'text-emerald-700'],
};

export function HomecellTamuSection({ homecellId }: { homecellId: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [adding, setAdding] = useState(false);
  const key = ['homecell', 'tamu', homecellId];
  const q = useQuery({ queryKey: key, queryFn: () => listHomecellTamu(homecellId) });
  const remove = useMutation({
    mutationFn: (tamuId: string) => removeHomecellTamu(homecellId, tamuId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const list = q.data ?? [];

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {t('hcj.tamu_section', { count: list.length })}
        </Text>
        <Pressable onPress={() => setAdding(true)} className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100">
          <UserPlus size={13} color="#7C3AED" />
          <Text className="text-[11px] font-bold text-violet-700">{t('hcj.tamu_add')}</Text>
        </Pressable>
      </View>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" />
      ) : list.length === 0 ? (
        <View className="bg-card rounded-2xl p-4 border border-dashed border-neutral-300 items-center">
          <Text className="text-xs text-neutral-500 text-center">{t('hcj.tamu_empty')}</Text>
        </View>
      ) : (
        <View className="gap-2">
          {list.map((g) => {
            const [bg, fg] = STATUS_STYLE[g.status ?? 'DIUNDANG'] ?? STATUS_STYLE.DIUNDANG!;
            return (
              <View key={g.id} className="bg-card rounded-2xl p-3 border border-neutral-100">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center">
                    <Text className="text-sm font-bold text-violet-700">{g.namaLengkap.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
                        {g.namaLengkap}
                      </Text>
                      {g.statusLabel ? (
                        <View className={`px-1.5 py-0.5 rounded-full ${bg}`}>
                          <Text className={`text-[9px] font-bold ${fg}`}>{g.statusLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-[11px] text-neutral-500 mt-0.5">
                      {g.addedAt ? t('hcj.tamu_added', { date: formatDateWithDay(g.addedAt.slice(0, 10), i18n.language) }) : ''}
                      {g.kehadiran ? ` · ${t('guests.attended_total', { count: g.kehadiran })}` : ''}
                    </Text>
                    {g.catatan ? (
                      <Text className="text-[11px] text-neutral-600 mt-0.5" numberOfLines={2}>
                        {g.catatan}
                      </Text>
                    ) : null}
                  </View>
                  {g.noHp ? (
                    <Pressable
                      onPress={() => Linking.openURL(`https://wa.me/${g.noHp!.replace(/^\+/, '')}`).catch(() => {})}
                      className="w-9 h-9 rounded-full bg-green-50 items-center justify-center"
                      accessibilityLabel="WhatsApp"
                    >
                      <MessageCircle size={14} color="#16A34A" />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() =>
                      Alert.alert(t('hcj.tamu_remove_title'), t('hcj.tamu_remove_body', { name: g.namaLengkap }), [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(g.id) },
                      ])
                    }
                    className="w-9 h-9 rounded-full items-center justify-center"
                    accessibilityLabel={t('common.delete')}
                  >
                    <Trash2 size={14} color={nc('#DC2626')} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Text className="text-[10px] text-neutral-400 mt-2">{t('hcj.tamu_footnote')}</Text>

      <AddTamuModal
        visible={adding}
        homecellId={homecellId}
        onClose={() => setAdding(false)}
        onAdded={(g) => {
          setAdding(false);
          showToast(g.isReturning ? t('hcj.tamu_added_returning', { name: g.namaLengkap }) : t('hcj.tamu_added_ok', { name: g.namaLengkap }), 'success');
        }}
      />
    </View>
  );
}
