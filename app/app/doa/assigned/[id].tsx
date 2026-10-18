/** Petugas doa — detail prayer request yang ditugaskan + tandai sudah didoakan. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CircleCheck, EyeOff, Sparkles } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getAssignedPrayer, markPrayed } from '@/api/prayer';
import { Chip, PrayerStatusBadge, fmtDate, untukLabel } from '@/components/doa/DoaBits';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';

export default function AssignedPrayerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [catatan, setCatatan] = useState('');

  const q = useQuery({ queryKey: ['prayer', 'assigned', 'detail', id], queryFn: () => getAssignedPrayer(id), enabled: !!id });
  const p = q.data;
  useEffect(() => {
    if (p) setCatatan(p.catatanPetugas ?? '');
  }, [p?.id, p?.catatanPetugas]); // eslint-disable-line react-hooks/exhaustive-deps

  const prayed = p?.status === 'SUDAH_DIDOAKAN';
  const mut = useMutation({
    mutationFn: () => markPrayed(id, catatan.trim() || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prayer'] });
      showToast(prayed ? t('doa.saved') : t('doa.prayed_done'), 'success');
      if (!prayed) goBack(router);
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{t('doa.tab_assigned')}</Text>
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : !p ? (
        <Text className="text-sm text-neutral-500 text-center mt-10 px-6">
          {q.error instanceof ApiError ? q.error.message : t('error.generic')}
        </Text>
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 gap-2.5">
              <View className="flex-row items-center gap-3">
                {p.pengirim ? (
                  <Avatar name={p.pengirim.namaLengkap} fotoUrl={p.pengirim.fotoUrl} size={40} />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center">
                    <EyeOff size={18} color="#737373" />
                  </View>
                )}
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {p.pengirim?.namaLengkap ?? t('doa.anonim')}
                  </Text>
                  <Text className="text-[11px] text-neutral-500">
                    {[p.cabang?.nama, fmtDate(p.createdAt, i18n.language, true)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <PrayerStatusBadge status={p.displayStatus} />
              </View>
              <View className="flex-row items-center gap-2 flex-wrap">
                <Chip label={t(`doa.kategori_${p.kategori}`)} muted />
                <Text className="text-xs text-neutral-500">
                  {t('doa.for')}: {untukLabel(t, p.untuk, p.untukNama)}
                </Text>
              </View>
              <Text className="text-[15px] text-neutral-900 leading-6">{p.isi}</Text>
            </View>

            {p.kesaksian ? (
              <View className="bg-green-50 rounded-2xl p-4 border border-green-100 gap-1">
                <View className="flex-row items-center gap-1.5">
                  <Sparkles size={15} color="#15803D" />
                  <Text className="text-xs font-semibold text-green-800">{t('doa.kesaksian_label')}</Text>
                </View>
                <Text className="text-sm text-green-900 leading-5">{p.kesaksian}</Text>
              </View>
            ) : null}

            {prayed && p.didoakanAt ? (
              <View className="flex-row items-center gap-2">
                <CircleCheck size={16} color="#16A34A" />
                <Text className="text-sm text-neutral-700">
                  {t('doa.mark_prayed_title')} · {fmtDate(p.didoakanAt, i18n.language, true)}
                </Text>
              </View>
            ) : null}

            <Text className="text-sm font-semibold text-neutral-800">{t('doa.catatan_label')}</Text>
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              multiline
              maxLength={1000}
              placeholder={t('doa.catatan_ph')}
              placeholderTextColor="#A3A3A3"
              className="bg-white rounded-2xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />
            <Button
              label={prayed ? t('doa.update_note') : t('doa.mark_prayed')}
              variant={prayed ? 'secondary' : 'primary'}
              loading={mut.isPending}
              onPress={() => mut.mutate()}
              fullWidth
              size="lg"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
