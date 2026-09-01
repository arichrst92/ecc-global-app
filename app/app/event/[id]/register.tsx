import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, HandHeart, Info, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { BebasWebRedirect } from '@/components/event/BebasWebRedirect';
import { TextField } from '@/components/ui/TextField';
import { useEventDetail, useMyEventParticipations } from '@/hooks/useEvents';
import { useMyFamily } from '@/hooks/useFamily';
import { useAuthStore } from '@/stores/auth.store';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { registerPesertaBatch } from '@/api/event';
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
  const familyListQuery = useMyFamily();
  const familyRelations = familyListQuery.data ?? [];
  const participationsQuery = useMyEventParticipations(id);
  // JemaatIds yang SUDAH punya participation aktif (non-BATAL) di event ini —
  // untuk disable checkbox + tampil badge "Sudah Daftar".
  const alreadyRegisteredIds = useMemo(
    () =>
      new Set(
        (participationsQuery.data ?? [])
          .filter((p) => p.status !== 'BATAL')
          .map((p) => p.jemaatId),
      ),
    [participationsQuery.data],
  );

  // Gate NOMINAL_BEBAS registration → web (Apple 3.2.2iv compliance).
  if (event && event.tipeBayar === 'NOMINAL_BEBAS' && id) {
    return <BebasWebRedirect eventId={id} />;
  }

  // Selected jemaat IDs — default pre-check self (kalau self belum daftar)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (!user) return new Set();
    return new Set([user.jemaatId]);
  });

  // Nominal input untuk NOMINAL_BEBAS
  const [bebasNominal, setBebasNominal] = useState('');
  const [bebasError, setBebasError] = useState<string | null>(null);

  const isBebas = event?.tipeBayar === 'NOMINAL_BEBAS';
  const isFree = event?.tipeBayar === 'GRATIS';

  function parseNominal(input: string): number | null {
    const digits = input.replace(/\D/g, '');
    if (!digits) return null;
    const num = Number(digits);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  }

  function toggleSelect(jemaatId: string) {
    // Blok kalau sudah terdaftar
    if (alreadyRegisteredIds.has(jemaatId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jemaatId)) next.delete(jemaatId);
      else next.add(jemaatId);
      return next;
    });
  }

  function handleBebasChange(v: string) {
    setBebasNominal(v);
    setBebasError(null);
  }

  const batchMutation = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error('Missing data');
      let nominalBayarPerOrang: number | undefined;
      if (event.tipeBayar === 'NOMINAL_TETAP') {
        nominalBayarPerOrang = Number(event.nominal);
      } else if (event.tipeBayar === 'NOMINAL_BEBAS') {
        const parsed = parseNominal(bebasNominal);
        nominalBayarPerOrang = parsed ?? 0;
      }
      const jemaatIds = Array.from(selectedIds);
      return registerPesertaBatch(event.id, {
        jemaatIds,
        nominalBayarPerOrang,
        catatan: catatan || undefined,
      });
    },
    onSuccess: async (data) => {
      // Persist self participation ke local store kalau sukses (offline fallback)
      const selfSuccess = data.successful.find((p) => p.jemaatId === user?.jemaatId);
      if (selfSuccess && event) {
        await addParticipation({
          participationId: selfSuccess.id,
          eventId: event.id,
          status: selfSuccess.status,
          registeredAt: Date.now(),
          nominalBayar: selfSuccess.nominalBayar ? Number(selfSuccess.nominalBayar) : null,
        });
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail'] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'mine-and-family', id] });

      // Local notification per successful registration
      if (event) {
        for (const p of data.successful) {
          const relation = familyRelations.find((r) => r.jemaat.id === p.jemaatId);
          const namaPeserta =
            p.jemaatId === user?.jemaatId
              ? user.namaLengkap
              : relation?.jemaat.namaLengkap ?? '';
          addNotification({
            category: 'event',
            title: isFree
              ? t('notif.event_register_free_title')
              : t('notif.event_register_paid_title'),
            body: namaPeserta && p.jemaatId !== user?.jemaatId
              ? t('notif.event_register_body_family', { judul: event.judul, nama: namaPeserta })
              : t('notif.event_register_body', { judul: event.judul }),
            deepLink: `/event/${event.id}`,
          });
        }
      }

      // Handle mixed success/failure summary
      if (data.failed.length > 0) {
        const failLines = data.failed
          .map((f) => {
            const rel = familyRelations.find((r) => r.jemaat.id === f.jemaatId);
            const nama =
              f.jemaatId === user?.jemaatId
                ? t('event.detail_self')
                : rel?.jemaat.namaLengkap ?? f.jemaatId;
            return `• ${nama}: ${f.error.message}`;
          })
          .join('\n');
        Alert.alert(
          t('event.register_partial_title'),
          t('event.register_partial_body', {
            success: data.successful.length,
            failed: data.failed.length,
            details: failLines,
          }),
          [{ text: 'OK', onPress: () => router.replace(`/event/${id}`) }],
        );
        return;
      }

      // Full success routing
      if (isFree) {
        Alert.alert(t('event.register_success'), undefined, [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
        return;
      }

      // Berbayar: kalau HANYA self → route ke payment (backward compat)
      // Kalau multi → back ke event detail (user pilih tracker mana untuk upload)
      if (data.successful.length === 1 && selfSuccess) {
        router.replace(`/event/${id}/payment`);
      } else {
        Alert.alert(
          t('event.register_multi_success_title'),
          t('event.register_multi_success_body', { count: data.successful.length }),
          [{ text: 'OK', onPress: () => router.replace(`/event/${id}`) }],
        );
      }
    },
    onError: async (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          // Fallback recovery — kemungkinan participation sudah ada
          await queryClient.invalidateQueries({ queryKey: ['event', 'detail'] });
          await queryClient.invalidateQueries({ queryKey: ['event', 'mine-and-family', id] });
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
    if (selectedIds.size === 0) {
      Alert.alert(t('event.register_select_at_least_one'));
      return;
    }
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
    batchMutation.mutate();
  }

  if (!user) return null;

  const bebasDisplay = (() => {
    const num = parseNominal(bebasNominal);
    return num !== null ? `Rp ${num.toLocaleString('id-ID')}` : '';
  })();

  const submitDisabled =
    !event ||
    selectedIds.size === 0 ||
    (isBebas && (parseNominal(bebasNominal) ?? 0) < 1000);

  const selectedCount = selectedIds.size;
  const totalNominal =
    event?.tipeBayar === 'NOMINAL_TETAP'
      ? Number(event.nominal) * selectedCount
      : event?.tipeBayar === 'NOMINAL_BEBAS'
        ? (parseNominal(bebasNominal) ?? 0) * selectedCount
        : 0;

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
            <View className="w-14 h-14 rounded-xl bg-brand-300 items-center justify-center">
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
                  Rp {Number(event.nominal).toLocaleString('id-ID')} / {t('event.per_person')}
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Multi-select peserta */}
        <View className="mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Users size={16} color="#171717" />
            <Text className="text-sm font-bold text-neutral-900">
              {t('event.register_select_participants')}
            </Text>
            <View className="bg-brand-50 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-brand-700">
                {selectedCount} {t('event.selected')}
              </Text>
            </View>
          </View>

          {/* Self row */}
          <ParticipantRow
            name={user.namaLengkap}
            subtitle={formatPhoneDisplay(user.noHp)}
            relationLabel={t('event.detail_self')}
            fotoUrl={user.fotoUrl}
            selected={selectedIds.has(user.jemaatId)}
            disabled={alreadyRegisteredIds.has(user.jemaatId)}
            disabledLabel={t('event.already_registered_short')}
            onToggle={() => toggleSelect(user.jemaatId)}
          />

          {/* Family rows */}
          {familyListQuery.isPending ? (
            <Text className="text-xs text-neutral-500 mt-2 italic">
              {t('common.loading')}
            </Text>
          ) : familyRelations.length === 0 ? (
            <View className="mt-2 p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
              <Text className="text-xs text-neutral-500 italic">
                {t('event.no_family_yet')}
              </Text>
            </View>
          ) : (
            <View className="mt-2 gap-2">
              {familyRelations.map((rel) => (
                <ParticipantRow
                  key={rel.jemaat.id}
                  name={rel.jemaat.namaLengkap}
                  subtitle={
                    rel.jemaat.noHp
                      ? formatPhoneDisplay(rel.jemaat.noHp)
                      : t('event.no_phone')
                  }
                  relationLabel={
                    rel.tipeRelasi?.nama ?? rel.role
                  }
                  fotoUrl={rel.jemaat.fotoUrl}
                  selected={selectedIds.has(rel.jemaat.id)}
                  disabled={alreadyRegisteredIds.has(rel.jemaat.id)}
                  disabledLabel={t('event.already_registered_short')}
                  onToggle={() => toggleSelect(rel.jemaat.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Input nominal manual untuk NOMINAL_BEBAS */}
        {isBebas ? (
          <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <HandHeart size={16} color="#1d4ed8" />
              <Text className="text-sm font-semibold text-blue-900">
                {t('event.nominal_bebas_label')} / {t('event.per_person')}
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
                editable={!batchMutation.isPending}
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
          editable={!batchMutation.isPending}
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
          {/* Total ringkasan */}
          {!isFree && selectedCount > 0 && totalNominal > 0 ? (
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs text-neutral-500">
                {t('event.total_for_selected', { count: selectedCount })}
              </Text>
              <Text className="text-base font-bold text-neutral-900">
                Rp {totalNominal.toLocaleString('id-ID')}
              </Text>
            </View>
          ) : null}
          <Button
            label={
              selectedCount > 1
                ? t('event.register_confirm_multi', { count: selectedCount })
                : t('event.register_confirm')
            }
            onPress={handleSubmit}
            loading={batchMutation.isPending}
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

/* ==============================================================
 * PARTICIPANT ROW — checkbox row untuk self + family di picker
 * ============================================================== */
function ParticipantRow({
  name,
  subtitle,
  relationLabel,
  fotoUrl,
  selected,
  disabled,
  disabledLabel,
  onToggle,
}: {
  name: string;
  subtitle: string;
  relationLabel: string;
  fotoUrl?: string | null;
  selected: boolean;
  disabled: boolean;
  disabledLabel: string;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      className={`bg-white rounded-2xl p-3 border flex-row items-center gap-3 active:opacity-80 ${
        disabled
          ? 'border-neutral-100 opacity-60'
          : selected
            ? 'border-brand-400 bg-brand-50/30'
            : 'border-neutral-100'
      }`}
    >
      {/* Checkbox */}
      <View
        className={`w-6 h-6 rounded border-2 items-center justify-center ${
          disabled
            ? 'border-neutral-300 bg-neutral-100'
            : selected
              ? 'border-brand-500 bg-brand-500'
              : 'border-neutral-300 bg-white'
        }`}
      >
        {selected && !disabled ? <Check size={14} color="#fff" /> : null}
      </View>

      <Avatar name={name} fotoUrl={fotoUrl} size={40} />

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
            {name}
          </Text>
          <View className="bg-neutral-100 px-1.5 py-0.5 rounded">
            <Text className="text-[10px] font-semibold text-neutral-600">
              {relationLabel}
            </Text>
          </View>
        </View>
        {disabled ? (
          <Text className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            ✓ {disabledLabel}
          </Text>
        ) : (
          <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
