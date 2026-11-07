/**
 * Form jadwal pertemuan homecell — buat baru, atau ubah (`?edit=<scheduleId>`, 2.4.7).
 * PIC homecell, PIC/pastor zona, dan asisten.
 * Form: tanggal (date picker) + jam mulai–selesai + lokasi (required) + catatan (optional).
 *
 * BE endpoint POST /admin/homecell/:id/schedule masih pending — error 404
 * akan toast "BE belum ready" message via generic error handler.
 */

import { createElement, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarPlus, Clock, MapPin } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCreateSchedule, useHomecellSchedule, useUpdateSchedule } from '@/hooks/useHomecellSchedules';
import { parseLocalDate } from '@/utils/date';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc, isDark } from '@/theme/ThemeRoot';
import { cekTeks, pertamaGagal } from '@/utils/inputRules';

function toHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fromHm(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 19, m ?? 0, 0, 0);
  return d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewScheduleScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const isEdit = !!edit;
  const lang = i18n.language;
  const showToast = useToast((s) => s.show);

  const [tanggal, setTanggal] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [lokasi, setLokasi] = useState('');
  const [catatan, setCatatan] = useState('');
  // Jam pertemuan (jam dinding cabang) — default 19:00–21:00.
  const [jamMulai, setJamMulai] = useState('19:00');
  const [jamSelesai, setJamSelesai] = useState('21:00');
  const [timeField, setTimeField] = useState<null | 'mulai' | 'selesai'>(null);
  const jamValid = jamSelesai > jamMulai;

  const mutation = useCreateSchedule(id);
  const updateMut = useUpdateSchedule(id, edit ?? '');
  // Mode ubah: isi form dari jadwal yang ada (sekali saja).
  const existing = useHomecellSchedule(id, edit);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const d = existing.data;
    if (!isEdit || filled || !d) return;
    setTanggal(parseLocalDate(d.tanggal.slice(0, 10)));
    if (d.jamMulai) setJamMulai(d.jamMulai);
    if (d.jamSelesai) setJamSelesai(d.jamSelesai);
    setLokasi(d.lokasi ?? '');
    setCatatan(d.catatan ?? '');
    setFilled(true);
  }, [existing.data, isEdit, filled]);

  function handleSave() {
    {
      const salah = pertamaGagal(
        cekTeks(lokasi, { wajib: true, label: t('homecell.schedule_field_lokasi') }),
        cekTeks(catatan, { label: t('homecell.schedule_field_catatan') }),
      );
      if (salah) {
        showToast(salah, 'error');
        return;
      }
    }
    if (!jamValid) {
      showToast(t('homecell.schedule_jam_invalid'), 'error');
      return;
    }
    if (isEdit) {
      updateMut.mutate(
        { tanggal: toYmd(tanggal), jamMulai, jamSelesai, lokasi: lokasi.trim(), catatan: catatan.trim() || null },
        {
          onSuccess: () => {
            showToast(t('homecell.schedule_updated_toast'), 'success');
            goBack(router);
          },
          onError: (err) => showToast(err instanceof ApiError ? err.message : t('error.network'), 'error'),
        },
      );
      return;
    }
    mutation.mutate(
      {
        tanggal: toYmd(tanggal),
        jamMulai,
        jamSelesai,
        lokasi: lokasi.trim(),
        catatan: catatan.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast(t('homecell.schedule_created_toast'), 'success');
          goBack(router);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : t('error.network');
          showToast(msg, 'error');
        },
      },
    );
  }

  const dateLabel = tanggal.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Date constraints: 30 hari ke belakang (sync dengan BE validation),
  // 90 hari ke depan (reasonable scheduling horizon).
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 30);
  // Ubah jadwal lama: tanggal aslinya tetap bisa dipertahankan.
  if (isEdit && tanggal < minDate) minDate.setTime(tanggal.getTime());
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {isEdit ? t('homecell.schedule_edit_title') : t('homecell.schedule_form_title')}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardSafeView
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tanggal */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('homecell.schedule_field_tanggal')}
          </Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            className="bg-card rounded-2xl p-4 border border-neutral-200 flex-row items-center gap-3 mb-5"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <CalendarPlus size={20} color="#EA580C" />
            </View>
            <Text className="text-sm font-semibold text-neutral-900 flex-1">
              {dateLabel}
            </Text>
          </Pressable>
          {Platform.OS === 'web' ? (
            // DateTimePicker tidak didukung di web → input date bawaan browser.
            createElement('input', {
              type: 'date',
              value: toYmd(tanggal),
              min: toYmd(minDate),
              max: toYmd(maxDate),
              onChange: (e: { target: { value: string } }) => {
                const v = e.target.value;
                if (v) setTanggal(new Date(`${v}T00:00:00`));
              },
              style: {
                marginTop: -8,
                marginBottom: 12,
                padding: 12,
                borderRadius: 16,
                border: `1px solid ${nc('#E5E5E5')}`,
                fontSize: 14,
                color: isDark() ? '#F5F5F5' : '#171717',
                backgroundColor: isDark() ? '#1C1C1E' : '#FFFFFF',
                colorScheme: isDark() ? 'dark' : 'light',
              },
            })
          ) : showPicker ? (
            <DateTimePicker
                themeVariant={isDark() ? 'dark' : 'light'}
              value={tanggal}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={minDate}
              maximumDate={maxDate}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (d) setTanggal(d);
              }}
            />
          ) : null}

          {/* Jam mulai – selesai */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-3">
            {t('homecell.schedule_field_jam')}
          </Text>
          <View className="flex-row gap-3 mb-2">
            {(['mulai', 'selesai'] as const).map((f) => {
              const val = f === 'mulai' ? jamMulai : jamSelesai;
              const active = timeField === f;
              return (
                <View key={f} className="flex-1">
                  {Platform.OS === 'web' ? (
                    <View className="bg-card rounded-2xl p-3 border border-neutral-200">
                      <Text className="text-[11px] text-neutral-500 mb-1">
                        {t(f === 'mulai' ? 'homecell.schedule_jam_mulai' : 'homecell.schedule_jam_selesai')}
                      </Text>
                      {createElement('input', {
                        type: 'time',
                        value: val,
                        onChange: (e: { target: { value: string } }) => {
                          const v = e.target.value;
                          if (v) (f === 'mulai' ? setJamMulai : setJamSelesai)(v.slice(0, 5));
                        },
                        style: {
                          fontSize: 16,
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          color: isDark() ? '#F5F5F5' : '#171717',
                          colorScheme: isDark() ? 'dark' : 'light',
                        },
                      })}
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setTimeField(active ? null : f)}
                      className={`bg-card rounded-2xl p-3 border flex-row items-center gap-2 ${active ? 'border-brand-400' : 'border-neutral-200'}`}
                    >
                      <Clock size={18} color="#EA580C" />
                      <View>
                        <Text className="text-[11px] text-neutral-500">
                          {t(f === 'mulai' ? 'homecell.schedule_jam_mulai' : 'homecell.schedule_jam_selesai')}
                        </Text>
                        <Text className="text-base font-semibold text-neutral-900">{val}</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          {!jamValid ? (
            <Text className="text-xs text-red-600 mb-2">{t('homecell.schedule_jam_invalid')}</Text>
          ) : null}
          {Platform.OS !== 'web' && timeField ? (
            // iOS spinner: warna teks eksplisit + latar kartu — tanpa ini teks
            // jam hitam di atas latar gelap (mode gelap) dan tidak terbaca.
            <View className="bg-card rounded-2xl border border-neutral-200 mb-2 overflow-hidden">
            <DateTimePicker
              themeVariant={isDark() ? 'dark' : 'light'}
              textColor={isDark() ? '#FFFFFF' : '#171717'}
              value={fromHm(timeField === 'mulai' ? jamMulai : jamSelesai)}
              mode="time"
              is24Hour
              minuteInterval={5}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                const field = timeField;
                if (Platform.OS !== 'ios') setTimeField(null);
                if (e.type === 'dismissed' || !d || !field) return;
                const hm = toHm(d);
                if (field === 'mulai') {
                  setJamMulai(hm);
                  // Geser jam selesai ikut maju bila jadi tidak valid (+2 jam).
                  if (jamSelesai <= hm) {
                    const end = new Date(d.getTime() + 2 * 60 * 60 * 1000);
                    setJamSelesai(end.getDate() === d.getDate() ? toHm(end) : '23:55');
                  }
                } else {
                  setJamSelesai(hm);
                }
              }}
            />
            </View>
          ) : null}

          {/* Lokasi */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-3">
            {t('homecell.schedule_field_lokasi')}
          </Text>
          <View className="bg-card rounded-2xl border border-neutral-200 px-3 py-2 flex-row items-start gap-2 mb-5">
            <MapPin size={18} color={nc('#737373')} style={{ marginTop: 4 }} />
            <TextInput
              value={lokasi}
              onChangeText={setLokasi}
              placeholder={t('homecell.schedule_field_lokasi_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              multiline
              className="flex-1 text-sm text-neutral-900 py-1.5"
              style={{ minHeight: 40 }}
              maxLength={500}
            />
          </View>

          {/* Catatan */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('homecell.schedule_field_catatan')}
          </Text>
          <View className="bg-card rounded-2xl border border-neutral-200 px-3 py-2 mb-6">
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              placeholder={t('homecell.schedule_field_catatan_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              multiline
              className="text-sm text-neutral-900 py-1.5"
              style={{ minHeight: 60, textAlignVertical: 'top' }}
              maxLength={1000}
            />
          </View>
        </ScrollView>

        <View className="px-5 pb-4 pt-3 bg-card border-t border-neutral-100">
          <SafeAreaView edges={['bottom']}>
            <Button
              label={isEdit ? t('homecell.schedule_update_btn') : t('homecell.schedule_save_btn')}
              onPress={handleSave}
              loading={mutation.isPending || updateMut.isPending}
              disabled={lokasi.trim().length === 0 || !jamValid || mutation.isPending || updateMut.isPending || (isEdit && !filled)}
              fullWidth
              size="lg"
            />
          </SafeAreaView>
        </View>
      </KeyboardSafeView>
    </View>
  );
}
