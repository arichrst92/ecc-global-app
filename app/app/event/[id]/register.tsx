import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, HandHeart, Info } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useEventDetail } from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth.store';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { useNotificationsStore } from '@/stores/notifications.store';
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
  const addNotification = useNotificationsStore((s) => s.add);
  const queryClient = useQueryClient();

  const eventQuery = useEventDetail(id);
  const event = eventQuery.data;

  // Untuk event NOMINAL_BEBAS, user input nominal sendiri (string supaya bisa
  // kontrol format input — parse ke number saat submit)
  const [bebasNominal, setBebasNominal] = useState('');
  const [bebasError, setBebasError] = useState<string | null>(null);

  const isBebas = event?.tipeBayar === 'NOMINAL_BEBAS';

  function parseNominal(input: string): number | null {
    // Strip semua selain digit
    const digits = input.replace(/\D/g, '');
    if (!digits) return null;
    const num = Number(digits);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  }

  function handleBebasChange(v: string) {
    setBebasNominal(v);
    setBebasError(null);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error('Missing data');
      let nominalBayar: number | undefined;
      if (event.tipeBayar === 'NOMINAL_TETAP') {
        nominalBayar = Number(event.nominal);
      } else if (event.tipeBayar === 'NOMINAL_BEBAS') {
        const parsed = parseNominal(bebasNominal);
        // Validation handled di submitMutation wrapper, mutation hanya jalan
        // kalau sudah valid. Defensive fallback di sini.
        nominalBayar = parsed ?? 0;
      }
      return registerPeserta(event.id, {
        jemaatId: user.jemaatId,
        nominalBayar,
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
          nominalBayar: data.nominalBayar ? Number(data.nominalBayar) : null,
        });
      }

      // Invalidate event queries supaya myParticipation field di detail ke-update
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'my-participation', id] });

      // Local notification — pendaftaran event berhasil
      if (event) {
        addNotification({
          category: 'event',
          title:
            event.tipeBayar === 'GRATIS'
              ? t('notif.event_register_free_title')
              : t('notif.event_register_paid_title'),
          body: t('notif.event_register_body', { judul: event.judul }),
          deepLink: `/event/${event.id}`,
        });
      }

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

  function handleSubmit() {
    // Validate NOMINAL_BEBAS sebelum submit
    if (isBebas) {
      const parsed = parseNominal(bebasNominal);
      if (parsed === null) {
        setBebasError(t('event.nominal_bebas_required'));
        return;
      }
      if (parsed < 1000) {
        setBebasError(t('event.nominal_bebas_min'));
        return;
      }
    }
    mutation.mutate();
  }

  if (!user) return null;

  const isFree = event?.tipeBayar === 'GRATIS';
  // Display formatted nominal (thousand separator) live while typing
  const bebasDisplay = (() => {
    const num = parseNominal(bebasNominal);
    return num !== null ? `Rp ${num.toLocaleString('id-ID')}` : '';
  })();
  const submitDisabled =
    !event ||
    (isBebas && (parseNominal(bebasNominal) ?? 0) < 1000);

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
                {formatDate(event.tanggalMulai, lang)}
                {event.lokasi && event.lokasi.trim().length > 0
                  ? ` · ${event.lokasi}`
                  : ''}
              </Text>
              {isFree ? (
                <Text className="text-sm font-bold text-emerald-600 mt-1">
                  {t('event.free')}
                </Text>
              ) : isBebas ? (
                <Text className="text-sm font-bold text-blue-600 mt-1">
                  {lang === 'id' ? 'Persembahan / Sukarela' : 'Voluntary donation'}
                </Text>
              ) : (
                <Text className="text-sm font-bold text-brand-600 mt-1">
                  Rp {Number(event.nominal).toLocaleString('id-ID')}
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

        {/* Input nominal manual untuk NOMINAL_BEBAS */}
        {isBebas ? (
          <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <HandHeart size={16} color="#1d4ed8" />
              <Text className="text-sm font-semibold text-blue-900">
                {t('event.nominal_bebas_label')}
              </Text>
            </View>
            <Text className="text-xs text-blue-700 mb-3 leading-relaxed">
              {t('event.nominal_bebas_hint')}
            </Text>
            <View
              className={`flex-row items-center bg-white border rounded-xl ${
                bebasError ? 'border-red-400' : 'border-neutral-200'
              }`}
              style={{ height: 48 }}
            >
              <Text className="text-base font-semibold text-neutral-500 pl-3 pr-1">Rp</Text>
              <TextInput
                placeholder="0"
                value={bebasNominal}
                onChangeText={handleBebasChange}
                keyboardType="numeric"
                editable={!mutation.isPending}
                placeholderTextColor="#A3A3A3"
                className="flex-1 px-2 text-base font-semibold text-neutral-900"
                style={{
                  height: '100%',
                  textAlignVertical: 'center',
                  ...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {}),
                  ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
                }}
              />
            </View>
            {bebasError ? (
              <Text className="text-xs text-red-600 mt-1.5">{bebasError}</Text>
            ) : null}
            {bebasDisplay && !bebasError ? (
              <Text className="text-xs text-blue-700 mt-1.5">
                {t('event.nominal_bebas_preview')}: {bebasDisplay}
              </Text>
            ) : null}
            <View className="flex-row gap-2 mt-3 flex-wrap">
              {[20000, 50000, 100000, 200000, 500000].map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => handleBebasChange(String(preset))}
                  className="px-3 py-1.5 bg-white border border-blue-200 rounded-full"
                >
                  <Text className="text-xs font-semibold text-blue-700">
                    {preset >= 1000 ? `${preset / 1000}rb` : preset}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

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
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={submitDisabled}
            leftIcon={<Check size={16} color="#fff" />}
            fullWidth
            size="lg"
          />
        </SafeAreaView>
      </View>
    </View>
  );
}
