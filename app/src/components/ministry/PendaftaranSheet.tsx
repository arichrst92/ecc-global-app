/**
 * Buka / tutup pendaftaran ministry per cabang (2.4.6) — untuk pemegang
 * otoritas, hanya cabang otoritasnya. Tanpa notifikasi; jemaat melihat badge
 * "Buka pendaftaran" di daftar pelayanan & catatan di halaman detail.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';

import { getMinistryPendaftaran, saveMinistryPendaftaran, type PendaftaranCabang } from '@/api/ministry';
import { ApiError } from '@/types/api';
import { useToast } from '@/components/ui/Toast';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

const PRESET = [0, 7, 14, 30] as const; // hari; 0 = tanpa batas

const ymdPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function PendaftaranSheet({ ministryId, visible, onClose }: { ministryId: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [editing, setEditing] = useState<PendaftaranCabang | null>(null);
  const [catatan, setCatatan] = useState('');
  const [preset, setPreset] = useState<number>(0);

  const q = useQuery({
    queryKey: ['ministry', 'pendaftaran', ministryId],
    queryFn: () => getMinistryPendaftaran(ministryId),
    enabled: visible,
    retry: false,
  });
  const save = useMutation({
    mutationFn: (v: { cabangId: string; isOpen: boolean; catatan?: string | null; tutupOtomatis?: string | null }) =>
      saveMinistryPendaftaran(ministryId, v.cabangId, v),
    onSuccess: (_d, v) => {
      showToast(v.isOpen ? t('ministry.pend_opened') : t('ministry.pend_closed'), 'success');
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['ministry'] });
    },
    onError: (e) => Alert.alert(e instanceof ApiError ? e.message : t('error.network')),
  });

  const label = (s: PendaftaranCabang['status']) =>
    s === 'BUKA' ? t('ministry.pend_status_buka') : s === 'TUTUP' ? t('ministry.pend_status_tutup') : t('ministry.pend_status_default');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardSafeView className="flex-1 justify-end bg-black/40">
        <View className="bg-card rounded-t-3xl max-h-[85%]" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center px-5 pt-4 pb-2">
            <Text className="flex-1 text-base font-bold text-neutral-900">{t('ministry.pend_title')}</Text>
            <Pressable onPress={onClose} className="w-9 h-9 items-center justify-center">
              <X size={20} color={nc('#525252')} />
            </Pressable>
          </View>
          <Text className="px-5 text-xs text-neutral-500 mb-2">{t('ministry.pend_intro')}</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {q.isPending ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#F97316" />
              </View>
            ) : (
              (q.data ?? []).map((c) => (
                <View key={c.cabangId} className="border border-neutral-100 rounded-2xl p-3 mb-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="flex-1 text-sm font-semibold text-neutral-900">{c.cabangNama}</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${c.status === 'BUKA' ? 'bg-emerald-100' : c.status === 'TUTUP' ? 'bg-red-100' : 'bg-neutral-100'}`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${c.status === 'BUKA' ? 'text-emerald-800' : c.status === 'TUTUP' ? 'text-red-700' : 'text-neutral-600'}`}
                      >
                        {label(c.status)}
                      </Text>
                    </View>
                  </View>
                  {c.status === 'BUKA' && (c.catatan || c.tutupOtomatis) ? (
                    <Text className="text-xs text-neutral-500 mt-1">
                      {c.catatan ?? ''}
                      {c.tutupOtomatis ? `${c.catatan ? ' · ' : ''}${t('ministry.pend_sampai', { tanggal: c.tutupOtomatis })}` : ''}
                    </Text>
                  ) : null}

                  {editing?.cabangId === c.cabangId ? (
                    <View className="mt-3">
                      <TextInput
                        value={catatan}
                        onChangeText={setCatatan}
                        placeholder={t('ministry.pend_catatan_ph')}
                        placeholderTextColor={nc('#A3A3A3')}
                        maxLength={500}
                        multiline
                        className="border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 min-h-[60px]"
                      />
                      <Text className="text-[11px] text-neutral-500 mt-2 mb-1">{t('ministry.pend_tutup_otomatis')}</Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {PRESET.map((d) => (
                          <Pressable
                            key={d}
                            onPress={() => setPreset(d)}
                            {...gx(`px-2.5 py-1 rounded-full border ${preset === d ? 'bg-brand-500 border-brand-500' : 'border-neutral-200'}`)}
                          >
                            <Text className={`text-[11px] font-semibold ${preset === d ? 'text-white' : 'text-neutral-700'}`}>
                              {d === 0 ? t('ministry.pend_tanpa_batas') : t('ministry.pend_hari', { count: d })}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <View className="flex-row gap-2 mt-3">
                        <Pressable onPress={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl border border-neutral-200 items-center">
                          <Text className="text-xs font-semibold text-neutral-700">{t('common.cancel')}</Text>
                        </Pressable>
                        <Pressable
                          disabled={save.isPending}
                          onPress={() =>
                            save.mutate({
                              cabangId: c.cabangId,
                              isOpen: true,
                              catatan: catatan.trim() || null,
                              tutupOtomatis: preset ? ymdPlus(preset) : null,
                            })
                          }
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 items-center"
                        >
                          <Text className="text-xs font-bold text-white">{t('ministry.pend_buka')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row gap-2 mt-3">
                      <Pressable
                        onPress={() => {
                          setEditing(c);
                          setCatatan(c.catatan ?? '');
                          setPreset(0);
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-50 border border-emerald-200 items-center"
                      >
                        <Text className="text-xs font-bold text-emerald-700">
                          {c.status === 'BUKA' ? t('ministry.pend_ubah') : t('ministry.pend_buka')}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={save.isPending || c.status === 'TUTUP'}
                        onPress={() => save.mutate({ cabangId: c.cabangId, isOpen: false })}
                        className={`flex-1 py-2 rounded-xl border border-red-200 items-center ${c.status === 'TUTUP' ? 'opacity-40' : ''}`}
                      >
                        <Text className="text-xs font-bold text-red-700">{t('ministry.pend_tutup')}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}
