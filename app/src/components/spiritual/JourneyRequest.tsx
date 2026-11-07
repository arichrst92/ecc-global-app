/**
 * Request update Spiritual Journey (2.4.6) — jemaat memilih tahap yang sudah
 * dicapai + catatan; admin menyetujui di Portal → tahap itu & sebelumnya
 * tercatat. Kartu status + lembar pengajuan.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Hourglass, Send, X, XCircle } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cancelJourneyRequest, requestJourneyUpdate, type MyJourney } from '@/api/spiritualJourney';
import { MY_JOURNEY_KEY } from '@/components/spiritual/JourneyCard';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

const RECENT_MS = 14 * 86_400_000;

export function JourneyRequestCard({ journey }: { journey: MyJourney }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [open, setOpen] = useState(false);
  const r = journey.request;
  // Server lama (tanpa field `request`) → fitur disembunyikan.
  if (r === undefined) return null;

  const cancel = async () => {
    if (!r) return;
    Alert.alert(t('journey.req_cancel_title'), t('journey.req_cancel_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('journey.req_cancel_yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelJourneyRequest(r.id);
            void qc.invalidateQueries({ queryKey: MY_JOURNEY_KEY });
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : t('error.network'), 'error');
          }
        },
      },
    ]);
  };

  const recent = r?.reviewedAt ? Date.now() - new Date(r.reviewedAt).getTime() < RECENT_MS : false;
  const allDone = journey.nextIndex == null;

  return (
    <View className="mb-5">
      {r?.status === 'PENDING' ? (
        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <View className="flex-row items-center gap-2">
            <Hourglass size={16} color="#B45309" />
            <Text className="text-sm font-bold text-amber-900 flex-1">{t('journey.req_pending_title')}</Text>
          </View>
          <Text className="text-sm text-amber-900 mt-1.5">{t('journey.req_pending_step', { title: r.step.judul })}</Text>
          {r.catatan ? (
            <Text className="text-xs text-amber-800 mt-1" numberOfLines={3}>
              “{r.catatan}”
            </Text>
          ) : null}
          <Pressable onPress={cancel} className="self-start mt-3 px-3 py-1.5 rounded-full border border-amber-300 bg-card">
            <Text className="text-xs font-semibold text-amber-800">{t('journey.req_cancel')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {r?.status === 'REJECTED' && recent ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl p-3 mb-2 flex-row gap-2">
              <XCircle size={16} color="#DC2626" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-red-800">{t('journey.req_rejected', { title: r.step.judul })}</Text>
                {r.alasanTolak ? <Text className="text-xs text-red-700 mt-0.5">{r.alasanTolak}</Text> : null}
              </View>
            </View>
          ) : r?.status === 'APPROVED' && recent ? (
            <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 mb-2 flex-row gap-2 items-center">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-800 flex-1">{t('journey.req_approved', { title: r.step.judul })}</Text>
            </View>
          ) : null}
          {!allDone ? (
            <Pressable
              onPress={() => setOpen(true)}
              className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-brand-200 bg-brand-50"
            >
              <Send size={16} color="#EA580C" />
              <Text className="text-sm font-bold text-brand-700">{t('journey.req_btn')}</Text>
            </Pressable>
          ) : null}
        </>
      )}
      <RequestSheet visible={open} onClose={() => setOpen(false)} journey={journey} />
    </View>
  );
}

function RequestSheet({ visible, onClose, journey }: { visible: boolean; onClose: () => void; journey: MyJourney }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [stepId, setStepId] = useState<string | null>(null);
  const [catatan, setCatatan] = useState('');

  const submit = useMutation({
    mutationFn: () => requestJourneyUpdate({ stepId: stepId!, catatan: catatan.trim() || null }),
    onSuccess: () => {
      showToast(t('journey.req_sent'), 'success');
      setStepId(null);
      setCatatan('');
      onClose();
      void qc.invalidateQueries({ queryKey: MY_JOURNEY_KEY });
    },
    onError: (e) => Alert.alert(e instanceof ApiError ? e.message : t('error.network')),
  });

  const canSubmit = !!stepId && !submit.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardSafeView className="flex-1 justify-end bg-black/40">
        <View className="bg-card rounded-t-3xl max-h-[88%]" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center px-5 pt-4 pb-2">
            <Text className="flex-1 text-base font-bold text-neutral-900">{t('journey.req_title')}</Text>
            <Pressable onPress={onClose} disabled={submit.isPending} className="w-9 h-9 items-center justify-center">
              <X size={20} color={nc('#525252')} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-neutral-600 mb-3 leading-relaxed">{t('journey.req_intro')}</Text>
            <View className="gap-2">
              {journey.steps.map((s) => {
                const picked = stepId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    disabled={s.achieved}
                    onPress={() => setStepId(s.id)}
                    className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                      picked ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-card'
                    } ${s.achieved ? 'opacity-50' : ''}`}
                  >
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center ${
                        s.achieved ? 'bg-emerald-500' : picked ? 'bg-brand-500' : 'border-2 border-neutral-300'
                      }`}
                    >
                      {s.achieved || picked ? <Check size={14} color="#fff" /> : null}
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-neutral-400">{t('journey.step_n', { n: s.urutan })}</Text>
                      <Text className="text-sm font-semibold text-neutral-900">
                        {s.ikon ? `${s.ikon} ` : ''}
                        {s.judul}
                      </Text>
                      {s.achieved ? <Text className="text-[11px] text-emerald-700">{t('journey.req_already')}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-sm font-semibold text-neutral-800 mt-4 mb-1.5">{t('journey.req_notes')}</Text>
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              placeholder={t('journey.req_notes_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              className="min-h-[96px] border border-neutral-300 rounded-xl px-3 py-2.5 text-sm text-neutral-900"
            />
            <Text className="text-[11px] text-neutral-500 mt-1.5">{t('journey.req_notes_hint')}</Text>
          </ScrollView>
          <View className="px-5 pt-2">
            {submit.isPending ? (
              <View className="py-3 items-center">
                <ActivityIndicator color="#F97316" />
              </View>
            ) : (
              <Button label={t('journey.req_submit')} onPress={() => submit.mutate()} disabled={!canSubmit} fullWidth size="lg" />
            )}
          </View>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}
