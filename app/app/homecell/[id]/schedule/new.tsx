/**
 * Create Homecell Schedule form — PIC only.
 * Form: tanggal (date picker) + lokasi (required) + catatan (optional).
 *
 * BE endpoint POST /admin/homecell/:id/schedule masih pending — error 404
 * akan toast "BE belum ready" message via generic error handler.
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarPlus, MapPin } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCreateSchedule } from '@/hooks/useHomecellSchedules';
import { ApiError } from '@/types/api';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewScheduleScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = i18n.language;
  const showToast = useToast((s) => s.show);

  const [tanggal, setTanggal] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [lokasi, setLokasi] = useState('');
  const [catatan, setCatatan] = useState('');

  const mutation = useCreateSchedule(id);

  function handleSave() {
    if (lokasi.trim().length === 0) {
      showToast(t('homecell.schedule_field_lokasi') + ' required', 'error');
      return;
    }
    mutation.mutate(
      {
        tanggal: toYmd(tanggal),
        lokasi: lokasi.trim(),
        catatan: catatan.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast(t('homecell.schedule_created_toast'), 'success');
          router.back();
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
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('homecell.schedule_form_title')}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            className="bg-white rounded-2xl p-4 border border-neutral-200 flex-row items-center gap-3 mb-5"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <CalendarPlus size={20} color="#EA580C" />
            </View>
            <Text className="text-sm font-semibold text-neutral-900 flex-1">
              {dateLabel}
            </Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
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

          {/* Lokasi */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-3">
            {t('homecell.schedule_field_lokasi')}
          </Text>
          <View className="bg-white rounded-2xl border border-neutral-200 px-3 py-2 flex-row items-start gap-2 mb-5">
            <MapPin size={18} color="#737373" style={{ marginTop: 4 }} />
            <TextInput
              value={lokasi}
              onChangeText={setLokasi}
              placeholder={t('homecell.schedule_field_lokasi_placeholder')}
              placeholderTextColor="#A3A3A3"
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
          <View className="bg-white rounded-2xl border border-neutral-200 px-3 py-2 mb-6">
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              placeholder={t('homecell.schedule_field_catatan_placeholder')}
              placeholderTextColor="#A3A3A3"
              multiline
              className="text-sm text-neutral-900 py-1.5"
              style={{ minHeight: 60, textAlignVertical: 'top' }}
              maxLength={1000}
            />
          </View>
        </ScrollView>

        <View className="px-5 pb-4 pt-3 bg-white border-t border-neutral-100">
          <SafeAreaView edges={['bottom']}>
            <Button
              label={t('homecell.schedule_save_btn')}
              onPress={handleSave}
              loading={mutation.isPending}
              disabled={lokasi.trim().length === 0 || mutation.isPending}
              fullWidth
              size="lg"
            />
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
