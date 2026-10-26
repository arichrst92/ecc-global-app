/** Detail prayer request saya — timeline, catatan tim doa, tandai terjawab, ubah, hapus. */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, EyeOff, MessageCircleHeart, Pencil, Sparkles, Trash2, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { deletePrayer, getMyPrayer, markPrayerAnswered } from '@/api/prayer';
import { Chip, PrayerStatusBadge, TimelineStep, fmtDate, untukLabel } from '@/components/doa/DoaBits';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function DoaDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [answerOpen, setAnswerOpen] = useState(false);
  const [kesaksian, setKesaksian] = useState('');

  const q = useQuery({ queryKey: ['prayer', 'detail', id], queryFn: () => getMyPrayer(id), enabled: !!id });
  const p = q.data;
  const onErr = (e: unknown) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');

  const answerMut = useMutation({
    mutationFn: (answered: boolean) => markPrayerAnswered(id, answered, answered ? kesaksian.trim() || null : null),
    onSuccess: (_d, answered) => {
      qc.invalidateQueries({ queryKey: ['prayer'] });
      setAnswerOpen(false);
      showToast(answered ? t('doa.answered_done') : t('doa.unmarked'), 'success');
    },
    onError: onErr,
  });
  const delMut = useMutation({
    mutationFn: () => deletePrayer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prayer'] });
      showToast(t('doa.deleted'), 'success');
      goBack(router);
    },
    onError: onErr,
  });
  const confirmDelete = () =>
    Alert.alert(t('doa.delete_title'), t('doa.delete_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('doa.delete'), style: 'destructive', onPress: () => delMut.mutate() },
    ]);
  const confirmUnmark = () =>
    Alert.alert(t('doa.unmark_answered'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('doa.unmark_answered'), style: 'destructive', onPress: () => answerMut.mutate(false) },
    ]);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{t('doa.title')}</Text>
          {p ? (
            <Pressable onPress={confirmDelete} className="w-10 h-10 items-center justify-center" hitSlop={8}>
              <Trash2 size={19} color={nc('#737373')} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {q.isPending || !p ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}>
          <View className="bg-card rounded-2xl p-4 border border-neutral-100 gap-2">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Chip label={t(`doa.kategori_${p.kategori}`)} muted />
              {p.isAnonim ? (
                <View className="flex-row items-center gap-1">
                  <EyeOff size={12} color={nc('#737373')} />
                  <Text className="text-[11px] text-neutral-500">{t('doa.anonim')}</Text>
                </View>
              ) : null}
              <View className="flex-1" />
              <PrayerStatusBadge status={p.displayStatus} />
            </View>
            <Text className="text-[15px] text-neutral-900 leading-6">{p.isi}</Text>
            <Text className="text-xs text-neutral-500">
              {t('doa.for')}: {untukLabel(t, p.untuk, p.untukNama)}
            </Text>
          </View>

          <View className="bg-card rounded-2xl p-4 border border-neutral-100 gap-2.5">
            <TimelineStep done label={t('doa.sent_at')} sub={fmtDate(p.createdAt, i18n.language, true)} />
            <TimelineStep
              done={p.status !== 'BARU'}
              label={t('doa.step_assigned')}
              sub={p.assignedAt ? fmtDate(p.assignedAt, i18n.language, true) : null}
            />
            <TimelineStep
              done={p.status === 'SUDAH_DIDOAKAN'}
              label={t('doa.step_prayed')}
              sub={p.didoakanAt ? fmtDate(p.didoakanAt, i18n.language, true) : null}
            />
            <TimelineStep
              done={!!p.terjawabAt}
              label={t('doa.step_answered')}
              sub={p.terjawabAt ? fmtDate(p.terjawabAt, i18n.language, true) : null}
            />
          </View>

          {p.catatanPetugas ? (
            <View className="bg-sky-50 rounded-2xl p-4 border border-sky-100 gap-1">
              <View className="flex-row items-center gap-1.5">
                <MessageCircleHeart size={15} color={nc('#0369A1')} />
                <Text className="text-xs font-semibold text-sky-800">{t('doa.note_from_team')}</Text>
              </View>
              <Text className="text-sm text-sky-900 leading-5">{p.catatanPetugas}</Text>
              <Text className="text-[11px] text-sky-700">— {t('doa.team')}</Text>
            </View>
          ) : null}

          {p.kesaksian ? (
            <View className="bg-green-50 rounded-2xl p-4 border border-green-100 gap-1">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={15} color={nc('#15803D')} />
                <Text className="text-xs font-semibold text-green-800">{t('doa.kesaksian_label')}</Text>
              </View>
              <Text className="text-sm text-green-900 leading-5">{p.kesaksian}</Text>
            </View>
          ) : null}

          {p.terjawabAt ? (
            <Button label={t('doa.unmark_answered')} variant="secondary" onPress={confirmUnmark} loading={answerMut.isPending} />
          ) : (
            <Button
              label={t('doa.mark_answered')}
              onPress={() => {
                setKesaksian('');
                setAnswerOpen(true);
              }}
              leftIcon={<Sparkles size={18} color="#fff" />}
              fullWidth
              size="lg"
            />
          )}

          {p.canEdit ? (
            <Button
              label={t('doa.edit')}
              variant="secondary"
              leftIcon={<Pencil size={16} color={nc('#171717')} />}
              onPress={() => router.push(`/doa/form?id=${p.id}` as never)}
            />
          ) : !p.terjawabAt ? (
            <Text className="text-[11px] text-neutral-400 text-center">{t('doa.cant_edit')}</Text>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={answerOpen} transparent animationType="slide" onRequestClose={() => setAnswerOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={() => setAnswerOpen(false)} />
          <View className="bg-card rounded-t-3xl p-5 gap-3" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-neutral-900">{t('doa.mark_answered')}</Text>
              <Pressable onPress={() => setAnswerOpen(false)} hitSlop={10}>
                <X size={18} color={nc('#737373')} />
              </Pressable>
            </View>
            <Text className="text-xs text-neutral-500">{t('doa.mark_answered_hint')}</Text>
            <TextInput
              value={kesaksian}
              onChangeText={setKesaksian}
              multiline
              maxLength={3000}
              placeholder={t('doa.kesaksian_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />
            <Button label={t('doa.mark_answered')} loading={answerMut.isPending} onPress={() => answerMut.mutate(true)} fullWidth />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
