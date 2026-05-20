import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Info } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useEventDetail } from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth.store';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { registerPeserta } from '@/api/event';
import { formatPhoneDisplay } from '@/utils/phone';
import { formatDate } from '@/utils/date';
import { ApiError } from '@/types/api';

export default function EventRegisterScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const catatan = useEventFlowStore((s) => s.catatan);
  const setCatatan = useEventFlowStore((s) => s.setCatatan);
  const addParticipation = useEventFlowStore((s) => s.addParticipation);
  const queryClient = useQueryClient();

  const eventQuery = useEventDetail(id);
  const event = eventQuery.data;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error('Missing data');
      return registerPeserta(event.id, {
        jemaatId: user.jemaatId,
        nominalBayar: event.tipeBayar === 'NOMINAL_TETAP' ? Number(event.nominal) : undefined,
        catatan: catatan || undefined,
      });
    },
    onSuccess: async (data) => {
      // Persist participation supaya bisa "lanjut pembayaran" kalau user
      // keluar app sebelum upload bukti (offline fallback)
      if (event) {
        await addParticipation({
          participationId: data.id,
          eventId: event.id,
          status: data.status,
          registeredAt: Date.now(),
        });
      }

      // Invalidate event queries supaya myParticipation field di detail ke-update
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'my-participation', id] });

      if (event?.tipeBayar === 'GRATIS') {
        // Skip payment screen — daftar selesai
        Alert.alert(t('event.register_success'), undefined, [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        router.replace(`/event/${id}/payment`);
      }
    },
    onError: async (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          // Heuristik: kalau pesan menyebut "sudah terdaftar"/"already registered"
          // → user sudah punya participation di BE, local state kemungkinan hilang.
          // Per BE patch 2026-05-21i, event detail include `myParticipation` —
          // tinggal invalidate cache dan event detail akan auto-sync dari BE.
          // Otherwise (quota penuh) → tampil error biasa.
          const msg = err.message.toLowerCase();
          const isAlreadyRegistered =
            msg.includes('sudah terdaftar') ||
            msg.includes('already registered') ||
            msg.includes('duplicate');

          if (isAlreadyRegistered && event) {
            // Invalidate event detail → re-fetch akan dapat myParticipation dari BE
            await queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
            await queryClient.invalidateQueries({ queryKey: ['event', 'my-participation', id] });
            Alert.alert(
              t('event.already_registered'),
              t('event.already_registered_recovery'),
              [
                {
                  text: 'OK',
                  onPress: () => router.replace(`/event/${id}`),
                },
              ],
            );
            return;
          }
          Alert.alert(err.message);
        } else {
          Alert.alert(t('error.generic'), err.message);
        }
      } else {
        Alert.alert(t('error.network'));
      }
    },
  });

  if (!user) return null;

  const isFree = event?.tipeBayar === 'GRATIS';

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('event.register_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Event summary */}
        {event ? (
          <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 flex-row gap-3">
            <View
              className="w-14 h-14 rounded-xl bg-brand-300 items-center justify-center"
            >
              <Text style={{ fontSize: 28 }}>🎉</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900" numberOfLines={2}>
                {event.judul}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {formatDate(event.tanggalMulai, lang)} · {event.lokasi}
              </Text>
              {!isFree ? (
                <Text className="text-sm font-bold text-brand-600 mt-1">
                  Rp {Number(event.nominal).toLocaleString('id-ID')}
                </Text>
              ) : (
                <Text className="text-sm font-bold text-emerald-600 mt-1">
                  {t('event.free')}
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Jemaat info */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
          <Text className="text-xs text-neutral-500 mb-2">{t('event.register_as')}</Text>
          <View className="flex-row items-center gap-3">
            <Avatar name={user.namaLengkap} fotoUrl={user.fotoUrl} size={40} />
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900">{user.namaLengkap}</Text>
              <Text className="text-xs text-neutral-500">{formatPhoneDisplay(user.noHp)}</Text>
            </View>
          </View>
        </View>

        {/* Catatan */}
        <TextField
          label={t('event.note_label')}
          placeholder={t('event.note_placeholder')}
          value={catatan}
          onChangeText={setCatatan}
          multiline
          numberOfLines={3}
          editable={!mutation.isPending}
        />

        {/* Notice */}
        <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
          <Info size={16} color="#92400e" />
          <Text className="text-xs text-amber-800 flex-1">
            {isFree ? t('event.after_register_free_notice') : t('event.after_register_notice')}
          </Text>
        </View>
      </ScrollView>

      <View className="bg-white border-t border-neutral-100 px-5 py-3">
        <SafeAreaView edges={['bottom']}>
          <Button
            label={t('event.register_confirm')}
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!event}
            leftIcon={<Check size={16} color="#fff" />}
            fullWidth
            size="lg"
          />
        </SafeAreaView>
      </View>
    </View>
  );
}
