/**
 * Daftar jemaat yang sudah hadir di halaman scanner (ibadah / event).
 *
 * Filter: "Discan petugas" (scan QR, input manual, tamu walk-in) atau
 * "Semua hadir" (termasuk self check-in & diubah admin). Terbaru di atas,
 * bisa dicari nama / kode. Data diperbarui tiap 10 detik selama terbuka.
 */
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListChecks, Search, X } from 'lucide-react-native';

import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { Avatar } from '@/components/ui/Avatar';
import { getEventCheckinList, getIbadahCheckinList, type ScanListItem } from '@/api/scanner';
import { useDebounce } from '@/hooks/useDebounce';
import { localTime } from '@/utils/time';
import { nc } from '@/theme/ThemeRoot';

type Target = { kind: 'ibadah'; ibadahId: string; tanggalIbadah: string } | { kind: 'event'; eventId: string };

const BY_PETUGAS = new Set(['SCAN', 'WALK_IN']);

export function scanListKey(target: Target) {
  return target.kind === 'ibadah'
    ? ['scanner', 'list', 'ibadah', target.ibadahId, target.tanggalIbadah]
    : ['scanner', 'list', 'event', target.eventId];
}

export function ScanListModal({
  visible,
  onClose,
  target,
}: {
  visible: boolean;
  onClose: () => void;
  target: Target;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [onlyPetugas, setOnlyPetugas] = useState(true);
  const q = useDebounce(text.trim(), 300);

  const list = useQuery({
    queryKey: [...scanListKey(target), q],
    queryFn: () =>
      target.kind === 'ibadah'
        ? getIbadahCheckinList(target.ibadahId, target.tanggalIbadah, q || undefined)
        : getEventCheckinList(target.eventId, q || undefined),
    enabled: visible,
    refetchInterval: visible ? 10_000 : false,
    staleTime: 5_000,
  });

  const all = list.data ?? [];
  // Data lama tanpa `method` dianggap discan petugas.
  const data = onlyPetugas ? all.filter((r) => !r.method || BY_PETUGAS.has(r.method)) : all;

  function close() {
    setText('');
    onClose();
  }

  function methodLabel(r: ScanListItem): string | null {
    if (r.guest && r.method === 'WALK_IN') return t('scanner.list_m_walkin');
    if (r.method === 'SELF') return t('scanner.list_m_self');
    if (r.method === 'MANUAL') return t('scanner.list_m_manual');
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={{ flex: 1 }} className="bg-card">
        <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
          <View className="flex-row items-center px-4 py-2">
            <ListChecks size={18} color={nc('#525252')} />
            <Text className="flex-1 text-base font-bold text-neutral-900 ml-2" numberOfLines={1}>
              {t('scanner.list_title')}
            </Text>
            <Pressable onPress={close} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.close')}>
              <X size={20} color={nc('#525252')} />
            </Pressable>
          </View>
        </SafeAreaView>

        <View className="px-4 pt-3">
          <View className="flex-row bg-neutral-100 rounded-xl p-1 mb-3">
            {[
              { on: true, label: t('scanner.list_by_petugas') },
              { on: false, label: t('scanner.list_all') },
            ].map((o) => {
              const active = onlyPetugas === o.on;
              return (
                <Pressable
                  key={String(o.on)}
                  onPress={() => setOnlyPetugas(o.on)}
                  className={`flex-1 py-2 rounded-lg items-center ${active ? 'bg-card' : ''}`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-neutral-900' : 'text-neutral-500'}`}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row items-center border-2 border-neutral-200 rounded-xl px-3">
            <Search size={16} color={nc('#A3A3A3')} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('scanner.list_search')}
              placeholderTextColor={nc('#A3A3A3')}
              autoCorrect={false}
              returnKeyType="search"
              className="flex-1 px-2 py-2.5 text-sm text-neutral-900"
            />
            {list.isFetching ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : text ? (
              <Pressable onPress={() => setText('')} hitSlop={8}>
                <X size={16} color={nc('#A3A3A3')} />
              </Pressable>
            ) : null}
          </View>
          <Text className="text-xs text-neutral-500 mt-2">{t('scanner.list_count', { count: data.length })}</Text>
        </View>

        <View style={{ flex: 1 }} className="mt-1">
          {list.isError ? (
            <Text className="text-xs text-red-600 text-center mt-6 px-4">
              {(list.error as Error)?.message || t('scanner.list_error')}
            </Text>
          ) : list.isLoading ? (
            <ActivityIndicator className="mt-8" color="#F97316" />
          ) : data.length === 0 ? (
            <Text className="text-sm text-neutral-500 text-center mt-8 px-4">{t('scanner.list_empty')}</Text>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={data}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              ItemSeparatorComponent={() => <View className="h-px bg-neutral-100" />}
              renderItem={({ item: r }) => {
                const m = methodLabel(r);
                const sub = [
                  r.jemaat.kode,
                  r.byMe ? t('scanner.list_by_me') : r.scannedBy ? t('scanner.list_by', { name: r.scannedBy }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <View className="flex-row items-center gap-3 py-3">
                    <Avatar name={r.jemaat.namaLengkap} fotoUrl={r.jemaat.fotoUrl} size={40} />
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-neutral-900 flex-shrink" numberOfLines={1}>
                          {r.jemaat.namaLengkap}
                        </Text>
                        {m ? (
                          <View className="bg-violet-50 rounded-full px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-violet-700">{m}</Text>
                          </View>
                        ) : null}
                      </View>
                      {sub ? (
                        <Text className="text-xs text-neutral-500" numberOfLines={1}>
                          {sub}
                        </Text>
                      ) : null}
                      {r.checkedOutAt || r.pickedUpAt ? (
                        <Text className="text-[11px] text-amber-700 mt-0.5">
                          {r.pickedUpAt
                            ? t('scanner.list_picked_up', { time: localTime(r.pickedUpAt) })
                            : t('scanner.list_checked_out', { time: localTime(r.checkedOutAt) })}
                        </Text>
                      ) : null}
                    </View>
                    {r.at ? <Text className="text-xs font-semibold text-neutral-700">{localTime(r.at)}</Text> : null}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
